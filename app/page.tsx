"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BedDouble,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Home,
  MoveRight,
  Plus,
  RefreshCcw,
  Smartphone,
  Stethoscope,
  UserRound,
} from "lucide-react";

const STORAGE_KEY = "acil-alan-takip-pwa-v2";

type RoomId = number | "M" | "A";
type BedName = "Sol" | "Sağ" | null;
type Triage = "Kırmızı" | "Sarı" | "Yeşil";
type MainTab = "aktif" | "taburcu";
type ViewMode = "liste" | "sedye";

type Room = {
  id: RoomId;
  beds: number;
  side: "left" | "right" | "top" | "center" | "center-bottom";
  label?: string;
};

type Patient = {
  id: string;
  name: string;
  complaint: string;
  bed: BedName;
  time: string;
  note: string;
  triage: Triage;
  doctor: string;
  plan: string;
  waitingConsult: boolean;
  waitingTests: boolean;
  waitingAdmission: boolean;
  mobilizedFrom?: number | string;
};

type DischargedPatient = {
  id: string;
  name: string;
  room: RoomId;
  bed: BedName;
  time: string;
  archiveTime: string;
  diagnosis: string;
  finalNote: string;
  snapshot: {
    triage: Triage;
    doctor: string;
    plan: string;
    note: string;
    waitingConsult: boolean;
    waitingTests: boolean;
    waitingAdmission: boolean;
    complaint: string;
    mobilizedFrom?: number | string;
  };
};

type NewPatientForm = {
  name: string;
  complaint: string;
  bed: BedName;
  note: string;
  triage: Triage;
  doctor: string;
  plan: string;
  waitingConsult: boolean;
  waitingTests: boolean;
  waitingAdmission: boolean;
};

type TransferState = {
  open: boolean;
  patient: Patient | null;
  sourceRoom: RoomId | null;
  targetRoom: string;
  targetBed: BedName;
};

type PatientsByRoom = Record<string, Patient[]>;

const roomConfig: Room[] = [
  { id: 1, beds: 2, side: "right" },
  { id: 2, beds: 2, side: "right" },
  { id: 3, beds: 2, side: "right" },
  { id: 4, beds: 2, side: "right" },
  { id: 5, beds: 2, side: "top" },
  { id: 6, beds: 1, side: "left" },
  { id: 7, beds: 1, side: "left" },
  { id: 8, beds: 2, side: "left" },
  { id: 9, beds: 1, side: "left" },
  { id: "M", beds: Number.POSITIVE_INFINITY, side: "center", label: "Mobilize Hastalar" },
  { id: "A", beds: Number.POSITIVE_INFINITY, side: "center-bottom", label: "Ayaktan Takip" },
];

const bedOptionsByRoom: Record<number, BedName[]> = {
  1: ["Sol", "Sağ"],
  2: ["Sol", "Sağ"],
  3: ["Sol", "Sağ"],
  4: ["Sol", "Sağ"],
  5: ["Sol", "Sağ"],
  6: ["Sol"],
  7: ["Sol"],
  8: ["Sol", "Sağ"],
  9: ["Sol"],
};

const initialPatients: PatientsByRoom = {
  1: [
    { id: "P-101", name: "Ayşe Yılmaz", complaint: "Karın ağrısı", bed: "Sol", time: "08:10", note: "Kan sonucu bekleniyor", triage: "Sarı", doctor: "Dr. Emre", plan: "Hemogram, biyokimya, USG", waitingConsult: false, waitingTests: true, waitingAdmission: false },
    { id: "P-102", name: "Mehmet Kaya", complaint: "Dispne", bed: "Sağ", time: "08:25", note: "Nebül tedavisi aldı", triage: "Kırmızı", doctor: "Dr. Emre", plan: "Nebül, akciğer grafisi, monitorizasyon", waitingConsult: true, waitingTests: false, waitingAdmission: false },
  ],
  2: [{ id: "P-103", name: "Fatma Demir", complaint: "Baş dönmesi", bed: "Sol", time: "09:00", note: "Serum takılı", triage: "Yeşil", doctor: "Dr. Ayşe", plan: "Semptomatik tedavi, gözlem", waitingConsult: false, waitingTests: true, waitingAdmission: false }],
  3: [],
  4: [{ id: "P-104", name: "Ali Can", complaint: "Göğüs ağrısı", bed: "Sol", time: "09:15", note: "EKG çekildi", triage: "Sarı", doctor: "Dr. Mehmet", plan: "Troponin, seri EKG", waitingConsult: true, waitingTests: true, waitingAdmission: false }],
  5: [{ id: "P-105", name: "Zeynep Aydın", complaint: "Ateş", bed: "Sol", time: "09:30", note: "Kan tetkiki alındı", triage: "Yeşil", doctor: "Dr. Elif", plan: "Kan tetkiki, semptomatik tedavi", waitingConsult: false, waitingTests: true, waitingAdmission: false }],
  6: [],
  7: [{ id: "P-106", name: "Hasan Koç", complaint: "Travma", bed: "Sol", time: "10:00", note: "Ortopedi görüşü bekleniyor", triage: "Sarı", doctor: "Dr. Can", plan: "Grafi, ortopedi değerlendirmesi", waitingConsult: true, waitingTests: true, waitingAdmission: true }],
  8: [{ id: "P-107", name: "Elif Şen", complaint: "Bulantı-kusma", bed: "Sağ", time: "10:10", note: "Gözlem altında", triage: "Yeşil", doctor: "Dr. Deniz", plan: "Antiemetik, hidrasyon", waitingConsult: false, waitingTests: false, waitingAdmission: false }],
  9: [],
  M: [{ id: "P-301", name: "Caner Uslu", complaint: "Kontrol EKG", bed: null, time: "10:25", note: "Mobilize izlem", triage: "Sarı", doctor: "Dr. Emre", plan: "Tekrar değerlendirme", waitingConsult: false, waitingTests: false, waitingAdmission: false, mobilizedFrom: 4 }],
  A: [
    { id: "P-201", name: "Selim Arda", complaint: "Pansuman kontrolü", bed: null, time: "10:20", note: "Ayaktan takip", triage: "Yeşil", doctor: "Dr. Emre", plan: "Kontrol muayenesi", waitingConsult: false, waitingTests: false, waitingAdmission: false },
    { id: "P-202", name: "Merve Ak", complaint: "Reçete düzenlenmesi", bed: null, time: "10:35", note: "Ayaktan hasta", triage: "Yeşil", doctor: "Dr. Ayşe", plan: "Tedavi düzenleme", waitingConsult: false, waitingTests: false, waitingAdmission: false },
  ],
};

const initialDischarged: DischargedPatient[] = [];

function nowTime() {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function nowDateTime() {
  return new Date().toLocaleString("tr-TR");
}

function defaultNewPatient(): NewPatientForm {
  return {
    name: "",
    complaint: "",
    bed: "Sol",
    note: "",
    triage: "Yeşil",
    doctor: "",
    plan: "",
    waitingConsult: false,
    waitingTests: false,
    waitingAdmission: false,
  };
}

function triageBadgeClass(triage: Triage) {
  if (triage === "Kırmızı") return "badge badge-red";
  if (triage === "Sarı") return "badge badge-yellow";
  return "badge badge-green";
}

function statusBadge(label: string, kind: "secondary" | "outline" = "secondary") {
  return <span className={`badge ${kind === "secondary" ? "badge-secondary" : "badge-outline"}`}>{label}</span>;
}

function roomLabel(room: Room) {
  return room.label || `Oda ${room.id}`;
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="card-title">{title}</h3>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function RoomTile({ room, patients, selectedRoom, onSelect }: { room: Room; patients: Patient[]; selectedRoom: RoomId; onSelect: (roomId: RoomId) => void }) {
  const flexible = room.id === "M" || room.id === "A";
  const occupied = patients.length;
  const full = !flexible && occupied >= room.beds;

  return (
    <button onClick={() => onSelect(room.id)} className={`room-tile ${selectedRoom === room.id ? "selected" : ""}`}>
      <div className="room-topline">
        <div>
          <div className="room-name">{roomLabel(room)}</div>
          <div className="room-capacity">{flexible ? "Sınırsız" : `${room.beds} sedye`}</div>
        </div>
        {flexible ? <ClipboardList size={20} /> : <BedDouble size={20} />}
      </div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
        <span className={full ? "badge badge-danger" : "badge badge-secondary"}>
          {flexible ? `${occupied} aktif` : `${occupied}/${room.beds} dolu`}
        </span>
        <span className="muted" style={{ fontSize: 12 }}>Detay</span>
      </div>
    </button>
  );
}

function PatientCard({
  patient,
  isFlexibleArea,
  allowMobilize,
  allowReturnToBed,
  allowTransfer,
  onQuickNote,
  onMobilize,
  onReturnToBed,
  onTransfer,
  onDischarge,
}: {
  patient: Patient;
  isFlexibleArea: boolean;
  allowMobilize: boolean;
  allowReturnToBed: boolean;
  allowTransfer: boolean;
  onQuickNote: (patientId: string, note: string) => void;
  onMobilize: (patient: Patient) => void;
  onReturnToBed: (patient: Patient) => void;
  onTransfer: (patient: Patient) => void;
  onDischarge: (patient: Patient) => void;
}) {
  const [noteDraft, setNoteDraft] = useState(patient.note || "");

  return (
    <div className="card patient-card">
      <div className="patient-head">
        <div>
          <div className="row" style={{ alignItems: "center" }}>
            <strong>{patient.name}</strong>
            <span className={triageBadgeClass(patient.triage)}>{patient.triage}</span>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>{patient.complaint}</div>
          <div className="row muted" style={{ marginTop: 8, fontSize: 12 }}>
            <span className="row"><UserRound size={14} /> {patient.id}</span>
            {!isFlexibleArea ? <span className="row"><BedDouble size={14} /> Sedye {patient.bed}</span> : null}
            <span className="row"><Clock3 size={14} /> {patient.time}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14 }}>Sorumlu doktor: {patient.doctor || "-"}</div>
          <div style={{ marginTop: 4, fontSize: 14 }}>Plan: {patient.plan || "-"}</div>
          <div className="row" style={{ marginTop: 10 }}>
            {patient.waitingConsult ? statusBadge("Konsültasyon bekliyor") : null}
            {patient.waitingTests ? statusBadge("Tetkik bekliyor") : null}
            {patient.waitingAdmission ? statusBadge("Yatış bekliyor") : null}
            {patient.mobilizedFrom ? statusBadge(`Mobilize: Oda ${patient.mobilizedFrom}`, "outline") : null}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Hızlı not ekle" />
            <button className="btn" onClick={() => onQuickNote(patient.id, noteDraft)}>Not Kaydet</button>
          </div>
          {patient.note ? <div style={{ marginTop: 8, fontSize: 14 }}>Not: {patient.note}</div> : null}
        </div>
        <div className="toolbar-actions">
          {allowMobilize ? <button className="btn small" onClick={() => onMobilize(patient)}><MoveRight size={14} /> Mobilize Et</button> : null}
          {allowReturnToBed ? <button className="btn small" onClick={() => onReturnToBed(patient)}><RefreshCcw size={14} /> Sedyeye Al</button> : null}
          {allowTransfer ? <button className="btn small" onClick={() => onTransfer(patient)}><ArrowRightLeft size={14} /> Oda Değiştir</button> : null}
          <button className="btn primary small" onClick={() => onDischarge(patient)}><CheckCircle2 size={14} /> Taburcu</button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [patientsByRoom, setPatientsByRoom] = useState<PatientsByRoom>(initialPatients);
  const [discharged, setDischarged] = useState<DischargedPatient[]>(initialDischarged);
  const [selectedRoom, setSelectedRoom] = useState<RoomId>(1);
  const [mainTab, setMainTab] = useState<MainTab>("aktif");
  const [viewMode, setViewMode] = useState<ViewMode>("liste");
  const [newPatient, setNewPatient] = useState<NewPatientForm>(defaultNewPatient());
  const [showAddModal, setShowAddModal] = useState(false);
  const [transfer, setTransfer] = useState<TransferState>({ open: false, patient: null, sourceRoom: null, targetRoom: "1", targetBed: "Sol" });
  const [archiveDetail, setArchiveDetail] = useState<DischargedPatient | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { patientsByRoom?: PatientsByRoom; discharged?: DischargedPatient[] };
      if (parsed.patientsByRoom) setPatientsByRoom(parsed.patientsByRoom);
      if (parsed.discharged) setDischarged(parsed.discharged);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ patientsByRoom, discharged }));
  }, [patientsByRoom, discharged]);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const selectedRoomConfig = roomConfig.find((room) => room.id === selectedRoom);
  const selectedPatients = patientsByRoom[String(selectedRoom)] || [];
  const isFlexibleArea = selectedRoom === "M" || selectedRoom === "A";
  const isMobilize = selectedRoom === "M";

  const totalActive = useMemo(() => Object.values(patientsByRoom).reduce((sum, list) => sum + list.length, 0), [patientsByRoom]);
  const totalBedCapacity = useMemo(() => roomConfig.filter((room) => typeof room.id === "number").reduce((sum, room) => sum + room.beds, 0), []);
  const occupiedBeds = useMemo(() => roomConfig.filter((room) => typeof room.id === "number").reduce((sum, room) => sum + (patientsByRoom[String(room.id)] || []).length, 0), [patientsByRoom]);
  const emptyBeds = totalBedCapacity - occupiedBeds;
  const mobilizeCount = (patientsByRoom.M || []).length;
  const ayaktanCount = (patientsByRoom.A || []).length;

  const rightRooms = roomConfig.filter((room) => room.side === "right").slice().reverse();
  const leftRooms = roomConfig.filter((room) => room.side === "left");
  const topRoom = roomConfig.find((room) => room.side === "top");
  const mobilizeArea = roomConfig.find((room) => room.side === "center");
  const ayaktanArea = roomConfig.find((room) => room.side === "center-bottom");

  function addPatient() {
    if (!newPatient.name.trim() || !newPatient.complaint.trim()) return;
    const roomKey = String(selectedRoom);
    const existing = patientsByRoom[roomKey] || [];
    if (!isFlexibleArea && existing.length >= (selectedRoomConfig?.beds || 0)) return;
    if (!isFlexibleArea && existing.some((p) => p.bed === newPatient.bed)) return;

    const patient: Patient = {
      id: `P-${Math.floor(Math.random() * 900 + 100)}`,
      name: newPatient.name.trim(),
      complaint: newPatient.complaint.trim(),
      bed: isFlexibleArea ? null : newPatient.bed,
      time: nowTime(),
      note: newPatient.note.trim(),
      triage: newPatient.triage,
      doctor: newPatient.doctor.trim(),
      plan: newPatient.plan.trim(),
      waitingConsult: newPatient.waitingConsult,
      waitingTests: newPatient.waitingTests,
      waitingAdmission: newPatient.waitingAdmission,
      mobilizedFrom: isMobilize ? "Dış alan" : undefined,
    };

    setPatientsByRoom((prev) => ({ ...prev, [roomKey]: [...(prev[roomKey] || []), patient] }));
    setNewPatient(defaultNewPatient());
    setShowAddModal(false);
  }

  function saveQuickNote(patientId: string, note: string) {
    const roomKey = String(selectedRoom);
    setPatientsByRoom((prev) => ({
      ...prev,
      [roomKey]: (prev[roomKey] || []).map((p) => (p.id === patientId ? { ...p, note } : p)),
    }));
  }

  function mobilizePatient(patient: Patient) {
    const fromRoom = selectedRoom;
    setPatientsByRoom((prev) => ({
      ...prev,
      [String(fromRoom)]: (prev[String(fromRoom)] || []).filter((p) => p.id !== patient.id),
      M: [{ ...patient, bed: null, mobilizedFrom: typeof fromRoom === "number" ? fromRoom : patient.mobilizedFrom, time: nowTime() }, ...(prev.M || [])],
    }));
    setSelectedRoom("M");
  }

  function openTransferDialog(patient: Patient) {
    const suggestedRoom = typeof patient.mobilizedFrom === "number" ? String(patient.mobilizedFrom) : "1";
    const suggestedBed = bedOptionsByRoom[Number(suggestedRoom)]?.[0] || "Sol";
    setTransfer({ open: true, patient, sourceRoom: selectedRoom, targetRoom: suggestedRoom, targetBed: suggestedBed });
  }

  function confirmTransfer() {
    const { patient, sourceRoom, targetRoom, targetBed } = transfer;
    if (!patient || sourceRoom == null || !targetBed) return;

    const targetRoomNum = Number(targetRoom);
    const targetConfig = roomConfig.find((room) => room.id === targetRoomNum);
    if (!targetConfig) return;

    const targetPatients = patientsByRoom[String(targetRoomNum)] || [];
    const targetOccupant = targetPatients.find((p) => p.bed === targetBed);

    if (!targetOccupant) {
      if (targetPatients.length >= targetConfig.beds) return;
      setPatientsByRoom((prev) => ({
        ...prev,
        [String(sourceRoom)]: (prev[String(sourceRoom)] || []).filter((p) => p.id !== patient.id),
        [String(targetRoomNum)]: [{ ...patient, bed: targetBed, time: nowTime() }, ...(prev[String(targetRoomNum)] || [])],
      }));
    } else {
      const sourceIsBedRoom = typeof sourceRoom === "number";
      const sourceBed = patient.bed;
      if (!sourceIsBedRoom || !sourceBed) return;
      setPatientsByRoom((prev) => ({
        ...prev,
        [String(sourceRoom)]: (prev[String(sourceRoom)] || []).map((p) => (p.id === patient.id ? { ...targetOccupant, bed: sourceBed, time: nowTime() } : p)),
        [String(targetRoomNum)]: (prev[String(targetRoomNum)] || []).map((p) => (p.id === targetOccupant.id ? { ...patient, bed: targetBed, time: nowTime() } : p)),
      }));
    }

    setSelectedRoom(targetRoomNum);
    setTransfer({ open: false, patient: null, sourceRoom: null, targetRoom: "1", targetBed: "Sol" });
  }

  function dischargePatient(patient: Patient) {
    setPatientsByRoom((prev) => ({ ...prev, [String(selectedRoom)]: (prev[String(selectedRoom)] || []).filter((p) => p.id !== patient.id) }));
    setDischarged((prev) => [{
      id: `D-${Math.floor(Math.random() * 900 + 100)}`,
      name: patient.name,
      room: selectedRoom,
      bed: patient.bed,
      time: nowTime(),
      archiveTime: nowDateTime(),
      diagnosis: patient.complaint,
      finalNote: patient.note || "Not yok",
      snapshot: {
        triage: patient.triage,
        doctor: patient.doctor,
        plan: patient.plan,
        note: patient.note,
        waitingConsult: patient.waitingConsult,
        waitingTests: patient.waitingTests,
        waitingAdmission: patient.waitingAdmission,
        complaint: patient.complaint,
        mobilizedFrom: patient.mobilizedFrom,
      },
    }, ...prev]);
  }

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>Acil A Alanı</h1>
          <small>PWA mobil taslak</small>
        </div>
        <div className="install-badge"><Smartphone size={14} /> Ana ekrana eklenebilir</div>
      </div>

      <div className="container">
        <div className="stack">
          <div className="stats">
                        <div className="card stat-box"><div className="stat-label">Aktif hasta</div><div className="stat-value">{totalActive}</div></div>
            <div className="card stat-box"><div className="stat-label">Boş sedye</div><div className="stat-value">{emptyBeds}</div></div>
            <div className="card stat-box"><div className="stat-label">Mobilize</div><div className="stat-value">{mobilizeCount}</div></div>
            <div className="card stat-box"><div className="stat-label">Ayaktan</div><div className="stat-value">{ayaktanCount}</div></div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Kroki</h2>
                          </div>
            <div className="card-body">
              <div className="sketch-wrap">
                <div className="sketch-grid">
                  <div className="sketch-top">{topRoom ? <RoomTile room={topRoom} patients={patientsByRoom[String(topRoom.id)] || []} selectedRoom={selectedRoom} onSelect={setSelectedRoom} /> : null}</div>
                  <div className="sketch-main">
                    <div className="stack">{leftRooms.map((room) => <RoomTile key={String(room.id)} room={room} patients={patientsByRoom[String(room.id)] || []} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />)}</div>
                    <div className="center-stack">
                      {mobilizeArea ? <RoomTile room={mobilizeArea} patients={patientsByRoom[String(mobilizeArea.id)] || []} selectedRoom={selectedRoom} onSelect={setSelectedRoom} /> : null}
                      {ayaktanArea ? <RoomTile room={ayaktanArea} patients={patientsByRoom[String(ayaktanArea.id)] || []} selectedRoom={selectedRoom} onSelect={setSelectedRoom} /> : null}
                    </div>
                    <div className="stack">{rightRooms.map((room) => <RoomTile key={String(room.id)} room={room} patients={patientsByRoom[String(room.id)] || []} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="tabs">
            <button className={`tab-btn ${mainTab === "aktif" ? "active" : ""}`} onClick={() => setMainTab("aktif")}>Aktif</button>
            <button className={`tab-btn ${mainTab === "taburcu" ? "active" : ""}`} onClick={() => setMainTab("taburcu")}>Taburcu</button>
          </div>

          {mainTab === "aktif" ? (
            <div className="card">
              <div className="card-header">
                <div className="toolbar">
                  <div>
                    <h2 className="card-title">{selectedRoom === "M" ? "Mobilize Hastalar" : selectedRoom === "A" ? "Ayaktan Takip" : `Oda ${selectedRoom}`}</h2>
                    <p className="card-subtitle">{isFlexibleArea ? `Aktif hasta: ${selectedPatients.length}` : `Kapasite: ${selectedPatients.length}/${selectedRoomConfig?.beds || 0} sedye`}</p>
                  </div>
                  <div className="toolbar-actions">
                    {!isFlexibleArea ? (
                      <>
                        <button className={`btn ${viewMode === "liste" ? "primary" : ""}`} onClick={() => setViewMode("liste")}>Liste</button>
                        <button className={`btn ${viewMode === "sedye" ? "primary" : ""}`} onClick={() => setViewMode("sedye")}>Sedye</button>
                      </>
                    ) : null}
                    <button className="btn primary" onClick={() => setShowAddModal(true)}><Plus size={16} /> Hasta ekle</button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="scroll-panel">
                  <div className="stack">
                    {selectedPatients.length === 0 ? (
                      <div className="card patient-card muted">Bu alanda aktif hasta yok.</div>
                    ) : isFlexibleArea || viewMode === "liste" ? (
                      selectedPatients.map((patient) => (
                        <PatientCard
                          key={patient.id}
                          patient={patient}
                          isFlexibleArea={isFlexibleArea}
                          allowMobilize={!isFlexibleArea}
                          allowReturnToBed={isMobilize}
                          allowTransfer={true}
                          onQuickNote={saveQuickNote}
                          onMobilize={mobilizePatient}
                          onReturnToBed={openTransferDialog}
                          onTransfer={openTransferDialog}
                          onDischarge={dischargePatient}
                        />
                      ))
                    ) : (
                      (bedOptionsByRoom[selectedRoom as number] || []).map((bedName) => {
                        const patient = selectedPatients.find((p) => p.bed === bedName);
                        return (
                          <div key={String(bedName)} className="card patient-card">
                            <div className="patient-head">
                              <div>
                                <strong>Sedye {bedName}</strong>
                                {patient ? (
                                  <>
                                    <div className="muted" style={{ marginTop: 6 }}>{patient.name} • {patient.complaint}</div>
                                    <div className="row" style={{ marginTop: 8 }}>
                                      <span className={triageBadgeClass(patient.triage)}>{patient.triage}</span>
                                      {patient.waitingConsult ? statusBadge("Konsültasyon") : null}
                                      {patient.waitingTests ? statusBadge("Tetkik") : null}
                                      {patient.waitingAdmission ? statusBadge("Yatış") : null}
                                    </div>
                                  </>
                                ) : (
                                  <div className="muted" style={{ marginTop: 6 }}>Boş sedye</div>
                                )}
                              </div>
                              {patient ? (
                                <div className="toolbar-actions">
                                  <button className="btn small" onClick={() => mobilizePatient(patient)}><MoveRight size={14} /> Mobilize Et</button>
                                  <button className="btn small" onClick={() => openTransferDialog(patient)}><ArrowRightLeft size={14} /> Oda Değiştir</button>
                                  <button className="btn primary small" onClick={() => dischargePatient(patient)}>Taburcu</button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header"><h2 className="card-title">Taburcu Olan Hasta Listesi</h2></div>
              <div className="card-body">
                <div className="scroll-panel">
                  <div className="stack">
                    {discharged.length === 0 ? <div className="card patient-card muted">Henüz taburcu kayıt yok.</div> : discharged.map((item) => (
                      <button key={item.id} className="card patient-card" style={{ textAlign: "left" }} onClick={() => setArchiveDetail(item)}>
                        <div className="patient-head">
                          <div>
                            <strong>{item.name}</strong>
                            <div className="muted" style={{ marginTop: 6 }}>Ön tanı/şikayet: {item.diagnosis}</div>
                            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                              {item.room === "A" ? "Ayaktan Takip" : item.room === "M" ? "Mobilize Hastalar" : `Oda ${item.room}`}
                              {item.bed ? ` • Sedye ${item.bed}` : ""} • {item.time}
                            </div>
                            <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>Arşiv zamanı: {item.archiveTime}</div>
                            <div style={{ marginTop: 4, fontSize: 14 }}>Son not: {item.finalNote}</div>
                          </div>
                          <span className="badge badge-secondary">Taburcu</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={showAddModal} title={selectedRoom === "M" ? "Mobilize Hastalar için yeni hasta" : selectedRoom === "A" ? "Ayaktan Takip için yeni hasta" : `Oda ${selectedRoom} için yeni hasta`} onClose={() => setShowAddModal(false)}>
        <input className="input" placeholder="Hasta adı" value={newPatient.name} onChange={(e) => setNewPatient((prev) => ({ ...prev, name: e.target.value }))} />
        <input className="input" placeholder="Başvuru şikayeti" value={newPatient.complaint} onChange={(e) => setNewPatient((prev) => ({ ...prev, complaint: e.target.value }))} />
        {!isFlexibleArea ? (
          <select className="select" value={newPatient.bed || "Sol"} onChange={(e) => setNewPatient((prev) => ({ ...prev, bed: e.target.value as BedName }))}>
            {(bedOptionsByRoom[selectedRoom as number] || ["Sol"]).map((bed) => <option key={String(bed)} value={String(bed)}>{bed}</option>)}
          </select>
        ) : null}
        <div className="icon-btns">
          <button className="btn small" style={{ background: "#dc2626", color: "white", borderColor: "#dc2626" }} onClick={() => setNewPatient((prev) => ({ ...prev, triage: "Kırmızı" }))}>Kırmızı</button>
          <button className="btn small" style={{ background: "#facc15", color: "black", borderColor: "#facc15" }} onClick={() => setNewPatient((prev) => ({ ...prev, triage: "Sarı" }))}>Sarı</button>
          <button className="btn small" style={{ background: "#16a34a", color: "white", borderColor: "#16a34a" }} onClick={() => setNewPatient((prev) => ({ ...prev, triage: "Yeşil" }))}>Yeşil</button>
        </div>
        <input className="input" placeholder="Sorumlu doktor" value={newPatient.doctor} onChange={(e) => setNewPatient((prev) => ({ ...prev, doctor: e.target.value }))} />
        <input className="input" placeholder="Kısa plan" value={newPatient.plan} onChange={(e) => setNewPatient((prev) => ({ ...prev, plan: e.target.value }))} />
        <textarea className="textarea" placeholder="Kısa not" value={newPatient.note} onChange={(e) => setNewPatient((prev) => ({ ...prev, note: e.target.value }))} />
        <div className="icon-btns">
          <button className={`btn small ${newPatient.waitingConsult ? "primary" : ""}`} onClick={() => setNewPatient((prev) => ({ ...prev, waitingConsult: !prev.waitingConsult }))}>Konsültasyon bekliyor</button>
          <button className={`btn small ${newPatient.waitingTests ? "primary" : ""}`} onClick={() => setNewPatient((prev) => ({ ...prev, waitingTests: !prev.waitingTests }))}>Tetkik bekliyor</button>
          <button className={`btn small ${newPatient.waitingAdmission ? "primary" : ""}`} onClick={() => setNewPatient((prev) => ({ ...prev, waitingAdmission: !prev.waitingAdmission }))}>Yatış bekliyor</button>
        </div>
        <button className="btn primary" onClick={addPatient}>Kaydet</button>
      </Modal>

      <Modal open={transfer.open} title="Hasta Yer Değiştir" onClose={() => setTransfer((prev) => ({ ...prev, open: false }))}>
        <div className="muted">Hedef sedye doluysa, sedyedeki hasta ile yer değiştirilecektir.</div>
        <select className="select" value={transfer.targetRoom} onChange={(e) => {
          const room = e.target.value;
          setTransfer((prev) => ({ ...prev, targetRoom: room, targetBed: bedOptionsByRoom[Number(room)]?.[0] || "Sol" }));
        }}>
          {roomConfig.filter((room) => typeof room.id === "number").map((room) => <option key={String(room.id)} value={String(room.id)}>Oda {room.id}</option>)}
        </select>
        <select className="select" value={transfer.targetBed || "Sol"} onChange={(e) => setTransfer((prev) => ({ ...prev, targetBed: e.target.value as BedName }))}>
          {(bedOptionsByRoom[Number(transfer.targetRoom)] || ["Sol"]).map((bed) => <option key={String(bed)} value={String(bed)}>{bed}</option>)}
        </select>
        <button className="btn primary" onClick={confirmTransfer}>Taşı / Yer Değiştir</button>
      </Modal>

      <Modal open={Boolean(archiveDetail)} title={archiveDetail ? `${archiveDetail.name} - Taburculuk Öncesi Kayıt` : "Detay"} onClose={() => setArchiveDetail(null)}>
        {archiveDetail ? (
          <>
            <div><strong>Alan:</strong> {archiveDetail.room === "A" ? "Ayaktan Takip" : archiveDetail.room === "M" ? "Mobilize Hastalar" : `Oda ${archiveDetail.room}`}</div>
            {archiveDetail.bed ? <div><strong>Sedye:</strong> {archiveDetail.bed}</div> : null}
            <div><strong>Şikayet:</strong> {archiveDetail.snapshot.complaint || archiveDetail.diagnosis}</div>
            <div><strong>Triyaj:</strong> {archiveDetail.snapshot.triage}</div>
            <div><strong>Sorumlu doktor:</strong> {archiveDetail.snapshot.doctor || "-"}</div>
            <div><strong>Plan:</strong> {archiveDetail.snapshot.plan || "-"}</div>
            <div><strong>Not:</strong> {archiveDetail.snapshot.note || "-"}</div>
            {archiveDetail.snapshot.mobilizedFrom ? <div><strong>Mobilize edildiği oda:</strong> {archiveDetail.snapshot.mobilizedFrom}</div> : null}
          </>
        ) : null}
      </Modal>
    </div>
  );
}

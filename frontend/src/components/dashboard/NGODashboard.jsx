import { useState, useEffect } from "react"
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from "firebase/firestore"
import { db } from "../../lib/firebase"

// ── Design tokens ─────────────────────────────────────────────────────────
const C = {
  bg:       "#F7F3EE",
  card:     "#FFFFFF",
  subtle:   "#F0EBE3",
  terra:    "#C1440E",
  ink:      "#1A1208",
  inkMid:   "#3D2C1E",
  inkLight: "#7A6355",
  rule:     "#DDD4C8",
  safe:     "#1D6F42",
  safeBg:   "#E8F5EE",
  warn:     "#92610A",
  warnBg:   "#FEF3DC",
  danger:   "#C1440E",
  dangerBg: "#FDEEE8",
  sky:      "#1A6E94",
  skyBg:    "#E8F4FA",
}

const SEVERITY_META = {
  high:   { label: "High",   color: C.danger, bg: C.dangerBg },
  medium: { label: "Medium", color: C.warn,   bg: C.warnBg   },
  low:    { label: "Low",    color: C.sky,    bg: C.skyBg    },
}

const STATUS_META = {
  open:        { label: "Open",        color: C.danger, bg: C.dangerBg },
  dispatched:  { label: "Dispatched",  color: C.warn,   bg: C.warnBg   },
  resolved:    { label: "Resolved",    color: C.safe,   bg: C.safeBg   },
}

function Badge({ label, color, bg, small }) {
  return (
    <span style={{
      background: bg, color,
      fontSize: small ? 9 : 10, fontWeight: 700,
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: 4, letterSpacing: "0.05em",
      textTransform: "uppercase", fontFamily: "monospace",
      display: "inline-block", whiteSpace: "nowrap",
    }}>{label}</span>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.rule }} />
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: C.card, borderRadius: 10, padding: "14px 16px",
      border: `1px solid ${C.rule}`, flex: 1,
    }}>
      <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "monospace", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || C.ink, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

// ── Report detail panel ───────────────────────────────────────────────────
function ReportPanel({ report, onClose }) {
  const [updating, setUpdating] = useState(false)
  const [note, setNote]         = useState("")

  const updateReport = async (newStatus) => {
    setUpdating(true)
    try {
      await updateDoc(doc(db, "reports", report.docId), {
        status:      newStatus,
        resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
        resolution_note: note || null,
      })
      // Update borehole status too
      if (report.water_point_id) {
        await updateDoc(doc(db, "water_points", report.water_point_id), {
          operation_status: newStatus === "resolved" ? "functional" : "issues",
        })
      }
      setUpdating(false)
      onClose()
    } catch (err) {
      console.error(err)
      setUpdating(false)
    }
  }

  const sm = STATUS_META[report.status]   || STATUS_META.open
  const sv = SEVERITY_META[report.severity] || SEVERITY_META.medium

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(26,18,8,0.5)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: C.card, borderRadius: "16px 16px 0 0",
        padding: "20px 20px 32px", width: "100%",
        maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: C.inkLight, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 4 }}>
              Report {report.id}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>
              {report.problem_type}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: C.subtle, border: "none", borderRadius: 8,
            padding: "6px 14px", fontSize: 12, fontWeight: 700,
            color: C.inkMid, cursor: "pointer", fontFamily: "inherit",
          }}>Close</button>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <Badge label={sm.label} color={sm.color} bg={sm.bg} />
          <Badge label={`${sv.label} severity`} color={sv.color} bg={sv.bg} />
        </div>

        <Divider />

        {/* Details */}
        <div style={{ margin: "14px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { l: "Borehole",   v: report.water_point_name || "—" },
            { l: "Submitted",  v: report.submitted_at ? new Date(report.submitted_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "—" },
            { l: "Channel",    v: report.channel || "web" },
            { l: "Report ID",  v: report.id },
          ].map(s => (
            <div key={s.l} style={{ background: C.subtle, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "monospace", marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, wordBreak: "break-all" }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Resolution note */}
        {report.status !== "resolved" && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 8 }}>
              Resolution Note (optional)
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Repair team dispatched, pump replaced..."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: `1px solid ${C.rule}`, fontSize: 13,
                fontFamily: "inherit", color: C.ink, background: C.subtle,
                resize: "vertical", minHeight: 72, marginBottom: 14,
                boxSizing: "border-box", outline: "none",
              }}
            />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {report.status === "open" && (
                <button onClick={() => updateReport("dispatched")} disabled={updating} style={{
                  flex: 1, padding: "12px 0", background: C.warnBg,
                  border: `1px solid ${C.warn}44`, borderRadius: 8,
                  color: C.warn, fontSize: 13, fontWeight: 700,
                  cursor: updating ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: updating ? 0.7 : 1,
                }}>
                  Dispatch Team
                </button>
              )}
              <button onClick={() => updateReport("resolved")} disabled={updating} style={{
                flex: 1, padding: "12px 0", background: C.safe,
                border: "none", borderRadius: 8,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: updating ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: updating ? 0.7 : 1,
              }}>
                {updating ? "Updating..." : "Mark Resolved"}
              </button>
            </div>
          </>
        )}

        {report.status === "resolved" && (
          <div style={{ background: C.safeBg, borderRadius: 10, padding: "12px 14px", color: C.safe, fontSize: 13, fontWeight: 600 }}>
            Resolved {report.resolved_at ? new Date(report.resolved_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : ""}
            {report.resolution_note && <div style={{ marginTop: 6, fontWeight: 400, color: C.inkMid }}>{report.resolution_note}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Report row ────────────────────────────────────────────────────────────
function ReportRow({ report, onClick }) {
  const sm = STATUS_META[report.status]    || STATUS_META.open
  const sv = SEVERITY_META[report.severity] || SEVERITY_META.medium
  const time = report.submitted_at
    ? new Date(report.submitted_at).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })
    : "—"

  return (
    <div onClick={onClick} style={{
      padding: "12px 16px", cursor: "pointer",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      transition: "background 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = C.subtle}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: sv.color, flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {report.problem_type}
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.inkLight, marginBottom: 5, paddingLeft: 15 }}>
          {report.water_point_name || "Unknown location"} · {time}
        </div>
        <div style={{ paddingLeft: 15 }}>
          <Badge label={sm.label} color={sm.color} bg={sm.bg} small />
        </div>
      </div>
      <div style={{ color: C.inkLight, fontSize: 16, marginLeft: 12, flexShrink: 0 }}>›</div>
    </div>
  )
}

// ── Main NGO Dashboard ────────────────────────────────────────────────────
export default function NGODashboard() {
  const [reports, setReports]         = useState([])
  const [waterPoints, setWaterPoints] = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [filter, setFilter]           = useState("open") // open | dispatched | resolved | all
  const [tab, setTab]                 = useState("reports") // reports | map_status

  // Real-time reports listener
  useEffect(() => {
    const q    = query(collection(db, "reports"), orderBy("submitted_at", "desc"))
    const unsub = onSnapshot(q, snapshot => {
      const data = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }))
      setReports(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Real-time water points listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "water_points"), snapshot => {
      setWaterPoints(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const filtered = filter === "all" ? reports : reports.filter(r => r.status === filter)

  const stats = {
    open:       reports.filter(r => r.status === "open").length,
    dispatched: reports.filter(r => r.status === "dispatched").length,
    resolved:   reports.filter(r => r.status === "resolved").length,
    issues:     waterPoints.filter(p => p.operation_status === "issues" || p.operation_status === "non_functional").length,
  }

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        background: C.ink, padding: "14px 18px 12px",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>
          WaterPath · NGO Dashboard
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
          Turkana County Operations
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: "14px 14px 0", display: "flex", gap: 10, flexShrink: 0 }}>
        <StatCard label="Open Reports"   value={stats.open}       color={C.danger} />
        <StatCard label="Dispatched"     value={stats.dispatched} color={C.warn}   />
        <StatCard label="Resolved"       value={stats.resolved}   color={C.safe}   />
        <StatCard label="Points w/ Issues" value={stats.issues}   color={C.terra}  />
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 0, margin: "14px 14px 0",
        background: C.subtle, borderRadius: 8, padding: 3, flexShrink: 0,
      }}>
        {[
          { id: "reports", label: "Reports" },
          { id: "boreholes", label: "Boreholes" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "7px 0", border: "none", borderRadius: 6,
            background: tab === t.id ? C.card : "transparent",
            color: tab === t.id ? C.ink : C.inkLight,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 20px" }}>

        {/* ── REPORTS TAB ── */}
        {tab === "reports" && (
          <>
            {/* Filter pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { id: "open",       label: `Open (${stats.open})`           },
                { id: "dispatched", label: `Dispatched (${stats.dispatched})` },
                { id: "resolved",   label: `Resolved (${stats.resolved})`   },
                { id: "all",        label: "All"                             },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  padding: "5px 14px", borderRadius: 20, border: "none",
                  background: filter === f.id ? C.ink : C.subtle,
                  color: filter === f.id ? "#fff" : C.inkMid,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  fontFamily: "monospace", letterSpacing: "0.04em",
                  transition: "all 0.15s",
                }}>{f.label}</button>
              ))}
            </div>

            {/* Report list */}
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: C.inkLight, fontSize: 13 }}>
                Loading reports...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: C.inkLight, fontSize: 13 }}>
                No {filter === "all" ? "" : filter} reports
              </div>
            ) : (
              <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.rule}`, overflow: "hidden" }}>
                {filtered.map((report, i) => (
                  <div key={report.docId}>
                    {i > 0 && <Divider />}
                    <ReportRow
                      report={report}
                      onClick={() => setSelectedReport(report)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── BOREHOLES TAB ── */}
        {tab === "boreholes" && (
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.rule}`, overflow: "hidden" }}>
            {waterPoints
              .filter(p => p.operation_status === "issues" || p.operation_status === "non_functional")
              .concat(waterPoints.filter(p => p.operation_status === "functional"))
              .concat(waterPoints.filter(p => !["issues","non_functional","functional"].includes(p.operation_status)))
              .map((pt, i, arr) => {
                const statusMeta = {
                  functional:     { label: "Functional",     color: C.safe,    bg: C.safeBg    },
                  issues:         { label: "Has Issues",     color: C.warn,    bg: C.warnBg    },
                  non_functional: { label: "Non-Functional", color: C.danger,  bg: C.dangerBg  },
                  unknown:        { label: "Status Unknown", color: C.inkLight, bg: C.subtle   },
                }
                const sm = statusMeta[pt.operation_status] || statusMeta.unknown
                return (
                  <div key={pt.id}>
                    {i > 0 && <Divider />}
                    <div style={{ padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{pt.name}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <Badge label={sm.label} color={sm.color} bg={sm.bg} small />
                          <span style={{ fontSize: 10, color: C.inkLight, fontFamily: "monospace" }}>
                            {pt.water_quality} · {pt.locality || "Turkana"}
                          </span>
                        </div>
                      </div>
                      {pt.report_count > 0 && (
                        <div style={{
                          background: C.dangerBg, color: C.danger,
                          fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                          padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                        }}>
                          {pt.report_count} report{pt.report_count > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Report detail panel */}
      {selectedReport && (
        <ReportPanel
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  )
}

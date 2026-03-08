import { useState, useEffect, useRef } from "react"
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from "firebase/firestore"
import { db } from "../../lib/firebase"
import DashboardMap from "./DashboardMap"

// Fonts in index.html:
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=IBM+Plex+Mono:wght@400;500;600&family=Karla:wght@400;500;600;700&display=swap" rel="stylesheet">
// Images in frontend/public/:
//   /turkana-hero.jpg  /turkana-well.jpg  /turkana-river.jpg  /turkana-landscape.jpg

const F = {
  display: "'Playfair Display', Georgia, serif",
  mono:    "'IBM Plex Mono', monospace",
  body:    "'Karla', system-ui, sans-serif",
}

// Palette built from extracted photo light tones
// Hero avg light: #C8AA8B  Well avg light: #DFB38E  Children: #C89D75
// All colours are warm, sandy, light — no dark mode anywhere
const C = {
  // Page backgrounds — light, warm, airy
  page:       "#FBF7F2",   // near-white with warm undertone
  surface:    "#FFFFFF",   // pure white cards
  lifted:     "#F5EDE0",   // slightly warmer — sections between cards

  // Ink — warm browns, never cold greys
  ink:        "#2C1A0E",   // deep warm brown (not black)
  inkMid:     "#6B4A30",   // mid body text
  inkLight:   "#9E7A5A",   // labels, captions
  inkFaint:   "#C4A882",   // very light — dividers, placeholders

  // Structure
  rule:       "#EAE0D0",
  sand:       "#EDE3D4",   // tag backgrounds, inactive pills

  // Accent — sun-warm, pulled from photo pigments, all light enough for white text and dark backgrounds
  rust:       "#C0522A",   // terracotta clothing — primary alert/urgent
  rustBg:     "#FAEAE3",
  amber:      "#C48A2A",   // jerrican yellow — dispatched / secondary
  amberBg:    "#FDF4E0",
  sage:       "#5A7A40",   // doum palm olive — resolved / positive
  sageBg:     "#EAF2E0",
  slate:      "#3A6070",   // calm water — informational
  slateBg:    "#E4EFF4",
}

// ── Animated counter ──────────────────────────────────────────────────────
function useCountUp(target, duration = 1600) {
  const [v, setV] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    if (target === prev.current) return
    const start = prev.current, diff = target - start
    let i = 0
    const t = setInterval(() => {
      i++
      setV(Math.round(start + diff * (1 - Math.pow(1 - i/60, 3))))
      if (i >= 60) { clearInterval(t); prev.current = target }
    }, duration / 60)
    return () => clearInterval(t)
  }, [target, duration])
  return v
}

// ── Narrative ─────────────────────────────────────────────────────────────
function narrative(reports, waterPoints) {
  const open    = reports.filter(r => r.status === "open")
  const broken  = waterPoints.filter(p => p.operation_status === "non_functional")
  const issues  = waterPoints.filter(p => p.operation_status === "issues")
  const urgent  = open.filter(r => r.severity === "high")
  if (!open.length && !broken.length)
    return { line: "All boreholes are reporting normally.", sub: "No open reports right now.", accent: C.sage }
  if (urgent.length)
    return { line: `${urgent.length} critical report${urgent.length > 1 ? "s" : ""} need immediate response.`, sub: `Most urgent: ${urgent[0].problem_type} at ${urgent[0].water_point_name || "unknown"}.`, accent: C.rust }
  if (broken.length)
    return { line: `${broken.length} borehole${broken.length > 1 ? "s" : ""} confirmed non-functional.`, sub: `${issues.length} more with active issues. ${open.length} reports open.`, accent: C.amber }
  return { line: `${open.length} report${open.length > 1 ? "s" : ""} open across Turkana County.`, sub: `${issues.length} boreholes flagged with issues.`, accent: C.amber }
}

// ── Tiny pill ─────────────────────────────────────────────────────────────
function Pill({ label, color, bg }) {
  return (
    <span style={{
      background: bg, color, fontSize: 9, fontWeight: 600,
      padding: "3px 10px", borderRadius: 2, textTransform: "uppercase",
      letterSpacing: "0.12em", fontFamily: F.mono, display: "inline-block", whiteSpace: "nowrap",
    }}>{label}</span>
  )
}

const S_META = {
  open:       { label: "Open",       color: C.rust,  bg: C.rustBg  },
  dispatched: { label: "Dispatched", color: C.amber, bg: C.amberBg },
  resolved:   { label: "Resolved",   color: C.sage,  bg: C.sageBg  },
}
const SEV = {
  high:   { label: "High",   color: C.rust  },
  medium: { label: "Medium", color: C.amber },
  low:    { label: "Low",    color: C.slate },
}

// ── Donut ─────────────────────────────────────────────────────────────────
function Donut({ value, total, color, label, sublabel, size = 90, stroke = 9 }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r
  const dash = total > 0 ? (value / total) * circ : 0
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.sand} strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color }}>{value}</span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
        {sublabel && <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  )
}

// ── Report sheet ──────────────────────────────────────────────────────────
function Sheet({ report, onClose }) {
  const [saving, setSaving] = useState(false)
  const [note, setNote]     = useState("")
  const sm = S_META[report.status] || S_META.open
  const sv = SEV[report.severity]  || SEV.medium

  const save = async (status) => {
    setSaving(true)
    try {
      await updateDoc(doc(db, "reports", report.docId), { status, resolved_at: status === "resolved" ? new Date().toISOString() : null, resolution_note: note || null })
      if (report.water_point_id) await updateDoc(doc(db, "water_points", report.water_point_id), { operation_status: status === "resolved" ? "functional" : "issues" })
      setSaving(false); onClose()
    } catch (e) { console.error(e); setSaving(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(44,26,14,0.35)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: "20px 20px 0 0", borderTop: `4px solid ${sm.color}`, padding: "28px 24px 48px", boxShadow: "0 -12px 56px rgba(0,0,0,0.10)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>{report.id}</div>
            <div style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{report.problem_type}</div>
          </div>
          <button onClick={onClose} style={{ background: C.sand, border: "none", borderRadius: 8, padding: "8px 16px", fontFamily: F.mono, fontSize: 10, color: C.inkLight, cursor: "pointer" }}>Close</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          <Pill label={sm.label} color={sm.color} bg={sm.bg} />
          <Pill label={`${sv.label} severity`} color={sv.color} bg={`${sv.color}15`} />
          {report.channel && <Pill label={report.channel} color={C.slate} bg={C.slateBg} />}
        </div>
        <div style={{ height: 1, background: C.rule, marginBottom: 22 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          {[
            { l: "Borehole",  v: report.water_point_name || "—" },
            { l: "Submitted", v: report.submitted_at ? new Date(report.submitted_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "—" },
            { l: "Channel",   v: report.channel || "web" },
            { l: "Report ID", v: report.id },
          ].map(s => (
            <div key={s.l} style={{ background: C.lifted, borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.ink, wordBreak: "break-all" }}>{s.v}</div>
            </div>
          ))}
        </div>
        {report.status !== "resolved" ? (
          <>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note…"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.rule}`, fontSize: 14, fontFamily: F.body, color: C.ink, background: C.lifted, resize: "vertical", minHeight: 80, marginBottom: 14, boxSizing: "border-box", outline: "none", lineHeight: 1.6 }} />
            <div style={{ display: "flex", gap: 10 }}>
              {report.status === "open" && (
                <button onClick={() => save("dispatched")} disabled={saving} style={{ flex: 1, padding: "14px 0", background: C.amberBg, border: `1px solid ${C.amber}55`, borderRadius: 10, color: C.amber, fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                  Dispatch Team
                </button>
              )}
              <button onClick={() => save("resolved")} disabled={saving} style={{ flex: 1, padding: "14px 0", background: C.sage, border: "none", borderRadius: 10, color: "#fff", fontFamily: F.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
                {saving ? "Saving…" : "Mark Resolved"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ background: C.sageBg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.sage, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>Resolved</div>
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink }}>{report.resolved_at ? new Date(report.resolved_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : ""}</div>
            {report.resolution_note && <div style={{ marginTop: 8, fontFamily: F.body, fontSize: 13, color: C.inkLight }}>{report.resolution_note}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// DISPATCH
// Women carrying jerricans — full bleed hero, narrative in the photo
// Below: affected count, donuts, report list — all on warm white
// ══════════════════════════════════════════════════════════════════════════
function Dispatch({ reports, waterPoints, onSelect }) {
  const [filter, setFilter] = useState("open")
  const stats = {
    open: reports.filter(r => r.status === "open").length,
    dispatched: reports.filter(r => r.status === "dispatched").length,
    resolved: reports.filter(r => r.status === "resolved").length,
    total: reports.length,
  }
  const broken  = waterPoints.filter(p => p.operation_status === "non_functional").length
  const issues  = waterPoints.filter(p => p.operation_status === "issues").length
  const n       = narrative(reports, waterPoints)
  const aOpen   = useCountUp(stats.open)
  const aDisp   = useCountUp(stats.dispatched)
  const aRes    = useCountUp(stats.resolved)
  const aAff    = useCountUp((broken + issues) * 420)
  const list    = filter === "all" ? reports : reports.filter(r => r.status === filter)

  return (
    <div>
      {/* Full-bleed hero — photo owns this space */}
      <div style={{ position: "relative", height: 320, overflow: "hidden" }}>
        <img src="/turkana-hero.jpg" alt="Turkana women carrying water"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 38%" }} />
        {/* Gradient is warm, not black — matches the golden-hour tones of the photo */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(210,155,90,0.0) 25%, rgba(50,25,10,0.72) 85%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFE082", display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: F.mono, fontSize: 9, color: "#FFE082", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Live · {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          <div style={{ fontFamily: F.display, fontSize: 23, fontWeight: 700, color: "#fff", lineHeight: 1.35, fontStyle: "italic", marginBottom: 8 }}>
            "{n.line}"
          </div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.6 }}>{n.sub}</div>
        </div>
      </div>

      {/* Affected count — warm white, large number */}
      <div style={{ background: C.surface, padding: "26px 24px 28px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.rust, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
          People without reliable water today
        </div>
        <div style={{ fontFamily: F.display, fontSize: 58, fontWeight: 900, color: C.rust, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {aAff.toLocaleString()}
        </div>
        <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkLight, marginTop: 10, lineHeight: 1.7, maxWidth: 280 }}>
          Estimated from {broken + issues} boreholes with confirmed faults — at 420 people per borehole.
        </div>
      </div>

      {/* Donuts — lifted background to create visual zone separation */}
      <div style={{ background: C.lifted, padding: "28px 24px 32px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 26 }}>
          Report Status
        </div>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <Donut value={aOpen} total={stats.total || 1} color={C.rust}  label="Open"       sublabel="reports"  />
          <Donut value={aDisp} total={stats.total || 1} color={C.amber} label="Dispatched" sublabel="in field" />
          <Donut value={aRes}  total={stats.total || 1} color={C.sage}  label="Resolved"   sublabel="closed"   />
        </div>
      </div>

      {/* Report list */}
      <div style={{ background: C.lifted }}>
        <div style={{ padding: "20px 24px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "open",       label: `Open · ${stats.open}`             },
            { id: "dispatched", label: `Dispatched · ${stats.dispatched}` },
            { id: "resolved",   label: `Resolved · ${stats.resolved}`     },
            { id: "all",        label: "All"                               },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "7px 16px", borderRadius: 20, border: "none",
              background: filter === f.id ? C.ink : C.sand,
              color: filter === f.id ? "#fff" : C.inkMid,
              fontFamily: F.mono, fontSize: 9, letterSpacing: "0.08em",
              textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
            }}>{f.label}</button>
          ))}
        </div>
        {list.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: F.display, fontSize: 64, color: C.sand, lineHeight: 1, marginBottom: 12 }}>—</div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint, letterSpacing: "0.12em", textTransform: "uppercase" }}>No {filter} reports</div>
          </div>
        ) : (
          <div style={{ background: C.surface, borderTop: `1px solid ${C.rule}`, marginTop: 4 }}>
            {list.map((r, i) => {
              const sm = S_META[r.status] || S_META.open
              const sv = SEV[r.severity]  || SEV.medium
              const urgent = r.status === "open" && r.severity === "high"
              const time = r.submitted_at ? new Date(r.submitted_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"
              return (
                <div key={r.docId}>
                  {i > 0 && <div style={{ height: 1, background: C.rule }} />}
                  <div onClick={() => onSelect(r)}
                    style={{ padding: "19px 24px", cursor: "pointer", borderLeft: `4px solid ${urgent ? C.rust : "transparent"}`, display: "flex", gap: 16, alignItems: "flex-start", background: C.surface, transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.lifted}
                    onMouseLeave={e => e.currentTarget.style.background = C.surface}>
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: C.inkFaint, paddingTop: 3, minWidth: 26, flexShrink: 0 }}>{String(i+1).padStart(2,"0")}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 700, color: C.ink }}>{r.problem_type}</div>
                        <Pill label={sm.label} color={sm.color} bg={sm.bg} />
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint, marginBottom: 8 }}>{r.water_point_name || "Unknown borehole"} · {time}</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sv.color, display: "inline-block" }} />
                        <span style={{ fontFamily: F.mono, fontSize: 9, color: sv.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{sv.label} severity</span>
                        {r.channel === "ussd" && <span style={{ fontFamily: F.mono, fontSize: 9, color: C.slate, letterSpacing: "0.08em" }}>· Feature phone</span>}
                      </div>
                    </div>
                    <div style={{ color: C.inkFaint, fontSize: 18, flexShrink: 0, paddingTop: 2 }}>›</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// BOREHOLES
// Well photo is the hero background — stat numbers float over it.
// The warm sandy overlay keeps the numbers readable without going dark.
// Grouped list below on warm white.
// ══════════════════════════════════════════════════════════════════════════
function Boreholes({ waterPoints }) {
  const functional = waterPoints.filter(p => p.operation_status === "functional")
  const issues     = waterPoints.filter(p => p.operation_status === "issues")
  const broken     = waterPoints.filter(p => p.operation_status === "non_functional")
  const unknown    = waterPoints.filter(p => !["functional","issues","non_functional"].includes(p.operation_status))
  const aF = useCountUp(functional.length)
  const aI = useCountUp(issues.length)
  const aB = useCountUp(broken.length)

  const groups = [
    { label: "Non-Functional", points: broken,     color: C.rust,  bg: C.rustBg,   border: `${C.rust}25`  },
    { label: "Has Issues",     points: issues,     color: C.amber, bg: C.amberBg,  border: `${C.amber}25` },
    { label: "Functional",     points: functional, color: C.sage,  bg: C.sageBg,   border: `${C.sage}25`  },
    { label: "Unknown",        points: unknown,    color: C.inkLight, bg: C.lifted, border: C.rule         },
  ].filter(g => g.points.length > 0)

  return (
    <div>
      {/* Well photo — warm sandy overlay, not dark */}
      <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
        <img src="/turkana-well.jpg" alt="Woman drawing water from a well"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%" }} />
        {/* Sandy warm overlay — stays in the photo's own colour register */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(200,155,90,0.25) 0%, rgba(60,30,10,0.62) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 24px 26px" }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 18 }}>
            {waterPoints.length} boreholes monitored · Turkana County
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { v: aF, label: "Functional",    color: "#A8E6B8" },
              { v: aI, label: "Has Issues",    color: "#F5D080" },
              { v: aB, label: "Non-Functional",color: "#F0A090" },
            ].map((s, i) => (
              <div key={s.label} style={{ textAlign: "center", padding: "0 8px 0", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
                <div style={{ fontFamily: F.display, fontSize: 52, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.v}</div>
                <div style={{ fontFamily: F.mono, fontSize: 8, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 7, lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped list */}
      <div style={{ background: C.lifted }}>
        {groups.map(group => (
          <div key={group.label}>
            <div style={{ padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, background: group.bg, borderTop: `1px solid ${group.border}`, borderBottom: `1px solid ${group.border}` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: group.color, display: "inline-block" }} />
              <span style={{ fontFamily: F.mono, fontSize: 9, color: group.color, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>{group.label}</span>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: group.color, opacity: 0.45, marginLeft: "auto" }}>{group.points.length}</span>
            </div>
            {group.points.map((pt, i) => (
              <div key={pt.id}>
                {i > 0 && <div style={{ height: 1, background: C.rule }} />}
                <div style={{ padding: "15px 24px", background: C.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{pt.name}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint }}>
                      {pt.water_quality} · {pt.locality || "Turkana"}{pt.ec ? ` · EC ${pt.ec.toLocaleString()} µS/cm` : ""}
                    </div>
                  </div>
                  {pt.report_count > 0 && (
                    <div style={{ background: C.rustBg, color: C.rust, fontFamily: F.mono, fontSize: 10, fontWeight: 600, padding: "4px 12px", borderRadius: 20, flexShrink: 0, marginLeft: 14 }}>
                      {pt.report_count} report{pt.report_count > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// MAP
// Landscape photo fades downward into the map — no hard edge.
// Photo and map share the same space; the fade is the transition.
// ══════════════════════════════════════════════════════════════════════════
function MapWorld() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <DashboardMap />
      </div>
      {/* Photo fades into the map from the top — bottom edge is fully transparent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 110, pointerEvents: "none", zIndex: 10, overflow: "hidden" }}>
        <img src="/turkana-landscape.jpg" alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 58%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(172,128,100,0.55) 0%, rgba(255,255,255,0) 100%)" }} />
        <div style={{ position: "absolute", top: 14, left: 24 }}>
          <div style={{ fontFamily: F.mono, fontSize: 8, color: "rgba(255,255,255,0.7)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Operational map</div>
          <div style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: "#fff", fontStyle: "italic", marginTop: 2 }}>Turkana County</div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SITING
// River photo as hero. Then plain-language summary. Then expandable site cards.
// ══════════════════════════════════════════════════════════════════════════
function Siting() {
  const [sites, setSites]     = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(null)

  useEffect(() => {
    fetch("/api/desalination/sites")
      .then(r => r.json())
      .then(d => { setSites(d.sites || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* River photo — full bleed hero */}
      <div style={{ position: "relative", height: 270, overflow: "hidden" }}>
        <img src="/turkana-river.jpg" alt="Community collecting water from a river"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 32%" }} />
        {/* Cooler gradient — matches the river's grey-green palette */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(100,130,120,0.15) 20%, rgba(30,40,45,0.72) 88%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 24px 26px" }}>
          <div style={{ fontFamily: F.display, fontSize: 21, fontWeight: 700, color: "#fff", lineHeight: 1.4, fontStyle: "italic", marginBottom: 8 }}>
            "Without clean infrastructure,<br />this river is their only option."
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
            ML-identified desalination sites · Turkana County
          </div>
        </div>
      </div>

      {/* 3-number summary — warm slate, light not dark */}
      <div style={{ background: C.slate, padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {[
          { label: "Optimal sites",    v: "8"       },
          { label: "Total investment", v: "$680k"   },
          { label: "Avg. breakeven",   v: "2.2 yrs" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontFamily: F.mono, fontSize: 8, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 7 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Plain-language explainer */}
      <div style={{ background: C.slateBg, padding: "18px 24px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.slate, lineHeight: 1.8 }}>
          Our model clusters saline boreholes — too salty to drink — and identifies where a single
          desalination unit can serve the most people. Each unit costs <strong>$85,000</strong>,
          treats water at <strong>$0.82/m³</strong>, and pays for itself in <strong>2.2 years</strong> by replacing water trucking.
        </div>
      </div>

      {/* Site cards */}
      <div style={{ background: C.lifted, padding: "18px 16px 60px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 14, paddingLeft: 8 }}>
          Ranked by people served
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, fontFamily: F.mono, fontSize: 11, color: C.inkFaint }}>Loading sites…</div>
        ) : sites.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, fontFamily: F.mono, fontSize: 11, color: C.inkFaint }}>No sites returned from API.</div>
        ) : (
          sites.map((site, i) => {
            const isOpen   = open === i
            const served   = (site.people_served || 8482).toLocaleString()
            const cost     = (site.unit_cost_usd || 85000).toLocaleString()
            const breakeven = site.breakeven_years || 2.2
            const count    = site.boreholes_count || site.borehole_count || "?"
            const ec       = Math.round(site.avg_ec || 2000).toLocaleString()

            return (
              <div key={i} style={{ background: C.surface, borderRadius: 14, marginBottom: 10, overflow: "hidden", border: `1px solid ${C.rule}`, boxShadow: isOpen ? "0 4px 20px rgba(44,26,14,0.07)" : "none" }}>
                {/* Always-visible header */}
                <div onClick={() => setOpen(isOpen ? null : i)} style={{ padding: "18px 20px", cursor: "pointer", display: "flex", gap: 14, alignItems: "center" }}>
                  {/* Number badge */}
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.lifted, border: `2px solid ${C.rule}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.inkMid, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                      {count} saline boreholes — EC avg {ec} µS/cm
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint }}>
                      {Number(site.center_lat || site.lat || 0).toFixed(4)}°N, {Number(site.center_lon || site.lon || 0).toFixed(4)}°E
                    </div>
                  </div>
                  {/* People served */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.sage, lineHeight: 1 }}>{served}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>people</div>
                  </div>
                  <div style={{ color: C.inkFaint, fontSize: 18, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>›</div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.rule}`, padding: "18px 20px 20px", background: C.lifted }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                      {[
                        { l: "Unit cost",       v: `$${cost}`            },
                        { l: "Breakeven",       v: `${breakeven} years`  },
                        { l: "Water cost",      v: "$0.82 / m³"          },
                        { l: "Avg salinity",    v: `${ec} µS/cm`         },
                        { l: "Service radius",  v: "15 km"               },
                        { l: "Boreholes",       v: `${count} treated`    },
                      ].map(s => (
                        <div key={s.l} style={{ background: C.surface, borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{s.l}</div>
                          <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.ink }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: C.sageBg, borderRadius: 8, padding: "13px 15px" }}>
                      <div style={{ fontFamily: F.body, fontSize: 12, color: C.sage, lineHeight: 1.8 }}>
                        <strong>Why here?</strong>&nbsp;
                        Placing one unit at this location converts {count} otherwise unusable saline boreholes,
                        delivering safe water to {served} people within 15km.
                        At $0.82/m³ it undercuts water trucking, recovering the ${cost} cost in {breakeven} years.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function NGODashboard() {
  const [reports, setReports]     = useState([])
  const [wps, setWps]             = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [tab, setTab]             = useState("dispatch")

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("submitted_at", "desc"))
    return onSnapshot(q, s => { setReports(s.docs.map(d => ({ docId: d.id, ...d.data() }))); setLoading(false) })
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, "water_points"), s => setWps(s.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const TABS = [
    { id: "dispatch",  label: "Dispatch"  },
    { id: "boreholes", label: "Boreholes" },
    { id: "map",       label: "Map"       },
    { id: "siting",    label: "Siting"    },
  ]

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.page, fontFamily: F.body, overflow: "hidden" }}>

      {/* Top bar — warm white, not grey */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.rule}`, padding: "14px 24px 0", flexShrink: 0, boxShadow: "0 1px 12px rgba(44,26,14,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 3 }}>WaterPath · NGO Operations</div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.ink, lineHeight: 1 }}>Turkana County</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.sage, display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.sage, letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 4px 9px", border: "none", background: "transparent",
              borderBottom: tab === t.id ? `2px solid ${C.rust}` : "2px solid transparent",
              color: tab === t.id ? C.ink : C.inkLight,
              fontFamily: F.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
              fontWeight: tab === t.id ? 600 : 400,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: tab === "map" ? "hidden" : "auto" }}>
        {loading && tab === "dispatch" ? (
          <div style={{ padding: 64, textAlign: "center", fontFamily: F.mono, fontSize: 11, color: C.inkFaint, letterSpacing: "0.12em" }}>Loading…</div>
        ) : (
          <>
            {tab === "dispatch"  && <Dispatch  reports={reports} waterPoints={wps} onSelect={setSelected} />}
            {tab === "boreholes" && <Boreholes waterPoints={wps} />}
            {tab === "map"       && <div style={{ height: "calc(100vh - 116px)" }}><MapWorld /></div>}
            {tab === "siting"    && <Siting />}
          </>
        )}
      </div>

      {selected && <Sheet report={selected} onClose={() => setSelected(null)} />}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  )
}

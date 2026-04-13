import { useState, useEffect } from "react"
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet"
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { getSafetyLevel, getFlowSignal, getSaltSignal, getWalkTime } from "../../utils/waterInterpretation"

// ── Colour maps ────────────────────────────────────────────────────────────
// Marker colour is driven by ML prediction_label (or water_quality fallback),
// NOT just operation_status, so the map reflects actual water safety.
const SAFETY_MARKER = {
  safe:    { fill: "#1D6F42", stroke: "#155233" },
  caution: { fill: "#C48A2A", stroke: "#8C5C10" },
  unsafe:  { fill: "#C1440E", stroke: "#8C2F07" },
  unknown: { fill: "#6B7280", stroke: "#4B5563" },
}

const STATUS_STYLE = {
  functional:     { fill: "#1D6F42", stroke: "#155233", label: "Functional"     },
  issues:         { fill: "#C48A2A", stroke: "#8C5C10", label: "Has issues"     },
  non_functional: { fill: "#C1440E", stroke: "#8C2F07", label: "Not working"    },
  unknown:        { fill: "#6B7280", stroke: "#4B5563", label: "Unknown"        },
}

const C = {
  bg:       "#F7F3EE",
  card:     "#FFFFFF",
  subtle:   "#F0EBE3",
  ink:      "#1A1208",
  inkMid:   "#3D2C1E",
  inkLight: "#7A6355",
  inkFaint: "#B09880",
  rule:     "#DDD4C8",
  sage:     "#1D6F42",
  sageBg:   "#E8F5EE",
  amber:    "#C48A2A",
  amberBg:  "#FDF4E0",
  rust:     "#C1440E",
  rustBg:   "#FDEEE8",
}

const F = {
  display: "'Playfair Display', Georgia, serif",
  mono:    "'IBM Plex Mono', monospace",
  body:    "'Karla', system-ui, sans-serif",
}

// ── Marker radius: larger when more reports filed ──────────────────────────
function getMarkerRadius(point) {
  return Math.min(8 + (point.report_count || 0) * 2, 20)
}

// ── Resolve point colour from ML prediction (priority) or quality ──────────
function markerColour(point) {
  const s = getSafetyLevel(point)
  return SAFETY_MARKER[s.level] || SAFETY_MARKER.unknown
}

// ── Fly to selected point ──────────────────────────────────────────────────
function FlyToPoint({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point?.latitude && point?.longitude) {
      map.flyTo([point.latitude, point.longitude], 13, { duration: 1.0 })
    }
  }, [point, map])
  return null
}

// ── RESOLVE PANEL (dashboard side panel shown on marker click) ─────────────
function ResolvePanel({ point, onClose, onResolved }) {
  const [updating, setUpdating] = useState(false)

  const safety = getSafetyLevel(point)
  const flow   = getFlowSignal(point.yield_ls)
  const salt   = getSaltSignal(point.ec)
  const mlConf = point.prediction_confidence
    ? Math.round(point.prediction_confidence * 100)
    : null

  const sm = STATUS_STYLE[point.operation_status] || STATUS_STYLE.unknown

  const updateStatus = async newStatus => {
    setUpdating(true)
    try {
      await updateDoc(doc(db, "water_points", point.id), {
        operation_status: newStatus,
      })
      onResolved()
      onClose()
    } catch (err) {
      console.error("Status update failed:", err)
    }
    setUpdating(false)
  }

  const handleDirections = () => {
    if (!point.latitude || !point.longitude) return
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`,
      "_blank"
    )
  }

  const flowStyle = flow.label === "Good flow"
    ? { color: C.sage,  bg: C.sageBg  }
    : flow.label === "Very low"
    ? { color: C.rust,  bg: C.rustBg  }
    : { color: C.amber, bg: C.amberBg }

  const saltStyle = salt.label === "Fresh"
    ? { color: C.sage,  bg: C.sageBg  }
    : salt.label === "Very salty"
    ? { color: C.rust,  bg: C.rustBg  }
    : { color: C.amber, bg: C.amberBg }

  return (
    <div style={{
      position: "absolute",
      bottom: 16, left: 16, right: 16,
      zIndex: 1000,
      background: C.card,
      borderRadius: 16,
      border: `0.5px solid ${C.rule}`,
      borderTop: `4px solid ${safety.color}`,
      boxShadow: "0 4px 32px rgba(0,0,0,0.13)",
      maxHeight: "70vh",
      overflowY: "auto",
    }}>
      <div style={{ padding: "18px 18px 0" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>
              {point.locality || "Turkana County"}
            </div>
            <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
              {point.name}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: C.subtle, border: "none", borderRadius: 8,
            padding: "6px 12px", fontSize: 11, fontWeight: 700,
            color: C.inkMid, cursor: "pointer", fontFamily: F.mono,
            flexShrink: 0,
          }}>✕</button>
        </div>

        {/* ML safety banner */}
        <div style={{ background: safety.bg, border: `0.5px solid ${safety.color}33`, borderRadius: 10, padding: "12px 14px", margin: "14px 0 10px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          {/* Water drop icon */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M16 4 C12 9 7 13 7 19 a9 9 0 0 0 18 0 C25 13 20 9 16 4Z" fill={safety.color} opacity="0.8"/>
            {safety.level === "safe" && (
              <path d="M11 19 L14.5 22.5 L22 15" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            )}
            {safety.level === "caution" && (
              <>
                <line x1="16" y1="14" x2="16" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="16" cy="23" r="1.2" fill="white"/>
              </>
            )}
            {safety.level === "unsafe" && (
              <path d="M12 15 L20 23 M20 15 L12 23" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            )}
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: safety.color, marginBottom: 2 }}>{safety.headline}</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkMid, lineHeight: 1.5 }}>{safety.body}</div>
            {mlConf && (
              <>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, marginTop: 5 }}>AI confidence · {mlConf}%</div>
                <div style={{ height: 3, background: C.subtle, borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: 3, width: `${mlConf}%`, background: safety.color, borderRadius: 2 }} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Operation status badge */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{
            background: sm.fill + "22", color: sm.fill,
            fontFamily: F.mono, fontSize: 9, fontWeight: 700,
            padding: "3px 10px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.1em",
          }}>{sm.label}</span>
          {point.report_count > 0 && (
            <span style={{
              background: C.rustBg, color: C.rust,
              fontFamily: F.mono, fontSize: 9, fontWeight: 700,
              padding: "3px 10px", borderRadius: 4,
            }}>{point.report_count} report{point.report_count > 1 ? "s" : ""}</span>
          )}
          {point.last_problem_type && (
            <span style={{
              background: C.subtle, color: C.inkLight,
              fontFamily: F.mono, fontSize: 9,
              padding: "3px 10px", borderRadius: 4,
            }}>Last: {point.last_problem_type.toLowerCase()}</span>
          )}
        </div>

        {/* Signal pills */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ background: flowStyle.bg, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: flowStyle.color }}>{flow.label}</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.inkLight, marginTop: 1 }}>{flow.sub}</div>
          </div>
          <div style={{ background: saltStyle.bg, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: saltStyle.color }}>{salt.label}</div>
            <div style={{ fontFamily: F.body, fontSize: 11, color: C.inkLight, marginTop: 1 }}>{salt.sub}</div>
          </div>
        </div>

        {/* Technical data grid — for NGO dashboard users */}
        {(point.ec || point.ph || point.well_depth || point.yield_ls) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              point.ec        && { label: "EC",         value: `${point.ec.toLocaleString()} µS/cm` },
              point.ph        && { label: "pH",         value: String(point.ph)                      },
              point.well_depth && { label: "Depth",     value: `${point.well_depth} m`               },
              point.yield_ls  && { label: "Yield",      value: `${point.yield_ls} L/s`               },
            ].filter(Boolean).map(r => (
              <div key={r.label} style={{ background: C.subtle, borderRadius: 8, padding: "9px 11px" }}>
                <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.ink }}>{r.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Directions */}
        <button onClick={handleDirections} style={{
          width: "100%", padding: "12px 0", marginBottom: 14,
          background: C.ink, border: "none", borderRadius: 10,
          color: "#FFE082", fontFamily: F.mono, fontSize: 10, fontWeight: 600,
          letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#FFE082" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1 7 L13 7 M8 2 L13 7 L8 12"/>
          </svg>
          Get directions
        </button>
      </div>

      {/* Status update section */}
      <div style={{ borderTop: `1px solid ${C.rule}`, padding: "14px 18px 18px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Update status
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { status: "functional",     label: "Working",    color: C.sage,  bg: C.sageBg  },
            { status: "issues",         label: "Has issues", color: C.amber, bg: C.amberBg },
            { status: "non_functional", label: "Broken",     color: C.rust,  bg: C.rustBg  },
          ].map(({ status, label, color, bg }) => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              disabled={updating || point.operation_status === status}
              style={{
                padding: "10px 4px", border: "none", borderRadius: 8, cursor: "pointer",
                background: point.operation_status === status ? bg : C.subtle,
                color: point.operation_status === status ? color : C.inkLight,
                fontFamily: F.mono, fontSize: 9, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
                opacity: updating ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── FILTER BAR ─────────────────────────────────────────────────────────────
function FilterBar({ filter, setFilter, counts }) {
  const options = [
    { id: "all",            label: "All",        count: counts.all            },
    { id: "functional",     label: "Working",    count: counts.functional     },
    { id: "issues",         label: "Issues",     count: counts.issues         },
    { id: "non_functional", label: "Broken",     count: counts.non_functional },
  ]
  return (
    <div style={{
      position: "absolute", top: 12, left: 12, right: 12, zIndex: 900,
      display: "flex", gap: 8, pointerEvents: "none",
    }}>
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => setFilter(o.id)}
          style={{
            pointerEvents: "all",
            padding: "7px 12px",
            borderRadius: 8,
            border: "none",
            background: filter === o.id ? "#2C1A0E" : "rgba(255,255,255,0.92)",
            color: filter === o.id ? "#FFE082" : "#3D2C1E",
            fontFamily: F.mono, fontSize: 9, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            transition: "all 0.15s",
          }}
        >
          {o.label}
          {o.count != null && (
            <span style={{ marginLeft: 5, opacity: 0.65 }}>({o.count})</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── LEGEND ─────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{
      position: "absolute", bottom: 16, right: 16, zIndex: 900,
      background: "rgba(255,255,255,0.93)",
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      border: `0.5px solid ${C.rule}`,
    }}>
      <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
        Water safety
      </div>
      {[
        { color: SAFETY_MARKER.safe.fill,    label: "Safe to drink"    },
        { color: SAFETY_MARKER.caution.fill, label: "Use with caution" },
        { color: SAFETY_MARKER.unsafe.fill,  label: "Not safe"         },
        { color: SAFETY_MARKER.unknown.fill, label: "Unknown"          },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.inkMid }}>{label}</span>
        </div>
      ))}
      <div style={{ height: 1, background: C.rule, margin: "8px 0" }} />
      <div style={{ fontFamily: F.body, fontSize: 10, color: C.inkFaint, lineHeight: 1.5 }}>
        Larger circles = more reports
      </div>
    </div>
  )
}

// ── MAIN DASHBOARD MAP ─────────────────────────────────────────────────────
export default function DashboardMap() {
  const [waterPoints, setWaterPoints]   = useState([])
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState("all")

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "water_points"), snapshot => {
      setWaterPoints(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = filter === "all"
    ? waterPoints
    : waterPoints.filter(p => p.operation_status === filter)

  const counts = {
    all:            waterPoints.length,
    functional:     waterPoints.filter(p => p.operation_status === "functional").length,
    issues:         waterPoints.filter(p => p.operation_status === "issues").length,
    non_functional: waterPoints.filter(p => p.operation_status === "non_functional").length,
  }

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: F.mono, fontSize: 12, color: C.inkLight }}>
        Loading water points...
      </div>
    )
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={[3.1191, 35.5966]}
        zoom={8}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToPoint point={selectedPoint} />

        {filtered.map(point => {
          if (!point.latitude || !point.longitude) return null
          const mc = markerColour(point)
          const isSelected = selectedPoint?.id === point.id

          return (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={isSelected ? getMarkerRadius(point) + 3 : getMarkerRadius(point)}
              fillColor={mc.fill}
              color={isSelected ? "#2C1A0E" : mc.stroke}
              weight={isSelected ? 2.5 : 1}
              fillOpacity={0.85}
              eventHandlers={{ click: () => setSelectedPoint(point) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div style={{ fontFamily: F.body, fontSize: 12 }}>
                  <strong>{point.name}</strong>
                  <br />
                  {getSafetyLevel(point).headline}
                  {point.distance_km != null && ` · ${point.distance_km} km`}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>

      <FilterBar filter={filter} setFilter={setFilter} counts={counts} />
      <Legend />

      {selectedPoint && (
        <ResolvePanel
          point={selectedPoint}
          onClose={() => setSelectedPoint(null)}
          onResolved={() => setSelectedPoint(null)}
        />
      )}
    </div>
  )
}
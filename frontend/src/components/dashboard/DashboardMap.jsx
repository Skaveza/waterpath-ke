import { useEffect, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet"
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore"
import { db } from "../../lib/firebase"

// ── Status colours — operational view ────────────────────────────────────
const STATUS_STYLE = {
  functional:     { fill: "#1D6F42", stroke: "#155233", label: "Functional"     },
  issues:         { fill: "#E07A0F", stroke: "#b56200", label: "Has Issues"     },
  non_functional: { fill: "#C1440E", stroke: "#8C2F07", label: "Non-Functional" },
  unknown:        { fill: "#6B7280", stroke: "#4B5563", label: "Unknown"        },
}

const QUALITY_META = {
  excellent: { color: "#1D6F42", label: "Excellent" },
  drinkable: { color: "#1A6E94", label: "Drinkable" },
  brackish:  { color: "#92610A", label: "Brackish"  },
  saline:    { color: "#C1440E", label: "Saline"    },
  unknown:   { color: "#6B7280", label: "Unknown"   },
}

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
}

function getMarkerRadius(point) {
  // Larger markers for boreholes with more reports — makes hotspots visible
  const base    = 8
  const reports = point.report_count || 0
  return Math.min(base + reports * 2, 20)
}

// ── Fly to selected point ─────────────────────────────────────────────────
function FlyToPoint({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point?.latitude && point?.longitude) {
      map.flyTo([point.latitude, point.longitude], 13, { duration: 1.0 })
    }
  }, [point, map])
  return null
}

// ── Resolve panel — appears when a marker is clicked ─────────────────────
function ResolvePanel({ point, onClose, onResolved }) {
  const [updating, setUpdating] = useState(false)
  const sm = STATUS_STYLE[point.operation_status] || STATUS_STYLE.unknown
  const qm = QUALITY_META[point.water_quality]    || QUALITY_META.unknown

  const updateStatus = async (newStatus) => {
    setUpdating(true)
    try {
      await updateDoc(doc(db, "water_points", point.id), {
        operation_status: newStatus,
      })
      onResolved()
      onClose()
    } catch (err) {
      console.error(err)
    }
    setUpdating(false)
  }

  return (
    <div style={{
      position: "absolute", bottom: 16, left: 16, right: 16, zIndex: 1000,
      background: C.card, borderRadius: 14, padding: "16px 18px",
      border: `1px solid ${C.rule}`,
      boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: C.inkLight, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 3 }}>
            {point.locality || "Turkana County"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>
            {point.name}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: C.subtle, border: "none", borderRadius: 6,
          padding: "5px 12px", fontSize: 11, fontWeight: 700,
          color: C.inkMid, cursor: "pointer", fontFamily: "inherit",
          flexShrink: 0, marginLeft: 10,
        }}>✕</button>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{
          background: sm.fill + "22", color: sm.fill,
          fontSize: 10, fontWeight: 700, padding: "3px 9px",
          borderRadius: 4, textTransform: "uppercase",
          fontFamily: "monospace", letterSpacing: "0.05em",
        }}>{sm.label}</span>
        <span style={{
          background: qm.color + "22", color: qm.color,
          fontSize: 10, fontWeight: 700, padding: "3px 9px",
          borderRadius: 4, textTransform: "uppercase",
          fontFamily: "monospace", letterSpacing: "0.05em",
        }}>{qm.label}</span>
        {point.report_count > 0 && (
          <span style={{
            background: C.dangerBg, color: C.danger,
            fontSize: 10, fontWeight: 700, padding: "3px 9px",
            borderRadius: 4, fontFamily: "monospace",
          }}>
            {point.report_count} report{point.report_count > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Data row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { l: "EC",    v: point.ec ? `${point.ec} µS/cm` : "—" },
          { l: "Depth", v: point.well_depth ? `${point.well_depth}m` : "—" },
          { l: "Yield", v: point.yield_ls ? `${point.yield_ls} L/s` : "—" },
        ].map(s => (
          <div key={s.l} style={{ background: C.subtle, borderRadius: 8, padding: "8px 10px", flex: 1 }}>
            <div style={{ fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "monospace", marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Status update buttons */}
      <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 8 }}>
        Update Status
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => updateStatus("functional")}
          disabled={updating || point.operation_status === "functional"}
          style={{
            flex: 1, padding: "10px 0",
            background: point.operation_status === "functional" ? C.safeBg : C.safe,
            border: point.operation_status === "functional" ? `1px solid ${C.safe}` : "none",
            borderRadius: 8, color: point.operation_status === "functional" ? C.safe : "#fff",
            fontSize: 11, fontWeight: 700, cursor: updating ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: updating ? 0.7 : 1,
          }}>
          Functional
        </button>
        <button
          onClick={() => updateStatus("issues")}
          disabled={updating || point.operation_status === "issues"}
          style={{
            flex: 1, padding: "10px 0",
            background: point.operation_status === "issues" ? C.warnBg : "#F5E6CC",
            border: point.operation_status === "issues" ? `1px solid ${C.warn}` : "none",
            borderRadius: 8, color: C.warn,
            fontSize: 11, fontWeight: 700, cursor: updating ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: updating ? 0.7 : 1,
          }}>
          Has Issues
        </button>
        <button
          onClick={() => updateStatus("non_functional")}
          disabled={updating || point.operation_status === "non_functional"}
          style={{
            flex: 1, padding: "10px 0",
            background: point.operation_status === "non_functional" ? C.dangerBg : "#F5D5CC",
            border: point.operation_status === "non_functional" ? `1px solid ${C.danger}` : "none",
            borderRadius: 8, color: C.danger,
            fontSize: 11, fontWeight: 700, cursor: updating ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: updating ? 0.7 : 1,
          }}>
          Non-Functional
        </button>
      </div>
    </div>
  )
}

// ── Main dashboard map ────────────────────────────────────────────────────
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

  // Stats for filter pills
  const counts = {
    all:            waterPoints.length,
    functional:     waterPoints.filter(p => p.operation_status === "functional").length,
    issues:         waterPoints.filter(p => p.operation_status === "issues").length,
    non_functional: waterPoints.filter(p => p.operation_status === "non_functional").length,
    unknown:        waterPoints.filter(p => !["functional","issues","non_functional"].includes(p.operation_status)).length,
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: C.bg }}>
        <p style={{ color: C.inkLight, fontSize: 13 }}>Loading map...</p>
      </div>
    )
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* Filter pills — overlaid on map */}
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 1000,
        display: "flex", gap: 6, flexWrap: "wrap",
      }}>
        {[
          { id: "all",            label: `All (${counts.all})`                          },
          { id: "issues",         label: `Issues (${counts.issues})`                    },
          { id: "non_functional", label: `Non-Functional (${counts.non_functional})`    },
          { id: "functional",     label: `Functional (${counts.functional})`            },
          { id: "unknown",        label: `Unknown (${counts.unknown})`                  },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "5px 12px", borderRadius: 20,
            background: filter === f.id ? C.ink : "rgba(255,255,255,0.92)",
            color: filter === f.id ? "#fff" : C.inkMid,
            border: `1px solid ${filter === f.id ? C.ink : C.rule}`,
            fontSize: 11, fontWeight: 700, cursor: "pointer",
            fontFamily: "monospace", letterSpacing: "0.04em",
            backdropFilter: "blur(4px)",
            transition: "all 0.15s",
          }}>{f.label}</button>
        ))}
      </div>

      <MapContainer
        center={[3.1191, 35.5966]}
        zoom={8}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToPoint point={selectedPoint} />

        {filtered.map(point => {
          const sm         = STATUS_STYLE[point.operation_status] || STATUS_STYLE.unknown
          const radius     = getMarkerRadius(point)
          const isSelected = selectedPoint?.id === point.id

          return (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={isSelected ? radius + 4 : radius}
              fillColor={sm.fill}
              color={isSelected ? C.ink : sm.stroke}
              fillOpacity={0.85}
              weight={isSelected ? 3 : 2}
              eventHandlers={{ click: () => setSelectedPoint(point) }}
            >
              {/* Hover tooltip */}
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
                  {point.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: sm.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.inkLight }}>{sm.label}</span>
                  {point.report_count > 0 && (
                    <span style={{ fontSize: 11, color: C.danger, fontWeight: 700 }}>
                      · {point.report_count} report{point.report_count > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: selectedPoint ? 180 : 16, right: 12, zIndex: 1000,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)",
        borderRadius: 10, padding: "10px 14px",
        border: `1px solid ${C.rule}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        transition: "bottom 0.3s",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Operational Status
        </div>
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.fill, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.inkMid }}>{s.label}</span>
          </div>
        ))}
        <div style={{ height: 1, background: C.rule, margin: "8px 0" }} />
        <div style={{ fontSize: 10, color: C.inkLight, lineHeight: 1.5 }}>
          Larger markers = more reports
        </div>
      </div>

      {/* Resolve panel — appears on marker click */}
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

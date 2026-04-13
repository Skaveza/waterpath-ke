import { useEffect, useRef } from "react"
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet"
import { useWaterPoints } from "../../hooks/useWaterPath"
import { getSafetyLevel } from "../../utils/waterInterpretation"

// ── Marker colour driven by ML prediction (same logic as the rest of the app) ──
const SAFETY_MARKER = {
  safe:    { fill: "#1D6F42", stroke: "#155233" },
  caution: { fill: "#C48A2A", stroke: "#8C5C10" },
  unsafe:  { fill: "#C1440E", stroke: "#8C2F07" },
  unknown: { fill: "#6B7280", stroke: "#4B5563" },
}

function markerColour(point) {
  const s = getSafetyLevel(point)
  return SAFETY_MARKER[s.level] || SAFETY_MARKER.unknown
}

const TURKANA_CENTER = [3.1191, 35.5966]

// ── FIT BOUNDS: zoom to show all boreholes on first load ──────────────────
function FitBounds({ points }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current) return
    if (!points || points.length === 0) return

    const valid = points.filter(p => p.latitude && p.longitude)
    if (valid.length === 0) return

    const bounds = valid.map(p => [p.latitude, p.longitude])
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    fitted.current = true
  }, [points, map])

  return null
}

// ── FLY TO SELECTED POINT ──────────────────────────────────────────────────
function FlyToPoint({ point }) {
  const map = useMap()
  useEffect(() => {
    if (point?.latitude && point?.longitude) {
      map.flyTo([point.latitude, point.longitude], 14, { duration: 1.2 })
    }
  }, [point, map])
  return null
}

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function WaterMap({ onSelectPoint, selectedPoint, userLocation }) {
  const { points: waterPoints, loading } = useWaterPoints(userLocation)

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", fontFamily: "monospace", fontSize: 12, color: "#9E7A5A",
      }}>
        Loading water points...
      </div>
    )
  }

  // Always start centered on Turkana — FitBounds will zoom to all boreholes
  // once they load. Don't center on user location or they lose the boreholes.
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        center={TURKANA_CENTER}
        zoom={8}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Zoom to fit all boreholes on first load */}
        <FitBounds points={waterPoints} />

        {/* Fly to a specific borehole when selected from the list */}
        <FlyToPoint point={selectedPoint} />

        {waterPoints.map(point => {
          if (!point.latitude || !point.longitude) return null

          const mc         = markerColour(point)
          const safety     = getSafetyLevel(point)
          const isSelected = selectedPoint?.id === point.id

          return (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={isSelected ? 12 : 8}
              fillColor={mc.fill}
              color={isSelected ? "#2C1A0E" : mc.stroke}
              weight={isSelected ? 2.5 : 1}
              fillOpacity={0.85}
              eventHandlers={{
                click: () => onSelectPoint?.(point),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div style={{ fontFamily: "system-ui", fontSize: 12, lineHeight: 1.5 }}>
                  <strong style={{ display: "block", marginBottom: 2 }}>{point.name}</strong>
                  <span style={{ color: mc.fill, fontWeight: 600 }}>{safety.headline}</span>
                  {point.distance_km != null && (
                    <span style={{ color: "#6B7280", marginLeft: 6 }}>· {point.distance_km} km</span>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
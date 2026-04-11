import { useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet"
import { useWaterPoints } from "../../hooks/useWaterPath"

// ─────────────────────────────────────────────
// SAME CONSTANTS (UNCHANGED)
// ─────────────────────────────────────────────

const QUALITY_COLOURS = {
  excellent: { fill: "#1D6F42", stroke: "#155233" },
  drinkable: { fill: "#2E86AB", stroke: "#1a6080" },
  brackish:  { fill: "#E07A0F", stroke: "#b56200" },
  saline:    { fill: "#C1440E", stroke: "#8C2F07" },
  unknown:   { fill: "#6B7280", stroke: "#4B5563" },
}

const STATUS_LABELS = {
  functional:     { label: "Functional", colour: "#1D6F42" },
  issues:         { label: "Has Issues", colour: "#E07A0F" },
  non_functional: { label: "Non-Functional", colour: "#C1440E" },
  unknown:        { label: "Status Unknown", colour: "#6B7280" },
}

// ─────────────────────────────────────────────
// MAP HELPERS (UNCHANGED)
// ─────────────────────────────────────────────

function LocationFlyTo({ userLocation }) {
  const map = useMap()

  useState(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lon], 11, { duration: 1.5 })
    }
  }, [userLocation])

  return null
}

function FlyToPoint({ point }) {
  const map = useMap()

  useState(() => {
    if (point?.latitude && point?.longitude) {
      map.flyTo([point.latitude, point.longitude], 14, { duration: 1.2 })
    }
  }, [point])

  return null
}

const TURKANA_CENTER = [3.1191, 35.5966]

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function WaterMap({ onSelectPoint, selectedPoint, userLocation }) {
  const { points: waterPoints, loading } = useWaterPoints(userLocation)

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        Loading water points...
      </div>
    )
  }

  const mapCenter = userLocation
    ? [userLocation.lat, userLocation.lon]
    : TURKANA_CENTER

  return (
    <MapContainer center={mapCenter} zoom={10} style={{ width: "100%", height: "100%" }}>

      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationFlyTo userLocation={userLocation} />
      <FlyToPoint point={selectedPoint} />

      {waterPoints.map(point => {
        const qColor = QUALITY_COLOURS[point.water_quality]?.fill || "#6B7280"

        return (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={8}
            fillColor={qColor}
            color="#333"
            fillOpacity={0.8}
            eventHandlers={{
              click: () => onSelectPoint?.(point)
            }}
          >
            <Tooltip>
              <div>
                <strong>{point.name}</strong><br />
                {point.water_quality}
              </div>
            </Tooltip>

            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{point.name}</strong>

                <div style={{ marginTop: 6 }}>
                  Quality: {point.water_quality}
                </div>

                {point.distance_km && (
                  <div>
                    Distance: {point.distance_km} km
                  </div>
                )}

                {/* OFFLINE NAV READY FIELD */}
                {point.bearing != null && (
                  <div>
                    Direction: {point.bearing}°
                  </div>
                )}

                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
                    window.open(url)
                  }}
                  style={{ marginTop: 8 }}
                >
                  Open Directions
                </button>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
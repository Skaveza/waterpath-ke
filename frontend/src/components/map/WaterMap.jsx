import { useEffect, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../../lib/firebase"

// ── Colour scheme matching the UI design ─────────────────────────────────
const QUALITY_COLOURS = {
  excellent:  { fill: "#1D6F42", stroke: "#155233" },
  drinkable:  { fill: "#2E86AB", stroke: "#1a6080" },
  brackish:   { fill: "#E07A0F", stroke: "#b56200" },
  saline:     { fill: "#C1440E", stroke: "#8C2F07" },
  unknown:    { fill: "#6B7280", stroke: "#4B5563" },
}

const STATUS_LABELS = {
  functional:     { label: "Functional",     colour: "#1D6F42" },
  issues:         { label: "Has Issues",     colour: "#E07A0F" },
  non_functional: { label: "Non-Functional", colour: "#C1440E" },
  unknown:        { label: "Status Unknown", colour: "#6B7280" },
}

function getMarkerStyle(point) {
  const q = QUALITY_COLOURS[point.water_quality] || QUALITY_COLOURS.unknown
  const isNonFunctional = point.operation_status === "non_functional"
  return {
    fillColor:   isNonFunctional ? "#6B7280" : q.fill,
    color:       isNonFunctional ? "#4B5563" : q.stroke,
    fillOpacity: isNonFunctional ? 0.4 : 0.85,
    weight:      2,
    radius:      point.operation_status === "functional" ? 9 : 7,
  }
}

// Fly to user location when it becomes available
function LocationFlyTo({ userLocation }) {
  const map = useMap()
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lon], 11, { duration: 1.5 })
    }
  }, [userLocation, map])
  return null
}

export default function WaterMap({ onSelectPoint, selectedPoint }) {
  const [waterPoints, setWaterPoints] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [loading, setLoading]           = useState(true)

  // Real-time Firestore listener — updates map instantly when NGO resolves a report
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "water_points"), snapshot => {
      const points = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setWaterPoints(points)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Get user's GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        ()  => setUserLocation({ lat: 3.1191, lon: 35.5966 }) // Default: Lodwar town
      )
    } else {
      setUserLocation({ lat: 3.1191, lon: 35.5966 })
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-100">
        <p className="text-stone-500 text-sm">Loading water points...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[3.1191, 35.5966]}
        zoom={9}
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationFlyTo userLocation={userLocation} />

        {/* User location marker */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lon]}
            radius={10}
            fillColor="#C1440E"
            color="#8C2F07"
            fillOpacity={1}
            weight={3}
          >
            <Popup>
              <div className="text-sm font-semibold text-stone-800">Your Location</div>
            </Popup>
          </CircleMarker>
        )}

        {/* Borehole markers */}
        {waterPoints.map(point => {
          const style    = getMarkerStyle(point)
          const isSelected = selectedPoint?.id === point.id
          return (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={isSelected ? style.radius + 4 : style.radius}
              fillColor={style.fillColor}
              color={isSelected ? "#1A1208" : style.color}
              fillOpacity={style.fillOpacity}
              weight={isSelected ? 3 : style.weight}
              eventHandlers={{ click: () => onSelectPoint?.(point) }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#1A1208" }}>
                    {point.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#7A6355", marginBottom: 6 }}>
                    {point.locality || "Turkana County"}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{
                      background: QUALITY_COLOURS[point.water_quality]?.fill || "#6B7280",
                      color: "#fff", fontSize: 10, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
                    }}>
                      {point.water_quality || "Unknown"}
                    </span>
                    <span style={{
                      background: "#F0EBE3", color: "#3D2C1E",
                      fontSize: 10, fontWeight: 600,
                      padding: "2px 8px", borderRadius: 4,
                    }}>
                      {STATUS_LABELS[point.operation_status]?.label || "Unknown"}
                    </span>
                  </div>
                  {point.ec && (
                    <div style={{ fontSize: 11, color: "#7A6355" }}>
                      EC: {point.ec} µS/cm · pH: {point.ph || "—"}
                    </div>
                  )}
                  {point.yield_ls && (
                    <div style={{ fontSize: 11, color: "#7A6355" }}>
                      Yield: {point.yield_ls} L/s
                    </div>
                  )}
                  {point.report_count > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#C1440E", fontWeight: 600 }}>
                      {point.report_count} community report{point.report_count > 1 ? "s" : ""}
                    </div>
                  )}
                  <button
                    onClick={() => onSelectPoint?.(point)}
                    style={{
                      marginTop: 8, width: "100%", padding: "6px 0",
                      background: "#C1440E", border: "none", borderRadius: 6,
                      color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 24, left: 12, zIndex: 1000,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)",
        borderRadius: 10, padding: "10px 14px",
        border: "1px solid #DDD4C8",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#7A6355", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Water Quality
        </div>
        {[
          { label: "Excellent",  colour: "#1D6F42" },
          { label: "Drinkable",  colour: "#2E86AB" },
          { label: "Brackish",   colour: "#E07A0F" },
          { label: "Saline",     colour: "#C1440E" },
          { label: "Unknown",    colour: "#6B7280" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.colour, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#3D2C1E" }}>{item.label}</span>
          </div>
        ))}
        <div style={{ height: 1, background: "#DDD4C8", margin: "8px 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#C1440E", border: "3px solid #8C2F07", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#3D2C1E" }}>Your Location</span>
        </div>
      </div>

      {/* Point count */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 1000,
        background: "rgba(255,255,255,0.92)", borderRadius: 8,
        padding: "6px 12px", border: "1px solid #DDD4C8",
        fontSize: 11, fontWeight: 700, color: "#3D2C1E",
      }}>
        {waterPoints.length} boreholes mapped
      </div>
    </div>
  )
}

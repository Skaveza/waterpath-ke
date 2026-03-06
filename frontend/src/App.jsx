import { useState } from "react"
import WaterMap from "./components/map/WaterMap"

export default function App() {
  const [selectedPoint, setSelectedPoint] = useState(null)

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        background: "#1A1208", padding: "12px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            WaterPath
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif" }}>
            Turkana County
          </div>
        </div>
        <div style={{
          background: "#C1440E", borderRadius: 20,
          padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "#fff",
        }}>
          Live Map
        </div>
      </div>

      {/* Map — fills remaining height */}
      <div style={{ flex: 1, position: "relative" }}>
        <WaterMap
          selectedPoint={selectedPoint}
          onSelectPoint={setSelectedPoint}
        />
      </div>

      {/* Selected point panel */}
      {selectedPoint && (
        <div style={{
          background: "#fff", borderTop: "1px solid #DDD4C8",
          padding: "14px 20px", flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1208" }}>{selectedPoint.name}</div>
            <div style={{ fontSize: 12, color: "#7A6355", marginTop: 2 }}>
              {selectedPoint.water_quality} · {selectedPoint.locality || "Turkana County"}
              {selectedPoint.ec ? ` · EC: ${selectedPoint.ec} µS/cm` : ""}
            </div>
          </div>
          <button
            onClick={() => setSelectedPoint(null)}
            style={{
              background: "#F0EBE3", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 12, fontWeight: 700,
              color: "#3D2C1E", cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

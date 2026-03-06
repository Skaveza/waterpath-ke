import { useState } from "react"
import { useWaterPoints, useUserLocation, useSubmitReport } from "../../hooks/useWaterPath"
import WaterMap from "../map/WaterMap"


// Design tokens 
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

const QUALITY_META = {
  excellent:  { color: C.safe,   bg: C.safeBg,   label: "Excellent"  },
  drinkable:  { color: C.sky,    bg: C.skyBg,    label: "Drinkable"  },
  brackish:   { color: C.warn,   bg: C.warnBg,   label: "Brackish"   },
  saline:     { color: C.danger, bg: C.dangerBg, label: "Saline"     },
  unknown:    { color: C.inkLight, bg: C.subtle,  label: "Unknown"   },
}

const STATUS_META = {
  functional:     { color: C.safe,   bg: C.safeBg,   label: "Functional"     },
  issues:         { color: C.warn,   bg: C.warnBg,   label: "Has Issues"     },
  non_functional: { color: C.danger, bg: C.dangerBg, label: "Non-Functional" },
  unknown:        { color: C.inkLight, bg: C.subtle,  label: "Status Unknown"},
}

const PROBLEM_TYPES = [
  "Borehole is Dry",
  "Pipe Broken or Blocked",
  "Unsafe Route",
  "Water Stolen or Diverted",
  "Pump Not Working",
  "Water is Contaminated",
]
// Shared UI components 
function Badge({ label, color, bg }) {
  return (
    <span style={{
      background: bg, color, fontSize: 10, fontWeight: 700,
      padding: "3px 9px", borderRadius: 4,
      letterSpacing: "0.05em", textTransform: "uppercase",
      fontFamily: "monospace", display: "inline-block",
    }}>{label}</span>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.rule }} />
}

function BackButton({ onBack }) {
  return (
    <button onClick={onBack} style={{
      background: "none", border: "none", color: C.terra,
      fontSize: 13, fontWeight: 700, cursor: "pointer",
      padding: "0 0 12px", display: "block",
      fontFamily: "inherit",
    }}>← Back</button>
  )
}

// HOME SCREEN 
function HomeScreen({ points, loading, onSelectPoint, onReport }) {
  const nearest = points.filter(p => p.water_quality !== "saline")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Hero — nearest safe borehole */}
      {nearest[0] && (
        <div style={{
          background: C.terra, borderRadius: 14, padding: "16px 18px", color: "#fff",
        }}>
          <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 }}>
            Nearest safe water
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, lineHeight: 1.2 }}>
            {nearest[0].name}
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, opacity: 0.65, fontFamily: "monospace" }}>WALK TIME</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {nearest[0].walk_minutes ? `${nearest[0].walk_minutes} min` : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.65, fontFamily: "monospace" }}>DISTANCE</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {nearest[0].distance_km ? `${nearest[0].distance_km.toFixed(1)} km` : "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.65, fontFamily: "monospace" }}>QUALITY</div>
              <div style={{ fontSize: 16, fontWeight: 700, textTransform: "capitalize" }}>
                {nearest[0].water_quality}
              </div>
            </div>
          </div>
          <button onClick={() => onSelectPoint(nearest[0])} style={{
            background: "#fff", color: C.terra, border: "none",
            borderRadius: 8, padding: "8px 18px",
            fontSize: 12, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit",
          }}>
            View Details
          </button>
        </div>
      )}

      {/* Section label */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "monospace" }}>
        All Nearby Points
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: C.inkLight, fontSize: 13 }}>
          Loading water points...
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.rule}`, overflow: "hidden" }}>
          {points.slice(0, 8).map((pt, i) => {
            const qm = QUALITY_META[pt.water_quality] || QUALITY_META.unknown
            const sm = STATUS_META[pt.operation_status] || STATUS_META.unknown
            return (
              <div key={pt.id}>
                {i > 0 && <Divider />}
                <div
                  onClick={() => onSelectPoint(pt)}
                  style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 5 }}>{pt.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge label={qm.label} color={qm.color} bg={qm.bg} />
                      <Badge label={sm.label} color={sm.color} bg={sm.bg} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.terra }}>
                      {pt.distance_km ? `${pt.distance_km.toFixed(1)} km` : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>
                      {pt.walk_minutes ? `${pt.walk_minutes} min walk` : ""}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Report button */}
      <button onClick={onReport} style={{
        width: "100%", padding: "13px 0",
        background: C.ink, border: "none", borderRadius: 10,
        color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit", letterSpacing: "0.02em",
      }}>
        Report a Water Problem
      </button>
    </div>
  )
}

// DETAIL SCREEN 
function DetailScreen({ point, onBack, onReport, onViewMap }) {
  const qm = QUALITY_META[point.water_quality] || QUALITY_META.unknown
  const sm = STATUS_META[point.operation_status] || STATUS_META.unknown

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}&travelmode=walking`

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <BackButton onBack={onBack} />

      <div style={{ background: C.card, borderRadius: 12, padding: "16px", border: `1px solid ${C.rule}` }}>
        {/* Header */}
        <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "monospace", marginBottom: 4 }}>
          {point.locality || "Turkana County"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, marginBottom: 12, lineHeight: 1.2 }}>
          {point.name}
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Badge label={qm.label} color={qm.color} bg={qm.bg} />
          <Badge label={sm.label} color={sm.color} bg={sm.bg} />
        </div>

        <Divider />

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "14px 0" }}>
          {[
            { l: "Distance",   v: point.distance_km ? `${point.distance_km.toFixed(1)} km` : "—" },
            { l: "Walk Time",  v: point.walk_minutes ? `${point.walk_minutes} min` : "—" },
            { l: "EC",         v: point.ec ? `${point.ec} µS/cm` : "Not measured" },
            { l: "pH",         v: point.ph || "—" },
            { l: "Depth",      v: point.well_depth ? `${point.well_depth} m` : "—" },
            { l: "Yield",      v: point.yield_ls ? `${point.yield_ls} L/s` : "—" },
          ].map(s => (
            <div key={s.l} style={{ background: C.subtle, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "monospace", marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Water quality explanation */}
        {point.water_quality === "saline" && (
          <div style={{ background: C.dangerBg, borderRadius: 8, padding: "10px 12px", color: C.danger, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
            This borehole is saline (EC: {point.ec} µS/cm). Water requires desalination before drinking.
          </div>
        )}
        {point.water_quality === "brackish" && (
          <div style={{ background: C.warnBg, borderRadius: 8, padding: "10px 12px", color: C.warn, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
            This borehole is brackish. Treatment is advised before drinking.
          </div>
        )}
        {point.report_count > 0 && (
          <div style={{ background: C.warnBg, borderRadius: 8, padding: "10px 12px", color: C.warn, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
            {point.report_count} community report{point.report_count > 1 ? "s" : ""} filed for this point
          </div>
        )}

        {/* GPS coordinates */}
        <div style={{ fontSize: 11, color: C.inkLight, fontFamily: "monospace", marginBottom: 14 }}>
          {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)} · Source: Rural Focus Ltd / WRA Kenya
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <a href={googleMapsUrl} target="_blank" rel="noreferrer" style={{
            flex: 1, padding: "11px 0", background: C.terra,
            border: "none", borderRadius: 8, color: "#fff",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            textDecoration: "none", textAlign: "center", display: "block",
            fontFamily: "inherit",
          }}>
            Navigate
          </a>
          <button onClick={() => onViewMap(point)} style={{
            flex: 1, padding: "11px 0", background: C.subtle,
            border: `1px solid ${C.rule}`, borderRadius: 8, color: C.ink,
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            View on Map
          </button>
          <button onClick={() => onReport(point)} style={{
            flex: 1, padding: "11px 0", background: C.ink,
            border: "none", borderRadius: 8, color: "#fff",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            Report
          </button>
        </div>
      </div>
    </div>
  )
}

// REPORT FLOW 
function ReportScreen({ points, preselectedPoint, onBack, onSuccess }) {
  const [step, setStep]       = useState(1)
  const [rType, setRType]     = useState(null)
  const [rPoint, setRPoint]   = useState(preselectedPoint || null)
  const { submitReport, submitting } = useSubmitReport()

  const handleSubmit = async () => {
    const result = await submitReport({
      water_point_id:   rPoint.id,
      water_point_name: rPoint.name,
      problem_type:     rType,
      severity: ["Borehole is Dry","Unsafe Route","Water Stolen or Diverted","Water is Contaminated"].includes(rType)
        ? "high" : "medium",
    })
    if (result.success) onSuccess(result.report_id)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <BackButton onBack={onBack} />

      {/* Progress bar */}
      <div style={{ display: "flex", gap: 4 }}>
        {[1,2,3].map(s => (
          <div key={s} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: s <= step ? C.terra : C.rule,
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.inkLight, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Step {step} of 3
      </div>

      {/* Step 1 — Problem type */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
            What is the problem?
          </div>
          <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 16, lineHeight: 1.6 }}>
            Your report is anonymous and goes directly to county officials and local NGOs.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {PROBLEM_TYPES.map(type => (
              <button key={type} onClick={() => setRType(type)} style={{
                padding: "12px 10px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${rType === type ? C.terra : C.rule}`,
                background: rType === type ? "#F2D5C8" : C.card,
                color: rType === type ? "#8C2F07" : C.inkMid,
                fontSize: 12, fontWeight: 600, textAlign: "left",
                lineHeight: 1.3, transition: "all 0.15s", fontFamily: "inherit",
              }}>{type}</button>
            ))}
          </div>
          <button onClick={() => rType && setStep(2)} style={{
            width: "100%", padding: "13px 0",
            background: rType ? C.terra : C.rule,
            border: "none", borderRadius: 8,
            color: rType ? "#fff" : C.inkLight,
            fontSize: 13, fontWeight: 700,
            cursor: rType ? "pointer" : "not-allowed",
            transition: "all 0.2s", fontFamily: "inherit",
          }}>Next</button>
        </div>
      )}

      {/* Step 2 — Which borehole */}
      {step === 2 && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
            Which water point?
          </div>
          <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 16 }}>
            Select the affected location.
          </div>
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.rule}`, overflow: "hidden", marginBottom: 16 }}>
            {points.slice(0, 6).map((pt, i) => (
              <div key={pt.id}>
                {i > 0 && <Divider />}
                <div
                  onClick={() => setRPoint(pt)}
                  style={{
                    padding: "12px 14px", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer",
                    background: rPoint?.id === pt.id ? "#F2D5C8" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{pt.name}</div>
                    <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>{pt.locality || "Turkana County"}</div>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkLight, fontFamily: "monospace", flexShrink: 0, marginLeft: 8 }}>
                    {pt.distance_km ? `${pt.distance_km.toFixed(1)} km` : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(1)} style={{
              flex: 1, padding: "12px 0", background: C.subtle,
              border: `1px solid ${C.rule}`, borderRadius: 8, color: C.ink,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Back</button>
            <button onClick={() => rPoint && setStep(3)} style={{
              flex: 2, padding: "12px 0",
              background: rPoint ? C.terra : C.rule, border: "none",
              borderRadius: 8, color: rPoint ? "#fff" : C.inkLight,
              fontSize: 13, fontWeight: 700,
              cursor: rPoint ? "pointer" : "not-allowed",
              transition: "all 0.2s", fontFamily: "inherit",
            }}>Next</button>
          </div>
        </div>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 4 }}>
            Confirm Report
          </div>
          <div style={{ fontSize: 12, color: C.inkLight, marginBottom: 16 }}>
            Review and submit anonymously.
          </div>
          <div style={{ background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.rule}`, marginBottom: 14 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 3 }}>Problem</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{rType}</div>
            </div>
            <Divider />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 3 }}>Location</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{rPoint?.name}</div>
              <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>{rPoint?.locality || "Turkana County"}</div>
            </div>
          </div>
          <div style={{ background: C.safeBg, borderRadius: 8, padding: "10px 12px", color: C.safe, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
            Your name is never stored or shared. This report is fully anonymous.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(2)} style={{
              flex: 1, padding: "12px 0", background: C.subtle,
              border: `1px solid ${C.rule}`, borderRadius: 8, color: C.ink,
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Back</button>
            <button onClick={handleSubmit} disabled={submitting} style={{
              flex: 2, padding: "12px 0", background: C.terra, border: "none",
              borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1, fontFamily: "inherit",
            }}>
              {submitting ? "Submitting..." : "Submit Anonymously"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// SUCCESS SCREEN 
function SuccessScreen({ reportId, onDone }) {
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "28px 20px", textAlign: "center", border: `1px solid ${C.rule}` }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: C.safeBg, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `2px solid ${C.safe}`,
      }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.safe }} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.safe, marginBottom: 8 }}>
        Report Submitted
      </div>
      <div style={{ color: C.inkLight, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
        Sent to Turkana County Water Office and local NGOs. Expected response within 4–8 hours.
      </div>
      <div style={{ background: C.safeBg, borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: `1px solid ${C.safe}33` }}>
        <div style={{ fontSize: 10, color: C.safe, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: "monospace", marginBottom: 4 }}>Report ID</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.safe, fontFamily: "monospace" }}>{reportId}</div>
      </div>
      <button onClick={onDone} style={{
        width: "100%", padding: "12px 0", background: C.ink,
        border: "none", borderRadius: 8, color: "#fff",
        fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}>
        Back to Home
      </button>
    </div>
  )
}

// MAIN COMMUNITY APP 
export default function CommunityApp() {
  const userLocation             = useUserLocation()
  const { points, loading }      = useWaterPoints(userLocation)
  const [tab, setTab]            = useState("home")
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [preselectedPoint, setPreselectedPoint] = useState(null)
  const [reportSuccess, setReportSuccess]  = useState(null)
  const [screen, setScreen]      = useState("home") // home | detail | report | success

  const goHome = () => { setScreen("home"); setSelectedPoint(null); setReportSuccess(null) }

  const openDetail = (point) => {
    // Prefer the enriched point from the points array (has distance_km + walk_minutes)
    // Falls back to the raw point if not found (e.g. clicked directly from map)
    const enriched = points.find(p => p.id === point.id) || point
    setSelectedPoint(enriched)
    setScreen("detail")
    setTab("home")
  }

  const openReport = (point = null) => {
    setPreselectedPoint(point)
    setScreen("report")
    setTab("report")
  }

  const handleReportSuccess = (reportId) => {
    setReportSuccess(reportId)
    setScreen("success")
  }

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* App header */}
      <div style={{
        background: C.card, padding: "12px 18px 10px",
        borderBottom: `1px solid ${C.rule}`, flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 10, color: C.inkLight, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>WaterPath</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>Turkana County</div>
        </div>
        <div style={{
          background: C.subtle, borderRadius: 20,
          padding: "4px 12px", fontSize: 11, color: C.inkMid,
          fontWeight: 600, border: `1px solid ${C.rule}`,
          fontFamily: "monospace",
        }}>
          {points.length} boreholes
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: tab === "map" ? 0 : 16 }}>

        {/* Map tab */}
        {tab === "map" && (
          <div style={{ height: "100%" }}>
            <WaterMap
              selectedPoint={selectedPoint}
              onSelectPoint={openDetail}
            />
          </div>
        )}

        {/* Home / detail / report screens */}
        {tab !== "map" && (
          <>
            {screen === "home" && (
              <HomeScreen
                points={points}
                loading={loading}
                onSelectPoint={openDetail}
                onReport={() => openReport()}
              />
            )}
            {screen === "detail" && selectedPoint && (
              <DetailScreen
                point={selectedPoint}
                onBack={goHome}
                onReport={openReport}
                onViewMap={(pt) => { setSelectedPoint(points.find(p => p.id === pt.id) || pt); setTab("map") }}
              />
            )}
            {screen === "report" && (
              <ReportScreen
                points={points}
                preselectedPoint={preselectedPoint}
                onBack={() => setScreen(selectedPoint ? "detail" : "home")}
                onSuccess={handleReportSuccess}
              />
            )}
            {screen === "success" && (
              <SuccessScreen reportId={reportSuccess} onDone={goHome} />
            )}
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <div style={{
        background: C.card, borderTop: `1px solid ${C.rule}`,
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 20px", flexShrink: 0,
      }}>
        {[
          { id: "home",   label: "Home"   },
          { id: "map",    label: "Map"    },
          { id: "report", label: "Report" },
        ].map(nav => (
          <button key={nav.id} onClick={() => {
            setTab(nav.id)
            if (nav.id === "report") openReport()
            else if (nav.id === "home") goHome()
          }} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4, padding: "0 24px",
          }}>
            <div style={{
              width: 24, height: 2.5, borderRadius: 2,
              background: tab === nav.id ? C.terra : "transparent",
              marginBottom: 2, transition: "background 0.2s",
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: tab === nav.id ? C.terra : C.inkLight,
              letterSpacing: "0.06em", textTransform: "uppercase",
              fontFamily: "monospace",
            }}>{nav.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

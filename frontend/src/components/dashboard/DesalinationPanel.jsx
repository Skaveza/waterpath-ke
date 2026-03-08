import { useState, useEffect } from "react"
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet"

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
  sky:      "#1A6E94",
  skyBg:    "#E8F4FA",
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ background: C.subtle, borderRadius: 8, padding: "10px 12px", flex: 1 }}>
      <div style={{ fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || C.ink, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.inkLight, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.rule }} />
}

export default function DesalinationPanel() {
  const [sites, setSites]         = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [view, setView]           = useState("list") // list | map

  useEffect(() => {
    fetch("http://localhost:5000/api/desalination/sites")
      .then(r => r.json())
      .then(data => {
        setSites(data.sites || [])
        setSelected(data.sites?.[0] || null)
        setLoading(false)
      })
      .catch(err => {
        setError("Could not load sites — is the Flask backend running?")
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: C.inkLight, fontSize: 13 }}>
        Running siting algorithm...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 20, background: "#FDEEE8", borderRadius: 10, color: C.terra, fontSize: 13, fontWeight: 600 }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header */}
      <div style={{ background: C.sky, borderRadius: 12, padding: "14px 16px", color: "#fff" }}>
        <div style={{ fontSize: 10, opacity: 0.7, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
          ML — Facility Location Analysis
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>
          Optimal Desalination Sites
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
          Computed from 134 saline/brackish boreholes across Turkana County.
          Each site serves communities within a 15km radius.
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", gap: 10 }}>
        <StatBox label="Sites Identified" value={sites.length}     color={C.sky}  />
        <StatBox label="Saline Boreholes" value="134"              color={C.warn} />
        <StatBox label="Cost / m³"        value="$0.82"            color={C.safe} sub="solar desalination" />
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 0, background: C.subtle, borderRadius: 8, padding: 3 }}>
        {[{ id: "list", label: "Site List" }, { id: "map", label: "Map View" }].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            flex: 1, padding: "7px 0", border: "none", borderRadius: 6,
            background: view === t.id ? C.card : "transparent",
            color: view === t.id ? C.ink : C.inkLight,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: view === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sites.map((site, i) => (
            <div
              key={i}
              onClick={() => setSelected(selected === site ? null : site)}
              style={{
                background: C.card, borderRadius: 12,
                border: `1.5px solid ${selected === site ? C.sky : C.rule}`,
                overflow: "hidden", cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              {/* Site header */}
              <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: C.sky, color: "#fff",
                      fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "monospace", flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, fontFamily: "monospace" }}>
                      {site.latitude}°N, {site.longitude}°E
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.inkLight, paddingLeft: 30 }}>
                    {site.borehole_count} saline boreholes · avg EC {site.avg_ec.toLocaleString()} µS/cm
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.safe }}>{site.breakeven_yrs}yr</div>
                  <div style={{ fontSize: 10, color: C.inkLight, fontFamily: "monospace" }}>breakeven</div>
                </div>
              </div>

              {/* Expanded detail */}
              {selected === site && (
                <>
                  <Divider />
                  <div style={{ padding: "12px 14px" }}>

                    {/* Stats grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[
                        { l: "Population Served",  v: (site.pop_served || 0).toLocaleString(),  color: C.ink  },
                        { l: "Daily Demand",       v: `${site.daily_m3} m³/day`,         color: C.ink  },
                        { l: "Unit Capital Cost",  v: `$${(site.unit_cost_usd || 85000).toLocaleString()}`, color: C.ink },
                        { l: "Cost per m³",        v: `$${site.cost_per_m3}`,            color: C.safe },
                        { l: "Breakeven",          v: `${site.breakeven_yrs} years`,     color: C.safe },
                        { l: "Boreholes Served",   v: site.borehole_count,               color: C.sky  },
                      ].map(s => (
                        <div key={s.l} style={{ background: C.subtle, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "monospace", marginBottom: 2 }}>{s.l}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Boreholes in cluster */}
                    <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace", marginBottom: 6 }}>
                      Boreholes in cluster
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {site.boreholes.map((name, j) => (
                        <span key={j} style={{
                          background: C.skyBg, color: C.sky,
                          fontSize: 10, fontWeight: 600,
                          padding: "3px 9px", borderRadius: 4,
                          fontFamily: "monospace",
                        }}>{name}</span>
                      ))}
                    </div>

                    {/* Investor note */}
                    <div style={{ marginTop: 12, background: C.safeBg, borderRadius: 8, padding: "10px 12px", fontSize: 11, color: C.safe, lineHeight: 1.6 }}>
                      A single unit at this location converts {site.borehole_count} unusable boreholes
                      into safe drinking water for {(site.pop_served || 0).toLocaleString()} people,
                      at ${site.cost_per_m3}/m³ with a {site.breakeven_yrs}-year breakeven.
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MAP VIEW ── */}
      {view === "map" && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.rule}`, height: 380 }}>
          <MapContainer
            center={[3.2, 35.5]}
            zoom={7}
            style={{ width: "100%", height: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {sites.map((site, i) => (
              <CircleMarker
                key={i}
                center={[site.latitude, site.longitude]}
                radius={8 + site.borehole_count * 0.8}
                fillColor={C.sky}
                color="#0f4d6e"
                fillOpacity={0.8}
                weight={2}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.97} permanent={false}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
                    Site {i + 1}
                  </div>
                  <div style={{ fontSize: 11, color: C.inkLight }}>
                    {site.borehole_count} boreholes · {site.breakeven_yrs}yr breakeven
                  </div>
                  <div style={{ fontSize: 11, color: C.safe, fontWeight: 700 }}>
                    Serves {(site.pop_served || 0).toLocaleString()} people
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Methodology note */}
      <div style={{ background: C.subtle, borderRadius: 10, padding: "12px 14px", fontSize: 11, color: C.inkLight, lineHeight: 1.7 }}>
        <span style={{ fontWeight: 700, color: C.inkMid }}>Methodology: </span>
        134 saline/brackish boreholes clustered on a 0.4° grid. Each cluster centroid
        scored by borehole density, average EC severity, and economic viability.
        Economics based on small-scale solar desalination ($85,000 capex, $0.82/m³ opex).
        Population estimates use Turkana County average density of 12 people/km².
        Data: Rural Focus Ltd / WRA Kenya.
      </div>
    </div>
  )
}

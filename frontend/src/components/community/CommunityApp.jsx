import { useState, useEffect } from "react"
import { collection, addDoc } from "firebase/firestore"
import { db } from "../../lib/firebase"
import WaterMap from "../map/WaterMap"
import { useWaterPoints, useSubmitReport } from "../../hooks/useWaterPath"
import { getSafetyLevel, getFlowSignal, getSaltSignal, getWalkTime } from "../../utils/waterInterpretation"

// Fonts in index.html:
// <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=IBM+Plex+Mono:wght@400;500;600&family=Karla:wght@400;500;600;700&display=swap" rel="stylesheet">
// Images in frontend/public/:
//   /turkana-hero.jpg  /turkana-children.jpg

const F = {
  display: "'Playfair Display', Georgia, serif",
  mono:    "'IBM Plex Mono', monospace",
  body:    "'Karla', system-ui, sans-serif",
}

const C = {
  page:     "#F5EFE6",
  surface:  "#FFFFFF",
  lifted:   "#F5EDE0",
  ink:      "#2C1A0E",
  inkMid:   "#6B4A30",
  inkLight: "#9E7A5A",
  inkFaint: "#C4A882",
  rule:     "#EAE0D0",
  sand:     "#EDE3D4",
  rust:     "#C0522A",
  rustBg:   "#FAEAE3",
  amber:    "#C48A2A",
  amberBg:  "#FDF4E0",
  sage:     "#5A7A40",
  sageBg:   "#EAF2E0",
}

// ── Translations ───────────────────────────────────────────────────────────
const T = {
  en: {
    langName:        "English",
    nearestWater:    "Nearest water points",
    heroTagline:     "Find safe water,\nclose to you.",
    nearLocation:    "Near",
    locationSub:     "Location detected",
    boreholesLoaded: "boreholes loaded",
    nearestToYou:    "Nearest to you",
    of:              "of",
    tapForDetails:   "Tap for details & directions",
    reportProblem:   "Report a problem",
    reportSub:       "Help your community · takes 1 minute",
    safeToDrink:     "Safe to drink",
    useWithCare:     "Use with caution",
    notSafe:         "Not safe",
    km:              "km",
    reportTitle:     "Report a problem",
    step1Label:      "Step 1 of 3 — What's wrong?",
    step2Label:      "Step 2 of 3 — Which borehole?",
    step3Label:      "Step 3 — Review & submit",
    problemType:     "Problem type",
    whatDidYouFind:  "What did you\nfind at the borehole?",
    problems: [
      { label: "No water coming out",  sub: "Pump failure / dry"  },
      { label: "Water looks dirty",    sub: "Colour or smell"     },
      { label: "Pump is broken",       sub: "Can't operate it"    },
      { label: "Animals in the water", sub: "Contamination risk"  },
      { label: "Access blocked",       sub: "Can't get to it"     },
      { label: "Other problem",        sub: "Describe it"         },
    ],
    nextConfirm:     "Next — Confirm borehole",
    isThisRight:     "Is this the right borehole?",
    nearestToLoc:    "Nearest to your location",
    wrongBorehole:   "This isn't the right borehole",
    yesCorrect:      "Yes, this is correct",
    reviewSubmit:    "Review & submit",
    problemReported: "Problem reported",
    borehole:        "Borehole",
    yourLocation:    "Your location",
    fromBorehole:    "from borehole",
    submitReport:    "Submit report",
    anonymous:       "Anonymous · your name is never shared",
    successTitle:    "Report submitted.",
    successSub:      "Thank you. A repair team has been notified.",
    successId:       "Your report ID",
    backHome:        "Back to water map",
    locating:        "Finding your location...",
    boreholeLocation:"Borehole location",
    away:            "away",
    navHome:         "Home",
    navMap:          "Map",
    navReport:       "Report",
  },

  sw: {
    langName:        "Kiswahili",
    nearestWater:    "Visima vya maji karibu nawe",
    heroTagline:     "Pata maji salama,\nkaribu nawe.",
    nearLocation:    "Karibu na",
    locationSub:     "Mahali pamepatikana",
    boreholesLoaded: "visima vimepakiwa",
    nearestToYou:    "Karibu nawe zaidi",
    of:              "kati ya",
    tapForDetails:   "Gusa kwa maelezo na maelekezo",
    reportProblem:   "Ripoti tatizo",
    reportSub:       "Saidia jamii yako · dakika 1",
    safeToDrink:     "Salama kunywa",
    useWithCare:     "Tumia kwa tahadhari",
    notSafe:         "Si salama",
    km:              "km",
    reportTitle:     "Ripoti tatizo",
    step1Label:      "Hatua 1 ya 3 — Ni nini tatizo?",
    step2Label:      "Hatua 2 ya 3 — Kisima gani?",
    step3Label:      "Hatua 3 — Kagua na wasilisha",
    problemType:     "Aina ya tatizo",
    whatDidYouFind:  "Ulipata nini\nkwenye kisima?",
    problems: [
      { label: "Hakuna maji yanayotoka",  sub: "Pampu imeshindwa / kavu" },
      { label: "Maji yanaonekana machafu", sub: "Rangi au harufu"        },
      { label: "Pampu imevunjika",         sub: "Haiwezi kufanya kazi"   },
      { label: "Wanyama kwenye maji",      sub: "Hatari ya uchafuzi"     },
      { label: "Njia imezuiwa",            sub: "Haiwezekani kufika"     },
      { label: "Tatizo lingine",           sub: "Elezea"                 },
    ],
    nextConfirm:     "Ifuatayo — Thibitisha kisima",
    isThisRight:     "Je, hiki ni kisima sahihi?",
    nearestToLoc:    "Karibu zaidi na mahali pako",
    wrongBorehole:   "Hiki si kisima sahihi",
    yesCorrect:      "Ndiyo, hii ni sahihi",
    reviewSubmit:    "Kagua na wasilisha",
    problemReported: "Tatizo lililoripotiwa",
    borehole:        "Kisima",
    yourLocation:    "Mahali pako",
    fromBorehole:    "kutoka kisimani",
    submitReport:    "Wasilisha ripoti",
    anonymous:       "Ya siri · jina lako halikuwa linashirikiwa",
    successTitle:    "Ripoti imewasilishwa.",
    successSub:      "Asante. Timu ya ukarabati imearifahiwa.",
    successId:       "Nambari ya ripoti yako",
    backHome:        "Rudi kwenye ramani ya maji",
    locating:        "Inatafuta mahali pako...",
    boreholeLocation:"Mahali pa kisima",
    away:            "mbali",
    navHome:         "Nyumbani",
    navMap:          "Ramani",
    navReport:       "Ripoti",
  },

  tu: null, // Turkana — shows contribution screen
}

// ── ML: auto-trigger predictions for boreholes with no prediction_label ────
// POST /api/water-points/predict-quality with point_id so Flask writes the
// result back to Firestore. The Firestore listener picks it up automatically.
async function triggerMissingPredictions(points) {
  const unpredicted = points.filter(
    p => !p.prediction_label && p.latitude && p.longitude
  )
  for (const p of unpredicted) {
    try {
      await fetch("/api/water-points/predict-quality", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude:   p.latitude,
          longitude:  p.longitude,
          well_depth: p.well_depth || 0,
          ph:         p.ph         || 7.5,
          point_id:   p.id,
        }),
      })
    } catch (_) {
      // fire-and-forget — never crash the app if ML API is down
    }
  }
}

// ── Card-list safety colour from ML prediction (priority) or status ────────
function safetyFromPoint(point, t) {
  const s = getSafetyLevel(point)
  if (s.level === "safe")   return { tag: t.safeToDrink, tagColor: C.sage,  tagBg: C.sageBg,  dot: C.sage,  border: C.sage  }
  if (s.level === "unsafe") return { tag: t.notSafe,     tagColor: C.rust,  tagBg: C.rustBg,  dot: C.rust,  border: C.rust  }
  return                           { tag: t.useWithCare,  tagColor: C.amber, tagBg: C.amberBg, dot: C.amber, border: C.amber }
}

// ── Nav icons ──────────────────────────────────────────────────────────────
function HomeIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function MapIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  )
}
function ReportIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

// ── Language bar ───────────────────────────────────────────────────────────
function LangBar({ lang, setLang }) {
  return (
    <div style={{ background: C.surface, padding: "10px 16px", display: "flex", gap: 8, borderBottom: `1px solid ${C.rule}`, flexShrink: 0 }}>
      {[{ id: "en", label: "English" }, { id: "sw", label: "Kiswahili" }, { id: "tu", label: "Turkana" }].map(l => (
        <button key={l.id} onClick={() => setLang(l.id)} style={{
          flex: 1, padding: "8px 4px", borderRadius: 8,
          border: `1.5px solid ${lang === l.id ? C.ink : C.rule}`,
          background: lang === l.id ? C.ink : C.lifted,
          color: lang === l.id ? "#FFE082" : C.inkLight,
          fontFamily: F.mono, fontSize: 10, letterSpacing: "0.06em",
          cursor: "pointer", transition: "all 0.15s",
          fontWeight: lang === l.id ? 600 : 400,
        }}>{l.label}</button>
      ))}
    </div>
  )
}

// ── Bottom nav ─────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, t }) {
  const tabs = [
    { id: "home",   label: t?.navHome   || "Home",   icon: HomeIcon   },
    { id: "map",    label: t?.navMap    || "Map",    icon: MapIcon    },
    { id: "report", label: t?.navReport || "Report", icon: ReportIcon },
  ]
  return (
    <div style={{
      background: C.surface, borderTop: `1px solid ${C.rule}`,
      display: "flex", flexShrink: 0,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      boxShadow: "0 -2px 16px rgba(44,26,14,0.07)",
    }}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = tab === id
        return (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "12px 4px 10px",
            border: "none", background: "transparent",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            cursor: "pointer",
            borderTop: `2px solid ${active ? C.rust : "transparent"}`,
            transition: "border-color 0.15s",
          }}>
            <Icon color={active ? C.rust : C.inkFaint} />
            <span style={{
              fontFamily: F.mono, fontSize: 8, letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: active ? C.rust : C.inkFaint,
              fontWeight: active ? 600 : 400,
            }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── TURKANA CONTRIBUTION SCREEN ────────────────────────────────────────────
function TurkanaScreen() {
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail]         = useState("")
  const [name, setName]           = useState("")

  const handleSubmit = async () => {
    if (!email) return
    try {
      await addDoc(collection(db, "language_volunteers"), {
        name, email, language: "Turkana", submitted_at: new Date().toISOString()
      })
    } catch (e) { console.error(e) }
    setSubmitted(true)
  }

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
        <img src="/turkana-hero.jpg" alt="Turkana community"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(210,155,90,0.0) 20%, rgba(44,22,8,0.82) 90%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 22px 22px" }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#FFE082", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
            Ng'aTurkana
          </div>
          <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.35, fontStyle: "italic" }}>
            Help us speak your language.
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, padding: "24px 22px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 10, lineHeight: 1.3 }}>
          We're building Turkana language support with the community.
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkLight, lineHeight: 1.8 }}>
          WaterPath works best when it speaks your language. We're looking for Turkana speakers
          to help translate the app into Ng'aTurkana — so that everyone in the community can
          use it, not just those who speak English or Kiswahili.
        </div>
      </div>

      <div style={{ background: C.lifted, padding: "20px 22px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 18 }}>
          What you'd help with
        </div>
        {[
          { num: "01", text: "Translating about 40 short phrases — takes roughly 30 minutes" },
          { num: "02", text: "Reviewing translations from other community members"            },
          { num: "03", text: "Testing the app and giving feedback in your language"          },
        ].map(item => (
          <div key={item.num} style={{ display: "flex", gap: 16, marginBottom: 18, alignItems: "flex-start" }}>
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: C.inkFaint, flexShrink: 0, paddingTop: 1 }}>{item.num}</span>
            <span style={{ fontFamily: F.body, fontSize: 13, color: C.inkMid, lineHeight: 1.7 }}>{item.text}</span>
          </div>
        ))}
      </div>

      {submitted ? (
        <div style={{ background: C.sageBg, margin: "20px 16px", borderRadius: 16, padding: "28px 22px", textAlign: "center", border: `1px solid ${C.sage}33` }}>
          <div style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.sage, marginBottom: 10, fontStyle: "italic" }}>Thank you.</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkMid, lineHeight: 1.8 }}>
            We'll be in touch soon. Your help will make WaterPath work for every Turkana community member.
          </div>
        </div>
      ) : (
        <div style={{ background: C.surface, padding: "22px 22px 12px" }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 18 }}>
            Sign up to help
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7 }}>Your name (optional)</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Akiru"
              style={{ width: "100%", padding: "13px 14px", borderRadius: 10, border: `1.5px solid ${C.rule}`, fontSize: 14, fontFamily: F.body, color: C.ink, background: C.lifted, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7 }}>Phone or email *</div>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. +254 7xx xxx xxx"
              style={{ width: "100%", padding: "13px 14px", borderRadius: 10, border: `1.5px solid ${email ? C.sage : C.rule}`, fontSize: 14, fontFamily: F.body, color: C.ink, background: C.lifted, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }} />
          </div>
          <button onClick={handleSubmit} disabled={!email} style={{
            width: "100%", padding: "15px 0", background: email ? C.ink : C.sand,
            border: "none", borderRadius: 12, color: email ? "#FFE082" : C.inkFaint,
            fontFamily: F.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
            textTransform: "uppercase", cursor: email ? "pointer" : "not-allowed", transition: "all 0.15s",
          }}>
            I want to help
          </button>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textAlign: "center", marginTop: 12, lineHeight: 1.7, letterSpacing: "0.06em", paddingBottom: 8 }}>
            We'll reach out by phone or email. No spam, ever.
          </div>
        </div>
      )}
      <div style={{ height: 32 }} />
    </div>
  )
}

// ── BOREHOLE DETAIL SHEET ──────────────────────────────────────────────────
function BoreholeSheet({ point, userLocation, lang, onClose, onReport }) {
  const t = T[lang]

  // point.distance_km is pre-computed by useWaterPoints hook.
  // If the sheet is opened from the map tab (where point may lack it),
  // we fall back to a quick inline calculation.
  const distance = point.distance_km ?? (
    userLocation && point.latitude && point.longitude
      ? (() => {
          const R    = 6371
          const dLat = (point.latitude  - userLocation.lat) * Math.PI / 180
          const dLon = (point.longitude - (userLocation.lon ?? userLocation.lng)) * Math.PI / 180
          const a    = Math.sin(dLat/2)**2 +
                       Math.cos(userLocation.lat*Math.PI/180) *
                       Math.cos(point.latitude*Math.PI/180)   *
                       Math.sin(dLon/2)**2
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        })()
      : null
  )

  const safety   = getSafetyLevel(point)
  const flow     = getFlowSignal(point.yield_ls)
  const salt     = getSaltSignal(point.ec)
  const walkTime = getWalkTime(distance)
  const mlConf   = point.prediction_confidence
    ? Math.round(point.prediction_confidence * 100)
    : null

  const statusSignal = (() => {
    const s = point.operation_status
    if (s === "functional")     return { label: "Working",      sub: "Pump is on",     color: C.sage,     bg: C.sageBg  }
    if (s === "issues")         return { label: "Has problems", sub: "Use with care",  color: C.amber,    bg: C.amberBg }
    if (s === "non_functional") return { label: "Broken",       sub: "Not working",    color: C.rust,     bg: C.rustBg  }
    return                             { label: "Unknown",      sub: "Status unclear", color: C.inkLight, bg: C.lifted  }
  })()

  const flowStyle = flow.label === "Good flow"
    ? { color: C.sage, bg: C.sageBg }
    : flow.label === "Very low"
    ? { color: C.rust, bg: C.rustBg }
    : { color: C.amber, bg: C.amberBg }

  const saltStyle = salt.label === "Fresh"
    ? { color: C.sage, bg: C.sageBg }
    : salt.label === "Very salty"
    ? { color: C.rust, bg: C.rustBg }
    : { color: C.amber, bg: C.amberBg }

  const handleDirections = () => {
    if (!point.latitude || !point.longitude) return
    const dest = `${point.latitude},${point.longitude}`
    const url  = userLocation
      ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lon ?? userLocation.lng}/${dest}`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`
    window.open(url, "_blank")
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(44,26,14,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surface, width: "100%", maxHeight: "88vh", overflowY: "auto",
          borderRadius: "20px 20px 0 0",
          borderTop: `4px solid ${safety.color}`,
          boxShadow: "0 -12px 56px rgba(44,26,14,0.12)",
          paddingBottom: 36,
        }}
      >
        {/* Handle + name */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: C.sand, margin: "0 auto 16px" }} />
          <div style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{point.name}</div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {point.locality || "Turkana County"}{distance != null ? ` · ${distance.toFixed(1)} km` : ""}
          </div>
        </div>

        {/* Big safety indicator: colour + SVG symbol + plain-language text */}
        <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", background: safety.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
              <path d="M25 6 C18 14 11 21 11 30 a14 14 0 0 0 28 0 C39 21 32 14 25 6Z" fill={safety.color} opacity="0.85"/>
              {safety.level === "safe" && (
                <path d="M18 31 L23 36 L34 23" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              )}
              {safety.level === "caution" && (
                <>
                  <line x1="25" y1="23" x2="25" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="25" cy="36" r="1.8" fill="white"/>
                </>
              )}
              {safety.level === "unsafe" && (
                <path d="M19 23 L31 37 M31 23 L19 37" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              )}
            </svg>
          </div>

          <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: safety.color, textAlign: "center" }}>
            {safety.headline}
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkMid, textAlign: "center", maxWidth: 260, lineHeight: 1.65 }}>
            {safety.body}
          </div>

          {mlConf && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%", maxWidth: 200, marginTop: 4 }}>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, letterSpacing: "0.08em" }}>
                AI confidence · {mlConf}%
              </div>
              <div style={{ height: 4, width: "100%", background: C.sand, borderRadius: 2 }}>
                <div style={{ height: 4, width: `${mlConf}%`, background: safety.color, borderRadius: 2, transition: "width 0.6s ease" }} />
              </div>
            </div>
          )}
        </div>

        {/* Three signal pills */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 16px 16px" }}>
          {[
            { bg: statusSignal.bg, color: statusSignal.color, label: statusSignal.label, sub: statusSignal.sub },
            { bg: flowStyle.bg,    color: flowStyle.color,    label: flow.label,         sub: flow.sub         },
            { bg: saltStyle.bg,    color: saltStyle.color,    label: salt.label,         sub: salt.sub         },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: s.color, textAlign: "center" }}>{s.label}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.inkLight, textAlign: "center", lineHeight: 1.4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Community reports */}
        {point.report_count > 0 && (
          <div style={{ margin: "0 16px 16px", background: C.rustBg, border: `0.5px solid ${C.rust}33`, borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.rust, flexShrink: 0, marginTop: 3, display: "inline-block" }} />
            <div>
              <div style={{ fontFamily: F.body, fontSize: 13, color: "#7B1F0F", lineHeight: 1.5 }}>
                {point.report_count} {point.report_count === 1 ? "person" : "people"} reported a problem here recently
              </div>
              {point.last_problem_type && (
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkLight, marginTop: 3 }}>
                  Most recent: {point.last_problem_type.toLowerCase()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Walk time */}
        {walkTime && (
          <div style={{ margin: "0 16px 20px", background: C.lifted, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="11" r="4" stroke={C.inkMid} strokeWidth="1.8"/>
              <path d="M14 3 C8 3 3 8 3 13 C3 20 14 25 14 25 C14 25 25 20 25 13 C25 8 20 3 14 3Z" stroke={C.inkMid} strokeWidth="1.8" fill="none"/>
            </svg>
            <div>
              <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.ink }}>{distance?.toFixed(1)} km</div>
              <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkLight }}>{walkTime}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, padding: "0 16px" }}>
          <button
            onClick={handleDirections}
            style={{
              background: C.ink, border: "none", borderRadius: 12, padding: "16px 0",
              color: "#FFE082", fontFamily: F.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#FFE082" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 8 L14 8 M9 3 L14 8 L9 13"/>
            </svg>
            Get directions
          </button>
          <button
            onClick={() => { onClose(); onReport(point) }}
            style={{
              background: C.rustBg, border: `0.5px solid ${C.rust}44`, borderRadius: 12, padding: "16px 0",
              color: C.rust, fontFamily: F.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Report
          </button>
        </div>
      </div>
    </div>
  )
}

// ── HOME SCREEN ────────────────────────────────────────────────────────────
function HomeScreen({ lang, waterPoints, userLocation, loading, onGoReport }) {
  const t = T[lang]
  const [selectedPoint, setSelectedPoint] = useState(null)

  // Hook already sorts by distance — take first 3
  const nearest = waterPoints.slice(0, 3)

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* Hero */}
      <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
        <img src="/turkana-hero.jpg" alt="Turkana community"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 38%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(170deg, rgba(210,155,90,0.0) 20%, rgba(44,22,8,0.80) 90%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 22px 20px" }}>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 7 }}>
            {t.nearestWater}
          </div>
          <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.3, fontStyle: "italic", whiteSpace: "pre-line" }}>
            {t.heroTagline}
          </div>
        </div>
      </div>

      {/* Location bar */}
      <div style={{ background: C.surface, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.rule}` }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: userLocation ? C.sage : C.amber, display: "inline-block", flexShrink: 0, animation: "pulse 2s infinite" }} />
        <div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: C.inkMid }}>
            {loading ? t.locating : userLocation ? `${t.nearLocation} Lodwar Town` : t.locating}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, marginTop: 1 }}>
            {t.locationSub} · {waterPoints.length} {t.boreholesLoaded}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ background: C.lifted, paddingTop: 4, paddingBottom: 4 }}>
        <div style={{ padding: "14px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.14em" }}>{t.nearestToYou}</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint }}>3 {t.of} {waterPoints.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: F.mono, fontSize: 11, color: C.inkFaint, letterSpacing: "0.12em" }}>
            {t.locating}
          </div>
        ) : (
          nearest.map(pt => {
            const sm = safetyFromPoint(pt, t)
            return (
              <div key={pt.id} style={{ margin: "0 14px 10px" }}>
                <div
                  style={{
                    background: C.surface, borderRadius: 16,
                    border: `1px solid ${C.rule}`,
                    borderTop: `3px solid ${sm.border}`,
                    overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(44,26,14,0.05)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedPoint(pt)}
                >
                  <div style={{ padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: sm.dot, flexShrink: 0, marginTop: 5, display: "inline-block" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 3, lineHeight: 1.2 }}>{pt.name}</div>
                      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, marginBottom: 9 }}>
                        {pt.locality || "Turkana County"}
                      </div>
                      <span style={{ fontFamily: F.mono, fontSize: 8, fontWeight: 600, padding: "3px 9px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.1em", background: sm.tagBg, color: sm.tagColor }}>
                        {sm.tag}
                      </span>
                    </div>
                    {pt.distance_km != null && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 900, color: C.ink, lineHeight: 1 }}>{pt.distance_km.toFixed(1)}</div>
                        <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{t.km}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: `1px solid ${C.rule}`, padding: "11px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: F.body, fontSize: 12, color: C.inkLight }}>{t.tapForDetails}</span>
                    <span style={{ color: C.inkFaint, fontSize: 18 }}>›</span>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Report FAB */}
        <div onClick={onGoReport} style={{
          margin: "6px 14px 20px", background: C.rust, borderRadius: 14,
          padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 4px 20px rgba(192,82,42,0.25)", cursor: "pointer",
        }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ReportIcon color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.body, fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{t.reportProblem}</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>{t.reportSub}</div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 20 }}>›</span>
        </div>
      </div>

      {selectedPoint && (
        <BoreholeSheet
          point={selectedPoint}
          userLocation={userLocation}
          lang={lang}
          onClose={() => setSelectedPoint(null)}
          onReport={pt => { setSelectedPoint(null); onGoReport(pt) }}
        />
      )}
    </div>
  )
}

// ── REPORT SCREEN ──────────────────────────────────────────────────────────
function ReportScreen({ lang, waterPoints, userLocation, onBack, onSuccess }) {
  const t = T[lang]
  const { submitReport, submitting } = useSubmitReport()

  const [step, setStep]             = useState(1)
  const [problem, setProblem]       = useState(null)
  const [borehole, setBorehole]     = useState(null)
  const [showPicker, setShowPicker] = useState(false)

  // Pre-select nearest borehole (hook already sorts by distance)
  useEffect(() => {
    if (waterPoints.length) setBorehole(waterPoints[0])
  }, [waterPoints])

  const handleSubmit = async () => {
    if (!problem || !borehole) return
    const result = await submitReport({
      water_point_id:    borehole.id,
      water_point_name:  borehole.name,
      problem_type:      problem.label,
      last_problem_type: problem.label,
      severity:          "medium",
    })
    if (result.success) onSuccess(result.report_id)
  }

  const stepLabel = step === 1 ? t.step1Label : step === 2 ? t.step2Label : t.step3Label

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* Top bar */}
      <div style={{ background: C.surface, padding: "13px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: `1px solid ${C.rule}` }}>
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} style={{
          width: 34, height: 34, borderRadius: "50%", background: C.lifted,
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, color: C.inkMid, cursor: "pointer", flexShrink: 0,
        }}>‹</button>
        <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.ink }}>{t.reportTitle}</span>
      </div>

      {/* Progress */}
      <div style={{ padding: "14px 20px 4px", display: "flex", gap: 8, alignItems: "center" }}>
        {[1,2,3].map(s => (
          <div key={s} style={{
            height: 6, borderRadius: 3, transition: "all 0.3s",
            background: s < step ? C.ink : s === step ? C.rust : C.sand,
            width: s === step ? 36 : s < step ? 24 : 20,
          }} />
        ))}
        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.1em", marginLeft: 4 }}>
          {stepLabel}
        </span>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div>
          <div style={{ padding: "16px 20px 14px" }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>{t.problemType}</div>
            <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.25, whiteSpace: "pre-line" }}>{t.whatDidYouFind}</div>
          </div>
          <div style={{ padding: "0 14px 4px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {t.problems.map((p, i) => (
              <div key={i} onClick={() => setProblem(p)} style={{
                background: problem?.label === p.label ? C.rustBg : C.surface,
                border: `1.5px solid ${problem?.label === p.label ? C.rust : C.rule}`,
                borderRadius: 14, padding: "16px 14px", cursor: "pointer", transition: "all 0.15s",
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: problem?.label === p.label ? C.rust : C.sand, marginBottom: 10, transition: "background 0.15s" }} />
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3, marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, letterSpacing: "0.06em" }}>{p.sub}</div>
              </div>
            ))}
          </div>
          <div onClick={() => problem && setStep(2)} style={{
            margin: "16px 14px", background: problem ? C.ink : C.sand,
            borderRadius: 14, padding: "15px", textAlign: "center",
            cursor: problem ? "pointer" : "not-allowed",
          }}>
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: problem ? "#FFE082" : C.inkFaint, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {t.nextConfirm}
            </span>
          </div>
          <div style={{ height: 24 }} />
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div>
          <div style={{ padding: "16px 20px 14px" }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>{t.boreholeLocation}</div>
            <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>{t.isThisRight}</div>
          </div>
          {!showPicker ? (
            borehole && (
              <div style={{ padding: "0 14px" }}>
                <div style={{ background: C.surface, borderRadius: 16, border: `1.5px solid ${C.sage}`, overflow: "hidden" }}>
                  <div style={{ padding: "18px" }}>
                    <div style={{ fontFamily: F.mono, fontSize: 8, color: C.sage, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>{t.nearestToLoc}</div>
                    <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{borehole.name}</div>
                    {borehole.distance_km != null && (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                        <span style={{ fontFamily: F.display, fontSize: 32, fontWeight: 900, color: C.ink, lineHeight: 1 }}>{borehole.distance_km.toFixed(1)}</span>
                        <span style={{ fontFamily: F.mono, fontSize: 10, color: C.inkLight, textTransform: "uppercase" }}>{t.km} {t.away}</span>
                      </div>
                    )}
                  </div>
                  <div onClick={() => setShowPicker(true)} style={{ borderTop: `1px solid ${C.rule}`, padding: "12px 18px", textAlign: "center", cursor: "pointer" }}>
                    <span style={{ fontFamily: F.body, fontSize: 12, color: C.rust, textDecoration: "underline" }}>{t.wrongBorehole}</span>
                  </div>
                </div>
                <div onClick={() => setStep(3)} style={{
                  background: C.ink, borderRadius: 14, padding: "15px",
                  textAlign: "center", cursor: "pointer", marginTop: 12,
                }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: "#FFE082", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {t.yesCorrect}
                  </span>
                </div>
              </div>
            )
          ) : (
            <div style={{ padding: "0 14px" }}>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Select borehole</div>
              {waterPoints.slice(0, 8).map(p => (
                <div key={p.id} onClick={() => { setBorehole(p); setShowPicker(false); setStep(3) }} style={{
                  background: C.surface, borderRadius: 12, padding: "14px 16px", marginBottom: 8,
                  border: `1px solid ${C.rule}`, cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint }}>
                      {p.locality || "Turkana"}{p.distance_km != null ? ` · ${p.distance_km.toFixed(1)} km` : ""}
                    </div>
                  </div>
                  <span style={{ color: C.inkFaint, fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ height: 32 }} />
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <div style={{ padding: "16px 20px 14px" }}>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>{t.reviewSubmit}</div>
            <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>Ready to submit?</div>
          </div>
          <div style={{ padding: "0 14px" }}>
            {[
              { label: t.problemReported, value: problem?.label },
              { label: t.borehole,        value: borehole?.name },
              { label: t.yourLocation,    value: borehole?.distance_km != null ? `${borehole.distance_km.toFixed(1)} ${t.km} ${t.fromBorehole}` : "—" },
            ].map(r => (
              <div key={r.label} style={{ background: C.surface, borderRadius: 12, padding: "14px 16px", marginBottom: 8, border: `1px solid ${C.rule}` }}>
                <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.ink }}>{r.value}</div>
              </div>
            ))}
          </div>
          <div onClick={!submitting ? handleSubmit : undefined} style={{
            margin: "14px 14px 0", background: C.rust, borderRadius: 14,
            padding: "15px", textAlign: "center",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}>
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {submitting ? "Submitting..." : t.submitReport}
            </span>
          </div>
          <div style={{ textAlign: "center", padding: "12px 20px", fontFamily: F.mono, fontSize: 9, color: C.inkFaint, letterSpacing: "0.08em" }}>
            {t.anonymous}
          </div>
          <div style={{ height: 24 }} />
        </div>
      )}
    </div>
  )
}

// ── SUCCESS SCREEN ─────────────────────────────────────────────────────────
function SuccessScreen({ lang, reportId, onBack }) {
  const t = T[lang]
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
      <div style={{ position: "relative", width: 120, height: 120, borderRadius: "50%", overflow: "hidden", marginBottom: 24, boxShadow: "0 8px 32px rgba(44,26,14,0.15)" }}>
        <img src="/turkana-children.jpg" alt="Children"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }} />
      </div>
      <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, marginBottom: 10, lineHeight: 1.2 }}>{t.successTitle}</div>
      <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkLight, lineHeight: 1.7, marginBottom: 28, maxWidth: 280 }}>{t.successSub}</div>
      <div style={{ background: C.lifted, borderRadius: 12, padding: "14px 20px", marginBottom: 32, border: `1px solid ${C.rule}` }}>
        <div style={{ fontFamily: F.mono, fontSize: 8, color: C.inkFaint, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>{t.successId}</div>
        <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.rust }}>{reportId}</div>
      </div>
      <button onClick={onBack} style={{
        width: "100%", maxWidth: 280, padding: "15px 0", background: C.ink,
        border: "none", borderRadius: 14, color: "#FFE082",
        fontFamily: F.mono, fontSize: 11, fontWeight: 600,
        letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
      }}>{t.backHome}</button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function CommunityApp() {
  const [lang, setLang]               = useState("en")
  const [tab, setTab]                 = useState("home")
  const [reportScreen, setReportScreen] = useState("form")
  const [userLocation, setUserLocation] = useState(null)
  const [successId, setSuccessId]     = useState(null)
  const [mapSelected, setMapSelected] = useState(null)
  const [mlTriggered, setMlTriggered] = useState(false)

  // useWaterPoints expects { lat, lon } (note: .lon not .lng)
  const { points: waterPoints, loading } = useWaterPoints(userLocation)

  // Geolocation — store as { lat, lon } to match the hook's expectation
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => setUserLocation({ lat: 3.119, lon: 35.597 }) // fallback: Lodwar
    )
  }, [])

  // Trigger ML predictions once after first load for any borehole missing a label.
  // Flask writes prediction_label back to Firestore; the snapshot listener
  // picks it up automatically — no manual refresh needed.
  useEffect(() => {
    if (!loading && waterPoints.length && !mlTriggered) {
      setMlTriggered(true)
      triggerMissingPredictions(waterPoints)
    }
  }, [loading, waterPoints, mlTriggered])

  const handleLang = l => {
    setLang(l)
    if (l === "tu") setTab("home")
  }

  const handleNavTab = newTab => {
    setTab(newTab)
    if (newTab === "report") setReportScreen("form")
  }

  const t = T[lang]
  const showNav = !(tab === "report" && reportScreen === "success")

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: C.page, fontFamily: F.body,
      overflow: "hidden",
    }}>
      <LangBar lang={lang} setLang={handleLang} />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {lang === "tu" && <TurkanaScreen />}

        {lang !== "tu" && (
          <>
            {tab === "home" && (
              <HomeScreen
                lang={lang}
                waterPoints={waterPoints}
                userLocation={userLocation}
                loading={loading}
                onGoReport={() => { setTab("report"); setReportScreen("form") }}
              />
            )}

            {tab === "map" && (
              <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                <WaterMap
                  userLocation={userLocation}
                  onSelectPoint={pt => setMapSelected(pt)}
                  selectedPoint={mapSelected}
                />
                {mapSelected && (
                  <BoreholeSheet
                    point={mapSelected}
                    userLocation={userLocation}
                    lang={lang}
                    onClose={() => setMapSelected(null)}
                    onReport={() => { setMapSelected(null); setTab("report"); setReportScreen("form") }}
                  />
                )}
              </div>
            )}

            {tab === "report" && reportScreen === "form" && (
              <ReportScreen
                lang={lang}
                waterPoints={waterPoints}
                userLocation={userLocation}
                onBack={() => setTab("home")}
                onSuccess={id => { setSuccessId(id); setReportScreen("success") }}
              />
            )}

            {tab === "report" && reportScreen === "success" && (
              <SuccessScreen
                lang={lang}
                reportId={successId}
                onBack={() => { setTab("home"); setReportScreen("form") }}
              />
            )}
          </>
        )}
      </div>

      {showNav && (
        <BottomNav tab={lang === "tu" ? "home" : tab} setTab={handleNavTab} t={t} />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  )
}
import { useState } from "react"

const F = {
  display: "'Playfair Display', Georgia, serif",
  mono:    "'IBM Plex Mono', monospace",
  body:    "'Karla', system-ui, sans-serif",
}

const C = {
  page:    "#F5EFE6",
  surface: "#FFFFFF",
  lifted:  "#F5EDE0",
  ink:     "#2C1A0E",
  inkMid:  "#6B4A30",
  inkLight:"#9E7A5A",
  inkFaint:"#C4A882",
  rule:    "#EAE0D0",
  sand:    "#EDE3D4",
  rust:    "#C0522A",
  rustBg:  "#FAEAE3",
  sage:    "#5A7A40",
  sageBg:  "#EAF2E0",
}

// PIN is stored as an env var VITE_NGO_PIN — defaults to "1234" for dev
const CORRECT_PIN = import.meta.env.VITE_NGO_PIN || "1234"

export default function PinGate({ onUnlock }) {
  const [pin, setPin]       = useState("")
  const [error, setError]   = useState(false)
  const [shake, setShake]   = useState(false)

  const handleDigit = (d) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError(false)

    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        // Brief pause so the last dot fills before unlocking
        setTimeout(() => onUnlock(), 180)
      } else {
        setShake(true)
        setTimeout(() => { setPin(""); setError(true); setShake(false) }, 600)
      }
    }
  }

  const handleDelete = () => {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  const dots = [0,1,2,3].map(i => ({
    filled: i < pin.length,
    error,
  }))

  const keys = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    [null,"0","del"],
  ]

  return (
    <div style={{
      width: "100%", height: "100%",
      background: C.page,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: F.body, padding: 24,
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.inkFaint, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>
          WaterPath · NGO Operations
        </div>
        <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
          Field Officer Access
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkLight, marginTop: 8 }}>
          Enter your 4-digit PIN to continue
        </div>
      </div>

      {/* PIN dots */}
      <div style={{
        display: "flex", gap: 18, marginBottom: 48,
        animation: shake ? "shake 0.5s ease" : "none",
      }}>
        {dots.map((dot, i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: dot.error ? C.rust : dot.filled ? C.ink : "transparent",
            border: `2px solid ${dot.error ? C.rust : dot.filled ? C.ink : C.inkFaint}`,
            transition: "all 0.15s",
          }} />
        ))}
      </div>

      {/* Error message */}
      <div style={{
        fontFamily: F.mono, fontSize: 10, color: C.rust,
        letterSpacing: "0.12em", textTransform: "uppercase",
        marginBottom: error ? 20 : 0,
        height: 16, transition: "all 0.2s",
        opacity: error ? 1 : 0,
      }}>
        Incorrect PIN
      </div>

      {/* Keypad */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {keys.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 12 }}>
            {row.map((key, ki) => {
              if (key === null) return <div key={ki} style={{ width: 72, height: 72 }} />
              const isDel = key === "del"
              return (
                <button key={ki}
                  onClick={() => isDel ? handleDelete() : handleDigit(key)}
                  style={{
                    width: 72, height: 72, borderRadius: 16,
                    border: `1.5px solid ${C.rule}`,
                    background: isDel ? C.lifted : C.surface,
                    color: isDel ? C.inkLight : C.ink,
                    fontFamily: isDel ? F.mono : F.display,
                    fontSize: isDel ? 12 : 26,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(44,26,14,0.06)",
                    transition: "all 0.1s",
                    letterSpacing: isDel ? "0.06em" : 0,
                  }}
                  onMouseDown={e => e.currentTarget.style.background = C.sand}
                  onMouseUp={e => e.currentTarget.style.background = isDel ? C.lifted : C.surface}
                  onTouchStart={e => e.currentTarget.style.background = C.sand}
                  onTouchEnd={e => e.currentTarget.style.background = isDel ? C.lifted : C.surface}
                >
                  {isDel ? "⌫" : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0) }
          20%      { transform: translateX(-8px) }
          40%      { transform: translateX(8px) }
          60%      { transform: translateX(-6px) }
          80%      { transform: translateX(6px) }
        }
      `}</style>
    </div>
  )
}

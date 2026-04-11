// utils/waterInterpretation.js

export function getSafetyLevel(point) {
  // ML prediction takes priority if available
  const q = (point.prediction_label || point.predicted_quality || point.water_quality || "").toLowerCase()

  if (q === "excellent" || q === "drinkable") {
    return {
      level:    "safe",
      color:    "#1D6F42",
      bg:       "#E8F5EE",
      border:   "#1D6F4244",
      headline: "Safe to drink",
      body:     "This water is clean. You can drink it every day.",
    }
  }
  if (q === "brackish") {
    return {
      level:    "caution",
      color:    "#92610A",
      bg:       "#FEF3DC",
      border:   "#92610A44",
      headline: "Use with caution",
      body:     "Water is salty. OK for washing. Drink a little — not every day.",
    }
  }
  if (q === "saline") {
    return {
      level:    "unsafe",
      color:    "#C1440E",
      bg:       "#FDEEE8",
      border:   "#C1440E44",
      headline: "Not safe to drink",
      body:     "Too much salt. Find another water source if you can.",
    }
  }
  // Fallback to operation_status
  if (point.operation_status === "non_functional") {
    return {
      level:    "unsafe",
      color:    "#C1440E",
      bg:       "#FDEEE8",
      border:   "#C1440E44",
      headline: "Not working",
      body:     "This pump is broken. Try the next nearest borehole.",
    }
  }
  return {
    level:    "caution",
    color:    "#92610A",
    bg:       "#FEF3DC",
    border:   "#92610A44",
    headline: "Quality unknown",
    body:     "We don't have recent data. Use your own judgement.",
  }
}

export function getFlowSignal(yield_ls) {
  if (!yield_ls) return { label: "Unknown flow", sub: "" }
  if (yield_ls >= 5) return { label: "Good flow",  sub: "No need to wait long" }
  if (yield_ls >= 1) return { label: "Low flow",   sub: "May need to wait" }
  return               { label: "Very low",  sub: "Long wait likely" }
}

export function getSaltSignal(ec) {
  if (!ec) return { label: "Unknown", sub: "" }
  if (ec < 500)  return { label: "Fresh",   sub: "Low salt — good" }
  if (ec < 1500) return { label: "Moderate", sub: "Some salt" }
  if (ec < 3000) return { label: "Salty",   sub: "Brackish water" }
  return               { label: "Very salty", sub: "Avoid drinking" }
}

export function getWalkTime(distance_km) {
  if (!distance_km) return null
  const minutes = Math.round(distance_km / 0.083)
  if (minutes < 60) return `About ${minutes} min walking`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `About ${hrs}h ${mins}min walking` : `About ${hrs}h walking`
}
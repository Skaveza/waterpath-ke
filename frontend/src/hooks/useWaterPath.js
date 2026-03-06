import { useState, useEffect, useMemo } from "react"
import { collection, onSnapshot, addDoc, updateDoc, doc, increment } from "firebase/firestore"
import { db } from "../lib/firebase"

// ── useWaterPoints ────────────────────────────────────────────────────────
// Firestore listener is independent of location.
// Distance is recalculated with useMemo whenever userLocation changes.
export function useWaterPoints(userLocation) {
  const [rawPoints, setRawPoints] = useState([])
  const [loading, setLoading]     = useState(true)

  // Firestore listener — fires once on mount, then on any data change
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "water_points"), snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRawPoints(data)
      setLoading(false)
    })
    return () => unsub()
  }, []) // no dependency on userLocation — runs independently

  // Distance calculation — re-runs whenever rawPoints OR userLocation changes
  const points = useMemo(() => {
    if (!userLocation || rawPoints.length === 0) return rawPoints

    const enriched = rawPoints.map(p => {
      const dist = haversine(userLocation.lat, userLocation.lon, p.latitude, p.longitude)
      return {
        ...p,
        distance_km:  Math.round(dist * 10) / 10,
        walk_minutes: Math.round(dist / 0.083),
      }
    })
    enriched.sort((a, b) => a.distance_km - b.distance_km)
    return enriched
  }, [rawPoints, userLocation])

  return { points, loading }
}

// ── useUserLocation ───────────────────────────────────────────────────────
export function useUserLocation() {
  const [location, setLocation] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ lat: 3.1191, lon: 35.5966 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => setLocation({ lat: 3.1191, lon: 35.5966 })
    )
  }, [])

  return location
}

// ── useSubmitReport ───────────────────────────────────────────────────────
export function useSubmitReport() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  const submitReport = async (reportData) => {
    setSubmitting(true)
    setError(null)
    try {
      const reportId = `WP-${Date.now().toString(36).toUpperCase()}`
      const report = {
        ...reportData,
        id:           reportId,
        status:       "open",
        submitted_at: new Date().toISOString(),
        channel:      "web",
      }

      await addDoc(collection(db, "reports"), report)

      if (reportData.water_point_id) {
        await updateDoc(doc(db, "water_points", reportData.water_point_id), {
          report_count:     increment(1),
          last_report_at:   new Date().toISOString(),
          operation_status: reportData.problem_type === "Borehole is Dry"
            ? "non_functional"
            : "issues",
        })
      }

      setSubmitting(false)
      return { success: true, report_id: reportId }
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
      return { success: false, error: err.message }
    }
  }

  return { submitReport, submitting, error }
}

// ── Haversine distance (km) ───────────────────────────────────────────────
export function haversine(lat1, lon1, lat2, lon2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
               Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

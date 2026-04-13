import { useState, useEffect, useMemo } from "react"
import { collection, onSnapshot, addDoc, updateDoc, doc, increment } from "firebase/firestore"
import { db } from "../lib/firebase"

// Distance and Navigation Helpers

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180

  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
  const x =
    Math.cos(lat1 * Math.PI / 180) *
    Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.cos(dLon)

  const brng = Math.atan2(y, x) * 180 / Math.PI
  return (brng + 360) % 360
}

// Main Hook (Single Source of Truth)

export function useWaterPoints(userLocation) {
  const [rawPoints, setRawPoints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "water_points"), snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setRawPoints(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const points = useMemo(() => {
    if (!rawPoints) return []

    return rawPoints.map(p => {
      let distance_km = null
      let walk_minutes = null
      let bearing = null

      if (userLocation && p.latitude && p.longitude) {
        distance_km = haversine(
          userLocation.lat,
          userLocation.lon,
          p.latitude,
          p.longitude
        )

        walk_minutes = Math.round(distance_km / 0.083)
        bearing = getBearing(
          userLocation.lat,
          userLocation.lon,
          p.latitude,
          p.longitude
        )
      }

      return {
        ...p,
        distance_km: distance_km ? Math.round(distance_km * 10) / 10 : null,
        walk_minutes,
        bearing: bearing ? Math.round(bearing) : null
      }
    }).sort((a, b) =>
      (a.distance_km ?? 9999) - (b.distance_km ?? 9999)
    )
  }, [rawPoints, userLocation])

  return { points, loading }
}

// Report Submission

export function useSubmitReport() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const submitReport = async (reportData) => {
    setSubmitting(true)
    setError(null)

    try {
      const reportId = `WP-${Date.now().toString(36).toUpperCase()}`

      const report = {
        ...reportData,
        id: reportId,
        status: "open",
        submitted_at: new Date().toISOString(),
        channel: "web",
      }

      await addDoc(collection(db, "reports"), report)

      if (reportData.water_point_id) {
        await updateDoc(doc(db, "water_points", reportData.water_point_id), {
          report_count: increment(1),
          last_report_at: new Date().toISOString(),
          operation_status:
            reportData.problem_type === "Borehole is Dry"
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
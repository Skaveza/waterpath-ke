// src/services/firestore/waterPoints.js

import { db } from "../../lib/firebase"
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore"

const COLLECTION = "water_points"

/**
 * Subscribe to realtime water points
 */
export function subscribeWaterPoints(callback) {
  return onSnapshot(collection(db, COLLECTION), (snapshot) => {
    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    callback(data)
  })
}

/**
 * Update operational status
 */
export async function updateWaterPointStatus(pointId, status) {
  await updateDoc(doc(db, COLLECTION, pointId), {
    operation_status: status,
  })
}

/**
 * Save ML prediction result into Firestore
 */
export async function saveWaterPointPrediction(pointId, prediction) {
  await updateDoc(doc(db, COLLECTION, pointId), {
    predicted_quality: prediction.predicted_quality,
    prediction_label: prediction.label,
    prediction_confidence: prediction.confidence,
    prediction_probabilities: prediction.probabilities,
    last_ml_update: new Date().toISOString(),
  })
}

/**
 * Optional: create water point (if needed later)
 */
export async function createWaterPoint(pointId, data) {
  await setDoc(doc(db, COLLECTION, pointId), data)
}
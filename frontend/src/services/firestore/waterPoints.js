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
 * Optional: create water point (if needed later)
 */
export async function createWaterPoint(pointId, data) {
  await setDoc(doc(db, COLLECTION, pointId), data)
}
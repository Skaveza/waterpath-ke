// src/services/navigationService.js

export function openNavigation(userLocation, point) {
  if (!point?.latitude || !point?.longitude) return null

  const lat = point.latitude
  const lng = point.longitude

  let url

  if (userLocation?.lat && userLocation?.lng) {
    url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${lat},${lng}`
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank")
  }

  return url
}
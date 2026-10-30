import { lazy, Suspense } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Landing from "./components/landing/Landing"

const CommunityApp = lazy(() => import("./components/community/CommunityApp"))
const NGODashboard = lazy(() => import("./components/dashboard/NGODashboard"))

function Loading() {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.1em", color: "#9E7A5A" }}>
      LOADING WATERPATH...
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Product page */}
          <Route path="/" element={<Landing />} />

          {/* Public app */}
          <Route path="/app" element={<CommunityApp />} />

          {/* NGO dashboard (PIN-gated demo) */}
          <Route path="/dashboard" element={<NGODashboard />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
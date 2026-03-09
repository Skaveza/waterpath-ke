import { useState } from "react"
import CommunityApp from "./components/community/CommunityApp"
import NGODashboard from "./components/dashboard/NGODashboard"
import PinGate from "./components/dashboard/PinGate"

export default function App() {
  const isNGO = window.location.pathname === "/dashboard"
  const [unlocked, setUnlocked] = useState(
    // Stay unlocked for the session once authenticated
    () => sessionStorage.getItem("ngo_unlocked") === "true"
  )

  const handleUnlock = () => {
    sessionStorage.setItem("ngo_unlocked", "true")
    setUnlocked(true)
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {isNGO
        ? unlocked
          ? <NGODashboard />
          : <PinGate onUnlock={handleUnlock} />
        : <CommunityApp />
      }
    </div>
  )
}

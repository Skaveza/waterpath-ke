import CommunityApp from "./components/community/CommunityApp"
import NGODashboard from "./components/dashboard/NGODashboard"

export default function App() {
  // Simple routing — /dashboard loads NGO view, everything else loads community app
  const isNGO = window.location.pathname === "/dashboard"

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {isNGO ? <NGODashboard /> : <CommunityApp />}
    </div>
  )
}

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import CommunityApp from "./components/community/CommunityApp"
import NGODashboard from "./components/dashboard/NGODashboard"

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public app */}
        <Route path="/" element={<CommunityApp />} />

        {/* NGO dashboard (we will protect this later) */}
        <Route path="/dashboard" element={<NGODashboard />} />
      </Routes>
    </Router>
  )
}
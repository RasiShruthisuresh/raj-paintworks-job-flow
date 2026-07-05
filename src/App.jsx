import { BarChart3, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import LeadForm from "./components/LeadForm.jsx";
import PipelineBoard from "./components/PipelineBoard.jsx";
import Analytics from "./pages/Analytics.jsx";
import { createLead, getLeads, updateLeadStage } from "./api.js";

export default function App() {
  const [leads, setLeads] = useState([]);
  const [view, setView] = useState("work");

  useEffect(() => {
    getLeads().then(setLeads);
  }, []);

  async function handleCreateLead(payload) {
    const newLead = await createLead(payload);
    setLeads([...leads, newLead]);
  }

  async function handleMoveLead(id, nextStage) {
    const updatedLead = await updateLeadStage(id, nextStage);
    setLeads(
      leads.map((lead) => {
        if (lead.id === id) {
          return updatedLead;
        }
        return lead;
      })
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Raj Paintworks</p>
          <h1>Commercial Painting Job Flow</h1>
        </div>
        <nav className="nav-tabs" aria-label="Primary">
          <button className={view === "work" ? "active" : ""} onClick={() => setView("work")}>
            <ClipboardList size={16} />
            Work
          </button>
          <button className={view === "analytics" ? "active" : ""} onClick={() => setView("analytics")}>
            <BarChart3 size={16} />
            Analytics
          </button>
        </nav>
      </header>

      {view === "work" ? (
        <main className="work-layout">
          <LeadForm onCreateLead={handleCreateLead} />
          <PipelineBoard leads={leads} onMoveLead={handleMoveLead} />
        </main>
      ) : (
        <Analytics leads={leads} />
      )}
    </div>
  );
}

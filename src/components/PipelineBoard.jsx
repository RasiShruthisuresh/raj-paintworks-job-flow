import { ArrowRight, Check } from "lucide-react";
import { formatINR } from "../format.js";

const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "quote_sent", label: "Quote sent" },
  { key: "customer_closed", label: "Customer closed" },
  { key: "work_finished", label: "Work finished" },
  { key: "invoice_sent", label: "Invoice sent" }
];

export default function PipelineBoard({ leads, onMoveLead }) {
  function nextStage(currentStage) {
    const currentIndex = STAGES.findIndex((stage) => stage.key === currentStage);
    if (currentIndex === -1 || currentIndex === STAGES.length - 1) {
      return null;
    }
    return STAGES[currentIndex + 1];
  }

  return (
    <section className="pipeline-board" aria-label="Painting work stages">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage.key);
        return (
          <div className="stage-column" key={stage.key}>
            <div className="stage-header">
              <h2>{stage.label}</h2>
              <span>{stageLeads.length}</span>
            </div>
            <div className="cards">
              {stageLeads.length === 0 ? (
                <p className="empty-state">No leads in this stage yet</p>
              ) : null}
              {stageLeads.map((lead) => {
                const next = nextStage(lead.stage);
                return (
                  <article className="lead-card" key={lead.id}>
                    <h3>{lead.customerName || "Untitled customer"}</h3>
                    <p>{lead.siteAddress}</p>
                    <strong>{formatINR(lead.estimatedValue)}</strong>
                    <small>{lead.notes}</small>
                    {next ? (
                      <button onClick={() => onMoveLead(lead.id, next.key)}>
                        Move to {next.label}
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <span className="stage-complete">
                        <Check size={14} />
                        Complete
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

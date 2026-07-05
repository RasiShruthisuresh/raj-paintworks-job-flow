import { useEffect, useState } from "react";
import { getAnalyticsSummary } from "../api.js";

export default function Analytics({ leads }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getAnalyticsSummary().then(setSummary);
  }, [leads]);

  const quoteValue = leads
    .filter((lead) => lead.stage === "quote_sent")
    .reduce((sum, lead) => sum + Number(lead.estimatedValue), 0);

  return (
    <main className="analytics-page">
      <section className="analytics-header">
        <p className="eyebrow">Preview</p>
        <h2>Job flow analytics</h2>
      </section>
      <section className="metric-grid">
        <div className="metric-card">
          <span>Total leads</span>
          <strong>{summary?.totalLeads || 0}</strong>
        </div>
        <div className="metric-card">
          <span>Open work value</span>
          <strong>Rs. {summary?.totalValue || 0}</strong>
        </div>
        <div className="metric-card">
          <span>Quote value</span>
          <strong>Rs. {quoteValue}</strong>
        </div>
      </section>
      <section className="placeholder-chart">
        <h3>Stage performance</h3>
        <div className="fake-bars">
          <div style={{ height: "72%" }} />
          <div style={{ height: "48%" }} />
          <div style={{ height: "30%" }} />
          <div style={{ height: "60%" }} />
          <div style={{ height: "22%" }} />
        </div>
      </section>
    </main>
  );
}

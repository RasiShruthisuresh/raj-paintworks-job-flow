import { useEffect, useState } from "react";
import { getAnalyticsDashboard } from "../api.js";

const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "quote_sent", label: "Quote sent" },
  { key: "customer_closed", label: "Customer closed" },
  { key: "work_finished", label: "Work finished" },
  { key: "invoice_sent", label: "Invoice sent" }
];

const STAGE_LABELS = STAGES.reduce((map, stage) => {
  map[stage.key] = stage.label;
  return map;
}, {});

function formatRupees(value) {
  return `Rs. ${Math.round(value || 0).toLocaleString("en-IN")}`;
}

function BarList({ items, labelKey, valueKey, countKey }) {
  if (items.length === 0) {
    return <p className="empty-state">No data for these filters</p>;
  }

  const maxValue = Math.max(...items.map((item) => item[valueKey]), 1);

  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item[labelKey]}>
          <div className="bar-row-label">
            <span>{item[labelKey]}</span>
            <span className="bar-row-count">
              {item[countKey]} lead{item[countKey] === 1 ? "" : "s"}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item[valueKey] / maxValue) * 100}%` }} />
          </div>
          <span className="bar-row-value">{formatRupees(item[valueKey])}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    stage: "",
    source: "",
    jobType: "",
    leadOwner: ""
  });

  useEffect(() => {
    getAnalyticsDashboard(filters)
      .then((data) => {
        setDashboard(data);
        setError(null);
      })
      .catch((err) => setError(err.message));
  }, [filters]);

  function updateFilter(event) {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value
    });
  }

  const metrics = dashboard?.metricSummary;
  const workload = dashboard?.workloadSignal;
  const filterOptions = dashboard?.filterOptions || { sources: [], jobTypes: [], leadOwners: [] };
  const stageBreakdown = (dashboard?.stageBreakdown || []).map((row) => ({
    ...row,
    label: STAGE_LABELS[row.stage] || row.stage
  }));

  return (
    <main className="analytics-page">
      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}

      <section className="analytics-header">
        <p className="eyebrow">Job flow</p>
        <h2>Analytics dashboard</h2>
      </section>

      <section className="filter-panel">
        <h2>Filters</h2>
        <div className="filter-row">
          <label>
            From
            <input type="date" name="startDate" value={filters.startDate} onChange={updateFilter} />
          </label>
          <label>
            To
            <input type="date" name="endDate" value={filters.endDate} onChange={updateFilter} />
          </label>
          <label>
            Stage
            <select name="stage" value={filters.stage} onChange={updateFilter}>
              <option value="">All stages</option>
              {STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select name="source" value={filters.source} onChange={updateFilter}>
              <option value="">All sources</option>
              {filterOptions.sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label>
            Job type
            <select name="jobType" value={filters.jobType} onChange={updateFilter}>
              <option value="">All job types</option>
              {filterOptions.jobTypes.map((jobType) => (
                <option key={jobType} value={jobType}>
                  {jobType}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lead owner
            <select name="leadOwner" value={filters.leadOwner} onChange={updateFilter}>
              <option value="">All owners</option>
              {filterOptions.leadOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="metric-grid">
        <div className="metric-card">
          <span>Total leads</span>
          <strong>{metrics?.totalLeads ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Open opportunity value</span>
          <strong>{formatRupees(metrics?.openValue)}</strong>
        </div>
        <div className="metric-card">
          <span>Closed value</span>
          <strong>{formatRupees(metrics?.closedValue)}</strong>
        </div>
        <div className="metric-card">
          <span>Invoices sent</span>
          <strong>{metrics?.invoicesSent ?? 0}</strong>
        </div>
        <div className="metric-card">
          <span>Avg. quote-to-close</span>
          <strong>{metrics?.avgQuoteToCloseDays != null ? `${metrics.avgQuoteToCloseDays.toFixed(1)}d` : "N/A"}</strong>
        </div>
      </section>

      <div className="analytics-grid">
        <section className="chart-panel">
          <h3>Stage breakdown</h3>
          <BarList items={stageBreakdown} labelKey="label" valueKey="value" countKey="count" />
        </section>

        <section className="chart-panel">
          <h3>Source performance</h3>
          <BarList items={dashboard?.sourcePerformance || []} labelKey="source" valueKey="closedValue" countKey="count" />
        </section>

        <section className="chart-panel">
          <h3>Job type mix</h3>
          <BarList items={dashboard?.jobTypeMix || []} labelKey="jobType" valueKey="value" countKey="count" />
        </section>

        <section className="chart-panel">
          <h3>Workload signal</h3>
          <div className="metric-grid">
            <div className="metric-card">
              <span>Active jobs</span>
              <strong>{workload?.activeJobCount ?? 0}</strong>
            </div>
            <div className="metric-card">
              <span>Avg. crew size</span>
              <strong>{workload?.averageCrewSize != null ? workload.averageCrewSize.toFixed(1) : "N/A"}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="entries-table-panel">
        <h2>Opportunities</h2>
        {!dashboard || dashboard.table.length === 0 ? (
          <p className="empty-state">No opportunities match these filters</p>
        ) : (
          <table className="entries-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Source</th>
                <th>Job type</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.table.map((row) => (
                <tr key={row.leadId}>
                  <td>{row.customerName}</td>
                  <td>{STAGE_LABELS[row.stage] || row.stage}</td>
                  <td>{formatRupees(row.value)}</td>
                  <td>{row.source}</td>
                  <td>{row.jobType}</td>
                  <td>{row.leadOwner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

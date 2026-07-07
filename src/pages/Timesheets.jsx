import { useEffect, useState } from "react";
import TeamMemberForm from "../components/TeamMemberForm.jsx";
import TimeEntryForm from "../components/TimeEntryForm.jsx";
import {
  createTeamMember,
  createTimeEntry,
  getTeamMembers,
  getTimeEntries,
  updateTeamMember,
  updateTimeEntry
} from "../api.js";

const WORK_TYPES = ["prep", "primer", "painting", "cleanup", "rework", "travel"];

function entryCost(entry) {
  if (entry.teamMemberRateType === "hourly") {
    return entry.payableHours * entry.teamMemberRate;
  }
  return (entry.payableHours / 8) * entry.teamMemberRate;
}

function getWeekStart(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function sumBy(entries, keyFn) {
  const totals = {};
  entries.forEach((entry) => {
    const key = keyFn(entry);
    totals[key] = (totals[key] || 0) + entry.payableHours;
  });
  return totals;
}

export default function Timesheets({ leads }) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [error, setError] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [filters, setFilters] = useState({
    jobId: "",
    teamMemberId: "",
    workType: "",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    getTeamMembers().then(setTeamMembers);
  }, []);

  useEffect(() => {
    getTimeEntries(filters).then(setTimeEntries);
  }, [filters]);

  async function handleCreateTeamMember(payload) {
    try {
      const created = await createTeamMember(payload);
      setTeamMembers([...teamMembers, created]);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function handleToggleActive(member) {
    try {
      const updated = await updateTeamMember(member.id, { ...member, isActive: !member.isActive });
      setTeamMembers(teamMembers.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateTimeEntry(payload) {
    try {
      const created = await createTimeEntry(payload);
      setTimeEntries([created, ...timeEntries]);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function handleUpdateTimeEntry(id, payload) {
    try {
      const updated = await updateTimeEntry(id, payload);
      setTimeEntries(timeEntries.map((entry) => (entry.id === updated.id ? updated : entry)));
      setEditingEntry(null);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  function updateFilter(event) {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value
    });
  }

  const dailyTotals = sumBy(timeEntries, (entry) => entry.workDate);
  const weeklyTotals = sumBy(timeEntries, (entry) => getWeekStart(entry.workDate));
  const filteredJob = filters.jobId ? leads.find((lead) => lead.id === filters.jobId) : null;
  const jobTotalHours = timeEntries.reduce((sum, entry) => sum + entry.payableHours, 0);
  const jobTotalCost = timeEntries.reduce((sum, entry) => sum + entryCost(entry), 0);

  return (
    <main className="timesheets-page">
      {error ? (
        <p className="error-banner" role="alert">
          {error}
        </p>
      ) : null}

      <div className="timesheets-layout">
        <div className="timesheets-forms">
          <TeamMemberForm onCreateTeamMember={handleCreateTeamMember} />
          <TimeEntryForm
            jobs={leads}
            teamMembers={teamMembers}
            editingEntry={editingEntry}
            onCreateTimeEntry={handleCreateTimeEntry}
            onUpdateTimeEntry={handleUpdateTimeEntry}
            onCancelEdit={() => setEditingEntry(null)}
          />
        </div>

        <section className="timesheets-main">
          <div className="team-list-panel">
            <h2>Team members</h2>
            {teamMembers.length === 0 ? <p className="empty-state">No team members yet</p> : null}
            <div className="team-list">
              {teamMembers.map((member) => (
                <div className="team-member-row" key={member.id}>
                  <div>
                    <strong>{member.name}</strong>
                    <span className="team-member-meta">
                      {member.role} · Rs. {member.rate}/{member.rateType === "hourly" ? "hr" : "day"}
                    </span>
                  </div>
                  <button type="button" onClick={() => handleToggleActive(member)}>
                    {member.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="filter-panel">
            <h2>Filters</h2>
            <div className="filter-row">
              <label>
                Job
                <select name="jobId" value={filters.jobId} onChange={updateFilter}>
                  <option value="">All jobs</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.customerName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Team member
                <select name="teamMemberId" value={filters.teamMemberId} onChange={updateFilter}>
                  <option value="">All team members</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Work type
                <select name="workType" value={filters.workType} onChange={updateFilter}>
                  <option value="">All work types</option>
                  {WORK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                From
                <input type="date" name="startDate" value={filters.startDate} onChange={updateFilter} />
              </label>
              <label>
                To
                <input type="date" name="endDate" value={filters.endDate} onChange={updateFilter} />
              </label>
            </div>
          </div>

          {filteredJob ? (
            <div className="job-summary-panel">
              <h2>{filteredJob.customerName} — labor summary</h2>
              <div className="metric-grid">
                <div className="metric-card">
                  <span>Total hours</span>
                  <strong>{jobTotalHours.toFixed(1)}</strong>
                </div>
                <div className="metric-card">
                  <span>Estimated labor cost</span>
                  <strong>Rs. {jobTotalCost.toFixed(0)}</strong>
                </div>
              </div>
            </div>
          ) : null}

          <div className="totals-panel">
            <h2>Daily totals</h2>
            {Object.keys(dailyTotals).length === 0 ? (
              <p className="empty-state">No entries yet</p>
            ) : (
              <ul className="totals-list">
                {Object.entries(dailyTotals)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([date, hours]) => (
                    <li key={date}>
                      <span>{date}</span>
                      <span>{hours.toFixed(1)}h</span>
                    </li>
                  ))}
              </ul>
            )}
            <h2>Weekly totals</h2>
            <ul className="totals-list">
              {Object.entries(weeklyTotals)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([weekStart, hours]) => (
                  <li key={weekStart}>
                    <span>Week of {weekStart}</span>
                    <span>{hours.toFixed(1)}h</span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="entries-table-panel">
            <h2>Time entries</h2>
            {timeEntries.length === 0 ? (
              <p className="empty-state">No time entries match these filters</p>
            ) : (
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Job</th>
                    <th>Team member</th>
                    <th>Hours</th>
                    <th>Work type</th>
                    <th>Cost</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.workDate}</td>
                      <td>{entry.jobCustomerName}</td>
                      <td>{entry.teamMemberName}</td>
                      <td>{entry.payableHours.toFixed(1)}</td>
                      <td>{entry.workType}</td>
                      <td>Rs. {entryCost(entry).toFixed(0)}</td>
                      <td>
                        <button type="button" onClick={() => setEditingEntry(entry)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

const WORK_TYPES = ["prep", "primer", "painting", "cleanup", "rework", "travel"];

const emptyEntry = {
  jobId: "",
  teamMemberId: "",
  workDate: "",
  startTime: "",
  endTime: "",
  breakMinutes: "0",
  workType: "painting",
  notes: ""
};

function formFromEntry(entry) {
  return {
    jobId: entry.jobId,
    teamMemberId: entry.teamMemberId,
    workDate: entry.workDate,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakMinutes: String(entry.breakMinutes),
    workType: entry.workType,
    notes: entry.notes || ""
  };
}

function validate(form) {
  const errors = {};

  if (!form.jobId) {
    errors.jobId = "A job is required.";
  }

  if (!form.teamMemberId) {
    errors.teamMemberId = "A team member is required.";
  }

  if (!form.workDate) {
    errors.workDate = "Work date is required.";
  }

  if (!form.startTime || !form.endTime) {
    errors.time = "Start and end time are required.";
  } else if (form.workDate) {
    const start = new Date(`${form.workDate}T${form.startTime}:00`);
    const end = new Date(`${form.workDate}T${form.endTime}:00`);
    const totalMinutes = (end - start) / 60000;
    const breakMinutes = Number(form.breakMinutes) || 0;

    if (totalMinutes <= 0) {
      errors.time = "End time must be after start time.";
    } else if (breakMinutes < 0) {
      errors.breakMinutes = "Break minutes cannot be negative.";
    } else if (breakMinutes >= totalMinutes) {
      errors.breakMinutes = "Break minutes cannot equal or exceed the shift duration.";
    }
  }

  return errors;
}

export default function TimeEntryForm({ jobs, teamMembers, editingEntry, onCreateTimeEntry, onUpdateTimeEntry, onCancelEdit }) {
  const [form, setForm] = useState(emptyEntry);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const activeTeamMembers = teamMembers.filter((member) => member.isActive);
  const isEditing = Boolean(editingEntry);

  useEffect(() => {
    setForm(editingEntry ? formFromEntry(editingEntry) : emptyEntry);
    setErrors({});
  }, [editingEntry]);

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    const payload = { ...form, breakMinutes: Number(form.breakMinutes) || 0 };
    try {
      if (isEditing) {
        await onUpdateTimeEntry(editingEntry.id, payload);
      } else {
        await onCreateTimeEntry(payload);
        setForm(emptyEntry);
      }
    } catch {
      // error is already surfaced by the caller; keep the form filled in
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="lead-form-panel">
      <h2>{isEditing ? "Correct time entry" : "Log time entry"}</h2>
      <form onSubmit={submitForm} noValidate>
        <label>
          Job
          <select name="jobId" value={form.jobId} onChange={updateField}>
            <option value="">Select a job...</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.customerName}
              </option>
            ))}
          </select>
          {errors.jobId ? <span className="field-error">{errors.jobId}</span> : null}
        </label>
        <label>
          Team member
          <select name="teamMemberId" value={form.teamMemberId} onChange={updateField}>
            <option value="">Select a team member...</option>
            {activeTeamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {errors.teamMemberId ? <span className="field-error">{errors.teamMemberId}</span> : null}
        </label>
        <label>
          Work date
          <input name="workDate" type="date" value={form.workDate} onChange={updateField} />
          {errors.workDate ? <span className="field-error">{errors.workDate}</span> : null}
        </label>
        <label>
          Start time
          <input name="startTime" type="time" value={form.startTime} onChange={updateField} />
        </label>
        <label>
          End time
          <input name="endTime" type="time" value={form.endTime} onChange={updateField} />
          {errors.time ? <span className="field-error">{errors.time}</span> : null}
        </label>
        <label>
          Break (minutes)
          <input name="breakMinutes" type="number" min="0" value={form.breakMinutes} onChange={updateField} />
          {errors.breakMinutes ? <span className="field-error">{errors.breakMinutes}</span> : null}
        </label>
        <label>
          Work type
          <select name="workType" value={form.workType} onChange={updateField}>
            {WORK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notes
          <textarea name="notes" value={form.notes} onChange={updateField} placeholder="Optional" />
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={submitting}>
            <Plus size={16} />
            {submitting ? "Saving..." : isEditing ? "Save changes" : "Log time entry"}
          </button>
          {isEditing ? (
            <button type="button" onClick={onCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </aside>
  );
}

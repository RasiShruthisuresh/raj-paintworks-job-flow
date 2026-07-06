import { Plus } from "lucide-react";
import { useState } from "react";

const emptyLead = {
  customerName: "",
  phone: "",
  siteAddress: "",
  estimatedValue: "",
  notes: ""
};

function validate(form) {
  const errors = {};

  if (!form.customerName.trim()) {
    errors.customerName = "Customer name is required.";
  }

  if (form.estimatedValue !== "") {
    const value = Number(form.estimatedValue);
    if (Number.isNaN(value) || value < 0) {
      errors.estimatedValue = "Estimated value must be a non-negative number.";
    }
  }

  return errors;
}

export default function LeadForm({ onCreateLead }) {
  const [form, setForm] = useState(emptyLead);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
    try {
      await onCreateLead(form);
      setForm(emptyLead);
    } catch {
      // error is already surfaced via the app-level error banner; keep the form filled in so the user doesn't lose their input
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="lead-form-panel">
      <h2>Add job lead</h2>
      <form onSubmit={submitForm} noValidate>
        <label>
          Customer / business name
          <input
            name="customerName"
            value={form.customerName}
            onChange={updateField}
            placeholder="Apex Dental Clinic"
            required
          />
          {errors.customerName ? <span className="field-error">{errors.customerName}</span> : null}
        </label>
        <label>
          Phone
          <input name="phone" value={form.phone} onChange={updateField} placeholder="98765 43210" />
        </label>
        <label>
          Site address
          <input name="siteAddress" value={form.siteAddress} onChange={updateField} placeholder="Indiranagar, Bengaluru" />
        </label>
        <label>
          Estimated value
          <input
            name="estimatedValue"
            type="number"
            min="0"
            value={form.estimatedValue}
            onChange={updateField}
            placeholder="120000"
          />
          {errors.estimatedValue ? <span className="field-error">{errors.estimatedValue}</span> : null}
        </label>
        <label>
          Notes
          <textarea name="notes" value={form.notes} onChange={updateField} placeholder="Scope, timing, decision maker..." />
        </label>
        <button className="primary-button" type="submit" disabled={submitting}>
          <Plus size={16} />
          {submitting ? "Adding..." : "Add lead"}
        </button>
      </form>
    </aside>
  );
}

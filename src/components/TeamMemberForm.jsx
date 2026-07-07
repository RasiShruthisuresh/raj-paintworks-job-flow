import { Plus } from "lucide-react";
import { useState } from "react";

const emptyMember = {
  name: "",
  role: "painter",
  rateType: "hourly",
  rate: "",
  phone: ""
};

function validate(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Name is required.";
  }

  const rate = Number(form.rate);
  if (form.rate === "" || Number.isNaN(rate) || rate <= 0) {
    errors.rate = "Rate must be a positive number.";
  }

  return errors;
}

export default function TeamMemberForm({ onCreateTeamMember }) {
  const [form, setForm] = useState(emptyMember);
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
      await onCreateTeamMember(form);
      setForm(emptyMember);
    } catch {
      // error is already surfaced by the caller; keep the form filled in
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="lead-form-panel">
      <h2>Add team member</h2>
      <form onSubmit={submitForm} noValidate>
        <label>
          Name
          <input name="name" value={form.name} onChange={updateField} placeholder="Ravi Kumar" required />
          {errors.name ? <span className="field-error">{errors.name}</span> : null}
        </label>
        <label>
          Role
          <select name="role" value={form.role} onChange={updateField}>
            <option value="painter">Painter</option>
            <option value="supervisor">Supervisor</option>
            <option value="helper">Helper</option>
            <option value="contractor">Contractor</option>
          </select>
        </label>
        <label>
          Rate type
          <select name="rateType" value={form.rateType} onChange={updateField}>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
          </select>
        </label>
        <label>
          Rate (Rs.)
          <input name="rate" type="number" min="1" value={form.rate} onChange={updateField} placeholder="250" required />
          {errors.rate ? <span className="field-error">{errors.rate}</span> : null}
        </label>
        <label>
          Phone
          <input name="phone" value={form.phone} onChange={updateField} placeholder="98765 43210" />
        </label>
        <button className="primary-button" type="submit" disabled={submitting}>
          <Plus size={16} />
          {submitting ? "Adding..." : "Add team member"}
        </button>
      </form>
    </aside>
  );
}

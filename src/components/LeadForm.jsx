import { Plus } from "lucide-react";
import { useState } from "react";

const emptyLead = {
  customerName: "",
  phone: "",
  siteAddress: "",
  estimatedValue: "",
  notes: ""
};

export default function LeadForm({ onCreateLead }) {
  const [form, setForm] = useState(emptyLead);

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  function submitForm(event) {
    event.preventDefault();
    onCreateLead(form);
    setForm(emptyLead);
  }

  return (
    <aside className="lead-form-panel">
      <h2>Add job lead</h2>
      <form onSubmit={submitForm}>
        <label>
          Customer / business name
          <input name="customerName" value={form.customerName} onChange={updateField} placeholder="Apex Dental Clinic" />
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
          <input name="estimatedValue" value={form.estimatedValue} onChange={updateField} placeholder="120000" />
        </label>
        <label>
          Notes
          <textarea name="notes" value={form.notes} onChange={updateField} placeholder="Scope, timing, decision maker..." />
        </label>
        <button className="primary-button" type="submit">
          <Plus size={16} />
          Add lead
        </button>
      </form>
    </aside>
  );
}

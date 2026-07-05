const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

export async function getLeads() {
  const response = await fetch(`${API_BASE_URL}/api/leads`);
  return response.json();
}

export async function createLead(payload) {
  const response = await fetch(`${API_BASE_URL}/api/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

export async function updateLeadStage(id, stage) {
  const response = await fetch(`${API_BASE_URL}/api/leads/${id}/stage`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status: stage })
  });
  return response.json();
}

export async function getAnalyticsSummary() {
  const response = await fetch(`${API_BASE_URL}/api/analytics/summary`);
  return response.json();
}

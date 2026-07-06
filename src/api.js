const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

async function parseResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function getLeads() {
  const response = await fetch(`${API_BASE_URL}/api/leads`);
  return parseResponse(response);
}

export async function createLead(payload) {
  const response = await fetch(`${API_BASE_URL}/api/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateLeadStage(id, stage) {
  const response = await fetch(`${API_BASE_URL}/api/leads/${id}/stage`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status: stage })
  });
  return parseResponse(response);
}

export async function getAnalyticsSummary() {
  const response = await fetch(`${API_BASE_URL}/api/analytics/summary`);
  return parseResponse(response);
}

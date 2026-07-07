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

export async function getTeamMembers() {
  const response = await fetch(`${API_BASE_URL}/api/team-members`);
  return parseResponse(response);
}

export async function createTeamMember(payload) {
  const response = await fetch(`${API_BASE_URL}/api/team-members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateTeamMember(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/team-members/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function getTimeEntries(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/time-entries${query ? `?${query}` : ""}`);
  return parseResponse(response);
}

export async function createTimeEntry(payload) {
  const response = await fetch(`${API_BASE_URL}/api/time-entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateTimeEntry(id, payload) {
  const response = await fetch(`${API_BASE_URL}/api/time-entries/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function getAnalyticsDashboard(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard${query ? `?${query}` : ""}`);
  return parseResponse(response);
}

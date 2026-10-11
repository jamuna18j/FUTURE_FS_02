const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("leadflow_token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

export const api = {
  register: (body) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getLeads: () => request("/leads"),

  createLead: (body) =>
    request("/leads", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateLead: (id, body) =>
    request(`/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteLead: (id) =>
    request(`/leads/${id}`, {
      method: "DELETE",
    }),
};
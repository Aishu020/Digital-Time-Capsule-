const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

let authToken = localStorage.getItem("dtc_token") || "";

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("dtc_token", token);
  } else {
    localStorage.removeItem("dtc_token");
  }
}

async function apiRequest(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (!options.skipAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.error || "Request failed";
    throw new Error(error);
  }
  return data;
}

export function register(payload) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipAuth: true
  });
}

export function login(payload) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    skipAuth: true
  });
}

export function createCapsule(payload) {
  return apiRequest("/api/capsules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function listCapsules() {
  return apiRequest("/api/capsules", { method: "GET" });
}

export function getCapsule(id) {
  return apiRequest(`/api/capsules/${id}`, { method: "GET" });
}

export function shareCapsule(id, recipients) {
  return apiRequest(`/api/capsules/${id}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipients })
  });
}

export function triggerCapsule(id) {
  return apiRequest(`/api/capsules/${id}/trigger`, { method: "POST" });
}

export function uploadAttachment(id, file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest(`/api/capsules/${id}/attachments`, {
    method: "POST",
    body: formData
  });
}

export function accessCapsule(accessId, accessSecret) {
  return apiRequest(`/api/capsules/access/${accessId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessSecret }),
    skipAuth: true
  });
}

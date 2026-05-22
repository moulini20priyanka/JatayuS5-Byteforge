// utils/api.js
// Import this wherever you make API calls in admin/recruiter pages

const API = (process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net');
//                                                                       
// THE FIX: base URL does NOT include /api, so apiFetch('/api/candidates')
//   now hits → https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api/candidates  ✅
//   (previously had double /api/api because base already included /api)

const TOKEN_KEYS = {
  admin:     'admin_token',
  recruiter: 'recruiter_token',
  student:   'student_token',
};

/**
 * Always fetches the correct token for the currently logged-in role.
 * This prevents a student token from being sent on admin API calls.
 */
function getAuthToken() {
  const role = localStorage.getItem('role') || 'student';
  return localStorage.getItem(TOKEN_KEYS[role] || 'student_token');
}

/**
 * Authenticated fetch — use this instead of raw fetch() everywhere.
 *
 * Returns { ok, data, res } so callers don't need to await .json() themselves.
 *
 * Usage:
 *   const { ok, data } = await apiFetch('/candidates');
 *   if (!ok) throw new Error(data?.error || 'Failed');
 */
export async function apiFetch(path, options = {}) {
  const token = getAuthToken();

  // Ensure path always starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${API}${normalizedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  if (res.status === 401 || res.status === 403) {
    console.error('[apiFetch] Auth error on', path, '— token may be wrong role or expired');
  }

  // Automatically parse the response body
  let data = null;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    // Non-JSON (e.g. Express HTML 404 page) — surface a readable error
    const text = await res.text();
    if (!res.ok) {
      console.error(`[apiFetch] Non-JSON error (${res.status}) on ${path}:`, text.substring(0, 300));
      data = { error: `HTTP ${res.status} — ${text.substring(0, 200)}` };
    } else {
      data = text;
    }
  }

  return { ok: res.ok, data, res };
}

/**
 * For multipart/form-data (file uploads).
 * Do NOT set Content-Type — the browser sets it automatically with the correct boundary.
 *
 * Returns { ok, data, res }
 */
export async function apiFetchFormData(path, formData) {
  const token = getAuthToken();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${API}${normalizedPath}`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  }

  return { ok: res.ok, data, res };
}



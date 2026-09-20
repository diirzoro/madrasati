// api.js — Minimal API client for Madarasati PostgreSQL backend
// Always uses same-origin /api routes: server/v4-static.js proxies /api and
// /uploads to the API, and the Netlify redirect does the same in production.
// Staying same-origin keeps the session cookie first-party, so no CORS is needed.
// Credentials are included for HttpOnly session cookie support.

const API_BASE = '';

async function apiRequest(method, path, body) {
  const opts = {
    method: method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = text; }
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function apiGet(path) { return apiRequest('GET', path); }
function apiPost(path, body) { return apiRequest('POST', path, body); }
function apiPut(path, body) { return apiRequest('PUT', path, body); }
function apiPatch(path, body) { return apiRequest('PATCH', path, body); }
function apiDelete(path) { return apiRequest('DELETE', path); }

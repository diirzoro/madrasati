// api.js — Minimal API client for Madarasati PostgreSQL backend
// Uses credentials:'include' for HttpOnly session cookie support.

const API_BASE = 'http://localhost:4003';

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

// Single API layer. Field names match API_CONTRACT.md exactly.
const BASE = import.meta.env.VITE_API_ORIGIN || '';
export const imgUrl = (u) => (u ? BASE + u : null);
export const money = (n) => `${Number(n).toFixed(2)} EGP`;
export const getToken = () => localStorage.getItem('token');

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload }); }
  catch { throw new Error('Cannot reach the server. Is the backend running?'); }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return json.data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  postForm: (p, form) => request(p, { method: 'POST', form }),
  putForm: (p, form) => request(p, { method: 'PUT', form }),
};

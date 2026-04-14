import { supabase } from './supabase'

const BASE_URL = import.meta.env.VITE_API_URL

async function request(path, options = {}) {
  let { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const { data } = await supabase.auth.getSession()
    session = data.session
  }

  const token = session?.access_token

  const headers = { ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const json = await res.json()
  if (!res.ok) {
    if (res.status === 401) {
      await supabase.auth.signOut()
      return
    }
    const err = new Error(json.error || 'Request failed')
    Object.assign(err, json)
    throw err
  }
  return json.data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  postForm: (path, formData) =>
    request(path, { method: 'POST', body: formData }),
  patch: (path, body) =>
    request(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

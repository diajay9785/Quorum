import axios from 'axios'
import { supabase } from './supabaseClient'

const API_BASE = 'https://quorum-j7zr.onrender.com'

export async function scoreTransaction(transaction) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await axios.post(`${API_BASE}/score`, transaction, {
    headers: { Authorization: `Bearer ${token}` },
  })

  return response.data
}
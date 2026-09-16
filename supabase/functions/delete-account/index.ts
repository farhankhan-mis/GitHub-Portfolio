import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
  const admin = createClient(url, serviceRole)
  const { data: files } = await admin.storage.from('resumes').list(user.id, { limit: 1000 })
  if (files?.length) await admin.storage.from('resumes').remove(files.map(file => `${user.id}/${file.name}`))
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  return new Response(JSON.stringify({ deleted: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})


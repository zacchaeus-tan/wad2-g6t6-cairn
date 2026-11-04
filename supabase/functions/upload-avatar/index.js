/* global Deno */
// Edge function: saves or removes the signed-in user's profile picture.
//
// Runs with the service-role key, so the avatars bucket needs no storage
// policies: the browser can only change a picture through here, and only its
// own (the user comes from their login token, never from the request body).
//
// Request:  multipart form with `file` (JPEG, PNG or WebP, up to 2 MB) to upload,
//           or JSON { remove: true } to go back to initials.
// Response: { avatar_path }  (null after a remove)  or  { error }
//
// Called by uploadAvatar() and removeAvatar() in src/model/authModel.js.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.js'

const BUCKET = 'avatars'
const MAX_BYTES = 2 * 1024 * 1024 // same limit as AVATAR_MAX_BYTES in src/lib/profileTools.js
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Injected automatically by Supabase; never sent to the browser.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  )

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user) return json({ error: 'Not signed in' }, 401)
  const userId = userData.user.id

  let file = null
  if (req.headers.get('Content-Type')?.startsWith('multipart/form-data')) {
    const form = await req.formData().catch(() => null)
    file = form?.get('file')
    if (!(file instanceof File)) return json({ error: 'Choose a picture to upload.' }, 400)
    if (!EXTENSIONS[file.type]) return json({ error: 'Use a JPEG, PNG or WebP picture.' }, 400)
    if (file.size > MAX_BYTES) return json({ error: 'Use a picture under 2 MB.' }, 400)
  } else {
    const { remove } = await req.json().catch(() => ({}))
    if (remove !== true) return json({ error: 'Send a file or { remove: true }' }, 400)
  }

  // Each upload gets a new name, so browsers never show a cached old picture
  let avatarPath = null
  if (file) {
    avatarPath = `${userId}/${Date.now()}.${EXTENSIONS[file.type]}`
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(avatarPath, file, { contentType: file.type })
    if (uploadError) return json({ error: uploadError.message }, 500)
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ avatar_path: avatarPath })
    .eq('id', userId)
  if (updateError) return json({ error: updateError.message }, 500)

  // Tidy up older pictures. The profile already points at the new one, so a
  // failure here only leaves an unused file behind.
  const { data: files } = await admin.storage.from(BUCKET).list(userId)
  const oldPaths = (files ?? [])
    .map((f) => `${userId}/${f.name}`)
    .filter((path) => path !== avatarPath)
  if (oldPaths.length) await admin.storage.from(BUCKET).remove(oldPaths)

  return json({ avatar_path: avatarPath })
})

/* global Deno */
// Edge function: fetches a 3-day forecast for every route from Open-Meteo,
// saves it in weather_cache, and queues 'pending' route alerts for severe
// weather. Admins publish or dismiss them from the admin page; nothing
// reaches hikers until they do.
//
// Called two ways:
//   - daily by pg_cron, with the shared CRON_SECRET in the x-cron-secret header
//   - from the admin page's "Run now" button, with the admin's login token
// verify_jwt is off because the cron call has no user token, so both are
// checked here instead.
//
// Response: { routes, forecasts, alertsQueued, alertsExpired }  or  { error }

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.js'
import { alertsForForecast, dayWindow } from '../_shared/weather-rules.js'

const JOB = 'check-weather'
const FORECAST_DAYS = 3

// Open-Meteo accepts many coordinates per request; this keeps URLs short.
const BATCH_SIZE = 50

const DAILY = 'weather_code,precipitation_sum,temperature_2m_max,temperature_2m_min,wind_gusts_10m_max'
const CURRENT = 'temperature_2m,weather_code,precipitation,wind_speed_10m'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 'schedule' or 'manual' when the caller may run the job, otherwise null.
async function authorise(req, db) {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
    return 'schedule'
  }

  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!token) return null

  const { data: userData } = await db.auth.getUser(token)
  if (!userData?.user) return null

  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle()
  return profile?.is_admin ? 'manual' : null
}

async function fetchForecasts(routes) {
  const params = new URLSearchParams({
    latitude: routes.map((r) => r.latitude).join(','),
    longitude: routes.map((r) => r.longitude).join(','),
    daily: DAILY,
    current: CURRENT,
    forecast_days: String(FORECAST_DAYS),
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) {
    throw new Error(`Open-Meteo returned ${res.status}: ${await res.text()}`)
  }
  const body = await res.json()
  // A single location comes back as an object, several as an array.
  return Array.isArray(body) ? body : [body]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Injected automatically by Supabase; never sent to the browser.
  const db = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

  const trigger = await authorise(req, db)
  if (!trigger) return json({ error: 'Only admins or the scheduler can run this job.' }, 401)

  const { data: run } = await db.from('job_runs').insert({ job: JOB, trigger }).select('id').single()

  async function finish(status, fields) {
    if (run) {
      await db
        .from('job_runs')
        .update({ status, finished_at: new Date().toISOString(), ...fields })
        .eq('id', run.id)
    }
  }

  try {
    const { data: routes, error: routesError } = await db
      .from('routes')
      .select('id, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (routesError) throw routesError

    const cacheRows = []
    const alertRows = []

    for (let i = 0; i < routes.length; i += BATCH_SIZE) {
      const batch = routes.slice(i, i + BATCH_SIZE)
      const forecasts = await fetchForecasts(batch)

      forecasts.forEach((forecast, index) => {
        const route = batch[index]
        cacheRows.push({
          route_id: route.id,
          current: forecast.current ?? null,
          forecast: forecast.daily ?? null,
          fetched_at: new Date().toISOString(),
        })

        for (const alert of alertsForForecast(forecast.daily)) {
          const { startsAt, endsAt } = dayWindow(alert.date, forecast.utc_offset_seconds ?? 0)
          alertRows.push({
            route_id: route.id,
            source: 'weather',
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            status: 'pending',
            starts_at: startsAt,
            ends_at: endsAt,
            // Severity is part of the key so a warning that worsens to danger
            // is queued again rather than skipped as a duplicate.
            external_ref: `${alert.kind}:${alert.severity}:${alert.date}`,
          })
        }
      })
    }

    const { error: cacheError } = await db.from('weather_cache').upsert(cacheRows, { onConflict: 'route_id' })
    if (cacheError) throw cacheError

    // ignoreDuplicates leaves alerts an admin already published or dismissed
    // untouched; only genuinely new ones come back in `queued`.
    let queued = []
    if (alertRows.length) {
      const { data, error: alertError } = await db
        .from('route_alerts')
        .upsert(alertRows, { onConflict: 'route_id,source,external_ref', ignoreDuplicates: true })
        .select('id')
      if (alertError) throw alertError
      queued = data ?? []
    }

    // Weather alerts whose day has passed no longer need a decision.
    const { data: expired, error: expireError } = await db
      .from('route_alerts')
      .update({ status: 'expired' })
      .eq('source', 'weather')
      .in('status', ['pending', 'active'])
      .lt('ends_at', new Date().toISOString())
      .select('id')
    if (expireError) throw expireError

    const summary = {
      routes: routes.length,
      forecasts: cacheRows.length,
      alertsQueued: queued.length,
      alertsExpired: expired?.length ?? 0,
    }
    await finish('success', { summary })
    return json(summary)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err?.message ?? err)
    await finish('error', { error: message })
    return json({ error: message }, 500)
  }
})

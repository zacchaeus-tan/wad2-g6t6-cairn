/* global Deno */
// Edge function: builds a gear checklist for a route using OpenAI.
// Runs on Supabase (Deno), so the OpenAI key never reaches the browser.
// Only signed-in users can call it (Supabase checks their login token).
//
// Request body: { route_id, forecast, plan }  (forecast and plan are optional)
// Response:     { items: [{ label, category, quantity, reason }] }  or  { error }

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.js'
import {
  addDays,
  cleanForecast,
  forecastLine,
  isDate,
  num,
  tripForecastSection,
} from '../_shared/forecast.js'

const MODEL = 'gpt-4.1-mini'

const CATEGORIES = [
  'clothing',
  'safety',
  'navigation',
  'water_food',
  'shelter',
  'documents',
  'other',
]
const PACES = ['relaxed', 'moderate', 'fast']

const MAX_PLAN_DAYS = 60 // same ceiling as the itinerary function
const MAX_DAY_ENTRIES = 14 // day-by-day lines sent to the model

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function validate(body) {
  if (!body?.route_id) {
    return 'route_id is required.'
  }
  return null
}

// Short single-line text with a length cap
function text(value, max) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

// Returns null unless the plan is complete and valid, so a bad plan
// simply falls back to route + forecast only.
function cleanPlan(plan) {
  if (!plan || typeof plan !== 'object') {
    return null
  }
  const days = Number(plan.days)
  if (
    !isDate(plan.start_date) ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > MAX_PLAN_DAYS ||
    !PACES.includes(plan.pace)
  ) {
    return null
  }
  const dayPlan = Array.isArray(plan.day_plan)
    ? plan.day_plan.slice(0, MAX_DAY_ENTRIES).map((d) => ({
        day: num(d?.day),
        title: text(d?.title, 80),
        start: text(d?.start, 60),
        end: text(d?.end, 60),
        distanceKm: num(d?.distance_km),
        gainM: num(d?.elevation_gain_m),
        hours: num(d?.est_hours),
      }))
    : []
  return { startDate: plan.start_date, days, pace: plan.pace, dayPlan }
}

function dayPlanLine(d) {
  const parts = []
  if (d.start || d.end) {
    parts.push(`${d.start || '?'} to ${d.end || '?'}`)
  }
  if (d.distanceKm !== null) {
    parts.push(`${d.distanceKm} km`)
  }
  if (d.gainM !== null) {
    parts.push(`${d.gainM} m gain`)
  }
  if (d.hours !== null) {
    parts.push(`about ${d.hours} h`)
  }
  const title = d.title ? ` (${d.title})` : ''
  return `- Day ${d.day ?? '?'}${title}: ${parts.join(', ') || 'no details'}`
}

// The forecast section depends on whether the user has an itinerary with a start date
function forecastSection(forecast, plan) {
  if (!plan) {
    const lines = forecast.length
      ? forecast.map((d) => forecastLine(d, d.date ?? 'date unknown')).join('\n')
      : 'Forecast unavailable. Do not guess the weather.'
    return `Forecast for the coming days (the hike start date is not known):\n${lines}`
  }

  return tripForecastSection(forecast, plan.startDate, plan.days)
}

function planSection(plan) {
  if (!plan) {
    return ''
  }
  const lastDate = addDays(plan.startDate, plan.days - 1)
  const lines = plan.dayPlan.length
    ? `\nDay-by-day plan:\n${plan.dayPlan.map(dayPlanLine).join('\n')}`
    : ''
  return `Planned trip: ${plan.days} hiking day(s), from ${plan.startDate} to ${lastDate}, at a ${plan.pace} pace.${lines}\n\n`
}

// Everything the model knows about the route comes from our database,
// not from text the user typed. The community hazard note is left out on
// purpose because it is written by users.
function buildPrompt(route, points, forecast, plan) {
  const stops = points.length
    ? points
        .map((p) => {
          const day = p.day_number ? ` (day ${p.day_number})` : ''
          const alt = p.altitude_m ? `, ${p.altitude_m} m` : ''
          return `- ${p.sequence}. ${p.name} [${p.point_type}${alt}]${day}`
        })
        .join('\n')
    : 'No checkpoints recorded.'

  const hikingDays = plan
    ? `${plan.days} (planned by the hiker)`
    : (route.duration_days ?? 'unknown')

  return `Route: ${route.name}
Country: ${route.country ?? 'unknown'}
Distance: ${route.distance_km ?? 'unknown'} km
Elevation gain: ${route.elevation_gain_m ?? 'unknown'} m
Maximum altitude: ${route.altitude_m ?? 'unknown'} m
Hiking days: ${hikingDays}
Multiday: ${route.is_multiday || (plan && plan.days > 1) ? 'yes' : 'no'}
Difficulty (1 easy to 4 strenuous): ${route.effective_difficulty ?? route.official_difficulty ?? 'unknown'}
Safety status: ${route.safety_status ?? 'unknown'}
Safety note: ${route.safety_status_note ?? 'none'}
Community hazard level: ${route.community_hazard_level ?? 'unknown'}
Permit required: ${route.permit_required == null ? 'unknown' : route.permit_required ? 'yes' : 'no'}
Permit hint: ${route.permit_hint ?? 'none'}
Guide required: ${route.guide_required ? 'yes' : 'unknown'}

${planSection(plan)}${forecastSection(forecast, plan)}

Checkpoints in order:
${stops}

Create a gear packing checklist for this hike.`
}

const SYSTEM_PROMPT = `You are an experienced hiking guide for Southeast Asia. Create a practical gear packing checklist tailored to the route described.
Base the items on the route facts: distance, elevation, altitude, duration, hazards, permits, guide requirement and the checkpoints (such as camps).
Reply with JSON only, in exactly this shape:
{
  "items": [
    {
      "label": "item name",
      "category": "one of: ${CATEGORIES.join(', ')}",
      "quantity": "short text such as 1, 3L or 2 pairs",
      "reason": "one short sentence tied to this route"
    }
  ]
}
Rules:
- Give 10 to 20 items.
- "quantity" is always a short non-empty string.
- Include documents (permit, ID) if a permit or guide is required. If either is unknown, add one item: "Check permit and guide requirements before you go".
- Include shelter items only if the route is multiday or has camps.
- Do not repeat items.
- Scale quantities to the number of hiking days (for example food, water, socks, underwear, batteries and toilet paper).
- If a planned trip with dates is given, use its number of days and its day-by-day plan: long days or large elevation gain mean more water and snacks, and days of 8 hours or more mean a headlamp. Overnight stops in the plan mean shelter and cooking gear.
- If no start date is given, the forecast is only a guide to current conditions, so prepare for the worst day in it.
- Use the forecast: rain or a high chance of rain means a rain jacket, pack cover and dry bags; cold at the trailhead or summit means insulation layers; high UV or heat means sun protection and extra water; strong wind or gusts means a windproof layer; thunderstorm risk means a note about turning back early; heavy recent rain means waterproof footwear.
- If the forecast is unavailable or missing for some days, do not assume weather for those days. Add one general weather-protection item instead.
- Where an item exists because of the forecast or the plan, say so in "reason" (for example "Heavy rain is forecast on day 2").`

Deno.serve(async (req) => {
  // Browser preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400)
  }

  const invalid = validate(body)
  if (invalid) {
    return json({ error: invalid }, 400)
  }

  // routes and route_points are publicly readable, so the anon key is enough.
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'))

  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('*')
    .eq('id', body.route_id)
    .maybeSingle()

  if (routeError) {
    return json({ error: routeError.message }, 500)
  }
  if (!route) {
    return json({ error: 'Route not found.' }, 404)
  }

  const { data: points, error: pointsError } = await supabase
    .from('route_points')
    .select('sequence, name, point_type, day_number, altitude_m')
    .eq('route_id', route.id)
    .order('sequence')

  if (pointsError) {
    return json({ error: pointsError.message }, 500)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return json({ error: 'OPENAI_API_KEY is not set on the server.' }, 500)
  }

  const forecast = cleanForecast(body.forecast)
  const plan = cleanPlan(body.plan)
  const prompt = buildPrompt(route, points, forecast, plan)
  // Check this in the Supabase dashboard (Edge Functions > generate-checklist > Logs)
  console.log('Checklist prompt:\n' + prompt)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        // Caps the reply length so one request can't run away in time or cost.
        max_tokens: 2000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('OpenAI error', response.status, detail)
      return json({ error: 'The checklist service is unavailable. Please try again later.' }, 502)
    }

    const result = await response.json()
    const parsed = JSON.parse(result.choices[0].message.content)
    if (!Array.isArray(parsed.items)) {
      console.error('Unexpected checklist shape', parsed)
      return json({ error: 'Could not generate a checklist. Please try again.' }, 502)
    }
    return json({ items: parsed.items })
  } catch (err) {
    console.error('Checklist generation failed', err)
    return json({ error: 'Could not generate a checklist. Please try again.' }, 502)
  }
})

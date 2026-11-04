<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { alertMessageForHikers } from '@/lib/alertDrafts'
import { GRADES, gradeOf } from '@/lib/difficultyStyle'
import { routePhotoUrl } from '@/controller/routesController'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import StarIcon from '@/components/common/StarIcon.vue'
import SaveRouteButton from '@/components/common/SaveRouteButton.vue'
import WarningIcon from '@/components/common/WarningIcon.vue'
import RouteLine from './RouteLine.vue'

const props = defineProps({
  route: { type: Object, required: true },
  isLoggedIn: { type: Boolean, required: true },
  alerts: { type: Array, default: () => [] }, // live alerts published by admins
})

// The route's own photo, from the route-photos bucket
const bannerPhoto = computed(() => routePhotoUrl(props.route))

const grade = computed(() => gradeOf(props.route))
const lineColor = computed(() => GRADES[grade.value]?.line ?? '#f2efea')

// The average rounded to the nearest half star, as how much of each star is filled:
// 3.5 gives [1, 1, 1, 0.5, 0]
const starFills = computed(() => {
  const rounded = Math.round(props.route.avg_rating * 2) / 2
  return [1, 2, 3, 4, 5].map((n) => Math.min(Math.max(rounded - (n - 1), 0), 1))
})

// The warning only shows when there is a risk: an admin has published a danger alert,
// the route is closed or needs caution, or hikers have reported a moderate or elevated hazard.
const SAFETY_TITLES = { caution: 'Caution', closed: 'Route closed' }
const HAZARD_TITLES = { moderate: 'Hazard: moderate', elevated: 'Hazard: elevated' }

const dangerAlerts = computed(() => props.alerts.filter((a) => a.severity === 'danger'))

// Lower severity alerts stay in the trail notices further down the page.
const warningLink = computed(() => (dangerAlerts.value.length ? '#trail-notices' : '#reviews'))

const warnings = computed(() => {
  const list = dangerAlerts.value.map((a) => ({
    key: a.id,
    title: a.title,
    note: alertMessageForHikers(a.message),
  }))
  const safety = SAFETY_TITLES[props.route.safety_status]
  if (safety) {
    list.push({ key: 'safety', title: safety, note: props.route.safety_status_note })
  }
  const hazard = HAZARD_TITLES[props.route.community_hazard_level]
  if (hazard) {
    list.push({ key: 'hazard', title: hazard, note: props.route.community_hazard_note })
  }
  return list
})
</script>

<template>
  <section class="route-banner" aria-labelledby="route-title">
    <img class="route-banner-photo" :src="bannerPhoto" alt="" />

    <div v-if="warnings.length" class="cairn-wrap route-banner-warning" role="alert">
      <a :href="warningLink" class="d-inline-flex align-items-center gap-3">
        <WarningIcon />
        <span>
          <span
            v-for="warning in warnings"
            :key="warning.key"
            class="route-banner-warning-item d-block"
          >
            <strong class="d-block">{{ warning.title }}</strong>
            <span v-if="warning.note">{{ warning.note }}</span>
          </span>
        </span>
      </a>
    </div>

    <div class="cairn-wrap route-banner-inner d-flex flex-column">
      <!-- Bootstrap grid: the title beside the route line from lg (992px) up, under it on smaller screens.
           The padding and line height for the stacked layout are in the CSS, on the same breakpoint. -->
      <div class="row flex-grow-1 align-items-end gx-lg-5 gy-4">
        <div class="col-lg-6">
          <p class="route-banner-crumb">
            <RouterLink to="/routes">Routes</RouterLink
            ><template v-if="route.country"> / {{ route.country }}</template>
          </p>
          <h1 id="route-title" class="route-banner-title mt-3">{{ route.name }}</h1>
          <p
            class="route-banner-labels d-flex flex-wrap align-items-center row-gap-2 column-gap-4 mt-4"
          >
            <DifficultyMark :grade="grade" :color="lineColor" />
            <span v-if="route.avg_rating != null" class="route-banner-stars">
              <StarIcon v-for="(fill, index) in starFills" :key="index" :fill="fill" />
            </span>
            <SaveRouteButton v-if="isLoggedIn" :routeId="route.id"></SaveRouteButton>
          </p>
        </div>
        <div class="col-lg-6 order-first order-lg-0 align-self-stretch">
          <div class="route-banner-art h-100">
            <RouteLine
              class="route-banner-line"
              :geometry="route.geometry"
              :color="lineColor"
              :width="5"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Dark photo, title on the left, the route line large on the right. The navbar sits on top. */
.route-banner {
  position: relative;
  display: flex;
  align-items: stretch;
  /* Fills the whole screen on arrival; the navbar sits on top of it */
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  background: #0d1411;
  color: var(--paper);
}

.route-banner-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.32;
  filter: saturate(0.5) brightness(0.75);
}

/* Focus rings on a dark photo are Glacier */
.route-banner-labels :deep(.cairn-btn:focus-visible) {
  outline-color: var(--glacier);
}

.route-banner-warning {
  position: absolute;
  top: 96px;
  left: 0;
  right: 0;
  z-index: 3;
}

.route-banner-warning a {
  color: var(--paper);
  text-decoration: none;
}

.route-banner-warning svg {
  width: 40px;
  height: 36px;
  flex: none;
}

.route-banner-warning-item strong {
  color: var(--hazard);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.route-banner-warning-item span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; /* published alerts can be long, and the route title sits below */
  color: #d4e3db;
  font-size: 14px;
}

.route-banner-warning a:hover .route-banner-warning-item span {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.route-banner-inner {
  position: relative;
  z-index: 2;
  padding-top: clamp(150px, 19vh, 180px);
  padding-bottom: 48px;
}

.route-banner-crumb {
  color: var(--sage);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.route-banner-crumb a {
  color: inherit;
  text-decoration: none;
}

.route-banner-crumb a:hover {
  color: var(--white);
  text-decoration: underline;
}

.route-banner-title {
  max-width: 14ch;
  font-size: clamp(44px, 6.6vw, 104px);
  line-height: 0.95;
  font-weight: 900;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.route-banner-labels {
  font-size: 15px;
  font-weight: 700;
}

.route-banner-labels :deep(.difficulty-mark svg) {
  width: 11px;
  height: 11px;
}

.route-banner-stars {
  --star-off: rgb(242 239 234 / 0.3);
  display: inline-flex;
  gap: 2px;
}

.route-banner-stars svg {
  width: 16px;
  height: 16px;
}

.route-banner-art {
  position: relative;
  min-height: clamp(320px, 54vh, 560px);
}

.route-banner-line {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.55));
}

/* The line draws itself in once */
.route-banner-line :deep(path) {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: route-banner-draw 3.2s var(--ease) 0.3s forwards;
}

@keyframes route-banner-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-banner-line :deep(path) {
    animation: none;
    stroke-dashoffset: 0;
  }
}

/* Below lg, where the title sits under the route line (col-lg-6 in the template) */
@media (width < 992px) {
  .route-banner-inner {
    padding-top: 160px;
  }

  .route-banner-art {
    min-height: 240px;
  }
}
</style>

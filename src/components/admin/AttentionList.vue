<script setup>
import { reactive } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'
import { difficultyLabel, formatDate } from '@/lib/format'
import {
  DIFFICULTY_REF,
  HAZARD_ROUTE_REF,
  draftFromHazardRoute,
  draftFromPointWarning,
  draftFromUnconfirmedReport,
  pointWarningRef,
  unconfirmedRef,
} from '@/lib/alertDrafts'

const emit = defineEmits(['raise-alert'])

const adminStore = useAdminStore()

const GRADES = [1, 2, 3, 4]

// The grade picked in each mismatch row, keyed by route id. Starts at the
// grade hikers are pointing to.
const newGrades = reactive({})

function gradeFor(route) {
  return newGrades[route.id] ?? Math.round(route.effective_difficulty)
}
</script>

<template>
  <div>
    <p v-if="!adminStore.attentionCount" class="admin-empty">Nothing needs attention right now.</p>

    <div v-if="adminStore.openPointWarnings.length" class="admin-group">
      <h3 class="cairn-label">Hazards confirmed at checkpoints</h3>
      <ul class="admin-list">
        <li
          v-for="warning in adminStore.openPointWarnings"
          :key="`${warning.point_id}-${warning.category}`"
          class="admin-item"
        >
          <div class="admin-item-body">
            <p>
              <strong>{{ warning.label }}</strong>
              at {{ warning.point_name
              }}<template v-if="warning.day_number"> (day {{ warning.day_number }})</template>
              on
              <RouterLink :to="{ name: 'route-detail', params: { id: warning.route_id } }">{{
                adminStore.routeNames.get(warning.route_id) || 'a route'
              }}</RouterLink>
            </p>
            <p class="cairn-fine">
              {{ warning.reporter_count }} hikers, last on {{ formatDate(warning.last_reported_at)
              }}<template v-if="warning.latest_note">: “{{ warning.latest_note }}”</template>
            </p>
          </div>
          <div class="admin-actions">
            <button
              type="button"
              class="cairn-btn is-small"
              @click="emit('raise-alert', draftFromPointWarning(warning))"
            >
              Raise alert
            </button>
            <button
              type="button"
              class="cairn-link"
              @click="adminStore.markReviewed(warning.route_id, pointWarningRef(warning))"
            >
              Reviewed, no action
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="adminStore.unconfirmedReports.length" class="admin-group">
      <h3 class="cairn-label">Serious reports, not yet confirmed</h3>
      <p class="admin-hint mb-2">
        One hiker each, so hikers don't see these until you raise an alert.
      </p>
      <ul class="admin-list">
        <li
          v-for="report in adminStore.unconfirmedReports"
          :key="`${report.route_id}-${report.point_id}-${report.category}`"
          class="admin-item"
        >
          <div class="admin-item-body">
            <p>
              <span class="admin-tag">Unconfirmed</span>
              <strong>{{ report.label }}</strong>
              <template v-if="report.point_name">
                at {{ report.point_name
                }}<template v-if="report.day_number"> (day {{ report.day_number }})</template>
              </template>
              on
              <RouterLink :to="{ name: 'route-detail', params: { id: report.route_id } }">{{
                adminStore.routeNames.get(report.route_id) || 'a route'
              }}</RouterLink>
            </p>
            <p class="cairn-fine">
              {{ report.reporter || 'A hiker' }}, {{ formatDate(report.created_at)
              }}<template v-if="report.note">: “{{ report.note }}”</template>
            </p>
          </div>
          <div class="admin-actions">
            <button
              type="button"
              class="cairn-btn is-small"
              @click="emit('raise-alert', draftFromUnconfirmedReport(report))"
            >
              Raise alert
            </button>
            <button
              type="button"
              class="cairn-link"
              @click="adminStore.markReviewed(report.route_id, unconfirmedRef(report))"
            >
              Reviewed, no action
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="adminStore.openHazardRoutes.length" class="admin-group">
      <h3 class="cairn-label">Community hazard reports</h3>
      <ul class="admin-list">
        <li v-for="route in adminStore.openHazardRoutes" :key="route.id" class="admin-item">
          <div class="admin-item-body">
            <p>
              <span class="admin-tag" :class="`is-${route.community_hazard_level}`">{{
                route.community_hazard_level
              }}</span>
              <RouterLink :to="{ name: 'route-detail', params: { id: route.id } }">{{
                route.name
              }}</RouterLink>
            </p>
            <p v-if="route.community_hazard_note" class="cairn-fine">
              {{ route.community_hazard_note }}
            </p>
          </div>
          <div class="admin-actions">
            <button
              type="button"
              class="cairn-btn is-small"
              @click="emit('raise-alert', draftFromHazardRoute(route))"
            >
              Raise alert
            </button>
            <button
              type="button"
              class="cairn-link"
              @click="adminStore.markReviewed(route.id, HAZARD_ROUTE_REF)"
            >
              Reviewed, no action
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="adminStore.difficultyMismatches.length" class="admin-group">
      <h3 class="cairn-label">Difficulty may need regrading</h3>
      <ul class="admin-list">
        <li v-for="route in adminStore.difficultyMismatches" :key="route.id" class="admin-item">
          <div class="admin-item-body">
            <p>
              <RouterLink :to="{ name: 'route-detail', params: { id: route.id } }">{{
                route.name
              }}</RouterLink>
              is graded <strong>{{ difficultyLabel(route.official_difficulty) }}</strong>
            </p>
            <p class="cairn-fine">
              {{ route.review_count }}
              {{ route.review_count === 1 ? 'hiker rates' : 'hikers rate' }} it closer to
              {{ difficultyLabel(route.effective_difficulty) }}
              ({{ route.gap > 0 ? 'harder' : 'easier' }}).
            </p>
          </div>
          <div class="admin-actions">
            <label class="cairn-visually-hidden" :for="`grade-${route.id}`">New grade</label>
            <select
              :id="`grade-${route.id}`"
              class="cairn-input w-auto"
              :value="gradeFor(route)"
              @change="newGrades[route.id] = Number($event.target.value)"
            >
              <option v-for="grade in GRADES" :key="grade" :value="grade">
                {{ difficultyLabel(grade) }}
              </option>
            </select>
            <button
              type="button"
              class="cairn-btn is-small"
              :disabled="gradeFor(route) === route.official_difficulty"
              @click="adminStore.regradeRoute(route.id, gradeFor(route))"
            >
              Regrade
            </button>
            <button
              type="button"
              class="cairn-link"
              @click="adminStore.markReviewed(route.id, DIFFICULTY_REF)"
            >
              Keep grade
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

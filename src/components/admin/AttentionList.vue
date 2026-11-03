<script setup>
import { reactive } from 'vue'
import { RouterLink } from 'vue-router'
import { motion } from 'motion-v'
import { useAdminStore } from '@/controller/adminStore'
import { difficultyLabel, formatDate, modifierClass } from '@/lib/format'
import { rowMotion } from '@/lib/motion'
import AttentionGroup from '@/components/admin/AttentionGroup.vue'
import ReportActions from '@/components/admin/ReportActions.vue'
import DifficultyMark from '@/components/common/DifficultyMark.vue'
import WarningIcon from '@/components/common/WarningIcon.vue'
import {
  DIFFICULTY_REF,
  HAZARD_ROUTE_REF,
  draftFromHazardRoute,
  draftFromPointWarning,
  draftFromRepeatedReport,
  draftFromUnconfirmedReport,
  pointWarningRef,
  repeatedRef,
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

    <AttentionGroup
      title="Hazards confirmed at checkpoints"
      :show="adminStore.openPointWarnings.length > 0"
    >
      <motion.li
        v-for="warning in adminStore.openPointWarnings"
        :key="`${warning.point_id}-${warning.category}`"
        v-bind="rowMotion"
        layout="position"
        class="admin-item has-mark"
      >
        <span class="admin-mark is-hazard"><WarningIcon /></span>
        <div class="admin-item-body">
          <p class="admin-item-title">
            <strong>{{ warning.label }}</strong>
            at {{ warning.point_name
            }}<template v-if="warning.day_number"> (day {{ warning.day_number }})</template>
            on
            <RouterLink :to="{ name: 'route-detail', params: { id: warning.route_id } }">{{
              adminStore.routeNames.get(warning.route_id) || 'a route'
            }}</RouterLink>
          </p>
          <p class="cairn-fine">
            {{ warning.reporter_count }} hikers, last on
            {{ formatDate(warning.last_reported_at) }}
          </p>
          <p v-if="warning.latest_note" class="admin-quote">“{{ warning.latest_note }}”</p>
        </div>
        <ReportActions
          @raise="emit('raise-alert', draftFromPointWarning(warning))"
          @review="adminStore.markReviewed(warning.route_id, pointWarningRef(warning))"
        />
      </motion.li>
    </AttentionGroup>

    <AttentionGroup
      title="Serious reports from several hikers"
      hint="Hikers don't see these until you raise an alert. A live notice for one of these already shows the new count, so publish again only to raise its severity, then take the older one down."
      :show="adminStore.repeatedReports.length > 0"
    >
      <motion.li
        v-for="report in adminStore.repeatedReports"
        :key="`${report.route_id}-${report.point_id}-${report.category}`"
        v-bind="rowMotion"
        layout="position"
        class="admin-item has-mark"
      >
        <span class="admin-mark is-hazard"><WarningIcon /></span>
        <div class="admin-item-body">
          <p class="admin-item-title">
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
            {{ report.reporter_count }} hikers, last on {{ formatDate(report.created_at) }}
          </p>
          <p v-if="report.note" class="admin-quote">“{{ report.note }}”</p>
        </div>
        <ReportActions
          @raise="emit('raise-alert', draftFromRepeatedReport(report))"
          @review="adminStore.markReviewed(report.route_id, repeatedRef(report))"
        />
      </motion.li>
    </AttentionGroup>

    <AttentionGroup
      title="Serious reports, not yet confirmed"
      hint="One hiker each, so hikers don't see these until you raise an alert."
      :show="adminStore.unconfirmedReports.length > 0"
    >
      <motion.li
        v-for="report in adminStore.unconfirmedReports"
        :key="`${report.route_id}-${report.point_id}-${report.category}`"
        v-bind="rowMotion"
        layout="position"
        class="admin-item has-mark"
      >
        <span class="admin-mark is-avatar">{{
          (report.reporter || 'A hiker').charAt(0).toUpperCase()
        }}</span>
        <div class="admin-item-body">
          <p class="admin-item-title">
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
            {{ report.reporter || 'A hiker' }}, {{ formatDate(report.created_at) }}
          </p>
          <p v-if="report.note" class="admin-quote">“{{ report.note }}”</p>
        </div>
        <ReportActions
          @raise="emit('raise-alert', draftFromUnconfirmedReport(report))"
          @review="adminStore.markReviewed(report.route_id, unconfirmedRef(report))"
        />
      </motion.li>
    </AttentionGroup>

    <AttentionGroup title="Community hazard reports" :show="adminStore.openHazardRoutes.length > 0">
      <motion.li
        v-for="route in adminStore.openHazardRoutes"
        :key="route.id"
        v-bind="rowMotion"
        layout="position"
        class="admin-item has-mark"
      >
        <span class="admin-mark is-hazard"><WarningIcon /></span>
        <div class="admin-item-body">
          <p class="admin-item-title">
            <span class="admin-tag" :class="modifierClass(route.community_hazard_level)">{{
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
        <ReportActions
          @raise="emit('raise-alert', draftFromHazardRoute(route))"
          @review="adminStore.markReviewed(route.id, HAZARD_ROUTE_REF)"
        />
      </motion.li>
    </AttentionGroup>

    <AttentionGroup
      title="Difficulty may need regrading"
      :show="adminStore.difficultyMismatches.length > 0"
    >
      <motion.li
        v-for="route in adminStore.difficultyMismatches"
        :key="route.id"
        v-bind="rowMotion"
        layout="position"
        class="admin-item has-mark"
      >
        <span class="admin-mark">
          <DifficultyMark :grade="Math.round(route.effective_difficulty)" :show-label="false" />
        </span>
        <div class="admin-item-body">
          <p class="admin-item-title">
            <RouterLink :to="{ name: 'route-detail', params: { id: route.id } }">{{
              route.name
            }}</RouterLink>
          </p>
          <p class="cairn-fine admin-regrade">
            <DifficultyMark :grade="route.official_difficulty" />
            <span aria-hidden="true">→</span>
            <span class="cairn-visually-hidden">hikers rate it</span>
            <DifficultyMark :grade="Math.round(route.effective_difficulty)" />
            <span>
              · {{ route.review_count }}
              {{ route.review_count === 1 ? 'hiker rates' : 'hikers rate' }} it
              {{ route.gap > 0 ? 'harder' : 'easier' }}
            </span>
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
      </motion.li>
    </AttentionGroup>
  </div>
</template>

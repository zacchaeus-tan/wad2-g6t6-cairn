<script setup>
import { RouterLink } from 'vue-router'
import { MotionConfig, motion } from 'motion-v'
import { alertMessageLines } from '@/lib/alertDrafts'
import { formatDate, modifierClass } from '@/lib/format'
import { rowMotion } from '@/lib/motion'

// Published route alerts, from the admin page. An alert with a route_name also
// links to its route, for lists that cover more than one route.
defineProps({
  alerts: { type: Array, required: true },
  title: { type: String, default: 'Trail notices' },
})

const SEVERITY_LABELS = { info: 'Notice', warning: 'Warning', danger: 'Danger' }
</script>

<template>
  <!-- A plain labelled section, not role="alert": the notices are part of the
       page, so screen readers should not announce them on load. -->
  <MotionConfig reduced-motion="user">
    <section
      v-if="alerts.length"
      id="trail-notices"
      class="trail-notices"
      aria-labelledby="trail-notices-title"
    >
      <h2 id="trail-notices-title" class="cairn-label">{{ title }}</h2>
      <ul class="trail-notices-list">
        <motion.li
          v-for="(alert, index) in alerts"
          :key="alert.id"
          v-bind="rowMotion"
          :transition="{ ...rowMotion.transition, delay: index * 0.06 }"
          class="trail-notice"
          :class="modifierClass(alert.severity)"
        >
          <div class="trail-notice-head">
            <p class="trail-notice-severity">{{ SEVERITY_LABELS[alert.severity] || 'Notice' }}</p>
            <p class="trail-notice-title">{{ alert.title }}</p>
            <p v-if="alert.route_name" class="cairn-fine">
              <RouterLink :to="{ name: 'route-detail', params: { id: alert.route_id } }">{{
                alert.route_name
              }}</RouterLink>
            </p>
            <p v-if="alert.ends_at" class="cairn-fine">
              Expected until {{ formatDate(alert.ends_at) }}
            </p>
          </div>
          <div v-if="alert.message" class="trail-notice-message">
            <p v-for="(line, lineIndex) in alertMessageLines(alert.message)" :key="lineIndex">
              {{ line }}
            </p>
          </div>
        </motion.li>
      </ul>
    </section>
  </MotionConfig>
</template>

<style scoped>
.trail-notices {
  container: trail-notices / inline-size;
  margin-bottom: 32px;
}

.trail-notices-list {
  display: grid;
  gap: 12px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.trail-notice {
  display: grid;
  gap: 10px;
  padding: 14px 20px;
  border-left: 6px solid var(--lake);
  background: #e3eef6;
  color: var(--ink);
}

/* The profile page sits outside .cairn, so set these here for every page */
.trail-notice p {
  margin: 0;
}

.trail-notice a {
  color: var(--pine);
}

.trail-notice.is-warning {
  border-left-color: var(--hazard);
  background: var(--warning-mist);
}

.trail-notice.is-danger {
  border-left-color: var(--blaze);
  background: #fbe9e2;
}

.trail-notice-severity {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--granite-700);
}

.trail-notice.is-danger .trail-notice-severity {
  color: var(--blaze-deep);
}

.trail-notice-head {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
}

.trail-notice-title {
  font-size: 17px;
  font-weight: 900;
  line-height: 22px;
}

/* Full ink, because these notices are safety information */
.trail-notice-message {
  display: grid;
  align-content: start;
  gap: 2px;
  min-width: 0;
  color: var(--ink);
  font-size: 15px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

/* Sized by the space it has, which is narrower than the screen on the profile page */
@container trail-notices (min-width: 720px) {
  .trail-notice {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: 28px;
  }

  .trail-notice-message {
    padding-left: 28px;
    border-left: 1px solid rgb(23 32 28 / 0.15);
  }
}
</style>

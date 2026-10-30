<script setup>
import { formatDate } from '@/lib/format'

// Published route alerts, from the admin page.
defineProps({
  alerts: { type: Array, required: true },
})

const SEVERITY_LABELS = { info: 'Notice', warning: 'Warning', danger: 'Danger' }
</script>

<template>
  <!-- A plain labelled section, not role="alert": the notices are part of the
       page, so screen readers should not announce them on load. -->
  <section v-if="alerts.length" class="trail-notices" aria-labelledby="trail-notices-title">
    <h2 id="trail-notices-title" class="cairn-label">Trail notices</h2>
    <ul class="trail-notices-list">
      <li
        v-for="alert in alerts"
        :key="alert.id"
        class="trail-notice"
        :class="`is-${alert.severity}`"
      >
        <p class="trail-notice-severity">{{ SEVERITY_LABELS[alert.severity] || 'Notice' }}</p>
        <p class="trail-notice-title">{{ alert.title }}</p>
        <p v-if="alert.message" class="trail-notice-message">{{ alert.message }}</p>
        <p v-if="alert.ends_at" class="cairn-fine">
          Expected until {{ formatDate(alert.ends_at) }}
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.trail-notices {
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
  gap: 4px;
  padding: 16px 20px;
  border-left: 6px solid var(--lake);
  background: #e3eef6;
  color: var(--ink);
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

.trail-notice-title {
  font-size: 18px;
  font-weight: 900;
}

.trail-notice-message {
  color: var(--granite-700);
}
</style>

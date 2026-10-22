<script setup>
import { useAdminStore } from '@/controller/adminStore'

const adminStore = useAdminStore()

const JOB_LABELS = {
  'check-weather': 'Weather check',
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClass(status) {
  return { success: 'bg-success', error: 'bg-danger', running: 'bg-info text-dark' }[status] || 'bg-secondary'
}

function summaryText(summary) {
  if (!summary) return ''
  return `${summary.forecasts} forecasts · ${summary.alertsQueued} new alerts queued · ${summary.alertsExpired} expired`
}
</script>

<template>
  <div>
    <p class="small text-body-secondary">
      The weather check runs once a day. It saves a 3-day forecast for every route and queues alerts for
      heavy rain, hail, strong gusts and extreme heat under <strong>Needs attention</strong>, where you
      choose whether to publish them.
    </p>

    <p v-if="!adminStore.latestRuns.length && !adminStore.jobError" class="text-body-secondary">
      No job has run yet.
    </p>

    <ul v-else class="list-group mb-3">
      <li v-for="run in adminStore.latestRuns" :key="run.id" class="list-group-item">
        <div class="d-flex flex-wrap gap-2 justify-content-between">
          <strong>{{ JOB_LABELS[run.job] || run.job }}</strong>
          <span class="badge" :class="statusClass(run.status)">{{ run.status }}</span>
        </div>
        <p class="small mb-0">
          {{ formatTime(run.started_at) }} · {{ run.trigger === 'manual' ? 'run by an admin' : 'scheduled' }}
        </p>
        <p v-if="run.status === 'success'" class="small text-body-secondary mb-0">{{ summaryText(run.summary) }}</p>
        <p v-else-if="run.error" class="small text-danger mb-0">{{ run.error }}</p>
      </li>
    </ul>

    <p v-if="adminStore.jobError" class="alert alert-danger" role="alert">{{ adminStore.jobError }}</p>

    <button
      type="button"
      class="btn btn-outline-success"
      :disabled="adminStore.jobRunning"
      @click="adminStore.runWeatherCheck()"
    >
      {{ adminStore.jobRunning ? 'Checking weather…' : 'Run weather check now' }}
    </button>
  </div>
</template>

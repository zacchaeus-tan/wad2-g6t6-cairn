<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import { useAuthStore } from '@/controller/authStore'
import AttentionList from '@/components/admin/AttentionList.vue'
import AlertForm from '@/components/admin/AlertForm.vue'
import LiveAlertList from '@/components/admin/LiveAlertList.vue'
import RouteStatusEditor from '@/components/admin/RouteStatusEditor.vue'
import DataQualityList from '@/components/admin/DataQualityList.vue'
import AutomationStatus from '@/components/admin/AutomationStatus.vue'

const adminStore = useAdminStore()
const auth = useAuthStore()
const alertRouteId = ref('')
const alertSection = ref(null)

onMounted(() => {
  adminStore.fetchAll()
})

// "Raise alert" on a hazard report fills in the route and jumps to the form.
async function raiseAlert(routeId) {
  alertRouteId.value = routeId
  await nextTick()
  alertSection.value?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="container admin-page py-5">
    <header class="d-flex flex-wrap gap-3 justify-content-between align-items-end mb-4">
      <div>
        <p class="admin-eyebrow mb-1">Admin</p>
        <h1 class="h2 mb-0">Route alerts and safety</h1>
      </div>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="adminStore.loading" @click="adminStore.fetchAll()">
        {{ adminStore.loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    <p v-if="adminStore.loadError" class="alert alert-danger" role="alert">
      Unable to load admin data: {{ adminStore.loadError }}
    </p>
    <p v-if="adminStore.actionError" class="alert alert-danger" role="alert">
      Could not update the alert: {{ adminStore.actionError }}
    </p>

    <p v-if="adminStore.loading && !adminStore.routes.length" role="status">Loading…</p>

    <div v-else class="row g-4">
      <section class="col-12" aria-labelledby="attention-title">
        <div class="admin-section">
          <h2 id="attention-title" class="h5 mb-3">
            Needs attention
            <span v-if="adminStore.attentionCount" class="badge bg-danger ms-1">{{ adminStore.attentionCount }}</span>
          </h2>
          <AttentionList @raise-alert="raiseAlert" />
        </div>
      </section>

      <section ref="alertSection" class="col-12 col-lg-7" aria-labelledby="new-alert-title">
        <div class="admin-section h-100">
          <h2 id="new-alert-title" class="h5 mb-3">Publish an alert</h2>
          <AlertForm :user-id="auth.user.id" :route-id="alertRouteId" />
        </div>
      </section>

      <section class="col-12 col-lg-5" aria-labelledby="live-alerts-title">
        <div class="admin-section h-100">
          <h2 id="live-alerts-title" class="h5 mb-3">Published alerts</h2>
          <LiveAlertList />
        </div>
      </section>

      <section class="col-12 col-lg-6" aria-labelledby="route-status-title">
        <div class="admin-section h-100">
          <h2 id="route-status-title" class="h5 mb-3">Route status</h2>
          <RouteStatusEditor />
        </div>
      </section>

      <section class="col-12 col-lg-6" aria-labelledby="data-quality-title">
        <div class="admin-section h-100">
          <h2 id="data-quality-title" class="h5 mb-3">Missing route information</h2>
          <DataQualityList />
        </div>
      </section>

      <section class="col-12" aria-labelledby="automation-title">
        <div class="admin-section">
          <h2 id="automation-title" class="h5 mb-3">Automated checks</h2>
          <AutomationStatus />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 1200px;
}

.admin-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #198754;
}

.admin-section {
  border: 1px solid #dee2e6;
  border-radius: 0.75rem;
  padding: 1.5rem;
}
</style>

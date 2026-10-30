<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import { useAuthStore } from '@/controller/authStore'
import AttentionList from '@/components/admin/AttentionList.vue'
import AlertForm from '@/components/admin/AlertForm.vue'
import LiveAlertList from '@/components/admin/LiveAlertList.vue'
import RouteStatusEditor from '@/components/admin/RouteStatusEditor.vue'
import DataQualityList from '@/components/admin/DataQualityList.vue'
import '@/assets/admin.css'

const adminStore = useAdminStore()
const auth = useAuthStore()
const alertForm = ref(null)
const alertSection = ref(null)

onMounted(() => {
  adminStore.fetchAll()
})

async function showForm() {
  await nextTick()
  alertSection.value?.scrollIntoView({ behavior: 'smooth' })
}

// "Raise alert" on a hazard report fills in the form and jumps to it.
function raiseAlert(draft) {
  alertForm.value?.fillDraft(draft)
  showForm()
}

// "Edit" on a published alert loads it into the same form.
function editAlert(alert) {
  alertForm.value?.editAlert(alert)
  showForm()
}
</script>

<template>
  <div class="cairn admin-page">
    <div class="cairn-wrap">
      <header class="admin-header">
        <div>
          <p class="cairn-label">Admin</p>
          <h1 class="cairn-headline">Route alerts and safety</h1>
        </div>
        <button
          type="button"
          class="cairn-btn is-ghost is-small"
          :disabled="adminStore.loading"
          @click="adminStore.fetchAll()"
        >
          {{ adminStore.loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </header>

      <p v-if="adminStore.loadError" class="admin-note is-error" role="alert">
        Unable to load admin data: {{ adminStore.loadError }}
      </p>
      <p v-if="adminStore.actionError" class="admin-note is-error" role="alert">
        That did not save: {{ adminStore.actionError }}
      </p>

      <p v-if="adminStore.loading && !adminStore.routes.length" role="status">Loading…</p>

      <div v-else class="row g-4 mt-1">
        <section class="col-12" aria-labelledby="attention-title">
          <div class="admin-panel">
            <h2 id="attention-title" class="admin-panel-title">
              Needs attention
              <span v-if="adminStore.attentionCount" class="admin-count">{{
                adminStore.attentionCount
              }}</span>
            </h2>
            <AttentionList @raise-alert="raiseAlert" />
          </div>
        </section>

        <section ref="alertSection" class="col-12 col-lg-7" aria-labelledby="new-alert-title">
          <div class="admin-panel">
            <h2 id="new-alert-title" class="admin-panel-title">Publish an alert</h2>
            <AlertForm ref="alertForm" :user-id="auth.user.id" />
          </div>
        </section>

        <section class="col-12 col-lg-5" aria-labelledby="live-alerts-title">
          <div class="admin-panel">
            <h2 id="live-alerts-title" class="admin-panel-title">Published alerts</h2>
            <LiveAlertList @edit-alert="editAlert" />
          </div>
        </section>

        <section class="col-12 col-lg-6" aria-labelledby="route-status-title">
          <div class="admin-panel">
            <h2 id="route-status-title" class="admin-panel-title">Route status</h2>
            <RouteStatusEditor />
          </div>
        </section>

        <section class="col-12 col-lg-6" aria-labelledby="data-quality-title">
          <div class="admin-panel">
            <h2 id="data-quality-title" class="admin-panel-title">Missing route information</h2>
            <DataQualityList />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

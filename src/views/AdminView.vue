<script setup>
import { onMounted, ref } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import { useAuthStore } from '@/controller/authStore'
import AdminNote from '@/components/admin/AdminNote.vue'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import AttentionList from '@/components/admin/AttentionList.vue'
import AlertForm from '@/components/admin/AlertForm.vue'
import LiveAlertList from '@/components/admin/LiveAlertList.vue'
import RouteStatusEditor from '@/components/admin/RouteStatusEditor.vue'
import DataQualityList from '@/components/admin/DataQualityList.vue'
import ReviewModeration from '@/components/admin/ReviewModeration.vue'
import CairnLoader from '@/components/common/CairnLoader.vue'
import '@/assets/admin.css'

const adminStore = useAdminStore()
const auth = useAuthStore()
const alertForm = ref(null)
const alertPanel = ref(null)
const statusPanel = ref(null)

onMounted(() => {
  adminStore.fetchAll()
})

// "Raise alert" on a hazard report fills in the form and jumps to it.
function raiseAlert(draft) {
  alertForm.value?.fillDraft(draft)
  alertPanel.value?.scrollToTop()
}

// "Edit" on a published alert loads it into the same form.
function editAlert(alert) {
  alertForm.value?.editAlert(alert)
  alertPanel.value?.scrollToTop()
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

      <AdminNote v-if="adminStore.loadError" type="error">
        Unable to load admin data: {{ adminStore.loadError }}
      </AdminNote>
      <AdminNote v-if="adminStore.actionError" type="error">
        That did not save: {{ adminStore.actionError }}
      </AdminNote>

      <CairnLoader
        v-if="adminStore.loading && !adminStore.routes.length"
        class="admin-loading"
        message="Loading admin data"
        on-light
      />

      <div v-else class="row g-4 mt-1">
        <AdminPanel class="col-12" title="Needs attention" :count="adminStore.attentionCount">
          <AttentionList @raise-alert="raiseAlert" />
        </AdminPanel>

        <AdminPanel ref="alertPanel" class="col-12 col-lg-7" title="Publish an alert">
          <AlertForm ref="alertForm" :user-id="auth.user.id" />
        </AdminPanel>

        <AdminPanel class="col-12 col-lg-5" title="Published alerts">
          <LiveAlertList @edit-alert="editAlert" />
        </AdminPanel>

        <AdminPanel ref="statusPanel" class="col-12 col-lg-6" title="Route status">
          <RouteStatusEditor @choose-from-list="statusPanel?.scrollToTop()" />
        </AdminPanel>

        <AdminPanel class="col-12 col-lg-6" title="Missing route information">
          <DataQualityList />
        </AdminPanel>

        <AdminPanel class="col-12" title="Recent reviews">
          <ReviewModeration />
        </AdminPanel>
      </div>
    </div>
  </div>
</template>

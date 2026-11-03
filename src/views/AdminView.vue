<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animate } from 'motion-v'
import { useAdminStore } from '@/controller/adminStore'
import { useAuthStore } from '@/controller/authStore'
import { EASE_OUT } from '@/lib/motion'
import AdminBanner from '@/components/admin/AdminBanner.vue'
import AdminNumbers from '@/components/admin/AdminNumbers.vue'
import AdminTabs from '@/components/admin/AdminTabs.vue'
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
const currentRoute = useRoute()
const router = useRouter()
const alertForm = ref(null)
const tabsTop = ref(null) // marks where the tab bar starts, since a stuck bar reports where it is stuck

const tabs = computed(() => [
  { key: 'attention', label: 'Needs attention', count: adminStore.attentionCount },
  { key: 'alerts', label: 'Alerts' },
  { key: 'status', label: 'Route status' },
  { key: 'info', label: 'Route info' },
  { key: 'reviews', label: 'Reviews' },
])

// The open tab lives in the address (/admin?tab=alerts), so a refresh or a shared link keeps it.
const activeTab = computed(() =>
  tabs.value.some((tab) => tab.key === currentRoute.query.tab)
    ? currentRoute.query.tab
    : 'attention',
)

onMounted(() => {
  adminStore.fetchAll()
})

// Brings the tab bar to the top of the screen, so the tab's content starts just under it.
function scrollToTabs() {
  const top = tabsTop.value.getBoundingClientRect().top + window.scrollY
  animate(window.scrollY, top, {
    duration: 0.6,
    ease: EASE_OUT,
    onUpdate: (y) => window.scrollTo(0, y),
  })
}

function selectTab(key) {
  router.replace({ query: { tab: key } })
  scrollToTabs()
}

// "Raise alert" on a hazard report fills in the form on the Alerts tab.
function raiseAlert(draft) {
  alertForm.value.fillDraft(draft)
  selectTab('alerts')
}

// "Edit" on a published alert loads it into the same form.
function editAlert(alert) {
  alertForm.value.editAlert(alert)
  scrollToTabs()
}
</script>

<template>
  <div class="cairn admin-page">
    <AdminBanner @show-attention="selectTab('attention')" />
    <AdminNumbers @select="selectTab" />
    <div ref="tabsTop"></div>
    <AdminTabs :tabs="tabs" :active="activeTab" @select="selectTab" />

    <!-- Padding, not the panels' margin, makes the extra room above the footer on
         large screens, so it keeps the page's background -->
    <div class="cairn-wrap pb-lg-5">
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

      <template v-else>
        <AdminPanel
          tab="attention"
          title="Needs attention"
          lede="Raise an alert to warn hikers, or mark a report reviewed to clear it from this list."
          :active="activeTab === 'attention'"
        >
          <AttentionList @raise-alert="raiseAlert" />
        </AdminPanel>

        <AdminPanel
          tab="alerts"
          title="Alerts"
          lede="Short-term warnings that show on a route's banner until they end. For a long closure, set the route status instead."
          :active="activeTab === 'alerts'"
        >
          <div class="row g-4 g-lg-5">
            <div class="col-12 col-lg-7">
              <AlertForm ref="alertForm" :user-id="auth.user.id" />
            </div>
            <div class="col-12 col-lg-5">
              <h3 class="admin-subhead">Published</h3>
              <LiveAlertList @edit-alert="editAlert" />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          tab="status"
          title="Route status"
          lede="Open, caution or closed. A status stays on the route's banner until you change it."
          :active="activeTab === 'status'"
        >
          <RouteStatusEditor @choose-from-list="scrollToTabs" />
        </AdminPanel>

        <AdminPanel
          tab="info"
          title="Missing route information"
          lede="Fill these in so the route shows its numbers, sits on the globe and turns up in filters."
          :active="activeTab === 'info'"
        >
          <DataQualityList />
        </AdminPanel>

        <AdminPanel
          tab="reviews"
          title="Trail register"
          lede="The newest entries across every route. Remove fake or abusive ones so they stop moving a route's grade and hazard level."
          :active="activeTab === 'reviews'"
        >
          <ReviewModeration />
        </AdminPanel>
      </template>
    </div>
  </div>
</template>

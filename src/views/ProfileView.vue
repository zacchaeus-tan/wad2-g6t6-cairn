<script setup>
import { computed, onMounted, ref } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { useAuthStore } from '@/controller/authStore'
import { useChecklistStore } from '@/controller/checklistStore'
import { useUserRoutesStore } from '@/controller/userRoutesStore'
import ProfileSummary from '@/components/profile/ProfileSummary.vue'
import ProfileExperience from '@/components/profile/ProfileExperience.vue'
import ProfileHikeTotals from '@/components/profile/ProfileHikeTotals.vue'
import ProfileSavedRoutes from '@/components/profile/ProfileSavedRoutes.vue'
import ProfileChecklists from '@/components/profile/ProfileChecklists.vue'

const auth = useAuthStore()
const userRoutesStore = useUserRoutesStore()
const checklistStore = useChecklistStore()

const tabs = computed(() => [
  {
    name: 'Profile',
    views: [
      {
        component: ProfileSummary,
        props: { profile: auth.profile, email: auth.user?.email },
      },
      { component: ProfileExperience, props: { profile: auth.profile } },
      { component: ProfileHikeTotals, props: { routes: userRoutesStore.savedRoutes } },
    ],
  },
  { name: 'Saved routes', views: [{ component: ProfileSavedRoutes, props: {} }] },
  { name: 'Checklists', views: [{ component: ProfileChecklists, props: {} }] },
])

const activeName = ref('Profile')
const activeTab = computed(() => tabs.value.find((tab) => tab.name === activeName.value))

onMounted(async () => {
  checklistStore.reset()
  await Promise.all([checklistStore.loadSaved(), userRoutesStore.loadSaved()])
})
</script>

<template>
  <div class="container mt-5" style="max-width: 960px; min-height:600px">

    <div v-if="!auth.profile" class="alert alert-warning">
      We couldn't load your profile. Try refreshing the page.
    </div>

    <div v-else class="row">
      <nav class="col-md-3 mb-3">
        <div class="nav nav-pills flex-column">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            type="button"
            class="nav-link text-start"
            :class="{ active: tab.name === activeName }"
            @click="activeName = tab.name"
          >
            {{ tab.name }}
          </button>
        </div>
      </nav>

      <div class="col-md-9">
        <AnimatePresence mode="wait" :initial="false">
          <motion.div
            :key="activeName"
            :initial="{ opacity: 0, y: 12 }"
            :animate="{ opacity: 1, y: 0 }"
            :exit="{ opacity: 0, y: -12 }"
            :transition="{ duration: 0.2 }"
          >
            <component
              :is="view.component"
              v-for="(view, index) in activeTab.views"
              :key="index"
              v-bind="view.props"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </div>
</template>

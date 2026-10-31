<script setup>
import { onMounted } from 'vue'
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

onMounted(async () => {
  checklistStore.reset()
  await Promise.all([checklistStore.loadSaved(), userRoutesStore.loadSaved()])
})
</script>

<template>
  <div class="container" style="max-width: 720px">
    <h1 class="h3 mb-3">My profile</h1>

    <div v-if="!auth.profile" class="alert alert-warning">
      We couldn't load your profile. Try refreshing the page.
    </div>

    <template v-else>
      <ProfileSummary :profile="auth.profile" :email="auth.user?.email" />
      <ProfileExperience :profile="auth.profile" />
    </template>

    <ProfileHikeTotals :routes="userRoutesStore.savedRoutes" />
    <ProfileSavedRoutes />
    <ProfileChecklists />
  </div>
</template>

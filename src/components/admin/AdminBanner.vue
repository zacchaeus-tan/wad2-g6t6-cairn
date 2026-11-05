<script setup>
import { computed } from 'vue'
import { useAdminStore } from '@/controller/adminStore'
import WarningIcon from '@/components/common/WarningIcon.vue'
import bannerPhoto from '@/assets/img/card-lake-peaks.jpg'

const emit = defineEmits(['show-attention'])

const adminStore = useAdminStore()

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

// The most severe hazard hikers confirmed at a checkpoint, shown under the navbar as on a route banner.
const hazard = computed(() => adminStore.openPointWarnings[0] ?? null)

const summary = computed(() => {
  const waiting = adminStore.attentionCount
  const closed = adminStore.notOpenRoutes.length
  const first = waiting
    ? `${plural(waiting, 'item needs', 'items need')} your attention`
    : 'Nothing needs your attention'
  return closed
    ? `${first}, and ${plural(closed, 'route is', 'routes are')} not open.`
    : `${first}.`
})
</script>

<template>
  <section class="admin-banner" aria-labelledby="admin-title">
    <img class="admin-banner-photo" :src="bannerPhoto" alt="" />

    <div v-if="hazard" class="cairn-wrap admin-banner-warning" role="alert">
      <button type="button" @click="emit('show-attention')">
        <WarningIcon />
        <span>
          <strong>Hazard confirmed by hikers</strong>
          <span class="admin-banner-warning-text">
            {{ hazard.label }} at {{ hazard.point_name }},
            {{ adminStore.routeNames.get(hazard.route_id) || 'a route' }}
          </span>
        </span>
      </button>
    </div>

    <div class="cairn-wrap admin-banner-inner">
      <p class="admin-banner-crumb">Admin</p>
      <h1 id="admin-title" class="admin-banner-title">Route alerts and safety</h1>
      <p v-if="adminStore.routes.length" class="admin-banner-lede">{{ summary }}</p>
      <button
        type="button"
        class="cairn-link admin-banner-refresh"
        data-testid="admin-refresh"
        :disabled="adminStore.loading"
        @click="adminStore.fetchAll()"
      >
        {{ adminStore.loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>
  </section>
</template>

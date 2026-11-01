<script setup>
import { RouterLink } from 'vue-router'
import { useUserRoutesStore } from '@/controller/userRoutesStore'
import SaveRouteButton from '@/components/common/SaveRouteButton.vue'

// Uses the store directly: SaveRouteButton changes this same list from inside each row.
const userRoutesStore = useUserRoutesStore()
</script>

<template>
  <section class="mb-4" aria-labelledby="saved-routes-title">
    <h2 id="saved-routes-title" class="h6 text-muted text-uppercase mb-2">My routes</h2>

    <p v-if="userRoutesStore.savedLoading && !userRoutesStore.savedRoutes.length" role="status">
      Loading your routes...
    </p>

    <div v-if="userRoutesStore.error" class="alert alert-danger py-2 small" role="alert">
      {{ userRoutesStore.error }}
    </div>
    <div v-if="userRoutesStore.statsMessage" class="alert alert-success py-2 small" role="status">
      {{ userRoutesStore.statsMessage }}
    </div>

    <p
      v-if="!userRoutesStore.savedLoading && !userRoutesStore.error && !userRoutesStore.savedRoutes.length"
      class="alert alert-secondary"
    >
      You have no saved routes yet. Open a route and click "Save route" or "Mark as completed" to see it here.
    </p>

    <ul v-if="userRoutesStore.savedRoutes.length" class="list-group">
      <li
        v-for="route in userRoutesStore.savedRoutes"
        :key="route.id"
        class="list-group-item d-flex flex-wrap align-items-center gap-2"
      >
        <div class="flex-grow-1">
          <div class="fw-medium">{{ route.route_name }}</div>
          <div class="small text-muted">
            <template v-if="route.country">{{ route.country }}</template>
            <template v-if="route.country && route.completed_at"> · </template>
            <template v-if="route.completed_at">Completed {{ new Date(route.completed_at).toLocaleDateString() }}</template>
          </div>
        </div>
        <SaveRouteButton :routeId="route.route_id"></SaveRouteButton>
        <RouterLink class="btn btn-sm btn-outline-secondary" :to="'/routes/' + route.route_id">View route</RouterLink>
      </li>
    </ul>
  </section>
</template>

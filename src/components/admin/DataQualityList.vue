<script setup>
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'

const adminStore = useAdminStore()
</script>

<template>
  <p v-if="!adminStore.incompleteRoutes.length" class="text-body-secondary mb-0">
    Every route has its map location, country and distance.
  </p>

  <div v-else class="table-responsive">
    <table class="table table-sm align-middle mb-0">
      <caption class="small">
        {{
          adminStore.incompleteRoutes.length
        }}
        of
        {{
          adminStore.routes.length
        }}
        routes are missing information.
      </caption>
      <thead>
        <tr>
          <th scope="col">Route</th>
          <th scope="col">Missing</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="route in adminStore.incompleteRoutes" :key="route.id">
          <td>
            <RouterLink :to="{ name: 'route-detail', params: { id: route.id } }">{{
              route.name
            }}</RouterLink>
          </td>
          <td>
            <span
              v-for="item in route.missing"
              :key="item"
              class="badge text-bg-light border me-1"
              >{{ item }}</span
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

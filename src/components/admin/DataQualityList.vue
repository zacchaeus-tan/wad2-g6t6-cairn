<script setup>
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'

const adminStore = useAdminStore()
</script>

<template>
  <p v-if="!adminStore.incompleteRoutes.length" class="admin-empty">
    Every route has its map location, country and distance.
  </p>

  <div v-else class="table-responsive">
    <table class="admin-table">
      <caption>
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
            <span v-for="item in route.missing" :key="item" class="admin-tag">{{ item }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

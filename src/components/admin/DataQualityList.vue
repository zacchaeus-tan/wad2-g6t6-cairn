<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAdminStore } from '@/controller/adminStore'
import RouteInfoForm from '@/components/admin/RouteInfoForm.vue'

const adminStore = useAdminStore()
const editingId = ref(null)
const saving = ref(false)
const savedName = ref('') // the route just saved, for the message above the table

function edit(route) {
  adminStore.infoError = null
  savedName.value = ''
  editingId.value = route.id
}

async function save(route, form) {
  saving.value = true
  const name = route.name
  const saved = await adminStore.saveRouteInfo(route.id, form)
  saving.value = false
  if (saved) {
    savedName.value = name
    editingId.value = null
  }
}
</script>

<template>
  <p v-if="savedName" class="admin-note mt-0 mb-3" role="status">Saved {{ savedName }}.</p>

  <p v-if="!adminStore.incompleteRoutes.length" class="admin-empty">
    Every route has its map location, country, distance, elevation gain and altitude.
  </p>

  <div v-else class="table-responsive admin-scroll">
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
          <th scope="col"><span class="cairn-visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="route in adminStore.incompleteRoutes" :key="route.id">
          <tr>
            <td>
              <RouterLink :to="{ name: 'route-detail', params: { id: route.id } }">{{
                route.name
              }}</RouterLink>
            </td>
            <td>
              <span v-for="item in route.missing" :key="item" class="admin-tag">{{ item }}</span>
            </td>
            <td class="text-end">
              <button type="button" class="cairn-link" @click="edit(route)">Edit</button>
            </td>
          </tr>
          <tr v-if="editingId === route.id">
            <td colspan="3">
              <RouteInfoForm
                :route="route"
                :saving="saving"
                @save="save(route, $event)"
                @cancel="editingId = null"
              />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

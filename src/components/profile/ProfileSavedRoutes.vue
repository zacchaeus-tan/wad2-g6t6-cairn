<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { AnimatePresence, motion } from 'motion-v'
import { useUserRoutesStore } from '@/controller/userRoutesStore'
import {
  ROUTE_FILTERS,
  ROUTE_SORTS,
  filterRoutes,
  routeCounts,
  sortRoutes,
} from '@/lib/profileTools'
import { useRowArrivals } from '@/lib/useRowArrivals'
import NoticeBox from '@/components/common/NoticeBox.vue'
import SaveRouteButton from '@/components/common/SaveRouteButton.vue'
import SelectMenu from '@/components/common/SelectMenu.vue'
import ProfileLoadError from './ProfileLoadError.vue'
import ProfileSkeleton from './ProfileSkeleton.vue'
import ProfileStatusMark from './ProfileStatusMark.vue'

// Uses the store directly: SaveRouteButton changes this same list from inside each row.
const userRoutesStore = useUserRoutesStore()
const rowMotion = useRowArrivals()

const filter = ref('all')
const sort = ref('name')

const counts = computed(() => routeCounts(userRoutesStore.savedRoutes))
const visibleRoutes = computed(() =>
  sortRoutes(filterRoutes(userRoutesStore.savedRoutes, filter.value), sort.value),
)

const NO_MATCH = {
  saved: 'No saved routes right now.',
  completed: 'No completed routes yet.',
}

function statusText(route) {
  if (route.status !== 'completed') return 'Saved'
  return route.completed_at
    ? `Completed ${new Date(route.completed_at).toLocaleDateString()}`
    : 'Completed'
}
</script>

<template>
  <section class="profile-routes" aria-labelledby="saved-routes-title">
    <h2 id="saved-routes-title" class="cairn-headline">My routes</h2>

    <ProfileSkeleton v-if="userRoutesStore.savedLoading && !userRoutesStore.savedRoutes.length">
      Loading your routes...
    </ProfileSkeleton>

    <ProfileLoadError v-if="userRoutesStore.error" @retry="userRoutesStore.loadSaved()">
      {{ userRoutesStore.error }}
    </ProfileLoadError>
    <NoticeBox v-if="userRoutesStore.statsMessage" type="success">
      {{ userRoutesStore.statsMessage }}
    </NoticeBox>

    <NoticeBox
      v-if="
        !userRoutesStore.savedLoading &&
        !userRoutesStore.error &&
        !userRoutesStore.savedRoutes.length
      "
      type="empty"
    >
      You have no saved routes yet. Open a route and click "Save route" or "Mark as completed" to
      see it here.
    </NoticeBox>

    <div v-if="userRoutesStore.savedRoutes.length" class="profile-routes-controls">
      <div class="profile-routes-segments" role="group" aria-label="Filter routes">
        <button
          v-for="option in ROUTE_FILTERS"
          :key="option.value"
          type="button"
          class="profile-routes-segment"
          :class="{ 'is-active': filter === option.value }"
          :aria-pressed="filter === option.value"
          @click="filter = option.value"
        >
          {{ option.label }}
          <span class="cairn-data">{{ counts[option.value] }}</span>
        </button>
      </div>
      <SelectMenu
        id="saved-routes-sort"
        v-model="sort"
        class="profile-routes-sort"
        label="Sort"
        :options="ROUTE_SORTS"
      />
    </div>

    <NoticeBox
      v-if="userRoutesStore.savedRoutes.length && !visibleRoutes.length"
      type="empty"
      role="status"
    >
      {{ NO_MATCH[filter] }}
    </NoticeBox>

    <AnimatePresence v-if="visibleRoutes.length" as="ul" class="profile-routes-list">
      <motion.li
        v-for="(route, index) in visibleRoutes"
        :key="route.id"
        v-bind="rowMotion('route-' + route.id, index)"
        layout
        class="profile-route"
      >
        <div class="profile-route-info">
          <p class="profile-route-name">{{ route.route_name }}</p>
          <p v-if="route.country" class="cairn-label">{{ route.country }}</p>
          <p class="profile-route-status">
            <ProfileStatusMark :completed="route.status === 'completed'" />
            {{ statusText(route) }}
          </p>
        </div>
        <div class="profile-route-actions">
          <SaveRouteButton :routeId="route.route_id" :show-completed="false" />
          <RouterLink class="cairn-btn is-ghost is-small" :to="'/routes/' + route.route_id">
            View route
          </RouterLink>
        </div>
      </motion.li>
    </AnimatePresence>
  </section>
</template>

<style scoped>
.profile-routes {
  display: grid;
  gap: 24px;
}

.profile-routes-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px 24px;
}

.profile-routes-segments {
  display: inline-flex;
  flex-wrap: wrap;
}

.profile-routes-segment {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-right: -2px;
  padding: 0 14px;
  border: 2px solid var(--ink);
  background: transparent;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.profile-routes-segment.is-active {
  background: var(--ink);
  color: var(--ground);
}

.profile-routes-segment:focus-visible {
  position: relative;
  z-index: 1;
  outline: 3px solid var(--lake);
  outline-offset: 2px;
}

.profile-routes-segment .cairn-data {
  font-size: 13px;
  font-weight: 600;
}

.profile-routes-sort {
  flex: 0 1 220px;
  min-width: 190px;
}

.profile-routes-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
}

/* Each route is a post-it. The shadow is on the row, so the cut corner on the sheet can't clip it */
.profile-route {
  --curl: 16px; /* inside the 20px padding, so it never covers content */
  --curl-reach: calc(var(--curl) * 1.414); /* corner to the fold's inner point */
  --curl-from: 45deg;
  --cut: polygon(0 0, 100% 0, 100% 100%, var(--curl) 100%, 0 calc(100% - var(--curl)));
  --fold: polygon(0 0, 100% 0, 100% 100%);
  position: relative;
  isolation: isolate;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px 32px;
  padding: 20px 24px;
  margin-bottom: 10px;
  filter: drop-shadow(0 10px 18px rgb(23 32 28 / 0.15));
}

.profile-route:nth-child(even) {
  --curl-from: -45deg;
  --cut: polygon(0 0, 100% 0, 100% calc(100% - var(--curl)), calc(100% - var(--curl)) 100%, 0 100%);
  --fold: polygon(0 0, 100% 0, 0 100%);
}

/* The sheet, its adhesive strip and the short shadow under the fold */
.profile-route::before {
  content: '';
  position: absolute;
  inset: 0 0 -1px;
  z-index: -1;
  background:
    linear-gradient(
      var(--curl-from),
      rgb(23 32 28 / 0.16) var(--curl-reach),
      transparent calc(var(--curl-reach) + 6px)
    ),
    linear-gradient(rgb(255 201 77 / 0.35), rgb(255 201 77 / 0.35)) top / 100% 10px no-repeat,
    linear-gradient(to top right, #fff6c4, #ffeea0);
  clip-path: var(--cut);
}

/* The corner folded over, showing the paper's underside */
.profile-route::after {
  content: '';
  position: absolute;
  bottom: -1px;
  z-index: -1;
  width: var(--curl);
  height: var(--curl);
  background: var(--hazard);
  clip-path: var(--fold);
}

.profile-route:nth-child(odd)::after {
  left: 0;
}

.profile-route:nth-child(even)::after {
  right: 0;
}

.profile-route-info {
  display: grid;
  flex: 1 1 14rem;
  gap: 6px;
  min-width: 0;
}

.profile-route-name {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 16px;
  font-weight: 900;
  line-height: 22px;
}

.profile-route-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--granite-700);
  font-size: 14px;
}

.profile-route-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
</style>

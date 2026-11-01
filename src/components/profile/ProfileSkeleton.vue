<script setup>
// Stands in for a ruled list while it loads. The slot is what screen readers hear.
defineProps({
  rows: { type: Number, default: 3 },
})
</script>

<template>
  <div class="profile-skeleton" role="status">
    <span class="cairn-visually-hidden"><slot /></span>
    <div v-for="row in rows" :key="row" class="profile-skeleton-row" aria-hidden="true">
      <span class="profile-skeleton-block is-title"></span>
      <span class="profile-skeleton-block"></span>
    </div>
  </div>
</template>

<style scoped>
.profile-skeleton {
  border-top: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
}

.profile-skeleton-row {
  display: grid;
  gap: 10px;
  padding: 20px 0;
}

.profile-skeleton-row + .profile-skeleton-row {
  border-top: 1px solid var(--granite-200);
}

.profile-skeleton-block {
  display: block;
  width: min(100%, 180px);
  height: 12px;
  background: var(--linen);
  animation: profile-skeleton-pulse 1.8s ease-in-out infinite;
}

.profile-skeleton-block.is-title {
  width: min(100%, 320px);
  height: 18px;
}

@keyframes profile-skeleton-pulse {
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-skeleton-block {
    animation: none;
  }
}
</style>

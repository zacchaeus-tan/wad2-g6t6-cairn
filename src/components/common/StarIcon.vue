<script setup>
// A faded star with the orange one on top, cut off at how full it should be.
// The parent sets the size, and the faded colour through --star-off.
defineProps({
  fill: { type: Number, default: 1 }, // 0 to 1, e.g. 0.5 for a half star
})

const STAR = 'm12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z'
</script>

<template>
  <svg viewBox="0 0 24 24">
    <path class="star-off" :d="STAR" />
    <path class="star-on" :d="STAR" :style="{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }" />
  </svg>
</template>

<style scoped>
.star-off {
  fill: var(--star-off);
}

.star-on {
  fill: var(--blaze);
}
</style>

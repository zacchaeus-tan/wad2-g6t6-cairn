<script setup>
defineProps({
  stacked: { type: Boolean, default: false }, // keep the buttons under the details at every width
})
</script>

<!-- The inside of one row in an admin list, in Bootstrap columns: an optional mark on
     the left (hazard, grade or the hiker's initial), the details, then the buttons.
     On phones the buttons drop under the details, still clear of the mark; from md
     they sit on the right. The parent keeps the <li>, so its list can animate rows. -->
<template>
  <div class="row g-3">
    <div v-if="$slots.mark" class="col-auto">
      <slot name="mark" />
    </div>
    <div class="col">
      <div class="row g-3 align-items-start">
        <div class="col-12" :class="{ 'col-md': !stacked }">
          <slot />
        </div>
        <div v-if="$slots.actions" class="col-12" :class="{ 'col-md-auto': !stacked }">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </div>
</template>

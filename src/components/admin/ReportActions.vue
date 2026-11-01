<script setup>
const emit = defineEmits(['raise', 'review'])
</script>

<template>
  <div class="admin-actions">
    <button type="button" class="cairn-btn is-small" @click="emit('raise')">Raise alert</button>
    <button type="button" class="cairn-link" @click="emit('review')">Reviewed, no action</button>
  </div>
</template>

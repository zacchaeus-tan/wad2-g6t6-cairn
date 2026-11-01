<script setup>
import NoticeBox from '@/components/common/NoticeBox.vue'

// A list that failed to load: what went wrong, and a way to try again.
const emit = defineEmits(['retry'])
</script>

<template>
  <div class="profile-load-error">
    <NoticeBox type="error"><slot /></NoticeBox>
    <button type="button" class="cairn-btn is-ghost is-small" @click="emit('retry')">
      Try again
    </button>
  </div>
</template>

<style scoped>
.profile-load-error {
  display: grid;
  justify-items: start;
  gap: 12px;
}

.profile-load-error > :first-child {
  justify-self: stretch;
}
</style>

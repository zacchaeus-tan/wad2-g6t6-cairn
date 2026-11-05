<script setup>
import { computed, ref, watch } from 'vue'
import { modifierClass } from '@/lib/format'
import { initialsOf } from '@/lib/profileTools'

// A square profile picture. Their initials stand in when there's no picture, or
// when it fails to load (deleted file, bad connection). A new picture gets another try.
const props = defineProps({
  src: { type: String, default: null },
  name: { type: String, default: '' }, // display name or email, for the initials
  size: { type: String, default: null }, // small, or null for the full 72px
})

const failed = ref(false)
watch(
  () => props.src,
  () => (failed.value = false),
)

const initials = computed(() => initialsOf(props.name))
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    alt=""
    class="user-avatar"
    :class="modifierClass(size)"
    @error="failed = true"
  />
  <div v-else class="user-avatar" :class="modifierClass(size)" aria-hidden="true">
    {{ initials }}
  </div>
</template>

<style scoped>
.user-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 72px;
  height: 72px;
  background: var(--pine);
  color: var(--paper);
  font-size: 28px;
  font-weight: 900;
  object-fit: cover;
}

.user-avatar.is-small {
  width: 44px;
  height: 44px;
  font-size: 17px;
}
</style>

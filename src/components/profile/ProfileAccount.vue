<script setup>
import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { useAuthStore } from '@/controller/authStore'
import { expandMotion } from '@/lib/motion'
import NoticeBox from '@/components/common/NoticeBox.vue'
import ProfileEditForm from './ProfileEditForm.vue'
import ProfilePasswordForm from './ProfilePasswordForm.vue'

const auth = useAuthStore()

const FORMS = {
  edit: { button: 'Edit profile', panelId: 'profile-edit-panel', success: 'Profile updated.' },
  password: {
    button: 'Change password',
    panelId: 'profile-password-panel',
    success: 'Password changed.',
  },
}

const openForm = ref(null)
const notice = ref('')
const buttons = useTemplateRef('buttons')

// The sign-in page shows the store's error too, so don't leave one behind
function toggle(name) {
  auth.error = null
  notice.value = ''
  openForm.value = openForm.value === name ? null : name
}

// Closing removes whatever had focus, so hand it back to the button that opened the form
async function onDone(name, saved) {
  auth.error = null
  openForm.value = null
  notice.value = saved ? FORMS[name].success : ''
  await nextTick()
  buttons.value.find((button) => button.dataset.form === name)?.focus()
}

onBeforeUnmount(() => {
  auth.error = null
})
</script>

<template>
  <div class="profile-account">
    <div class="profile-account-buttons">
      <button
        v-for="(form, name) in FORMS"
        :key="name"
        ref="buttons"
        type="button"
        class="cairn-btn is-ghost is-small"
        :data-form="name"
        :aria-expanded="openForm === name"
        :aria-controls="form.panelId"
        @click="toggle(name)"
      >
        {{ form.button }}
      </button>
    </div>

    <NoticeBox v-if="notice" type="success">{{ notice }}</NoticeBox>

    <AnimatePresence :initial="false">
      <motion.div
        v-if="openForm"
        :id="FORMS[openForm].panelId"
        :key="openForm"
        v-bind="expandMotion"
        class="profile-account-panel"
      >
        <div class="profile-account-panel-inner">
          <ProfileEditForm
            v-if="openForm === 'edit'"
            :profile="auth.profile"
            @done="onDone('edit', $event)"
          />
          <ProfilePasswordForm v-else @done="onDone('password', $event)" />
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.profile-account {
  display: grid;
  flex-basis: 100%;
  gap: 16px;
  min-width: 0;
}

.profile-account-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Clips the opening height. The inner padding keeps focus rings inside the clip. */
.profile-account-panel {
  overflow: hidden;
  margin: -6px;
}

.profile-account-panel-inner {
  padding: 6px;
}
</style>

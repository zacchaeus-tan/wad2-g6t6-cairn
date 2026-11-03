<script setup>
import { useRoute, useRouter } from 'vue-router'
import { motion } from 'motion-v'
import { useAuthStore } from '@/controller/authStore'
import { rowMotion } from '@/lib/motion'
import ProfileEditForm from '@/components/profile/ProfileEditForm.vue'
import TrailBackground from '@/components/auth/TrailBackground.vue'
import photo from '@/assets/img/cairn-valley.jpg'

// Where new Google sign-ups land: Google gives us their name and email, this asks for the rest.
// The router guard keeps them here until it's saved.
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

function finish() {
  router.push(route.query.redirect || { name: 'profile' })
}
</script>

<template>
  <section class="cairn welcome">
    <div class="welcome-backdrop">
      <img class="welcome-photo" :src="photo" alt="" />
      <TrailBackground />
    </div>

    <div class="welcome-layout">
      <motion.div v-bind="rowMotion" class="welcome-card">
        <h1 class="welcome-title">Finish your profile</h1>
        <p class="cairn-fine welcome-intro">
          A few details about you, so we can suggest routes that suit you.
        </p>

        <ProfileEditForm
          v-if="auth.profile"
          :profile="auth.profile"
          submit-label="Save and continue"
          :cancellable="false"
          @done="finish"
        />
      </motion.div>
    </div>
  </section>
</template>

<style scoped>
.welcome {
  position: relative;
  min-height: 100svh;
  background: var(--night);
  overflow: clip;
}

.welcome-backdrop {
  position: absolute;
  inset: 0;
}

.welcome-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.4;
  filter: saturate(0.55) brightness(0.8);
}

.welcome-layout {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: center;
  min-height: 100svh;
  padding: calc(var(--nav-height) + 40px) var(--gutter) 64px;
}

.welcome-card {
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: 560px;
  padding: clamp(24px, 4vw, 40px);
  background: var(--ground);
  box-shadow: var(--shadow-panel);
}

.welcome-title,
.welcome-intro {
  margin: 0;
}

.welcome-title {
  font-size: 24px;
}
</style>

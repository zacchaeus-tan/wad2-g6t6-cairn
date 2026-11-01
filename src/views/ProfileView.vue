<script setup>
import { computed, onMounted, ref } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { useAuthStore } from '@/controller/authStore'
import { useChecklistStore } from '@/controller/checklistStore'
import { useUserRoutesStore } from '@/controller/userRoutesStore'
import ProfileSummary from '@/components/profile/ProfileSummary.vue'
import ProfileExperience from '@/components/profile/ProfileExperience.vue'
import ProfileHikeTotals from '@/components/profile/ProfileHikeTotals.vue'
import ProfileSavedRoutes from '@/components/profile/ProfileSavedRoutes.vue'
import ProfileChecklists from '@/components/profile/ProfileChecklists.vue'
import ridgePhoto from '@/assets/img/card-ridge-hikers.jpg'

const EASE = [0.16, 1, 0.3, 1]
const PLANK_SPRING = { type: 'spring', stiffness: 320, damping: 24 }

// One plank per tab, in tab order: the rough outline drawn in a 380x92 box and its tilt on the post.
const PLANKS = [
  {
    outline: 'M14 10 L300 4 L318 6 L376 44 L322 86 L140 88 L40 84 L18 88 L26 76 L6 74 L20 62 L8 52 L24 44 L4 32 L22 26 L10 16 Z',
    tilt: -1,
  },
  {
    outline: 'M4 46 L60 8 L210 12 L352 8 L372 14 L362 24 L378 34 L360 42 L374 56 L356 62 L370 78 L350 84 L240 80 L64 86 Z',
    tilt: 1.2,
  },
  {
    outline: 'M20 8 L170 12 L316 4 L376 46 L318 88 L120 84 L30 88 L12 80 L24 68 L2 58 L20 48 L8 36 L26 28 L6 18 Z',
    tilt: -0.6,
  },
]

const auth = useAuthStore()
const userRoutesStore = useUserRoutesStore()
const checklistStore = useChecklistStore()

const tabs = computed(() => [
  {
    name: 'Profile',
    views: [
      {
        component: ProfileSummary,
        props: { profile: auth.profile, email: auth.user?.email },
      },
      { component: ProfileExperience, props: { profile: auth.profile } },
      { component: ProfileHikeTotals, props: { routes: userRoutesStore.savedRoutes } },
    ],
  },
  { name: 'Saved routes', views: [{ component: ProfileSavedRoutes, props: {} }] },
  { name: 'Checklists', views: [{ component: ProfileChecklists, props: {} }] },
])

const activeName = ref('Profile')
const activeTab = computed(() => tabs.value.find((tab) => tab.name === activeName.value))

const isActive = (tab) => tab.name === activeName.value
// Planks alternate: 1 points right, -1 points left.
const direction = (index) => (index % 2 ? -1 : 1)

onMounted(async () => {
  checklistStore.reset()
  await Promise.all([checklistStore.loadSaved(), userRoutesStore.loadSaved()])
})
</script>

<template>
  <div class="cairn profile-page">
    <img class="profile-photo" :src="ridgePhoto" alt="" />

    <div class="cairn-wrap profile-trail">
      <p v-if="!auth.profile" class="profile-note">
        We couldn't load your profile. Try refreshing the page.
      </p>

      <template v-else>
        <nav class="signpost" aria-label="Profile">
          <svg class="signpost-post" viewBox="0 0 36 600" preserveAspectRatio="none" aria-hidden="true">
            <filter id="post-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.22 0.008" numOctaves="4" seed="2" />
              <feColorMatrix values="0 0 0 0 0.24  0 0 0 0 0.16  0 0 0 0 0.09  0 0 0 3 -1.2" />
              <feComposite in2="SourceGraphic" operator="in" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode />
              </feMerge>
            </filter>
            <path d="M3 4 L14 0 L33 3 L36 600 L0 600 Z" filter="url(#post-grain)" />
          </svg>

          <motion.button
            v-for="(tab, index) in tabs"
            :key="tab.name"
            type="button"
            class="plank"
            :class="{ active: isActive(tab), 'points-left': direction(index) < 0 }"
            :aria-current="isActive(tab) ? 'page' : undefined"
            :initial="false"
            :animate="{ x: isActive(tab) ? direction(index) * 10 : 0, rotate: PLANKS[index].tilt }"
            :whileHover="{ x: direction(index) * 14 }"
            :whilePress="{ scale: 0.98 }"
            :transition="PLANK_SPRING"
            @click="activeName = tab.name"
          >
            <svg class="plank-wood" viewBox="0 0 380 92" preserveAspectRatio="none" aria-hidden="true">
              <filter :id="`plank-grain-${index}`" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.008 0.22" numOctaves="4" :seed="index + 3" />
                <feColorMatrix values="0 0 0 0 0.24  0 0 0 0 0.16  0 0 0 0 0.09  0 0 0 3 -1.2" />
                <feComposite in2="SourceGraphic" operator="in" />
                <feMerge>
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode />
                </feMerge>
              </filter>
              <path :d="PLANKS[index].outline" :filter="`url(#plank-grain-${index})`" />
            </svg>

            <span class="plank-word">
              <AnimatePresence :initial="false">
                <motion.span
                  v-if="isActive(tab)"
                  class="plank-mark"
                  :initial="{ clipPath: 'inset(0 100% 0 0%)' }"
                  :animate="{ clipPath: 'inset(0 0% 0 0%)' }"
                  :exit="{ clipPath: 'inset(0 0% 0 100%)' }"
                  :transition="{ duration: 0.55, ease: EASE }"
                />
              </AnimatePresence>
              {{ tab.name }}
            </span>
          </motion.button>
        </nav>

        <section class="profile-panel">
          <AnimatePresence mode="wait" :initial="false">
            <motion.div
              :key="activeName"
              :initial="{ opacity: 0, y: 12 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0, y: -12 }"
              :transition="{ duration: 0.25, ease: EASE }"
            >
              <component
                :is="view.component"
                v-for="(view, index) in activeTab.views"
                :key="index"
                v-bind="view.props"
              />
            </motion.div>
          </AnimatePresence>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  --wood: var(--trail);
  --wood-light: #664c33;
  --stage: calc(100svh - var(--nav-height));
  --stage-pad: clamp(24px, 5vh, 56px);
  position: relative;
  overflow: clip;
  background: var(--night);
}

/* Stays on screen behind the panel when a long view scrolls */
.profile-photo {
  position: sticky;
  top: 0;
  display: block;
  width: 100%;
  height: 100svh;
  margin-bottom: -100svh;
  object-fit: cover;
  object-position: center 78%;
  opacity: 0.42;
  filter: saturate(0.8);
}

.profile-trail {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: clamp(32px, 6vw, 88px);
  min-height: var(--stage);
  padding-block: var(--stage-pad);
}

.profile-note {
  grid-column: 1 / -1;
  place-self: center;
  max-width: 460px;
  padding: 16px 20px;
  background: var(--warning-mist);
  color: var(--warning);
  font-weight: 700;
}

.signpost {
  position: sticky;
  top: 24px;
  align-self: start;
  display: grid;
  gap: 24px;
  padding-block: 48px;
}

/* Taller than the screen, so it always runs off the bottom of the page */
.signpost-post {
  position: absolute;
  top: 0;
  left: calc(50% - 18px);
  width: 36px;
  height: 100svh;
  fill: var(--wood);
}

.plank {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: end;
  width: 94%;
  height: 92px;
  padding: 0 52px 0 28px;
  border: 0;
  background: none;
  color: var(--paper);
  font: 900 clamp(22px, 2.2vw, 28px) / 1 var(--font);
  letter-spacing: -0.01em;
  text-shadow: 0 1px 0 rgb(16 24 20 / 0.55);
  cursor: pointer;
}

.plank.points-left {
  justify-self: start;
  padding: 0 28px 0 52px;
}

.plank:focus-visible {
  outline: 3px solid var(--glacier);
}

.plank-wood {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  fill: var(--wood);
  filter: drop-shadow(0 8px 8px rgb(16 24 20 / 0.45));
}

.plank:hover .plank-wood,
.plank.active .plank-wood {
  fill: var(--wood-light);
}

.plank-word {
  position: relative;
  isolation: isolate;
  padding: 14px 60px;
  white-space: nowrap;
}

.plank-mark {
  position: absolute;
  inset: 0;
  z-index: -1;
}

/* Rough, hand-drawn edges like the marker on sign-in */
.plank-mark::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--pine);
  clip-path: polygon(1% 8%, 22% 2%, 48% 7%, 74% 1%, 99% 6%, 97% 34%, 100% 62%, 98% 95%, 72% 99%, 46% 93%, 20% 98%, 0 92%, 2% 58%, 0 30%);
}

/* A plain sheet so the views stay readable over the photo */
.profile-panel {
  position: relative;
  min-width: 0;
  min-height: calc(var(--stage) - 2 * var(--stage-pad));
  padding: clamp(24px, 3vw, 44px);
  background: var(--ground);
  box-shadow: var(--shadow-panel);
}

@media (max-width: 900px) {
  .profile-trail {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .signpost {
    position: relative;
    top: 0;
    justify-self: center;
    width: min(100%, 380px);
    gap: 12px;
    padding-block: 24px 32px;
  }

  .plank {
    height: 68px;
  }

  .profile-panel {
    min-height: 700px;
  }
}
</style>

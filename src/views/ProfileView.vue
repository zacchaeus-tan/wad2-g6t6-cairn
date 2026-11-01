<script setup>
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion-v'
import { useAuthStore } from '@/controller/authStore'
import { useChecklistStore } from '@/controller/checklistStore'
import { useMyReviewsStore } from '@/controller/myReviewsStore'
import { useUserRoutesStore } from '@/controller/userRoutesStore'
import NoticeBox from '@/components/common/NoticeBox.vue'
import TrailNotices from '@/components/routes/TrailNotices.vue'
import ProfileSummary from '@/components/profile/ProfileSummary.vue'
import ProfileGettingStarted from '@/components/profile/ProfileGettingStarted.vue'
import ProfileExperience from '@/components/profile/ProfileExperience.vue'
import ProfileHikeTotals from '@/components/profile/ProfileHikeTotals.vue'
import ProfileSavedRoutes from '@/components/profile/ProfileSavedRoutes.vue'
import ProfileChecklists from '@/components/profile/ProfileChecklists.vue'
import ProfileReviews from '@/components/profile/ProfileReviews.vue'
import { gettingStartedSteps } from '@/lib/profileTools'
import { SEEN_ROWS } from '@/lib/useRowArrivals'
import mountainPhoto from '@/assets/img/card-mountain.jpg'

const EASE = [0.16, 1, 0.3, 1]
const PLANK_SPRING = { type: 'spring', stiffness: 320, damping: 24 }

// One plank per tab, in tab order: the rough outline drawn in a 380x92 box and its tilt on the post.
const PLANKS = [
  {
    outline:
      'M14 10 L300 4 L318 6 L376 44 L322 86 L140 88 L40 84 L18 88 L26 76 L6 74 L20 62 L8 52 L24 44 L4 32 L22 26 L10 16 Z',
    tilt: -1,
  },
  {
    outline:
      'M4 46 L60 8 L210 12 L352 8 L372 14 L362 24 L378 34 L360 42 L374 56 L356 62 L370 78 L350 84 L240 80 L64 86 Z',
    tilt: 1.2,
  },
  {
    outline:
      'M20 8 L170 12 L316 4 L376 46 L318 88 L120 84 L30 88 L12 80 L24 68 L2 58 L20 48 L8 36 L26 28 L6 18 Z',
    tilt: -0.6,
  },
  {
    outline:
      'M3 44 L58 6 L196 10 L348 6 L374 12 L360 22 L376 36 L358 44 L372 58 L352 66 L368 80 L344 86 L216 82 L60 88 Z',
    tilt: 0.8,
  },
]

const currentRoute = useRoute()
const router = useRouter()
const auth = useAuthStore()
const reduceMotion = useReducedMotion()
// Kept here because the tabs unmount their lists when you switch away
provide(SEEN_ROWS, new Set())
const userRoutesStore = useUserRoutesStore()
const checklistStore = useChecklistStore()
const myReviewsStore = useMyReviewsStore()

// The trail waits for what it counts, so it doesn't show steps as unfinished while they load
const dataLoaded = ref(false)
const stepsReady = computed(
  () => dataLoaded.value && !userRoutesStore.error && !myReviewsStore.error,
)

const tabs = computed(() => [
  {
    name: 'Profile',
    value: 'profile',
    views: [
      {
        component: ProfileSummary,
        props: { profile: auth.profile, email: auth.user?.email },
      },
      {
        component: ProfileGettingStarted,
        props: {
          ready: stepsReady.value,
          userId: auth.user?.id,
          steps: gettingStartedSteps({
            profile: auth.profile,
            savedRoutes: userRoutesStore.savedRoutes,
            reviewCount: myReviewsStore.total,
          }),
        },
      },
      { component: ProfileExperience, props: { profile: auth.profile } },
      { component: ProfileHikeTotals, props: { routes: userRoutesStore.savedRoutes } },
    ],
  },
  { name: 'Saved routes', value: 'routes', views: [{ component: ProfileSavedRoutes, props: {} }] },
  { name: 'Checklists', value: 'checklists', views: [{ component: ProfileChecklists, props: {} }] },
  { name: 'Reviews', value: 'reviews', views: [{ component: ProfileReviews, props: {} }] },
])

// The active tab is in the URL (?tab=routes), so a refresh or a link lands on it. An unknown
// value falls back to the first tab, whose value is left out of the URL.
const activeTab = computed(
  () => tabs.value.find((tab) => tab.value === currentRoute.query.tab) ?? tabs.value[0],
)
const activeName = computed(() => activeTab.value.name)

function selectTab(tab) {
  const query = { ...currentRoute.query, tab: tab.value }
  if (tab === tabs.value[0]) delete query.tab
  router.replace({ query })
}

const activeIndex = computed(() => tabs.value.indexOf(activeTab.value))

const isActive = (tab) => tab.name === activeName.value
// Planks alternate: 1 points right, -1 points left.
const direction = (index) => (index % 2 ? -1 : 1)

// Arrow keys move between the tabs, and choosing one opens it
function onTabKeydown(event, index) {
  const count = tabs.value.length
  const next = {
    ArrowDown: index + 1,
    ArrowRight: index + 1,
    ArrowUp: index - 1,
    ArrowLeft: index - 1,
    Home: 0,
    End: count - 1,
  }[event.key]
  if (next === undefined) return

  event.preventDefault()
  const target = (next + count) % count
  selectTab(tabs.value[target])
  document.getElementById(`profile-tab-${target}`)?.focus()
}

onMounted(async () => {
  checklistStore.reset()
  await Promise.all([
    checklistStore.loadSaved(),
    userRoutesStore.loadSaved(),
    myReviewsStore.loadFirst(),
  ])
  dataLoaded.value = true
})
</script>

<template>
  <MotionConfig reduced-motion="user">
    <div class="cairn profile-page">
      <img class="profile-photo" :src="mountainPhoto" alt="" />
      <h1 class="cairn-visually-hidden">My profile</h1>

      <div class="cairn-wrap profile-trail">
        <NoticeBox v-if="!auth.profile" type="error" class="profile-note">
          We couldn't load your profile. Try refreshing the page.
        </NoticeBox>

        <template v-else>
          <div class="signpost" role="tablist" aria-label="Profile" aria-orientation="vertical">
            <svg
              class="signpost-post"
              viewBox="0 0 36 600"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <filter id="post-grain" x="0" y="0" width="100%" height="100%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.22 0.008"
                  numOctaves="4"
                  seed="2"
                />
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
              :id="`profile-tab-${index}`"
              type="button"
              role="tab"
              aria-controls="profile-tab-panel"
              :aria-selected="isActive(tab)"
              :tabindex="isActive(tab) ? 0 : -1"
              class="plank"
              :class="{ active: isActive(tab), 'points-left': direction(index) < 0 }"
              :initial="false"
              :animate="{
                x: isActive(tab) ? direction(index) * 10 : 0,
                rotate: PLANKS[index].tilt,
              }"
              :whileHover="{ x: direction(index) * 14 }"
              :whilePress="{ scale: 0.98 }"
              :transition="PLANK_SPRING"
              @click="selectTab(tab)"
              @keydown="onTabKeydown($event, index)"
            >
              <svg
                class="plank-wood"
                viewBox="0 0 380 92"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <filter :id="`plank-grain-${index}`" x="0" y="0" width="100%" height="100%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.008 0.22"
                    numOctaves="4"
                    :seed="index + 3"
                  />
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
          </div>

          <section
            id="profile-tab-panel"
            class="profile-panel"
            role="tabpanel"
            :aria-labelledby="`profile-tab-${activeIndex}`"
          >
            <!-- Above the tabs, so a safety notice shows whichever tab is open -->
            <TrailNotices
              :alerts="userRoutesStore.savedRouteNotices"
              title="Notices on your saved routes"
            />

            <AnimatePresence mode="wait" :initial="false">
              <motion.div
                :key="activeName"
                class="profile-panel-views"
                :initial="reduceMotion ? false : { opacity: 0 }"
                :animate="{ opacity: 1 }"
                :exit="reduceMotion ? undefined : { opacity: 0 }"
                :transition="{ duration: 0.35, ease: EASE }"
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
  </MotionConfig>
</template>

<style scoped>
.profile-page {
  --wood: var(--trail);
  --wood-light: #664c33;
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
  min-height: 100svh;
  padding-block: calc(var(--nav-height) + var(--stage-pad)) var(--stage-pad);
}

.profile-note {
  grid-column: 1 / -1;
  place-self: center;
  max-width: 460px;
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

/* The plank's shape isn't a rectangle, so keyboard focus lightens the wood and underlines the
   word instead of drawing a box around it */
.plank:focus,
.plank:focus-visible {
  outline: 0;
}

.plank:focus-visible .plank-wood {
  fill: var(--wood-light);
}

.plank:focus-visible .plank-word {
  text-decoration: underline 3px var(--glacier);
  text-underline-offset: 6px;
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
  clip-path: polygon(
    1% 8%,
    22% 2%,
    48% 7%,
    74% 1%,
    99% 6%,
    97% 34%,
    100% 62%,
    98% 95%,
    72% 99%,
    46% 93%,
    20% 98%,
    0 92%,
    2% 58%,
    0 30%
  );
}

/* A plain sheet so the views stay readable over the photo. It hugs its content, with a floor so
   short tabs don't make it jump */
.profile-panel {
  --panel-pad: clamp(20px, 3vw, 44px);
  position: relative;
  align-self: start;
  container: profile-panel / inline-size;
  min-width: 0;
  min-height: 420px;
  padding: var(--panel-pad);
  background: var(--ground);
  box-shadow: var(--shadow-panel);
}

.profile-panel-views {
  display: grid;
  gap: 40px;
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
    min-height: 0;
  }
}
</style>

<script setup>
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animate, motion, useMotionValue, useTransform } from 'motion-v'
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
import { fadeMotion } from '@/lib/motion'
import mountainPhoto from '@/assets/img/card-mountain.jpg'

const FLIP = { duration: 0.55, ease: 'easeInOut' }
// How far the leaf has turned, in degrees. It is edge-on at EDGE_ON and gone at TURNED.
const EDGE_ON = -90
const TURNED = -150
// A tab's height on the page; these match the tab sizes in the styles
const TAB_LIFTED = -34 // clear of the page, so it can change sides unseen
const TAB_ON_PAGE = 8

const currentRoute = useRoute()
const router = useRouter()
const auth = useAuthStore()
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
    colour: '#c9d0cb',
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
  {
    name: 'Saved routes',
    value: 'routes',
    colour: '#bfdeb1',
    views: [{ component: ProfileSavedRoutes, props: {} }],
  },
  {
    name: 'Checklists',
    value: 'checklists',
    colour: '#fff4db',
    views: [{ component: ProfileChecklists, props: {} }],
  },
  {
    name: 'Reviews',
    value: 'reviews',
    colour: '#a3cbd1',
    views: [{ component: ProfileReviews, props: {} }],
  },
])

// The active tab is in the URL (?tab=routes), so a refresh or a link lands on it. An unknown
// value falls back to the first tab, whose value is left out of the URL.
const activeTab = computed(
  () => tabs.value.find((tab) => tab.value === currentRoute.query.tab) ?? tabs.value[0],
)

function selectTab(tab) {
  const query = { ...currentRoute.query, tab: tab.value }
  if (tab === tabs.value[0]) delete query.tab
  router.replace({ query })
}

const activeIndex = computed(() => tabs.value.indexOf(activeTab.value))

// The page on show follows the active tab, but only changes while the leaf is edge-on
const shownIndex = ref(activeIndex.value)
const shownTab = computed(() => tabs.value[shownIndex.value])

// One value drives the whole flip. Before EDGE_ON the sheet turns with the current content on it.
// After it the sheet is back flat and fading in with the new content, under the leaf's blank back.
// That makes 0 and TURNED look the same, so a forward flip runs 0 to TURNED, a backward flip runs
// TURNED to 0, and a click mid-flip can head for either end from wherever the leaf is.
const turn = useMotionValue(0)
const backOpacity = (angle) => (angle > EDGE_ON ? 0 : (angle - TURNED) / (EDGE_ON - TURNED))
const sheetRotate = useTransform(turn, (angle) => (angle > EDGE_ON ? angle : 0))
const sheetOpacity = useTransform(turn, (angle) => (angle > EDGE_ON ? 1 : 1 - backOpacity(angle)))
const leafOpacity = useTransform(turn, backOpacity)
const shadeOpacity = useTransform(turn, [TURNED, EDGE_ON, 0], [0, 1, 0])

watch(activeIndex, (index) => {
  if (turn.get() === 0 && index < shownIndex.value) turn.jump(TURNED)

  // Cross the edge if the content still has to change, otherwise fall back to the near end.
  // Starting a new animation stops the last one, so flips never queue.
  const startedNear = turn.get() > EDGE_ON
  const mustCross = index !== shownIndex.value
  animate(turn, mustCross === startedNear ? TURNED : 0, {
    ...FLIP,
    onUpdate: (angle) => {
      if (angle > EDGE_ON !== startedNear) shownIndex.value = activeIndex.value
    },
    onComplete: () => turn.jump(0),
  })
})

// Both tabs in a flip lift clear of the page, then settle once the content has changed
function tabY(index) {
  if (shownIndex.value !== activeIndex.value) {
    return index === shownIndex.value || index === activeIndex.value ? TAB_LIFTED : 0
  }
  return index === activeIndex.value ? TAB_ON_PAGE : 0
}

// Arrow keys move between the tabs, and choosing one opens it
function onTabKeydown(event, index) {
  const count = tabs.value.length
  const next = {
    ArrowRight: index + 1,
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
  <div class="cairn profile-page">
    <img class="profile-photo" :src="mountainPhoto" alt="" />
    <h1 class="cairn-visually-hidden">My profile</h1>

    <div class="cairn-wrap profile-stage">
      <NoticeBox v-if="!auth.profile" type="error" class="profile-note">
        We couldn't load your profile. Try refreshing the page.
      </NoticeBox>

      <motion.div v-else class="notebook" v-bind="fadeMotion">
        <div class="notebook-tabs" role="tablist" aria-label="Profile">
          <motion.button
            v-for="(tab, index) in tabs"
            :key="tab.name"
            :id="`profile-tab-${index}`"
            type="button"
            role="tab"
            aria-controls="profile-tab-panel"
            :aria-selected="index === activeIndex"
            :tabindex="index === activeIndex ? 0 : -1"
            class="notebook-tab"
            :class="{ 'is-on-page': index === shownIndex }"
            :style="{ backgroundColor: tab.colour }"
            :initial="false"
            :animate="{ y: tabY(index) }"
            :transition="{ duration: FLIP.duration / 2, ease: FLIP.ease }"
            @click="selectTab(tab)"
            @keydown="onTabKeydown($event, index)"
          >
            {{ tab.name }}
          </motion.button>
        </div>

        <section
          id="profile-tab-panel"
          class="notebook-page"
          role="tabpanel"
          :aria-labelledby="`profile-tab-${activeIndex}`"
        >
          <motion.div class="notebook-shade" :style="{ opacity: shadeOpacity }" />

          <motion.div
            class="notebook-sheet"
            :style="{ rotateY: sheetRotate, opacity: sheetOpacity }"
          >
            <!-- Above the views, so a safety notice shows whichever tab is open -->
            <TrailNotices
              :alerts="userRoutesStore.savedRouteNotices"
              title="Notices on your saved routes"
            />

            <div class="notebook-views">
              <component
                :is="view.component"
                v-for="(view, index) in shownTab.views"
                :key="index"
                v-bind="view.props"
              />
            </div>
          </motion.div>

          <motion.div class="notebook-leaf" :style="{ rotateY: turn, opacity: leafOpacity }" />

          <motion.div
            class="notebook-band"
            :initial="false"
            :animate="{ backgroundColor: activeTab.colour }"
            :transition="FLIP"
          />
          <div class="notebook-binding"></div>
        </section>
      </motion.div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  position: relative;
  overflow: clip;
  background: var(--night);
}

/* Stays on screen behind the notebook when a long view scrolls */
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

.profile-stage {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100svh;
  padding-block: calc(var(--nav-height) + clamp(8px, 2vh, 24px)) clamp(24px, 5vh, 56px);
}

.profile-note {
  align-self: center;
  max-width: 460px;
}

.notebook {
  --binding: 44px;
  --panel-pad: clamp(56px, 7vw, 84px);
  --margin-line: calc(var(--panel-pad) - 16px);
  --ruling: 32px;
  --ruled-paper:
    linear-gradient(
      90deg,
      transparent calc(var(--margin-line) - 1px),
      #e5a3a3 calc(var(--margin-line) - 1px) var(--margin-line),
      transparent var(--margin-line)
    ),
    repeating-linear-gradient(
      transparent 0 calc(var(--ruling) - 1px),
      rgb(95 107 101 / 0.16) calc(var(--ruling) - 1px) var(--ruling)
    ),
    var(--ground);
  position: relative;
  isolation: isolate;
  width: min(100%, 920px);
  padding-left: calc(var(--binding) / 2);
}

/* Tall enough to hold a lifted tab and one on the page, so nothing clips when the row scrolls.
   The bottom margin leaves 26px of each tab showing above the page. */
.notebook-tabs {
  display: flex;
  gap: 8px;
  height: 102px;
  margin-bottom: -42px;
  padding: 34px 16px 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.notebook-tab {
  position: relative;
  z-index: 0;
  display: flex;
  flex: none;
  align-self: flex-start;
  justify-content: center;
  align-items: flex-start;
  height: 60px;
  padding: 6px 18px 0;
  border: 0;
  border-radius: 2px 5px 0 0;
  color: var(--ink);
  font: 700 15px / 14px var(--font);
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.notebook-tab:first-child {
  margin-left: auto;
}

.notebook-tab:hover {
  filter: brightness(1.05);
}

.notebook-tab:focus-visible {
  outline-offset: -3px;
}

/* Over the page instead of behind it */
.notebook-tab.is-on-page {
  z-index: 2;
}

.notebook-page {
  position: relative;
  z-index: 1;
  perspective: 1600px;
  background: var(--ruled-paper);
  box-shadow: var(--shadow-panel);
}

.notebook-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(23 32 28 / 0.32), transparent 70%);
  pointer-events: none;
}

.notebook-sheet {
  position: relative;
  container: profile-panel / inline-size;
  min-height: 420px;
  padding: 72px var(--panel-pad) var(--panel-pad);
  background: var(--ruled-paper);
  transform-origin: left center;
}

.notebook-views {
  display: grid;
  gap: 40px;
}

/* The back of the turning leaf, blank and hinged like the sheet */
.notebook-leaf {
  position: absolute;
  inset: 0;
  background: var(--ruled-paper);
  box-shadow: var(--shadow-stop);
  transform-origin: left center;
  pointer-events: none;
}

/* The selected tab's colour running on along the page, under the tab itself */
.notebook-band {
  position: absolute;
  inset: 0 0 auto;
  height: 12px;
  pointer-events: none;
}

.notebook-binding {
  position: absolute;
  inset-block: 0;
  left: calc(var(--binding) / -2);
  width: var(--binding);
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='42' fill='none'%3E%3Crect x='28' y='13' width='10' height='16' fill='%237a5a3a'/%3E%3Cg stroke='%239aa3a0' stroke-width='2'%3E%3Crect x='3' y='12' width='32' height='7' rx='3.5'/%3E%3Crect x='3' y='23' width='32' height='7' rx='3.5'/%3E%3C/g%3E%3C/svg%3E")
    top / 100% auto repeat-y;
  pointer-events: none;
}

/* Saved routes sit as rows on the page's ruling */
.notebook-sheet :deep(.profile-routes-list) {
  border: 0;
}

.notebook-sheet :deep(.profile-route) {
  border-top: 0;
  border-bottom: 1px solid rgb(95 107 101 / 0.16);
}

@media (max-width: 900px) {
  .profile-stage {
    padding-inline: 0;
  }

  .notebook {
    --binding: 24px;
    --panel-pad: 36px;
    width: 100%;
  }

  .notebook-sheet {
    min-height: 0;
  }
}
</style>

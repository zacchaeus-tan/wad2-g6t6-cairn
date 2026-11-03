<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import { GRADES } from '@/lib/difficultyStyle'
import ArrowIcon from '@/components/common/ArrowIcon.vue'
import photoAlpinePath from '@/assets/img/card-alpine-path.jpg'
import photoRidgeHikers from '@/assets/img/card-ridge-hikers.jpg'
import photoLakePeaks from '@/assets/img/card-lake-peaks.jpg'
import photoValley from '@/assets/img/cairn-valley.jpg'

// A draggable filmstrip: the middle panel is current and its photo fades in behind the section.
// A copy of the set sits on each side of the real panels. Once a move settles on a copy the
// strip jumps to the same panel in the real set, so it never reaches an end.
const SLIDES = [
  {
    key: 'fit',
    photo: photoAlpinePath,
    title: 'See your suitability for each route',
    text: "Fixed rules check each route against your history. A route can ask up to 25% more than you've done before and still count as within your experience.",
  },
  {
    key: 'grade',
    photo: photoRidgeHikers,
    title: 'The grade moves when hikers say so.',
    text: 'Every route keeps its official grade next to a community grade from reviews. When hikers rate it harder, the grade shifts, and the fit check uses it.',
  },
  {
    key: 'plan',
    photo: photoLakePeaks,
    title: 'Plan your trek',
    text: 'AI-assisted planner based on weather and your preferences',
  },
  {
    key: 'pack',
    photo: photoValley,
    title: 'Pack the right gear',
    text: 'Our AI assists you in ensuring you have the right gear for the conditions ahead.',
  },
]

const LEVELS = [
  { filled: 1, label: 'Comfortable', note: 'Within what you have done before.' },
  { filled: 2, label: 'Good challenge', note: 'A step up in one or two areas.' },
  { filled: 3, label: 'A stretch', note: 'Well beyond what you have done so far.' },
]

const PACK_LIST = [
  { name: 'Rain jacket', done: true },
  { name: 'Water bottles', qty: '2 L', done: true },
  { name: 'Head torch' },
  { name: 'Warm layer' },
]

const EASE = [0.16, 1, 0.3, 1]
const count = SLIDES.length
const panels = [...SLIDES, ...SLIDES, ...SLIDES]

const wrap = (index) => ((index % count) + count) % count

const view = ref(null)
const pos = ref(count) // index into panels; the real set runs from count to 2 * count - 1
const dragging = ref(false)
const current = computed(() => wrap(pos.value))

let moving = false
let settleTimer = 0
let dragStart = null

const panelEls = () => [...view.value.querySelectorAll('.slide')]

function leftOf(index) {
  const panel = panelEls()[index]
  return panel.offsetLeft - (view.value.clientWidth - panel.offsetWidth) / 2
}

function nearest() {
  const mid = view.value.scrollLeft + view.value.clientWidth / 2
  const offset = (panel) => Math.abs(panel.offsetLeft + panel.offsetWidth / 2 - mid)
  const els = panelEls()
  return els.reduce((best, panel, index) => (offset(panel) < offset(els[best]) ? index : best), 0)
}

function moveTo(index, smooth = true) {
  pos.value = Math.max(0, Math.min(panels.length - 1, index))
  moving = smooth
  view.value.scrollTo({ left: leftOf(pos.value), behavior: smooth ? 'smooth' : 'auto' })
  if (!smooth) settle()
}

// Back onto the real set, at the same scroll offset within the panel
function settle() {
  if (dragStart) return
  moving = false
  pos.value = nearest()
  const shift = pos.value < count ? count : pos.value >= 2 * count ? -count : 0
  if (shift) {
    const els = panelEls()
    view.value.scrollLeft += els[pos.value + shift].offsetLeft - els[pos.value].offsetLeft
    pos.value += shift
  }
}

function onScroll() {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(settle, 140)
  if (!moving) pos.value = nearest()
}

// Mouse drag; touch scrolls natively
function onPointerDown(event) {
  if (event.pointerType !== 'mouse') return
  if (moving) settle()
  dragStart = { x: event.clientX, left: view.value.scrollLeft }
  dragging.value = true
}

function onPointerMove(event) {
  if (dragStart) view.value.scrollLeft = dragStart.left - (event.clientX - dragStart.x)
}

function onPointerUp() {
  if (!dragStart) return
  dragStart = null
  dragging.value = false
  moveTo(nearest())
}

const onResize = () => moveTo(pos.value, false)

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', onResize)
  moveTo(count, false)
})

onBeforeUnmount(() => {
  clearTimeout(settleTimer)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <section class="tour">
    <div class="tour-back">
      <motion.img
        v-for="(slide, index) in SLIDES"
        :key="slide.key"
        :src="slide.photo"
        alt=""
        :initial="false"
        :animate="{ opacity: index === current ? 1 : 0 }"
        :transition="{ duration: 0.8, ease: EASE }"
      />
    </div>

    <div class="cairn-wrap tour-head">
      <h2 class="cairn-headline">How it works</h2>
    </div>

    <div
      ref="view"
      class="tour-view"
      :class="{ 'is-dragging': dragging }"
      @scroll.passive="onScroll"
      @pointerdown="onPointerDown"
    >
      <div class="tour-track">
        <motion.article
          v-for="(slide, index) in panels"
          :key="index"
          class="slide"
          :initial="false"
          :animate="{ opacity: wrap(index) === current ? 1 : 0.45 }"
          :transition="{ duration: 0.35, ease: EASE }"
        >
          <img class="slide-photo" :src="slide.photo" alt="" loading="lazy" />
          <!-- Text beside the visual from lg (992px) up, stacked below it -->
          <div class="row align-items-center gx-5 gy-3">
            <div class="slide-text col-lg-5">
              <h3>{{ slide.title }}</h3>
              <p>{{ slide.text }}</p>
            </div>

            <div class="slide-visual col-lg-7">
              <ul v-if="slide.key === 'fit'" class="levels">
                <li v-for="level in LEVELS" :key="level.filled">
                  <span class="meter">
                    <i
                      v-for="n in 3"
                      :key="n"
                      :style="n <= level.filled ? { background: GRADES[level.filled].line } : null"
                    ></i>
                  </span>
                  <strong>{{ level.label }}</strong>
                  <span>{{ level.note }}</span>
                </li>
              </ul>

              <div v-else-if="slide.key === 'grade'" class="shift">
                <div class="shift-grade">
                  <span class="cairn-label">Official</span>
                  <span class="shift-number cairn-data" :style="{ color: GRADES[1].ink }"
                    >1.00</span
                  >
                  <strong>{{ GRADES[1].label }}</strong>
                </div>
                <ArrowIcon class="shift-arrow" />
                <div class="shift-grade is-dark">
                  <span class="cairn-label">Community</span>
                  <span class="shift-number cairn-data">1.33</span>
                  <strong>Leaning moderate</strong>
                </div>
              </div>

              <article v-else-if="slide.key === 'plan'" class="plan-day">
                <p class="cairn-label">Day 1 · Sat, 31 Oct 2026</p>
                <h4>Ascent via Akiki Trail</h4>
                <p class="plan-way">Akiki Trailhead → Trail End at 2913 m</p>
                <p class="plan-facts cairn-data">
                  <span>9.26 km</span><span>+1647 m</span><span>~7 h</span>
                </p>
                <ul>
                  <li>Panoramic views of the Philippine mountain ranges</li>
                  <li>Dense forest sections transitioning to alpine vegetation</li>
                  <li>Rewarding summit views at the highest altitude point</li>
                </ul>
                <p class="plan-notes">
                  Start early to avoid afternoon weather changes; bring plenty of water and
                  high-energy snacks; wear sturdy hiking boots and layered clothing for altitude
                  changes; pace yourself for the steep elevation gain.
                </p>
              </article>

              <div v-else class="pad">
                <div class="pad-sheet">
                  <strong>Mount Pulag Lusod Trail · pack list</strong>
                  <ul>
                    <li v-for="item in PACK_LIST" :key="item.name">
                      <span class="pad-tick" :class="{ 'is-on': item.done }"></span>
                      <span class="pad-text" :class="{ 'is-on': item.done }">
                        {{ item.name }}
                        <span v-if="item.qty" class="pad-qty"> — {{ item.qty }}</span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.article>
      </div>
    </div>

    <div class="cairn-wrap tour-controls">
      <button
        class="tour-button is-previous"
        type="button"
        aria-label="Previous step"
        @click="moveTo(pos - 1)"
      >
        <ArrowIcon />
      </button>
      <div class="tour-ticks">
        <button
          v-for="(slide, index) in SLIDES"
          :key="slide.key"
          class="tour-tick"
          type="button"
          @click="moveTo(pos - current + index)"
        >
          <motion.span
            :initial="false"
            :animate="{ scaleX: index <= current ? 1 : 0 }"
            :transition="{ duration: 0.25, ease: EASE }"
            :style="{ originX: 0 }"
          />
        </button>
      </div>
      <span class="tour-count cairn-data">{{ current + 1 }} / {{ count }}</span>
      <button class="tour-button" type="button" aria-label="Next step" @click="moveTo(pos + 1)">
        <ArrowIcon />
      </button>
    </div>
  </section>
</template>

<style scoped>
.tour {
  --slide-width: min(82vw, 1120px);
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: clamp(12px, 3vh, 28px);
  height: 100svh;
  min-height: 560px;
  padding: clamp(20px, 5vh, 56px) 0 clamp(12px, 3vh, 32px);
  overflow: clip;
  background: var(--night);
  color: var(--paper);
}

.tour-back {
  position: absolute;
  inset: 0;
}

.tour-back img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.3) saturate(0.6);
}

.tour-head,
.tour-controls {
  position: relative;
}

.tour-view {
  position: relative;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  cursor: grab;
}

.tour-view::-webkit-scrollbar {
  display: none;
}

.tour-view.is-dragging {
  scroll-snap-type: none;
  cursor: grabbing;
  user-select: none;
}

.tour-track {
  display: flex;
  gap: 20px;
  width: max-content;
  height: 100%;
  padding-inline: calc((100vw - var(--slide-width)) / 2);
}

/* One panel: words beside what that step produces */
.slide {
  position: relative;
  flex: 0 0 var(--slide-width);
  display: grid;
  align-content: center;
  min-height: 0;
  padding: clamp(20px, 4vw, 56px);
  overflow: hidden;
  scroll-snap-align: center;
}

.slide-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.5) saturate(0.75);
  pointer-events: none;
}

.slide-text,
.slide-visual {
  position: relative;
}

.slide-text h3 {
  font-size: clamp(30px, 3.6vw, 52px);
  line-height: 1.04;
  font-weight: 900;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

.slide-text p {
  max-width: 40ch;
  margin-top: 18px;
  color: var(--paper);
  font-size: 18px;
  line-height: 28px;
  text-wrap: pretty;
}

.slide-visual {
  display: grid;
  justify-items: center;
}

.slide-visual > * {
  width: 100%;
  max-width: 440px;
}

/* The three suitability levels, on pine as on the route page */
.levels {
  margin: 0;
  padding: 8px 24px;
  list-style: none;
  background: var(--pine);
}

.levels li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 16px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid rgb(242 239 234 / 0.18);
}

.levels li:last-child {
  border-bottom: 0;
}

.levels strong {
  font-size: 20px;
  line-height: 26px;
  font-weight: 900;
}

.levels li > span:last-child {
  color: var(--sage);
  font-size: 15px;
  line-height: 22px;
}

.meter {
  grid-row: span 2;
  display: inline-grid;
  grid-auto-flow: column;
  gap: 3px;
}

.meter i {
  width: 10px;
  height: 34px;
  background: rgb(242 239 234 / 0.25);
}

/* Official grade next to the community grade */
.shift {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
}

.shift-grade {
  display: grid;
  gap: 6px;
  padding: 20px;
  border: 2px solid var(--ink);
  background: var(--white);
  color: var(--ink);
}

.shift-grade.is-dark {
  background: var(--ink);
  color: var(--paper);
}

.shift-grade.is-dark .cairn-label {
  color: var(--sage);
}

.shift-number {
  font-size: 44px;
  font-weight: 600;
  line-height: 1;
}

.shift-arrow {
  width: 40px;
  height: 40px;
}

/* Itinerary day card, as on the route page */
.plan-day {
  display: grid;
  gap: 8px;
  padding: 20px 22px;
  border-top: 3px solid var(--ink);
  background: var(--white);
  color: var(--ink);
}

.plan-day h4 {
  margin: 0;
  font-size: 18px;
  line-height: 24px;
  font-weight: 900;
}

.plan-day .cairn-label {
  color: var(--granite-700);
}

.plan-way {
  font-size: 15px;
}

.plan-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  color: var(--granite-700);
  font-size: 13px;
  font-weight: 500;
}

.plan-day ul {
  margin: 0;
  padding-left: 18px;
  font-size: 15px;
  line-height: 22px;
}

.plan-notes {
  color: var(--granite-700);
  font-size: 14px;
  line-height: 21px;
}

/* Ring-bound gear notepad, as on the route page */
.pad {
  color: var(--ink);
  filter: drop-shadow(0 16px 24px rgb(23 32 28 / 0.18));
  transform: rotate(-0.6deg);
}

.pad-sheet {
  padding: 18px 24px 24px 62px;
  background-color: var(--notepad);
  background-image:
    linear-gradient(to right, transparent 44px, #e5a3a3 44px 46px, transparent 46px),
    repeating-linear-gradient(to bottom, transparent 0 47px, #b8d2e6 47px 48px);
  background-position:
    0 0,
    0 52px;
}

.pad-sheet strong {
  display: flex;
  align-items: baseline;
  height: 34px;
  margin-bottom: 18px;
  font-size: 17px;
  font-weight: 900;
}

.pad-sheet ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.pad-sheet li {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
}

.pad-tick {
  position: relative;
  flex: none;
  width: 20px;
  height: 20px;
  border: 2px solid var(--granite-700);
}

.pad-tick.is-on::after {
  content: '';
  position: absolute;
  left: -2px;
  top: -8px;
  width: 24px;
  height: 24px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c2481a' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 13l5 5L21 4'/%3E%3C/svg%3E")
    no-repeat center / contain;
}

.pad-text {
  position: relative;
  font-size: 17px;
}

.pad-text.is-on {
  color: var(--granite-500);
}

.pad-text.is-on::after {
  content: '';
  position: absolute;
  left: -4px;
  right: -4px;
  top: 55%;
  height: 2px;
  background: var(--granite-700);
}

.pad-qty {
  color: var(--granite-700);
}

/* Controls: a rule per panel, arrows, count */
.tour-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tour-ticks {
  flex: 1;
  display: flex;
  gap: 6px;
  min-width: 0;
}

.tour-tick {
  position: relative;
  flex: 1;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.tour-tick::before,
.tour-tick span {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 3px;
}

.tour-tick::before {
  background: rgb(242 239 234 / 0.3);
}

.tour-tick span {
  background: var(--paper);
}

.tour-count {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.tour-button {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 2px solid currentColor;
  background: none;
  color: inherit;
  cursor: pointer;
}

.tour-button:hover {
  border-color: var(--paper);
  background: var(--paper);
  color: var(--ink);
}

.tour-button svg {
  width: 18px;
  height: 18px;
}

.tour-button.is-previous svg {
  rotate: 180deg;
}

@media (max-width: 760px) {
  .tour {
    --slide-width: 92vw;
  }

  .tour-track {
    gap: 8px;
  }

  .slide {
    padding: 16px;
  }

  .slide-text h3 {
    font-size: 26px;
  }

  .slide-text p {
    margin-top: 8px;
    font-size: 15px;
    line-height: 21px;
  }

  .plan-day {
    gap: 4px;
    padding: 14px 16px;
  }

  .plan-day ul {
    font-size: 14px;
    line-height: 19px;
  }

  .plan-notes {
    font-size: 13px;
    line-height: 18px;
  }
}

@media (max-width: 560px) {
  .shift {
    gap: 8px;
  }

  .shift-arrow {
    width: 24px;
    height: 24px;
  }

  .shift-grade {
    padding: 12px;
  }

  .shift-number {
    font-size: 32px;
  }

  .shift-grade strong {
    font-size: 14px;
    line-height: 18px;
  }
}

/* Short screens: fewer lines in the tallest cards */
@media (max-height: 760px) {
  .plan-notes {
    display: none;
  }

  .pad-sheet li:nth-child(n + 4) {
    display: none;
  }
}

@media (max-height: 760px) and (max-width: 900px) {
  .plan-day li:nth-child(3) {
    display: none;
  }

  .levels li {
    padding: 10px 0;
  }
}
</style>

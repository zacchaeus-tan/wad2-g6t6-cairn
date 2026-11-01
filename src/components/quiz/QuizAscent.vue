<script setup>
import { computed, ref } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { quizQuestions as questions, splitOption } from '@/lib/quizQuestions'

// The quiz as an ascent: the questions are stops on a trail up a mountain. Answering
// walks the hiker up to the next stop; the summit is where the answers are saved.
defineProps({
  saving: { type: Boolean, default: false },
  saved: { type: Boolean, default: false },
  error: { type: String, default: null },
})

const emit = defineEmits(['submit'])

const answers = defineModel({ type: Object, required: true })

const index = ref(0) // questions.length means the summit
const isSummit = computed(() => index.value === questions.length)
const question = computed(() => questions[index.value])

// The option picked for a question, if any
const chosen = (q) => q.options.find((option) => option.val === answers.value[q.key])
const allAnswered = computed(() => questions.every(chosen))

const tiles = computed(() => question.value?.options.map((option) => ({ ...option, ...splitOption(option.desc) })))

// Trailhead, one stop per question, then the summit (drawing coordinates)
const STOPS = [
  [70, 452],
  [168, 398],
  [262, 340],
  [318, 262],
  [372, 192],
  [404, 128],
  [436, 70],
]

// A smooth curve through the stops, one piece per stop so each can be walked on its own
const trailPieces = STOPS.slice(0, -1).map((p1, i) => {
  const p0 = STOPS[i - 1] || p1
  const p2 = STOPS[i + 1]
  const p3 = STOPS[i + 2] || p2
  return `M${p1[0]} ${p1[1]} C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`
})

const checkpoints = computed(() =>
  STOPS.slice(1).map(([x, y], i) => {
    const q = questions[i]
    return { x, y, label: q ? q.short : 'Summit', done: q ? Boolean(chosen(q)) : allAnswered.value }
  }),
)

// The hiker stands at the stop for the current question (stop 1 is the first question)
const hiker = computed(() => {
  const [x, y] = STOPS[index.value + 1]
  return { x, y }
})

let advanceTimer = null
function pick(value) {
  answers.value = { ...answers.value, [question.value.key]: value }
  const next = index.value + 1
  clearTimeout(advanceTimer)
  advanceTimer = setTimeout(() => (index.value = next), 450)
}

// Same curve as --ease in cairn.css
const EASE = [0.16, 1, 0.3, 1]
const WALK = { duration: 0.9, ease: EASE }
const CLIMB = { type: 'spring', stiffness: 140, damping: 20 }
const PING = { duration: 1.8, ease: 'easeOut', repeat: Infinity }

// Each checkpoint cairn: three stones, bottom first. fall is the way each one tips when toppled.
const CAIRN_STONES = [
  { cy: -4, rx: 9, ry: 4.5, order: 0, fall: -1 },
  { cy: -11, rx: 6.5, ry: 3.5, order: 1, fall: 1 },
  { cy: -17, rx: 4, ry: 2.6, order: 2, fall: -1 },
]

// Stones turn about their base
const STONE_PIVOT = { originX: 0.5, originY: 1 }

// Built: stones drop onto the stack one after another, bottom first.
// Toppled: they tip over and fall away, top first.
const CAIRN_VARIANTS = {
  hidden: {},
  built: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
  toppled: { transition: { staggerChildren: 0.07, staggerDirection: -1 } },
}

const STONE_VARIANTS = {
  hidden: { opacity: 0, y: -26 },
  built: { opacity: 1, y: 0, x: 0, rotate: 0, transition: { type: 'spring', stiffness: 520, damping: 18 } },
  toppled: (stone) => ({
    opacity: 0,
    x: stone.fall * (10 + stone.order * 4),
    y: 16,
    rotate: stone.fall * 50,
    transition: { duration: 0.45, ease: [0.55, 0, 0.75, 0.4] },
  }),
}
</script>

<template>
  <section class="quiz-ascent" aria-label="Quiz questions">
    <div class="quiz-ascent-mountain" aria-hidden="true">
      <svg viewBox="0 0 520 480">
        <defs>
          <!-- The mountain's fill fades out downwards, so it has no hard box edges -->
          <linearGradient id="ascent-ridge-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#f2efea" stop-opacity="0.14" />
            <stop offset="0.75" stop-color="#f2efea" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="ascent-ridge" d="M0 480 L0 430 L90 400 L180 330 L250 300 L330 200 L400 120 L436 52 L470 110 L520 150 L520 480 Z" />
        <path class="ascent-skyline" d="M0 430 L90 400 L180 330 L250 300 L330 200 L400 120 L436 52 L470 110 L520 150" />
        <path class="ascent-snow" d="M400 120 L436 52 L470 110 L452 102 L436 120 L420 104 Z" />
        <path class="ascent-trail-ghost" :d="trailPieces.join(' ')" />
        <motion.path
          v-for="(piece, i) in trailPieces"
          :key="piece"
          class="ascent-trail"
          :d="piece"
          :initial="false"
          :animate="{ pathLength: i <= index ? 1 : 0 }"
          :transition="WALK"
        />

        <g v-for="(stop, i) in checkpoints" :key="stop.label" :transform="`translate(${stop.x} ${stop.y})`">
          <!-- Not reached yet: just a faint marker where the cairn will go -->
          <circle v-if="i > index" class="ascent-marker" cx="0" cy="-6" r="5" />

          <!-- Reached: the cairn is built stone by stone; going back topples it -->
          <AnimatePresence as="g">
            <motion.g
              v-if="i <= index"
              :key="`cairn-${i}`"
              class="ascent-stop"
              :class="{ 'is-done': stop.done }"
              :variants="CAIRN_VARIANTS"
              initial="hidden"
              animate="built"
              exit="toppled"
            >
              <motion.ellipse
                v-for="stone in CAIRN_STONES"
                :key="stone.cy"
                cx="0"
                :cy="stone.cy"
                :rx="stone.rx"
                :ry="stone.ry"
                :custom="stone"
                :variants="STONE_VARIANTS"
                :style="STONE_PIVOT"
              />
            </motion.g>
          </AnimatePresence>

          <text class="ascent-label" x="18" y="-2">{{ stop.label }}</text>
        </g>

        <motion.g :initial="false" :animate="hiker" :transition="CLIMB">
          <motion.circle
            class="ascent-hiker-ring"
            r="14"
            cy="-26"
            :animate="{ scale: [0.8, 2], opacity: [0.6, 0] }"
            :transition="PING"
          />
          <circle class="ascent-hiker" r="8" cy="-26" />
        </motion.g>
      </svg>
    </div>

    <div class="quiz-ascent-panel">
      <AnimatePresence mode="wait" :initial="false">
        <motion.div
          :key="index"
          class="quiz-ascent-step"
          :initial="{ opacity: 0, y: 24, filter: 'blur(6px)' }"
          :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
          :exit="{ opacity: 0, y: -16, filter: 'blur(6px)' }"
          :transition="{ duration: 0.35, ease: EASE }"
        >
          <template v-if="!isSummit">
            <p class="quiz-ascent-where">
              <span class="cairn-label">Stop {{ index + 1 }} of {{ questions.length }}</span>
              <span class="cairn-label">{{ question.short }}</span>
            </p>
            <h2 :id="`ascent-${question.key}`" class="quiz-ascent-question">{{ question.label }}</h2>
            <p v-if="question.hint" class="quiz-ascent-hint">{{ question.hint }}</p>

            <div class="quiz-tiles" role="radiogroup" :aria-labelledby="`ascent-${question.key}`">
              <label
                v-for="tile in tiles"
                :key="tile.val"
                class="quiz-tile"
                :class="{ 'is-picked': answers[question.key] === tile.val }"
              >
                <input
                  type="radio"
                  :name="`ascent-${question.key}`"
                  :value="tile.val"
                  :checked="answers[question.key] === tile.val"
                  @click="pick(tile.val)"
                />
                <motion.span
                  v-if="answers[question.key] === tile.val"
                  :layout-id="`ascent-pick-${question.key}`"
                  class="quiz-tile-fill"
                  :transition="{ type: 'spring', stiffness: 420, damping: 34 }"
                />
                <span class="quiz-tile-text">
                  <strong>{{ tile.title }}</strong>
                  <span v-if="tile.detail">{{ tile.detail }}</span>
                </span>
              </label>
            </div>
          </template>

          <template v-else>
            <p class="quiz-ascent-where"><span class="cairn-label">Summit</span></p>
            <h2 class="quiz-ascent-question">You made it to the top.</h2>
            <ul class="quiz-ascent-summary">
              <li v-for="(q, i) in questions" :key="q.key">
                <span class="cairn-label">{{ q.short }}</span>
                <span :class="{ 'is-missing': !chosen(q) }">{{ chosen(q)?.desc ?? 'Not answered yet' }}</span>
                <button type="button" class="cairn-link" @click="index = i">Change</button>
              </li>
            </ul>
            <button type="button" class="cairn-btn is-light" :disabled="!allAnswered || saving" @click="emit('submit')">
              {{ saving ? 'Saving...' : 'Save answers' }}
            </button>
            <p v-if="!allAnswered" class="quiz-ascent-note">Answer every question to save.</p>
            <p v-if="saved" class="quiz-ascent-saved" role="status">Saved. Taking you to your profile.</p>
            <p v-if="error" class="quiz-ascent-error" role="alert">{{ error }}</p>
          </template>
        </motion.div>
      </AnimatePresence>

      <div class="quiz-ascent-nav">
        <button type="button" class="cairn-link quiz-ascent-back" :disabled="index === 0" @click="index--">
          Back down
        </button>
        <button
          v-if="!isSummit"
          type="button"
          class="cairn-btn is-small is-light"
          :disabled="!chosen(question)"
          @click="index++"
        >
          {{ index === questions.length - 1 ? 'To the summit' : 'Next stop' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quiz-ascent {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 520px);
  align-items: center;
  gap: clamp(24px, 4vw, 64px);
}

.quiz-ascent-mountain svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* The mountain is a faint fill; only its skyline is outlined */
.ascent-ridge {
  fill: url(#ascent-ridge-fade);
}

.ascent-skyline {
  fill: none;
  stroke: rgb(242 239 234 / 0.45);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.ascent-snow {
  fill: rgb(242 239 234 / 0.35);
}

.ascent-trail-ghost {
  fill: none;
  stroke: rgb(242 239 234 / 0.45);
  stroke-width: 2;
  stroke-dasharray: 2 7;
  stroke-linecap: round;
}

.ascent-trail {
  fill: none;
  stroke: var(--sand);
  stroke-width: 5;
}

.ascent-marker {
  fill: rgb(16 24 20 / 0.5);
  stroke: rgb(242 239 234 / 0.8);
  stroke-width: 1.6;
  stroke-dasharray: 2.5 2.5;
}

.ascent-stop ellipse {
  fill: rgb(16 24 20 / 0.6);
  stroke: rgb(242 239 234 / 0.7);
  stroke-width: 1.2;
}

.ascent-stop.is-done ellipse {
  fill: var(--pine);
  stroke: var(--paper);
}

.ascent-label {
  fill: var(--lichen);
  font: 700 11px var(--font);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ascent-hiker {
  fill: var(--blaze);
  stroke: var(--white);
  stroke-width: 3;
}

.ascent-hiker-ring {
  fill: none;
  stroke: var(--blaze);
  stroke-width: 2;
}

.quiz-ascent-panel {
  display: grid;
  gap: 24px;
  color: var(--paper);
}

/* Glacier focus rings on the dark photo */
.quiz-ascent-panel :focus-visible {
  outline-color: var(--glacier);
}

.quiz-ascent-step {
  display: grid;
  gap: 18px;
}

.quiz-ascent-where {
  display: flex;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 2px solid rgb(242 239 234 / 0.8);
}

.quiz-ascent-where .cairn-label {
  color: var(--sage);
}

.quiz-ascent-question {
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.08;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.quiz-ascent-hint {
  color: var(--lichen);
  font-size: 15px;
}

/* Answers as square tiles, two to a row */
.quiz-tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.quiz-tile {
  position: relative;
  display: block;
  cursor: pointer;
}

.quiz-tile input {
  position: absolute;
  opacity: 0;
}

.quiz-tile-fill {
  position: absolute;
  inset: 0;
  background: var(--pine);
}

.quiz-tile-text {
  position: relative;
  display: grid;
  align-content: start;
  gap: 4px;
  height: 100%;
  min-height: 84px;
  padding: 14px 16px;
  background: rgb(242 239 234 / 0.08);
  border: 1.5px solid rgb(242 239 234 / 0.35);
  font-size: 16px;
}

.quiz-tile-text strong {
  font-weight: 900;
}

.quiz-tile-text span {
  color: var(--lichen);
  font-size: 14px;
}

.quiz-tile:hover .quiz-tile-text {
  border-color: var(--paper);
}

.quiz-tile.is-picked .quiz-tile-text {
  background: transparent;
  border-color: var(--sage);
}

.quiz-tile input:focus-visible ~ .quiz-tile-text {
  outline: 3px solid var(--glacier);
  outline-offset: 2px;
}

.quiz-ascent-summary {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.quiz-ascent-summary li {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  align-items: baseline;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgb(242 239 234 / 0.2);
}

.quiz-ascent-summary .cairn-label {
  color: var(--sage);
}

.quiz-ascent-summary .cairn-link,
.quiz-ascent-back {
  color: var(--paper);
}

.quiz-ascent-summary .is-missing {
  color: var(--ember);
  font-weight: 700;
}

.quiz-ascent-note {
  color: var(--lichen);
  font-size: 14px;
}

.quiz-ascent-saved {
  padding: 10px 12px;
  background: var(--pine-mist);
  color: var(--pine-deep);
}

.quiz-ascent-error {
  padding: 10px 12px;
  background: #fdecea;
  color: #b42318;
}

.quiz-ascent-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.quiz-ascent-back:disabled {
  opacity: 0.4;
  cursor: default;
}

/* The mountain scales to the height left on screen and the panel tightens */
@media (min-width: 901px) {
  .quiz-ascent {
    height: 100%;
    min-height: 0;
    align-items: stretch;
  }

  .quiz-ascent-mountain {
    min-height: 0;
  }

  .quiz-ascent-mountain svg {
    height: 100%;
  }

  .quiz-ascent-panel {
    align-self: center;
    gap: 16px;
  }

  .quiz-ascent-step {
    gap: 12px;
  }

  .quiz-ascent-where {
    padding-bottom: 8px;
  }

  .quiz-ascent-question {
    font-size: clamp(22px, 3.2vh, 30px);
  }

  .quiz-ascent-hint {
    font-size: 14px;
  }

  .quiz-tile-text {
    min-height: clamp(52px, 8vh, 72px);
    padding: 10px 14px;
    font-size: 15px;
  }

  .quiz-ascent-summary li {
    padding: 8px 0;
    font-size: 15px;
  }
}

@media (max-width: 900px) {
  .quiz-ascent {
    grid-template-columns: 1fr;
  }

  .quiz-ascent-mountain {
    justify-self: end;
    width: 100%;
    max-width: 420px;
  }
}

@media (max-width: 480px) {
  .quiz-tiles {
    grid-template-columns: 1fr;
  }

  .quiz-tile-text {
    min-height: 0;
  }
}
</style>

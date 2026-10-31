<script setup>
import { computed } from 'vue'
import { motion } from 'motion-v'
import NumberTicker from '@/components/common/NumberTicker.vue'
import ReviewSummary from '@/components/reviews/ReviewSummary.vue'
import { GRADES } from '@/lib/difficultyStyle'

// Official grade as a black arrow, community-adjusted grade as the same arrow in orange.
// Both needles swing in from Easy when the dial comes into view.
const props = defineProps({
  route: { type: Object, required: true },
})

// The database keeps both grades between 1 and 4; only the community grade can be empty
const official = computed(() => Number(props.route.official_difficulty))
const community = computed(() =>
  props.route.effective_difficulty == null ? null : Number(props.route.effective_difficulty),
)

// 1 points left (-90°), 4 points right (90°)
function angleFor(grade) {
  return -90 + ((grade - 1) / 3) * 180
}

// Point on the dial at an angle, measured from straight up around the hub at (200, 200)
const HUB = 200
const RADIUS = 160
function pointAt(angle, radius = RADIUS) {
  const rad = (angle * Math.PI) / 180
  return [HUB + radius * Math.sin(rad), HUB - radius * Math.cos(rad)]
}

// Bands split where gradeOf() rounds (1.5, 2.5, 3.5), so the colour under a needle
// matches the grade label shown everywhere else on the site
const BAND_EDGES = [1, 1.5, 2.5, 3.5, 4]

// The bands draw in left to right like one pen stroke: each band starts when the one
// before it ends and takes time in proportion to its length, so the pen keeps a steady speed
const DRAW_SECONDS = 0.8

const bands = [1, 2, 3, 4].map((grade) => {
  const from = BAND_EDGES[grade - 1]
  const to = BAND_EDGES[grade]
  const [x1, y1] = pointAt(angleFor(from))
  const [x2, y2] = pointAt(angleFor(to))
  return {
    grade,
    color: GRADES[grade].line,
    d: `M${x1} ${y1}A${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2}`,
    variants: {
      // pathLength 0 is an empty stroke, 1 is the full band
      resting: { pathLength: 0 },
      pointing: {
        pathLength: 1,
        transition: {
          ease: 'linear',
          delay: ((from - 1) / 3) * DRAW_SECONDS,
          duration: ((to - from) / 3) * DRAW_SECONDS,
        },
      },
    },
  }
})

// Each join between two bands is labelled just outside the dial
const edgeLabels = BAND_EDGES.slice(1, -1).map((edge) => {
  const [x, y] = pointAt(angleFor(edge), 190)
  return { edge, x, y }
})

// Each needle rests at Easy, then springs to its grade once the bands are drawn.
// The dial switches every band and needle from 'resting' to 'pointing' at once;
// the delays set the order.
function needleVariants(grade, delay) {
  return {
    resting: { rotate: -90 },
    pointing: {
      rotate: angleFor(grade),
      transition: { type: 'spring', stiffness: 60, damping: 12, delay },
    },
  }
}

// Turn about the needle's bottom centre, which sits on the hub at (200, 200)
const NEEDLE_PIVOT = { originX: 0.5, originY: 1 }

const officialNeedle = computed(() => needleVariants(official.value, DRAW_SECONDS + 0.1))
const communityNeedle = computed(() =>
  community.value == null ? null : needleVariants(community.value, DRAW_SECONDS + 0.5),
)
</script>

<template>
  <article class="grade-dial">
    <div class="grade-dial-head">
      <h2 class="cairn-headline">How hard, honestly</h2>
      <span class="cairn-fine">Official grade and community grade</span>
    </div>

    <div class="grade-dial-split">
      <motion.div
        class="grade-dial-svg"
        initial="resting"
        while-in-view="pointing"
        :in-view-options="{ once: true, amount: 0.5 }"
      >
        <svg viewBox="0 0 400 236">
          <motion.path
            v-for="band in bands"
            :key="band.grade"
            :d="band.d"
            fill="none"
            :stroke="band.color"
            stroke-width="30"
            :variants="band.variants"
          />
          <g fill="var(--granite-700)" font-size="12" font-weight="700" letter-spacing="1">
            <text x="40" y="228" text-anchor="middle">1 EASY</text>
            <text
              v-for="mark in edgeLabels"
              :key="mark.edge"
              :x="mark.x"
              :y="mark.y"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ mark.edge }}
            </text>
            <text x="360" y="228" text-anchor="middle">4 STRENUOUS</text>
          </g>
          <motion.g v-if="communityNeedle" :variants="communityNeedle" :style="NEEDLE_PIVOT">
            <line
              x1="200"
              y1="200"
              x2="200"
              y2="66"
              stroke="var(--blaze)"
              stroke-width="5"
              stroke-linecap="round"
            />
            <path d="M200 46 L189 70 L211 70 Z" fill="var(--blaze)" />
          </motion.g>
          <motion.g :variants="officialNeedle" :style="NEEDLE_PIVOT">
            <line
              x1="200"
              y1="200"
              x2="200"
              y2="66"
              stroke="var(--ink)"
              stroke-width="5"
              stroke-linecap="round"
            />
            <path d="M200 46 L189 70 L211 70 Z" fill="var(--ink)" />
          </motion.g>
          <circle cx="200" cy="200" r="13" fill="var(--ink)" />
        </svg>
      </motion.div>

      <div class="grade-dial-key">
        <div class="grade-dial-row">
          <span class="grade-dial-swatch is-official" aria-hidden="true"></span>
          <strong>Official</strong>
          <b class="cairn-data"><NumberTicker :value="official" :decimals="2" /></b>
        </div>
        <div v-if="community != null" class="grade-dial-row">
          <span class="grade-dial-swatch is-community" aria-hidden="true"></span>
          <strong>Community-adjusted</strong>
          <b class="cairn-data"><NumberTicker :value="community" :decimals="2" /></b>
        </div>
        <ReviewSummary :route="route" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.grade-dial {
  display: grid;
  gap: 20px;
  padding: clamp(24px, 3vw, 44px);
  background: var(--sand);
  box-shadow: var(--shadow-stop);
}

/* Muted text steps up a shade on sand so it stays readable */
.grade-dial .cairn-fine {
  color: var(--granite-700);
}

.grade-dial-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 16px;
}

.grade-dial-split {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  align-items: center;
  gap: 32px;
}

.grade-dial-svg {
  width: 100%;
  max-width: 460px;
  justify-self: center;
}

.grade-dial-svg svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

.grade-dial-svg text {
  font-family: var(--font);
}

.grade-dial-key {
  display: grid;
  gap: 14px;
}

.grade-dial-row {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgb(23 32 28 / 0.15);
}

.grade-dial-row b {
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
}

/* Key marks drawn as arrows with clip-path, matching the needles */
.grade-dial-swatch {
  position: relative;
  width: 40px;
  height: 14px;
}

.grade-dial-swatch.is-official::before {
  content: '';
  position: absolute;
  left: 0;
  right: 10px;
  top: 50%;
  height: 5px;
  margin-top: -2.5px;
  background: var(--ink);
}

.grade-dial-swatch.is-official::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  width: 12px;
  height: 14px;
  margin-top: -7px;
  background: var(--ink);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.grade-dial-swatch.is-community::before {
  content: '';
  position: absolute;
  left: 0;
  right: 10px;
  top: 50%;
  height: 5px;
  margin-top: -2.5px;
  background: var(--blaze);
}

.grade-dial-swatch.is-community::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  width: 12px;
  height: 14px;
  margin-top: -7px;
  background: var(--blaze);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

@media (max-width: 900px) {
  .grade-dial-split {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import { useReducedMotion } from 'motion-v'
import { authRoutes } from '@/lib/authRoutes'

// Real trails drawing themselves over the sign-in photo, like routes traced on a map.
// Neutral colours on purpose: heat colour always comes with a grade, and these have none.

// Each route's place in the 1600 x 1000 drawing, around the edges so the middle stays quiet
const PLACES = [
  { x: -30, y: 180, scale: 0.6 },
  { x: 1250, y: 170, scale: 0.6 },
  { x: -20, y: 590, scale: 0.68 },
  { x: 1210, y: 610, scale: 0.68 },
  { x: 400, y: 790, scale: 0.42 },
  { x: 950, y: 800, scale: 0.42 },
]
const STAGGER = 0.5 // seconds between one route starting and the next
const DRAW_TIME = [4, 4.6, 5.2, 6] // seconds, varied so they don't finish in step
const DOT_RADIUS = 4.5
const WALK_TIME = 150 // seconds for a dot to walk its route and back

const reduceMotion = useReducedMotion()

const trails = authRoutes.slice(0, PLACES.length).map((route, index) => {
  const place = PLACES[index]
  const delay = index * STAGGER
  const duration = DRAW_TIME[index % DRAW_TIME.length]
  return {
    d: route.d,
    transform: `translate(${place.x} ${place.y}) scale(${place.scale})`,
    radius: DOT_RADIUS / place.scale,
    style: { animationDelay: `${delay}s`, animationDuration: `${duration}s` },
    dotStart: delay + duration,
  }
})

// Faint contour lines, wavy like the ones on a topographic map
const contours = [90, 230, 360, 500, 640, 780, 910].map((y, index) => {
  let path = ''
  for (let x = -40; x <= 1640; x += 40) {
    const wave = 34 * Math.sin(x * 0.004 + index * 1.3) + 12 * Math.sin(x * 0.013 + index * 0.7)
    path += `${path ? 'L' : 'M'}${x} ${(y + wave).toFixed(1)}`
  }
  return path
})
</script>

<template>
  <div class="trail-background" aria-hidden="true">
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <path v-for="d in contours" :key="d" class="trail-contour" :d="d" />

      <g v-for="trail in trails" :key="trail.d" :transform="trail.transform">
        <path class="trail-line" :d="trail.d" pathLength="1" :style="trail.style" />
        <!-- Only appears once its line has finished drawing -->
        <circle
          v-if="!reduceMotion"
          class="trail-dot"
          :r="trail.radius"
          :style="{ animationDelay: `${trail.dotStart}s` }"
        >
          <animateMotion
            :path="trail.d"
            :begin="`${trail.dotStart}s`"
            :dur="`${WALK_TIME}s`"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.trail-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.trail-background svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Keeps the card and the two words readable over the lines */
.trail-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    rgb(16 24 20 / 0.72) 0%,
    rgb(16 24 20 / 0.5) 42%,
    rgb(16 24 20 / 0) 78%
  );
}

.trail-contour {
  fill: none;
  stroke: var(--sage);
  stroke-width: 1;
  opacity: 0.09;
  vector-effect: non-scaling-stroke;
}

.trail-line {
  fill: none;
  stroke: var(--sage);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.62;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: trail-draw 5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.trail-dot {
  fill: var(--blaze);
  stroke: var(--ember);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  animation: trail-dot-in 0.6s var(--ease) both;
}

@keyframes trail-draw {
  from {
    stroke-dashoffset: 1;
  }
}

@keyframes trail-dot-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .trail-line {
    animation: none;
  }
}
</style>

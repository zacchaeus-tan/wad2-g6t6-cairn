<script setup>
import { RouterLink } from 'vue-router'
import { motion, useScroll, useTransform } from 'motion-v'
import ArrowIcon from '@/components/common/ArrowIcon.vue'
import cloudSky from '@/assets/img/cairn-cloud-sky.jpg'
import cloudFront from '@/assets/img/cairn-cloud-front.jpg'
import cloudMask from '@/assets/img/cairn-cloud-front-mask.png'

// The wordmark sits between the sky and the mountain, and each layer scrolls at its own speed
const { scrollY } = useScroll()

const skyImage = `url(${cloudSky})`
const frontImage = `url(${cloudFront})`
const frontMask = `url(${cloudMask})`

function layerSpeed(speed) {
  return useTransform(scrollY, (y) => y * speed)
}

const skyY = layerSpeed(0.6)
const wordY = layerSpeed(0.42)
const frontY = layerSpeed(0.05)
const footY = layerSpeed(-0.15)
const footOpacity = useTransform(scrollY, (y) => Math.max(0, 1 - (y / window.innerHeight) * 1.8))
</script>

<template>
  <section class="banner">
    <motion.div class="banner-layer banner-sky" :style="{ y: skyY, backgroundImage: skyImage }" />
    <motion.div class="banner-layer banner-word" :style="{ y: wordY }">
      <span>CAIRN</span>
    </motion.div>
    <motion.div
      class="banner-layer banner-front"
      :style="{
        y: frontY,
        backgroundImage: frontImage,
        maskImage: frontMask,
        webkitMaskImage: frontMask,
      }"
    />
    <div class="banner-shade"></div>

    <motion.div class="banner-foot cairn-wrap" :style="{ y: footY, opacity: footOpacity }">
      <div>
        <h1>Know if a trek suits you before you go.</h1>
        <a class="banner-cue" href="#intro">Find out more<ArrowIcon /></a>
      </div>
      <div class="banner-quiz">
        <p>Tell us about your experience level</p>
        <RouterLink class="cairn-btn is-light is-small" to="/quiz">
          Take the quiz<ArrowIcon />
        </RouterLink>
      </div>
    </motion.div>
  </section>
</template>

<style scoped>
.banner {
  --h: max(640px, 100svh);
  --pad: calc(65px + clamp(48px, 10vh, 110px));
  --font: clamp(120px, 27vw, 420px);
  /* The stack's top reaches halfway up the wordmark */
  --stack-top: calc(var(--pad) + var(--font) * 0.5);
  /* Photo width: wide enough to reach the banner's foot */
  --w: max(100vw, (var(--h) - var(--stack-top)) / 0.621);
  /* The stack is 68.1% across the photo, and its top is 84.06% of the photo's width down */
  --x: max(100vw - var(--w), min(0px, 68vw - var(--w) * 0.681));
  --y: calc(var(--stack-top) - var(--w) * 0.8406);
  position: relative;
  height: var(--h);
  overflow: hidden;
  background: #8fa9b4;
  color: var(--white);
  isolation: isolate;
}

.banner-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.banner-sky {
  background: var(--x) var(--y) / var(--w) auto no-repeat;
}

.banner-word {
  z-index: 2;
  display: flex;
  justify-content: center;
  padding-top: var(--pad);
}

.banner-word span {
  font-size: var(--font);
  line-height: 0.8;
  font-weight: 900;
  letter-spacing: -0.05em;
  text-shadow: 0 8px 32px rgb(0 0 0 / 0.18);
}

.banner-front {
  z-index: 3;
  background: var(--x) var(--y) / var(--w) auto no-repeat;
  -webkit-mask: var(--x) var(--y) / var(--w) auto no-repeat;
  mask: var(--x) var(--y) / var(--w) auto no-repeat;
}

.banner-shade {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgb(10 18 14 / 0.38),
    transparent 20%,
    transparent 55%,
    rgb(10 18 14 / 0.6) 100%
  );
}

.banner-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24px;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}

.banner-foot h1 {
  max-width: 15ch;
  font-size: clamp(19px, 1.7vw, 24px);
  line-height: 1.1;
  font-weight: 900;
  text-shadow: 0 2px 16px rgb(0 0 0 / 0.35);
}

.banner-foot .banner-cue {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgb(255 255 255 / 0.6);
  color: var(--white);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-decoration: none;
  text-transform: uppercase;
}

.banner-cue svg {
  width: 13px;
  height: 13px;
  rotate: 90deg;
}

.banner-quiz {
  display: grid;
  gap: 10px;
  width: min(240px, 100%);
  padding: 14px;
  background: var(--pine);
  color: var(--paper);
  box-shadow: var(--shadow-panel);
}

.banner-quiz p {
  font-size: 13px;
  line-height: 18px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .banner-foot {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

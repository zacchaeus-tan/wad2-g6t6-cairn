<script setup>
import RiseIn from '@/components/common/RiseIn.vue'
import photoValley from '@/assets/img/cairn-valley.jpg'
import photoAlpinePath from '@/assets/img/card-alpine-path.jpg'
</script>

<template>
  <section id="intro" class="statement">
    <figure class="statement-frame is-left">
      <img :src="photoValley" alt="" />
    </figure>
    <figure class="statement-frame is-right">
      <img :src="photoAlpinePath" alt="" />
    </figure>

    <RiseIn class="cairn-wrap">
      <h2 class="cairn-display">Every summit starts with an honest answer.</h2>
      <p>
        CAIRN is a trek planner for hikers in Southeast Asia. Take a short quiz about the walks
        you've done, and every route shows whether it suits you and where it will stretch you.
        Grades shift with real hiker reviews, and AI helps you plan the days and pack the right
        gear.
      </p>
      <svg class="statement-glyph" viewBox="0 0 24 24">
        <ellipse cx="12" cy="20" rx="8" ry="2.4" />
        <ellipse cx="12" cy="15.2" rx="6" ry="2.2" />
        <ellipse cx="12" cy="10.6" rx="4.4" ry="2" />
        <ellipse cx="12" cy="6.4" rx="3" ry="1.8" />
        <ellipse cx="12" cy="3" rx="1.6" ry="1.2" />
      </svg>
    </RiseIn>
  </section>
</template>

<style scoped>
.statement {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: center;
  min-height: 100svh;
  padding-block: clamp(40px, 7vh, 80px);
  overflow: hidden;
  text-align: center;
}

.statement h2 {
  max-width: 14ch;
  margin: 0 auto;
}

.statement p {
  max-width: 52ch;
  margin: 28px auto 0;
  color: var(--granite-700);
  font-size: 18px;
  line-height: 28px;
  text-wrap: pretty;
}

.statement-glyph {
  display: block;
  width: 28px;
  height: 28px;
  margin: 36px auto 0;
  fill: var(--pine);
}

/* Framed photos set off-grid, as in a printed spread */
.statement-frame {
  position: absolute;
  width: clamp(140px, 15vw, 220px);
  aspect-ratio: 4 / 5;
  margin: 0;
  padding: 10px;
  background: var(--linen);
}

.statement-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.statement-frame.is-left {
  left: max(16px, calc(50vw - 640px));
  top: 40px;
}

.statement-frame.is-right {
  right: max(16px, calc(50vw - 640px));
  bottom: 40px;
}

@media (max-width: 900px) {
  .statement-frame {
    display: none;
  }
}
</style>

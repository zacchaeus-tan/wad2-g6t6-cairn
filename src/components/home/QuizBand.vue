<script setup>
import { RouterLink } from 'vue-router'
import ArrowIcon from '@/components/common/ArrowIcon.vue'
import RiseIn from '@/components/common/RiseIn.vue'
</script>

<template>
  <section class="quiz-band">
    <RiseIn class="cairn-wrap">
      <h2 class="cairn-display">Find the trek that fits.</h2>
      <p>Take our short quiz. Every route then shows how it compares with what you've walked.</p>
      <RouterLink class="cairn-btn is-blaze" to="/quiz">Take the quiz<ArrowIcon /></RouterLink>
    </RiseIn>
  </section>
</template>

<style scoped>
.quiz-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: center;
  min-height: 100svh;
  padding-block: clamp(40px, 7vh, 80px);
  background: var(--pine);
  color: var(--paper);
  text-align: center;
}

.quiz-band h2 {
  max-width: 12ch;
  margin: 0 auto;
}

.quiz-band p {
  max-width: 46ch;
  margin: 22px auto 32px;
  color: var(--sage);
  font-size: 18px;
  line-height: 28px;
}
</style>

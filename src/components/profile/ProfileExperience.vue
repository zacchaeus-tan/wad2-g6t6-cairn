<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { quizQuestions, quizAnswer } from '@/lib/quizQuestions'

const props = defineProps({
  profile: { type: Object, required: true },
})

// what the user told us in the quiz, shown as the option they picked; null means not answered
const statLabels = {
  longest_distance_km: 'Longest distance',
  max_elevation_gain_m: 'Max elevation gain',
  highest_altitude_m: 'Highest altitude',
  longest_trek_days: 'Longest trek',
}

const experienceStats = computed(() =>
  quizQuestions
    .filter((question) => statLabels[question.column])
    .map((question) => ({
      label: statLabels[question.column],
      value: quizAnswer(props.profile, question)?.desc ?? null,
    })),
)
</script>

<template>
  <section class="profile-experience" aria-labelledby="experience-title">
    <div class="profile-experience-head">
      <h2 id="experience-title" class="cairn-headline">Your experience</h2>
      <RouterLink class="cairn-btn is-light is-small" :to="{ name: 'quiz' }">
        {{ profile.quiz_completed_at ? 'Retake quiz' : 'Take the quiz' }}
      </RouterLink>
    </div>
    <dl class="profile-experience-list">
      <div v-for="stat in experienceStats" :key="stat.label">
        <dt class="cairn-label">{{ stat.label }}</dt>
        <dd v-if="stat.value">{{ stat.value }}</dd>
        <dd v-else aria-label="Not listed">—</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.profile-experience {
  margin-inline: calc(-1 * var(--panel-pad));
  padding: clamp(24px, 3vw, 44px) var(--panel-pad);
  background: var(--pine);
  color: var(--paper);
}

.profile-experience-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--paper);
}

.profile-experience-head a:focus-visible {
  outline-color: var(--glacier);
}

.profile-experience-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
}

.profile-experience-list > div {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 20px 16px;
  border-left: 1px solid rgb(242 239 234 / 0.18);
}

.profile-experience-list > div:first-child {
  padding-left: 0;
  border-left: 0;
}

.profile-experience-list dt {
  color: var(--sage);
}

.profile-experience-list dd {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  line-height: 22px;
}

/* Sized by the card, which is narrower than the screen beside the signpost */
@container profile-panel (max-width: 640px) {
  .profile-experience-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-experience-list > div:nth-child(odd) {
    padding-left: 0;
    border-left: 0;
  }

  .profile-experience-list > div:nth-child(n + 3) {
    border-top: 1px solid rgb(242 239 234 / 0.18);
  }
}

@container profile-panel (max-width: 480px) {
  .profile-experience-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-experience-list > div {
    padding-inline: 0;
    border-left: 0;
  }

  .profile-experience-list > div:nth-child(n + 2) {
    border-top: 1px solid rgb(242 239 234 / 0.18);
  }
}
</style>

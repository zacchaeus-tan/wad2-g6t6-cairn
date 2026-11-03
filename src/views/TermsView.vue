<script setup>
import { RouterLink } from 'vue-router'
import LegalPage from '@/components/common/LegalPage.vue'
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/legal'
</script>

<template>
  <LegalPage title="Terms of service" :updated="LEGAL_UPDATED">
    <p>
      Cairn is a student project built for the IS216 course at Singapore Management University. By
      using it, you agree to these terms.
    </p>

    <h2>Hike at your own risk</h2>
    <p>
      Route details, difficulty ratings, weather, checklists and itineraries are guides only. They
      can be out of date or wrong, and AI-generated suggestions can make mistakes. Always check
      conditions with official sources, and decide for yourself whether a route is safe for you.
      We aren't responsible for injury, loss or damage from using Cairn.
    </p>

    <h2>Your account</h2>
    <p>
      Keep your sign-in details to yourself. You must be at least 13 to use Cairn. We may suspend
      accounts that break these terms.
    </p>

    <h2>What you post</h2>
    <p>
      Reviews and trail reports should be honest and about your own experience. Don't post anything
      offensive, misleading, or that isn't yours to share. We may edit or remove posts that break
      these rules. You keep ownership of what you write, but let us show it on Cairn.
    </p>

    <h2>Changes</h2>
    <p>
      As a student project, Cairn may change or shut down at any time. We may update these terms,
      and the date at the top will show when.
    </p>

    <h2>Privacy and contact</h2>
    <p>
      See our <RouterLink class="cairn-link" to="/privacy">privacy policy</RouterLink> for how we
      handle your information. Questions:
      <a class="cairn-link" :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>.
    </p>
  </LegalPage>
</template>

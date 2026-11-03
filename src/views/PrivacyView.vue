<script setup>
import LegalPage from '@/components/common/LegalPage.vue'
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/legal'
</script>

<template>
  <LegalPage title="Privacy policy" :updated="LEGAL_UPDATED">
    <p>
      Cairn is a student project built for the IS216 course at Singapore Management University.
      This page explains what we collect when you use it, and why.
    </p>

    <h2>What we collect</h2>
    <ul>
      <li>
        <strong>Account details:</strong> your email address and, if you register with one, your
        password, which is stored securely and never visible to us. If you sign in with Google, we
        receive your name, email address and profile picture from Google.
      </li>
      <li>
        <strong>Profile details:</strong> your name, age, gender, country and anything you write in
        "About".
      </li>
      <li>
        <strong>Hiking experience:</strong> your quiz answers, such as your longest hike and highest
        altitude, which we use to suggest routes.
      </li>
      <li>
        <strong>What you do on Cairn:</strong> routes you save or complete, your gear checklists,
        and reviews and trail reports you post.
      </li>
    </ul>

    <h2>How we use it</h2>
    <p>
      Only to run Cairn: signing you in, showing your profile, matching you with suitable routes,
      and showing your reviews. We don't sell your information or use it for advertising.
    </p>

    <h2>What other people can see</h2>
    <p>
      Reviews and trail reports you post are public, and show your name. Cairn doesn't show the
      rest of your profile to other users. The Cairn team can see account details when moderating
      reports.
    </p>

    <h2>Services we use</h2>
    <ul>
      <li><strong>Supabase</strong> stores your account and everything listed above.</li>
      <li><strong>Google</strong> handles sign-in if you choose "Continue with Google".</li>
      <li>
        <strong>OpenAI</strong> generates gear checklists and itineraries. It receives the route
        and your trip plan (dates, number of days and pace), but not your name, email or profile.
      </li>
      <li><strong>Vercel</strong> hosts the website.</li>
    </ul>

    <h2>Deleting your data</h2>
    <p>
      You can edit your profile at any time from your profile page. To delete your account and
      everything linked to it, email us at
      <a class="cairn-link" :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about this policy:
      <a class="cairn-link" :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>.
    </p>
  </LegalPage>
</template>

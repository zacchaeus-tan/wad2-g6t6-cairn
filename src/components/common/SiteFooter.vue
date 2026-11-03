<script setup>
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/controller/authStore'

const auth = useAuthStore()
</script>

<template>
  <footer class="cairn site-footer">
    <div class="cairn-wrap">
      <div class="site-footer-cols">
        <div>
          <h2 class="site-footer-title">Know before you go.</h2>
          <RouterLink class="cairn-btn is-light" to="/routes">Browse routes</RouterLink>
        </div>
        <nav aria-label="Explore">
          <p class="site-footer-label">Explore</p>
          <p><RouterLink to="/routes">Routes</RouterLink></p>
          <p><RouterLink to="/globe">Globe</RouterLink></p>
          <p><RouterLink to="/quiz">Quiz</RouterLink></p>
        </nav>
        <nav aria-label="Account">
          <p class="site-footer-label">Account</p>
          <p v-if="auth.isLoggedIn"><RouterLink to="/profile">Profile</RouterLink></p>
          <p v-else><RouterLink to="/auth">Sign in</RouterLink></p>
          <p><RouterLink to="/privacy">Privacy</RouterLink></p>
          <p><RouterLink to="/terms">Terms</RouterLink></p>
        </nav>
        <div>
          <p class="site-footer-label">Data</p>
          <p class="site-footer-small">
            Trails © OpenStreetMap contributors (ODbL). Weather by
            <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a>
            (CC BY 4.0).
          </p>
        </div>
      </div>

      <div class="site-footer-word" aria-hidden="true">CAIRN</div>

      <div class="site-footer-base">
        <span>© 2026 CAIRN · IS216 project</span>
        <span>Made for hikers</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  overflow: hidden;
  padding: 72px 0 24px;
  background: var(--ink);
  color: var(--lichen);
  font-family: var(--font);
}

.site-footer a {
  color: var(--paper);
  text-decoration: none;
}

.site-footer a:hover {
  text-decoration: underline;
}

.site-footer a:focus-visible {
  outline: 3px solid var(--glacier);
  outline-offset: 3px;
}

.site-footer-cols {
  display: grid;
  grid-template-columns: 1.5fr repeat(3, 1fr);
  gap: 32px;
}

.site-footer-cols p {
  margin: 0 0 10px;
  font-size: 15px;
}

.site-footer-title {
  margin: 0 0 20px;
  color: var(--paper);
  font-size: 26px;
  line-height: 32px;
  font-weight: 900;
}

/* Outlined on the dark footer; on hover green sweeps in from the left behind the text */
.site-footer .cairn-btn.is-light {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: var(--ink);
  border-color: var(--paper);
  color: var(--paper);
  text-decoration: none;
}

.site-footer .cairn-btn.is-light::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--pine);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s var(--ease);
}

.site-footer .cairn-btn.is-light:hover {
  background: var(--ink);
  border-color: var(--paper);
  color: var(--paper);
}

.site-footer .cairn-btn.is-light:hover::before,
.site-footer .cairn-btn.is-light:focus-visible::before {
  transform: scaleX(1);
}

@media (prefers-reduced-motion: reduce) {
  .site-footer .cairn-btn.is-light::before {
    transition: none;
  }
}

.site-footer-label {
  font-size: 11px !important;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sage);
}

.site-footer-small {
  font-size: 13px !important;
  line-height: 20px;
}

/* The giant wordmark */
.site-footer-word {
  margin: 64px 0 28px;
  color: var(--paper);
  font-size: clamp(96px, 22vw, 330px);
  font-weight: 900;
  line-height: 0.8;
  letter-spacing: -0.03em;
  text-align: center;
  user-select: none;
}

.site-footer-base {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 18px;
  border-top: 1px solid rgb(242 239 234 / 0.18);
  font-size: 13px;
}

@media (max-width: 1000px) {
  .site-footer-cols {
    grid-template-columns: 1fr 1fr;
  }

  .site-footer-cols > :first-child {
    grid-column: 1 / -1;
  }
}
</style>

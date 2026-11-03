<script setup>
// Plain reading layout shared by the privacy policy and terms pages
defineProps({
  title: { type: String, required: true },
  updated: { type: String, required: true }, // shown as "Last updated ..."
})
</script>

<template>
  <article class="cairn legal">
    <div class="cairn-wrap legal-wrap">
      <h1>{{ title }}</h1>
      <p class="cairn-fine legal-updated">Last updated {{ updated }}</p>
      <slot />
    </div>
  </article>
</template>

<style scoped>
.legal {
  padding: calc(var(--nav-height) + 48px) 0 80px;
  background: var(--paper);
}

.legal-wrap {
  max-width: calc(720px + 2 * var(--gutter));
}

.legal-updated {
  margin: 4px 0 24px;
}

.legal :slotted(h2) {
  margin: 40px 0 12px;
  font-size: 22px;
}

.legal :slotted(p),
.legal :slotted(li) {
  max-width: 68ch;
}

.legal :slotted(ul) {
  padding-left: 20px;
}

.legal :slotted(li) {
  margin-bottom: 8px;
}
</style>

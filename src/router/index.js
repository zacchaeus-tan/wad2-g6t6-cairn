import { createRouter, createWebHistory } from 'vue-router'
import Homepage from '../views/Homepage.vue'
import { useAuthStore } from '@/controller/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // A route's page always opens at its banner, not wherever the previous page was scrolled to.
  // Back and forward still return to where you were; other pages keep their current behaviour.
  scrollBehavior(to, from, savedPosition) {
    // Section links (#reviews) on the same route keep their own scrolling
    if (to.name === 'route-detail' && to.params.id !== from.params.id) {
      return savedPosition ?? { top: 0 }
    }
    // Reached from the footer, so they'd otherwise open scrolled to the bottom
    if (['privacy', 'terms'].includes(to.name)) return savedPosition ?? { top: 0 }
    return false
  },
  routes: [
    { path: '/', name: 'home', component: Homepage },
    { path: '/routes', name: 'routes-list', component: () => import('@/views/RoutesList.vue') },
    { path: '/globe', name: 'routes-globe', component: () => import('@/views/RoutesGlobe.vue') },
    { path: '/routes/:id', name: 'route-detail', component: () => import('@/views/RouteDetail.vue') },
    { path: '/auth', name: 'auth', component: () => import('@/views/AuthView.vue') },
    { path: '/welcome', name: 'complete-profile', component: () => import('@/views/CompleteProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/quiz', name: 'quiz', component: () => import('@/views/QuizView.vue'), meta: { requiresAuth: true } },
    { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
    { path: '/terms', name: 'terms', component: () => import('@/views/TermsView.vue') },
    { path: '/admin', name: 'admin', component: () => import('@/views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initSession()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }
  // New Google sign-ups fill in the rest of their profile before going anywhere else
  if (auth.needsProfile && !['complete-profile', 'privacy', 'terms'].includes(to.name)) {
    return { name: 'complete-profile', query: { redirect: to.fullPath } }
  }
  if (to.name === 'complete-profile' && !auth.needsProfile) {
    return { name: 'profile' }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home' }
  }
  // already signed in, no need to see the login page
  if (to.name === 'auth' && auth.isLoggedIn) {
    return { name: 'profile' }
  }
})

export default router

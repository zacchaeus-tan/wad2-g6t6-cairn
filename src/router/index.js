import { createRouter, createWebHistory } from 'vue-router'
import Homepage from '../views/Homepage.vue'
import RouteDetailView from '../views/RouteDetailView.vue'
import RoutesView from '../views/RoutesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Homepage,
    },
    {
      path: '/routes',
      name: 'routes',
      component: RoutesView,
    },
    {
      path: '/routes/:id',
      name: 'route-detail',
      component: RouteDetailView,
    },
  ],
})

export default router

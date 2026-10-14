import { flushPromises, mount } from '@vue/test-utils'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'
import { fetchRouteById } from '../controller/routesController'
import RouteDetailView from '../views/RouteDetail.vue'

vi.mock('../controller/routesController', () => ({
  fetchRouteById: vi.fn(),
}))

async function mountRouteDetailView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/routes/:id', name: 'route-detail', component: RouteDetailView }],
  })
  await router.push('/routes/route-1')
  await router.isReady()

  return mount(RouterView, {
    global: {
      plugins: [router],
    },
  })
}

describe('RouteDetailView', () => {
  it('loads the selected route details', async () => {
    fetchRouteById.mockResolvedValue({
      id: 'route-1',
      name: 'Mount Example',
      country: 'Singapore',
      distance_km: 12.5,
      elevation_gain_m: 450,
      duration_days: 1,
      altitude_m: 800,
      is_multiday: false,
      permit_required: true,
      guide_required: false,
      official_difficulty: 2,
      effective_difficulty: 3,
      avg_perceived_difficulty: 3.2,
      avg_rating: 4.5,
      review_count: 10,
      completion_rate: 0.8,
      safety_status: 'open',
      safety_status_note: 'No current restrictions',
      community_hazard_level: 'low',
      community_hazard_note: 'No recent reports',
    })

    const wrapper = await mountRouteDetailView()
    await flushPromises()

    expect(fetchRouteById).toHaveBeenCalledWith('route-1')
    expect(wrapper.text()).toContain('Mount Example')
    expect(wrapper.text()).toContain('12.5 km')
    expect(wrapper.text()).toContain('450 m')
    expect(wrapper.text()).toContain('80%')
    expect(wrapper.text()).toContain('No current restrictions')
  })

  it('shows a not-found message when the route does not exist', async () => {
    fetchRouteById.mockResolvedValue(null)

    const wrapper = await mountRouteDetailView()
    await flushPromises()

    expect(wrapper.text()).toContain('This route could not be found.')
  })
})

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from '@/controller/authStore'
import { REVIEWS_PAGE_SIZE } from '@/controller/reviewsStore'
import * as reviewsModel from '@/model/reviewsModel'

// The signed-in user's reviews across every route, for their profile.
export const useMyReviewsStore = defineStore('myReviews', () => {
  const reviews = ref([]) // the pages loaded so far, newest first
  const total = ref(0) // all of the user's reviews, loaded or not
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref(null)

  const hasMore = computed(() => reviews.value.length < total.value)

  // Answers to anything older than the latest load are ignored
  let latestLoad = 0

  async function loadPage(from) {
    const load = ++latestLoad
    const userId = useAuthStore().user?.id
    error.value = null

    const {
      data,
      count,
      error: loadError,
    } = await reviewsModel.listMyReviews(userId, from, from + REVIEWS_PAGE_SIZE - 1)
    if (load !== latestLoad) return

    if (loadError) {
      console.error('Could not load your reviews:', loadError)
      error.value = 'Could not load your reviews.'
      return
    }
    reviews.value = [...reviews.value.slice(0, from), ...data]
    total.value = count ?? reviews.value.length
  }

  async function loadFirst() {
    reset()
    loading.value = true
    await loadPage(0)
    loading.value = false
  }

  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    await loadPage(reviews.value.length)
    loadingMore.value = false
  }

  function reset() {
    latestLoad++
    reviews.value = []
    total.value = 0
    loading.value = false
    loadingMore.value = false
    error.value = null
  }

  return { reviews, total, loading, loadingMore, error, hasMore, loadFirst, loadMore }
})

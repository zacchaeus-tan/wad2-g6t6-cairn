import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as reviewsModel from '@/model/reviewsModel'

export const useReviewsStore = defineStore('reviews', () => {
  const reviews = ref([])
  const categories = ref([])
  const error = ref(null)
  const loading = ref(false)

  function clearError() {
    error.value = null
  }

  // The categories never change, so they are only loaded once.
  async function fetchCategories() {
    if (categories.value.length) {
      return true
    }

    clearError()
    const { data, error: err } = await reviewsModel.listIncidentCategories()
    if (err) {
      error.value = err.message
      return false
    }
    categories.value = data
    return true
  }

  async function fetchForRoute(routeId) {
    loading.value = true
    clearError()
    const { data, error: err } = await reviewsModel.listReviewsForRoute(routeId)
    loading.value = false
    if (err) {
      error.value = err.message
      reviews.value = []
      return false
    }
    reviews.value = data
    return true
  }

  return {
    reviews,
    categories,
    error,
    loading,
    clearError,
    fetchCategories,
    fetchForRoute,
  }
})

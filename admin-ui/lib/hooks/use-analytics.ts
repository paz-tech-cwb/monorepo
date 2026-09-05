"use client"

import { useCallback } from "react"
import {
  trackEvent,
  trackPageView,
  type AnalyticsEventName,
  type AnalyticsEventParams,
} from "@/lib/firebase/analytics"

export function useAnalytics() {
  const track = useCallback(
    <T extends AnalyticsEventName>(
      eventName: T,
      params: AnalyticsEventParams[T]
    ) => {
      trackEvent(eventName, params)
    },
    []
  )

  const trackPage = useCallback((pagePath: string, pageTitle?: string) => {
    trackPageView(pagePath, pageTitle)
  }, [])

  return {
    trackEvent: track,
    trackPageView: trackPage,
  }
}

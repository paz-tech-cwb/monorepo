import { logEvent, type Analytics } from "firebase/analytics"
import { getFirebaseAnalytics } from "./config"

export type AnalyticsEventName =
  | "page_view"
  | "login"
  | "logout"
  | "announcement_created"
  | "announcement_updated"
  | "announcement_deleted"
  | "contribution_created"
  | "contribution_updated"
  | "contribution_deleted"
  | "event_created"
  | "event_updated"
  | "event_deleted"
  | "api_error"

export interface AnalyticsEventParams {
  page_view: { page_path: string; page_title?: string }
  login: { method: "google" | "apple" }
  logout: Record<string, never>
  announcement_created: { announcement_id?: number }
  announcement_updated: { announcement_id: number }
  announcement_deleted: { announcement_id: number }
  contribution_created: { contribution_id?: number }
  contribution_updated: { contribution_id: number }
  contribution_deleted: { contribution_id: number }
  event_created: { event_id?: number }
  event_updated: { event_id: number }
  event_deleted: { event_id: number }
  api_error: { endpoint: string; status: number; message?: string }
}

let analyticsInstance: Analytics | null = null

async function getAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance === null) {
    analyticsInstance = await getFirebaseAnalytics()
  }
  return analyticsInstance
}

export async function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  params: AnalyticsEventParams[T]
): Promise<void> {
  const analytics = await getAnalytics()
  if (analytics) {
    logEvent(analytics, eventName as string, params as Record<string, unknown>)
  }
}

export async function trackPageView(
  pagePath: string,
  pageTitle?: string
): Promise<void> {
  await trackEvent("page_view", {
    page_path: pagePath,
    page_title: pageTitle,
  })
}

export async function trackLogin(method: "google" | "apple"): Promise<void> {
  await trackEvent("login", { method })
}

export async function trackLogout(): Promise<void> {
  await trackEvent("logout", {})
}

export async function trackApiError(
  endpoint: string,
  status: number,
  message?: string
): Promise<void> {
  await trackEvent("api_error", { endpoint, status, message })
}

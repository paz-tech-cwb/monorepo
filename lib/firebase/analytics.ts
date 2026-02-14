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
  | "course_created"
  | "course_updated"
  | "course_deleted"
  | "notification_sent"
  | "notification_deleted"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_role_changed"
  | "member_created"
  | "member_updated"
  | "member_deleted"
  | "member_viewed"
  | "dashboard_viewed"
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
  course_created: { course_id?: string }
  course_updated: { course_id: string }
  course_deleted: { course_id: string }
  notification_sent: { notification_id?: number }
  notification_deleted: { notification_id: number }
  user_created: { user_id?: number }
  user_updated: { user_id: number }
  user_deleted: { user_id: number }
  user_role_changed: { user_id: number; new_role: string }
  member_created: { member_id?: number }
  member_updated: { member_id: number }
  member_deleted: { member_id: number }
  member_viewed: { member_id: number }
  dashboard_viewed: Record<string, never>
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

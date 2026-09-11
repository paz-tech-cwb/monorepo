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
  | "notification_created"
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
  | "church_updated"
  | "member_stage_updated"
  | "life_group_created"
  | "life_group_updated"
  | "life_group_deleted"
  | "area_created"
  | "area_updated"
  | "area_deleted"
  | "sector_created"
  | "sector_updated"
  | "sector_deleted"
  | "conversion_created"
  | "conversion_deleted"
  | "reminder_rule_updated"
  | "life_group_study_created"
  | "life_group_study_updated"
  | "life_group_study_deleted"
  | "life_group_study_publisher_added"
  | "life_group_study_publisher_removed"
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
  notification_created: { notification_id?: number }
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
  church_updated: { church_id: number }
  member_stage_updated: { member_id: number; stage_id: number }
  life_group_created: { life_group_id: number }
  life_group_updated: { life_group_id: number }
  life_group_deleted: { life_group_id: number }
  area_created: { area_id?: number }
  area_updated: { area_id: number }
  area_deleted: { area_id: number }
  sector_created: { sector_id?: number }
  sector_updated: { sector_id: number }
  sector_deleted: { sector_id: number }
  conversion_created: { conversion_id?: number; type?: string }
  conversion_deleted: { conversion_id: number }
  reminder_rule_updated: { reminder_type: string }
  life_group_study_created: { study_id: string }
  life_group_study_updated: { study_id: string }
  life_group_study_deleted: { study_id: string }
  life_group_study_publisher_added: { user_id: string }
  life_group_study_publisher_removed: { user_id: string }
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

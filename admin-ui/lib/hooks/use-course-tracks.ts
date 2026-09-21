"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { courseTracksApi } from "@/lib/api/endpoints/course-tracks"
import type {
  CreateCourseTrackRequest,
  SetTrackCoursesRequest,
  UpdateCourseTrackRequest,
} from "@/lib/api/types/academy"
import { trackEvent } from "@/lib/firebase/analytics"

const QUERY_KEY = ["course-tracks"]

export function useCourseTracks() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => courseTracksApi.getAll(),
  })
}

export function useCreateCourseTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCourseTrackRequest) => courseTracksApi.create(data),
    onSuccess: (track) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("course_track_created", { track_id: track.id })
    },
  })
}

export function useUpdateCourseTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCourseTrackRequest }) =>
      courseTracksApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("course_track_updated", { track_id: variables.id })
    },
  })
}

export function useDeleteCourseTrack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => courseTracksApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("course_track_deleted", { track_id: id })
    },
  })
}

export function useSetTrackCourses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SetTrackCoursesRequest }) =>
      courseTracksApi.setCourses(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      trackEvent("course_track_courses_set", { track_id: variables.id })
    },
  })
}

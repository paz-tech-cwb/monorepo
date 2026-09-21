import { CourseDetailManagement } from "./course-detail-management"

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CourseDetailManagement courseId={id} />
}

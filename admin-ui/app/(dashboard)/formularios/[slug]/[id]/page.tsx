import { SubmissionDetail } from "./submission-detail"
import type { FormSlug } from "@/lib/api/types/formularios"

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  return <SubmissionDetail slug={slug as FormSlug} id={id} />
}

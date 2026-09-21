import { TrackBuilder } from "./track-builder"

export default async function JourneyTrackBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TrackBuilder trackId={Number(id)} />
}

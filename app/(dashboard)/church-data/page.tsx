import { Suspense } from "react"
import { ChurchDataManagement } from "./church-data-management"

export default function ChurchDataPage() {
  return (
    <Suspense>
      <ChurchDataManagement />
    </Suspense>
  )
}

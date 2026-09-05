import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[60px] mb-2" />
        <Skeleton className="h-3 w-[140px]" />
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-[100px]" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className="h-4 w-[120px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-[200px]" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-2">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 border border-border p-1">
            <Skeleton className="h-4 w-6 mb-1" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

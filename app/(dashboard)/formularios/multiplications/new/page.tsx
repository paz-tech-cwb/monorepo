import { MultiplicationsForm } from "./multiplications-form"

export default function Page() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Nova Multiplicação</h1>
      <MultiplicationsForm />
    </div>
  )
}

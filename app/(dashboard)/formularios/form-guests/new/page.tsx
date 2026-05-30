import { FormGuestsForm } from "./form-guests-form"

export default function Page() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Novo Convidado</h1>
      <FormGuestsForm />
    </div>
  )
}

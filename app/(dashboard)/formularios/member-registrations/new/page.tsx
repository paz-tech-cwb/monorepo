import { MemberRegistrationsForm } from "./member-registrations-form"

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Novo Registro de Membro</h1>
      <MemberRegistrationsForm />
    </div>
  )
}

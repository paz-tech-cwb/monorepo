import { Suspense } from "react"
import { LoginForm } from "./auth/login-form"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Faça login para acessar o sistema de gerenciamento da igreja</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

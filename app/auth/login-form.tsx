"use client"

import type React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chrome, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle, isLoading, isAuthenticated } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const sessionExpired = searchParams.get("session_expired") === "1"

  useEffect(() => {
    if (sessionExpired) {
      setError("Sua sessão expirou. Faça login novamente para continuar.")
    }
  }, [sessionExpired])

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, redirectTo, router])

  if (isAuthenticated) return null

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      await loginWithGoogle()
      router.push(redirectTo)
    } catch (err: unknown) {
      console.error("Google login error:", err)
      const status =
        err instanceof Error && "status" in err
          ? (err as { status?: number }).status
          : (err as { response?: { status?: number } })?.response?.status

      if (status === 403) {
        setError(
          "Sua conta não tem acesso ao painel administrativo. Entre em contato com o suporte."
        )
      } else if (status === 401) {
        setError("Autenticação falhou. Tente novamente.")
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao fazer login. Tente novamente."
        )
      }
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Entrar</CardTitle>
        <CardDescription className="text-center">
          Entrar com Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Chrome className="mr-2 h-4 w-4" />
          )}
          Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Use sua conta Google para acessar o painel administrativo.
        </p>
      </CardContent>
    </Card>
  )
}

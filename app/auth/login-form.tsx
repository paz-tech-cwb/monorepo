"use client"

import type React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Chrome, Apple, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle, loginWithApple, isLoading, isAuthenticated } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const redirectTo = searchParams.get("redirect") || "/dashboard"

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
    } catch (err) {
      console.error("Google login error:", err)
      setError(err instanceof Error ? err.message : "Falha ao fazer login com Google. Tente novamente.")
    }
  }

  const handleAppleLogin = async () => {
    try {
      setError(null)
      await loginWithApple()
      router.push(redirectTo)
    } catch (err) {
      console.error("Apple login error:", err)
      setError(err instanceof Error ? err.message : "Falha ao fazer login com Apple. Tente novamente.")
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Entrar</CardTitle>
        <CardDescription className="text-center">
          Escolha seu metodo de login preferido
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
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
          <Button
            variant="outline"
            onClick={handleAppleLogin}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Apple className="mr-2 h-4 w-4" />
            )}
            Apple
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Login social apenas
            </span>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Use sua conta Google ou Apple para acessar o painel administrativo.
        </p>
      </CardContent>
    </Card>
  )
}

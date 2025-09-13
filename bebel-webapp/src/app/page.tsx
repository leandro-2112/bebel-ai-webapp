"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to pendencias page since it's the only implemented module
    router.push("/pendencias")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">BebelAI - Gestão de Clínica</h1>
        <p className="text-muted-foreground">Redirecionando para o módulo de Pendências...</p>
      </div>
    </div>
  )
}

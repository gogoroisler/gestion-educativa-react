import { Button } from '@/components/ui/button'

export default function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">
          Gestión Educativa
        </h1>
        <p className="text-muted-foreground">Frontend inicializado — Tailwind + shadcn/ui funcionando</p>
        <Button>Componente shadcn OK</Button>
      </div>
    </div>
  )
}

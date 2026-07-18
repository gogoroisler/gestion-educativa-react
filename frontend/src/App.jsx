import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'

function AppRoot() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-foreground font-medium">Bienvenido, {user?.nombre}</p>
        <p className="text-muted-foreground text-sm">Rol: {user?.rol}</p>
        <button
          onClick={logout}
          className="text-sm text-destructive underline underline-offset-4"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppRoot />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import LoginPage from '@/pages/LoginPage'

function Placeholder({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">Próximamente</p>
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
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Placeholder title="Dashboard" />} />
            <Route path="/alumnos" element={<Placeholder title="Alumnos" />} />
            <Route path="/comisiones" element={<Placeholder title="Comisiones" />} />
            <Route path="/calificaciones" element={<Placeholder title="Calificaciones" />} />
            <Route path="/asistencia" element={<Placeholder title="Asistencia" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

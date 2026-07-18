import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export default function AsistenciaPage() {
  const [searchParams] = useSearchParams()
  const comisionId = searchParams.get('comision')
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const [comision, setComision] = useState(null)
  const [roster, setRoster] = useState([])
  const [fecha, setFecha] = useState(hoy)
  const [presentes, setPresentes] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingFecha, setLoadingFecha] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [puedeEscribir, setPuedeEscribir] = useState(false)

  useEffect(() => {
    if (!comisionId) return
    loadComision()
  }, [comisionId])

  useEffect(() => {
    if (roster.length > 0) loadAsistenciaFecha()
  }, [fecha, roster])

  async function loadComision() {
    setLoading(true)
    setError('')
    try {
      const [com, alumnos] = await Promise.all([
        apiFetch(`/api/comisiones/${comisionId}`, token),
        apiFetch(`/api/comisiones/${comisionId}/alumnos`, token),
      ])
      setComision(com)
      setRoster(alumnos)
      setPuedeEscribir(isAdmin || com.docente_id === user?.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadAsistenciaFecha() {
    setLoadingFecha(true)
    setSavedMsg('')
    try {
      const registros = await apiFetch(
        `/api/comisiones/${comisionId}/asistencias?fecha=${fecha}`, token
      )
      const map = {}
      // Inicializar todos como ausentes
      roster.forEach(a => { map[a.id] = false })
      // Pisar con los registros existentes
      registros.forEach(r => { map[r.alumno_id] = r.presente === 1 })
      setPresentes(map)
    } catch {
      roster.forEach(a => { presentes[a.id] = false })
      setPresentes({ ...presentes })
    } finally {
      setLoadingFecha(false)
    }
  }

  function togglePresente(alumnoId) {
    setPresentes(prev => ({ ...prev, [alumnoId]: !prev[alumnoId] }))
    setSavedMsg('')
  }

  function marcarTodos(valor) {
    const map = {}
    roster.forEach(a => { map[a.id] = valor })
    setPresentes(map)
    setSavedMsg('')
  }

  async function handleGuardar() {
    setSaving(true)
    setSavedMsg('')
    setError('')
    try {
      await apiFetch(`/api/comisiones/${comisionId}/asistencias`, token, {
        method: 'POST',
        body: JSON.stringify({
          fecha,
          alumnos: roster.map(a => ({ alumno_id: a.id, presente: presentes[a.id] ?? false })),
        }),
      })
      setSavedMsg('Asistencia guardada correctamente')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!comisionId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Asistencia</h1>
        <p className="text-muted-foreground text-sm">
          Accedé al registro de asistencia desde el detalle de una comisión.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/comisiones')}>
          Ir a Comisiones
        </Button>
      </div>
    )
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (error && !comision) return <p className="text-sm text-destructive">{error}</p>
  if (!comision) return null

  const totalPresentes = Object.values(presentes).filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => navigate(`/comisiones/${comisionId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Asistencia</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-sm">{comision.curso_nombre}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">{comision.nombre}</span>
            <Badge variant="secondary">{comision.turno}</Badge>
            <span className="text-muted-foreground text-sm">{comision.anio}</span>
          </div>
        </div>
      </div>

      {/* Selector de fecha */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="fecha" className="text-sm font-medium text-foreground">Fecha</label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-40"
          />
        </div>
        {roster.length > 0 && puedeEscribir && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => marcarTodos(true)}>Todos presentes</Button>
            <Button variant="outline" size="sm" onClick={() => marcarTodos(false)}>Todos ausentes</Button>
          </div>
        )}
      </div>

      {/* Tabla de alumnos */}
      {loadingFecha ? (
        <p className="text-sm text-muted-foreground">Cargando asistencia...</p>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead className="text-center w-28">Presente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No hay alumnos inscriptos en esta comisión
                  </TableCell>
                </TableRow>
              ) : (
                roster.map(alumno => (
                  <TableRow key={alumno.id}>
                    <TableCell>{alumno.nombre}</TableCell>
                    <TableCell className="font-mono text-sm">{alumno.dni}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={presentes[alumno.id] ?? false}
                        onCheckedChange={() => puedeEscribir && togglePresente(alumno.id)}
                        disabled={!puedeEscribir}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer: resumen + guardar */}
      {roster.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalPresentes} de {roster.length} presentes
          </p>
          <div className="flex items-center gap-3">
            {savedMsg && <p className="text-sm text-green-600 dark:text-green-400">{savedMsg}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {puedeEscribir && (
              <Button size="sm" onClick={handleGuardar} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar asistencia'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

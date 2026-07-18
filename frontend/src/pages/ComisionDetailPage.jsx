import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, UserPlus, Trash2, ClipboardList, CalendarCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export default function ComisionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const [comision, setComision] = useState(null)
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [inscribirOpen, setInscribirOpen] = useState(false)
  const [todosAlumnos, setTodosAlumnos] = useState([])
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('')
  const [inscribiendo, setInscribiendo] = useState(false)
  const [inscribirError, setInscribirError] = useState('')

  const [bajaTarget, setBajaTarget] = useState(null)
  const [dandoBaja, setDandoBaja] = useState(false)

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [com, alumnos] = await Promise.all([
        apiFetch(`/api/comisiones/${id}`, token),
        apiFetch(`/api/comisiones/${id}/alumnos`, token),
      ])
      setComision(com)
      setRoster(alumnos)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function openInscribir() {
    setInscribirError('')
    setAlumnoSeleccionado('')
    try {
      const todos = await apiFetch('/api/alumnos', token)
      const inscriptosIds = new Set(roster.map(a => a.id))
      setTodosAlumnos(todos.filter(a => !inscriptosIds.has(a.id)))
    } catch {}
    setInscribirOpen(true)
  }

  async function handleInscribir() {
    if (!alumnoSeleccionado) return
    setInscribiendo(true)
    setInscribirError('')
    try {
      await apiFetch(`/api/comisiones/${id}/alumnos`, token, {
        method: 'POST',
        body: JSON.stringify({ alumno_id: Number(alumnoSeleccionado) }),
      })
      setInscribirOpen(false)
      await loadData()
    } catch (err) {
      setInscribirError(err.message)
    } finally {
      setInscribiendo(false)
    }
  }

  async function handleBaja() {
    setDandoBaja(true)
    try {
      await apiFetch(`/api/comisiones/${id}/alumnos/${bajaTarget.id}`, token, { method: 'DELETE' })
      setBajaTarget(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setDandoBaja(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!comision) return null

  const cupoLleno = roster.length >= comision.cupo

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => navigate('/comisiones')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{comision.curso_nombre}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-muted-foreground text-sm">{comision.nombre}</span>
            <Badge variant="secondary">{comision.turno}</Badge>
            <span className="text-muted-foreground text-sm">{comision.anio}</span>
            {comision.docente_nombre && (
              <span className="text-muted-foreground text-sm">· {comision.docente_nombre}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/calificaciones?comision=${id}`}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Calificaciones
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/asistencia?comision=${id}`}>
              <CalendarCheck className="w-4 h-4 mr-2" />
              Asistencia
            </Link>
          </Button>
        </div>
      </div>

      {/* Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">
            Alumnos inscriptos
            <span className={`ml-2 text-sm font-normal ${cupoLleno ? 'text-destructive' : 'text-muted-foreground'}`}>
              {roster.length} / {comision.cupo}
            </span>
          </h2>
          {isAdmin && (
            <Button size="sm" onClick={openInscribir} disabled={cupoLleno}>
              <UserPlus className="w-4 h-4 mr-2" />
              {cupoLleno ? 'Cupo lleno' : 'Inscribir alumno'}
            </Button>
          )}
        </div>

        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                {isAdmin && <TableHead className="w-16">Baja</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                    No hay alumnos inscriptos
                  </TableCell>
                </TableRow>
              ) : (
                roster.map(alumno => (
                  <TableRow key={alumno.id}>
                    <TableCell className="font-mono text-sm">{alumno.dni}</TableCell>
                    <TableCell>{alumno.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{alumno.email || '—'}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setBajaTarget(alumno)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog inscribir alumno */}
      <Dialog open={inscribirOpen} onOpenChange={setInscribirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscribir alumno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Alumno</Label>
              <Select value={alumnoSeleccionado} onValueChange={setAlumnoSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder={todosAlumnos.length === 0 ? 'Todos los alumnos ya están inscriptos' : 'Seleccioná un alumno'} />
                </SelectTrigger>
                <SelectContent>
                  {todosAlumnos.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.nombre} ({a.dni})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inscribirError && <p className="text-sm text-destructive">{inscribirError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInscribirOpen(false)}>Cancelar</Button>
            <Button onClick={handleInscribir} disabled={!alumnoSeleccionado || inscribiendo}>
              {inscribiendo ? 'Inscribiendo...' : 'Inscribir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog baja de inscripción */}
      <AlertDialog open={!!bajaTarget} onOpenChange={open => !open && setBajaTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja la inscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              {bajaTarget?.nombre} será dado de baja de esta comisión. Sus notas y asistencias quedan en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBaja} disabled={dandoBaja}>
              {dandoBaja ? 'Procesando...' : 'Dar de baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

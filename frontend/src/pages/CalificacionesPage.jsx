import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const emptyForm = { alumno_id: '', periodo: '', nota: '' }

export default function CalificacionesPage() {
  const [searchParams] = useSearchParams()
  const comisionId = searchParams.get('comision')
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const [comision, setComision] = useState(null)
  const [roster, setRoster] = useState([])
  const [calificaciones, setCalificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [puedeEscribir, setPuedeEscribir] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCalif, setEditingCalif] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!comisionId) return
    loadData()
  }, [comisionId])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [com, alumnos, calif] = await Promise.all([
        apiFetch(`/api/comisiones/${comisionId}`, token),
        apiFetch(`/api/comisiones/${comisionId}/alumnos`, token),
        apiFetch(`/api/comisiones/${comisionId}/calificaciones`, token),
      ])
      setComision(com)
      setRoster(alumnos)
      setCalificaciones(calif)
      setPuedeEscribir(isAdmin || com.docente_id === user?.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingCalif(null)
    setForm(emptyForm)
    setFormError('')
    setDialogOpen(true)
  }

  function openEdit(calif) {
    setEditingCalif(calif)
    setForm({ alumno_id: String(calif.alumno_id), periodo: calif.periodo, nota: String(calif.nota) })
    setFormError('')
    setDialogOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const notaNum = Number(form.nota)
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
      setFormError('La nota debe ser un número entre 0 y 10')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editingCalif) {
        await apiFetch(`/api/calificaciones/${editingCalif.id}`, token, {
          method: 'PUT',
          body: JSON.stringify({ periodo: form.periodo, nota: notaNum }),
        })
      } else {
        await apiFetch(`/api/comisiones/${comisionId}/calificaciones`, token, {
          method: 'POST',
          body: JSON.stringify({ alumno_id: Number(form.alumno_id), periodo: form.periodo, nota: notaNum }),
        })
      }
      setDialogOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await apiFetch(`/api/calificaciones/${deleteTarget.id}`, token, { method: 'DELETE' })
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (!comisionId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Calificaciones</h1>
        <p className="text-muted-foreground text-sm">
          Accedé a las calificaciones desde el detalle de una comisión.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/comisiones')}>
          Ir a Comisiones
        </Button>
      </div>
    )
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!comision) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => navigate(`/comisiones/${comisionId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Calificaciones</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground text-sm">{comision.curso_nombre}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">{comision.nombre}</span>
            <Badge variant="secondary">{comision.turno}</Badge>
            <span className="text-muted-foreground text-sm">{comision.anio}</span>
          </div>
        </div>
        {puedeEscribir && (
          <Button size="sm" onClick={openCreate} disabled={roster.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva calificación
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-center">Nota</TableHead>
              {puedeEscribir && <TableHead className="w-24">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {calificaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={puedeEscribir ? 5 : 4} className="text-center text-muted-foreground py-8">
                  No hay calificaciones cargadas
                </TableCell>
              </TableRow>
            ) : (
              calificaciones.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell className="font-mono text-sm">{c.dni}</TableCell>
                  <TableCell>{c.periodo}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${c.nota < 6 ? 'text-destructive' : 'text-foreground'}`}>
                      {c.nota}
                    </span>
                  </TableCell>
                  {puedeEscribir && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCalif ? 'Editar calificación' : 'Nueva calificación'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingCalif && (
              <div className="space-y-1">
                <Label>Alumno</Label>
                <Select value={form.alumno_id} onValueChange={v => setForm(p => ({ ...p, alumno_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná un alumno" /></SelectTrigger>
                  <SelectContent>
                    {roster.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nombre} ({a.dni})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="periodo">Período</Label>
              <Input
                id="periodo"
                value={form.periodo}
                onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))}
                placeholder="Ej: 1er Parcial, Final"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nota">Nota (0 – 10)</Label>
              <Input
                id="nota"
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={form.nota}
                onChange={e => setForm(p => ({ ...p, nota: e.target.value }))}
                required
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || (!editingCalif && !form.alumno_id)}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar calificación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la nota de {deleteTarget?.nombre} — {deleteTarget?.periodo}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

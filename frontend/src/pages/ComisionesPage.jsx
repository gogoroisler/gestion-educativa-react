import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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

const TURNOS = ['Mañana', 'Tarde', 'Noche']
const emptyForm = { nombre: '', curso_id: '', turno: '', cupo: '', anio: String(new Date().getFullYear()), docente_id: '' }

export default function ComisionesPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.rol === 'admin'

  const [comisiones, setComisiones] = useState([])
  const [cursos, setCursos] = useState([])
  const [docentes, setDocentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingComision, setEditingComision] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadComisiones()
    if (isAdmin) {
      loadCursos()
      loadDocentes()
    }
  }, [])

  async function loadComisiones() {
    setLoading(true)
    setError('')
    try {
      setComisiones(await apiFetch('/api/comisiones', token))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadCursos() {
    try { setCursos(await apiFetch('/api/cursos', token)) } catch {}
  }

  async function loadDocentes() {
    try { setDocentes(await apiFetch('/api/docentes', token)) } catch {}
  }

  function openCreate() {
    setEditingComision(null)
    setForm(emptyForm)
    setFormError('')
    setDialogOpen(true)
  }

  function openEdit(comision) {
    setEditingComision(comision)
    setForm({
      nombre: comision.nombre,
      curso_id: String(comision.curso_id),
      turno: comision.turno,
      cupo: String(comision.cupo),
      anio: String(comision.anio),
      docente_id: comision.docente_id ? String(comision.docente_id) : '',
    })
    setFormError('')
    setDialogOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.curso_id || !form.turno) {
      setFormError('Seleccioná una materia y un turno')
      return
    }
    setSaving(true)
    setFormError('')
    const payload = {
      nombre: form.nombre,
      curso_id: Number(form.curso_id),
      turno: form.turno,
      cupo: Number(form.cupo),
      anio: Number(form.anio),
      docente_id: form.docente_id ? Number(form.docente_id) : null,
    }
    try {
      if (editingComision) {
        await apiFetch(`/api/comisiones/${editingComision.id}`, token, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiFetch('/api/comisiones', token, { method: 'POST', body: JSON.stringify(payload) })
      }
      setDialogOpen(false)
      await loadComisiones()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await apiFetch(`/api/comisiones/${deleteTarget.id}`, token, { method: 'DELETE' })
      setDeleteTarget(null)
      await loadComisiones()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Comisiones</h1>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva comisión
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materia</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Docente</TableHead>
                <TableHead className="text-center">Inscriptos / Cupo</TableHead>
                {isAdmin && <TableHead className="w-24">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comisiones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                    No hay comisiones activas
                  </TableCell>
                </TableRow>
              ) : (
                comisiones.map(c => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/comisiones/${c.id}`)}
                  >
                    <TableCell className="font-medium">{c.curso_nombre}</TableCell>
                    <TableCell>{c.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.turno}</Badge>
                    </TableCell>
                    <TableCell>{c.anio}</TableCell>
                    <TableCell className="text-muted-foreground">{c.docente_nombre || '—'}</TableCell>
                    <TableCell className="text-center">
                      <span className={c.inscriptos >= c.cupo ? 'text-destructive font-medium' : ''}>
                        {c.inscriptos} / {c.cupo}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingComision ? 'Editar comisión' : 'Nueva comisión'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Materia</Label>
              <Select value={form.curso_id} onValueChange={v => setForm(p => ({ ...p, curso_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccioná una materia" /></SelectTrigger>
                <SelectContent>
                  {cursos.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre de la comisión</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Comisión A"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Turno</Label>
                <Select value={form.turno} onValueChange={v => setForm(p => ({ ...p, turno: v }))}>
                  <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                  <SelectContent>
                    {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="anio">Año</Label>
                <Input
                  id="anio"
                  type="number"
                  value={form.anio}
                  onChange={e => setForm(p => ({ ...p, anio: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cupo">Cupo</Label>
              <Input
                id="cupo"
                type="number"
                min="1"
                value={form.cupo}
                onChange={e => setForm(p => ({ ...p, cupo: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Docente asignado</Label>
              <Select value={form.docente_id} onValueChange={v => setForm(p => ({ ...p, docente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  {docentes.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog desactivar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar comisión?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.curso_nombre} — {deleteTarget?.nombre} quedará inactiva. Las inscripciones y calificaciones se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Desactivando...' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

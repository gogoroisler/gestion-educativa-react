import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, BookOpen, AlertTriangle, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

function RiskLabel({ tipo }) {
  const map = {
    ambos:             { label: 'Nota y asistencia', className: 'text-destructive' },
    baja_nota:         { label: 'Baja nota',         className: 'text-orange-500 dark:text-orange-400' },
    baja_asistencia:   { label: 'Baja asistencia',   className: 'text-yellow-600 dark:text-yellow-400' },
  }
  if (!tipo || !map[tipo]) return null
  const { label, className } = map[tipo]
  return <span className={`text-xs font-medium ${className}`}>{label}</span>
}

function TasaBar({ tasa }) {
  const colorClass =
    tasa === null   ? 'text-muted-foreground' :
    tasa >= 70      ? 'text-green-600 dark:text-green-400' :
    tasa >= 50      ? 'text-orange-500 dark:text-orange-400' :
                      'text-destructive'
  const barColor =
    tasa === null ? 'transparent' :
    tasa >= 70    ? '#22c55e' :
    tasa >= 50    ? '#f97316' :
                    '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${tasa ?? 0}%`, backgroundColor: barColor }}
        />
      </div>
      <span className={`text-sm font-medium ${colorClass}`}>
        {tasa !== null ? `${tasa}%` : '—'}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const { token, user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [porMateria, setPorMateria] = useState([])
  const [comisionesDashboard, setComisionesDashboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      if (isAdmin) {
        const [s, m] = await Promise.all([
          apiFetch('/api/dashboard', token),
          apiFetch('/api/dashboard/por-materia', token),
        ])
        setStats(s)
        setPorMateria(m)
      } else {
        const comisiones = await apiFetch('/api/comisiones', token)
        const propias = comisiones.filter(c => c.docente_id === user?.id)
        if (propias.length > 0) {
          const dashboards = await Promise.all(
            propias.map(c => apiFetch(`/api/comisiones/${c.id}/dashboard`, token))
          )
          setComisionesDashboard(dashboards)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (error) return <p className="text-sm text-destructive">{error}</p>

  /* ── Admin ─────────────────────────────────────────────────────── */
  if (isAdmin) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total alumnos</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{stats?.total_alumnos ?? '—'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comisiones activas</CardTitle>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{stats?.total_comisiones ?? '—'}</p>
            </CardContent>
          </Card>

          <Card className={stats?.alumnos_en_riesgo > 0 ? 'border-destructive/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos en riesgo</CardTitle>
              <AlertTriangle className={`w-4 h-4 ${stats?.alumnos_en_riesgo > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stats?.alumnos_en_riesgo > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {stats?.alumnos_en_riesgo ?? '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Rendimiento por materia
          </h2>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead className="text-center">Inscriptos</TableHead>
                  <TableHead className="text-center">Aprobados</TableHead>
                  <TableHead className="text-center">En riesgo</TableHead>
                  <TableHead>Tasa de aprobación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porMateria.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay datos disponibles aún
                    </TableCell>
                  </TableRow>
                ) : (
                  porMateria.map(m => (
                    <TableRow key={m.curso_id}>
                      <TableCell className="font-medium">{m.curso}</TableCell>
                      <TableCell className="text-center">{m.total_inscriptos}</TableCell>
                      <TableCell className="text-center text-green-600 dark:text-green-400">
                        {m.aprobados}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.en_riesgo > 0
                          ? <span className="text-destructive font-medium">{m.en_riesgo}</span>
                          : <span className="text-muted-foreground">0</span>
                        }
                      </TableCell>
                      <TableCell>
                        <TasaBar tasa={m.tasa_aprobacion} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  /* ── Docente ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      {comisionesDashboard.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tenés comisiones asignadas.</p>
      ) : (
        <div className="space-y-6">
          {comisionesDashboard.map(({ comision, resumen, alumnos }) => {
            const enRiesgo = alumnos.filter(a => a.riesgo !== null)
            return (
              <Card key={comision.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{comision.curso}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">{comision.nombre}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/comisiones/${comision.id}`)}>
                      Ver detalle
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{resumen.total_inscriptos}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Inscriptos</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resumen.aprobados}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Aprobados</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${resumen.en_riesgo > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {resumen.en_riesgo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">En riesgo</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${
                        resumen.tasa_aprobacion === null  ? 'text-muted-foreground' :
                        resumen.tasa_aprobacion >= 70     ? 'text-green-600 dark:text-green-400' :
                        resumen.tasa_aprobacion >= 50     ? 'text-orange-500 dark:text-orange-400' :
                                                            'text-destructive'
                      }`}>
                        {resumen.tasa_aprobacion !== null ? `${resumen.tasa_aprobacion}%` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Aprobación</p>
                    </div>
                  </div>

                  {enRiesgo.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                        Alumnos que requieren atención
                      </p>
                      <div className="rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Alumno</TableHead>
                              <TableHead className="text-center">Promedio</TableHead>
                              <TableHead className="text-center">Asistencia</TableHead>
                              <TableHead>Situación</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enRiesgo.map(a => (
                              <TableRow key={a.alumno_id}>
                                <TableCell className="font-medium">{a.nombre}</TableCell>
                                <TableCell className="text-center">
                                  {a.promedio !== null
                                    ? <span className={a.promedio < 6 ? 'text-destructive font-medium' : ''}>{a.promedio}</span>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </TableCell>
                                <TableCell className="text-center">
                                  {a.pct_asistencia !== null
                                    ? <span className={a.pct_asistencia < 75 ? 'text-destructive font-medium' : ''}>{a.pct_asistencia}%</span>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  <RiskLabel tipo={a.riesgo} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {enRiesgo.length === 0 && resumen.total_inscriptos > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Todos los alumnos están dentro de los parámetros.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

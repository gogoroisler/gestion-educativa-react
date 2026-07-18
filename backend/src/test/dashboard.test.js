import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import db from '../db/connection.js'
import app from '../app.js'
import { seedDb, getToken } from './helpers.js'

let ids
beforeEach(() => { ids = seedDb() })

describe('GET /api/dashboard', () => {
  it('admin obtiene stats globales correctas', async () => {
    const token = await getToken('admin@test.com')
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.total_alumnos).toBe(1)      // solo alumnoId está inscripto
    expect(res.body.total_comisiones).toBe(1)   // solo comisionId tiene inscriptos
    expect(typeof res.body.alumnos_en_riesgo).toBe('number')
  })

  it('docente no puede acceder al dashboard global', async () => {
    const token = await getToken('docente@test.com')
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/comisiones/:id/dashboard', () => {
  it('docente accede al dashboard de su propia comisión', async () => {
    const token = await getToken('docente@test.com')
    const res = await request(app)
      .get(`/api/comisiones/${ids.comisionId}/dashboard`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('comision')
    expect(res.body).toHaveProperty('resumen')
    expect(res.body).toHaveProperty('alumnos')
    expect(res.body.resumen.total_inscriptos).toBe(1)
  })

  it('docente no puede ver el dashboard de una comisión ajena', async () => {
    // docente2 intenta ver la comisión de docente
    const token = await getToken('docente2@test.com')
    const res = await request(app)
      .get(`/api/comisiones/${ids.comisionId}/dashboard`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('el campo riesgo refleja correctamente una nota baja', async () => {
    // Cargamos una nota reprobada para el alumno
    db.prepare(
      'INSERT INTO calificaciones (inscripcion_id, periodo, nota) VALUES (?, ?, ?)'
    ).run(ids.inscripcionId, '1er Cuatrimestre', 3)

    const token = await getToken('admin@test.com')
    const res = await request(app)
      .get(`/api/comisiones/${ids.comisionId}/dashboard`)
      .set('Authorization', `Bearer ${token}`)

    const alumno = res.body.alumnos.find(a => a.alumno_id === ids.alumnoId)
    expect(alumno.riesgo).toBe('baja_nota')
    expect(alumno.promedio).toBe(3)
  })
})

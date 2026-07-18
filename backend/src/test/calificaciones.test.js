import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import db from '../db/connection.js'
import app from '../app.js'
import { seedDb, getToken } from './helpers.js'

let ids
beforeEach(() => { ids = seedDb() })

describe('POST /api/comisiones/:id/calificaciones', () => {
  it('docente asignado puede cargar una nota', async () => {
    const token = await getToken('docente@test.com')
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/calificaciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alumno_id: ids.alumnoId, periodo: '1er Cuatrimestre', nota: 8 })

    expect(res.status).toBe(201)
    expect(res.body.nota).toBe(8)
  })

  it('rechaza nota fuera del rango 0–10', async () => {
    const token = await getToken('admin@test.com')
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/calificaciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alumno_id: ids.alumnoId, periodo: '1er Cuatrimestre', nota: 11 })

    expect(res.status).toBe(400)
  })

  it('docente no puede cargar notas en una comisión que no es suya', async () => {
    const token = await getToken('docente2@test.com')
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/calificaciones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alumno_id: ids.alumnoId, periodo: '1er Cuatrimestre', nota: 7 })

    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/calificaciones/:id', () => {
  it('solo el admin puede eliminar una calificación', async () => {
    // Primero cargamos una nota
    const adminToken = await getToken('admin@test.com')
    const created = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/calificaciones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ alumno_id: ids.alumnoId, periodo: 'Final', nota: 6 })
    const califId = created.body.id

    // El docente intenta borrarla — debe fallar
    const docenteToken = await getToken('docente@test.com')
    const resDenied = await request(app)
      .delete(`/api/calificaciones/${califId}`)
      .set('Authorization', `Bearer ${docenteToken}`)
    expect(resDenied.status).toBe(403)

    // El admin la borra exitosamente
    const resOk = await request(app)
      .delete(`/api/calificaciones/${califId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(resOk.status).toBe(200)

    const row = db.prepare('SELECT id FROM calificaciones WHERE id = ?').get(califId)
    expect(row).toBeUndefined()
  })
})

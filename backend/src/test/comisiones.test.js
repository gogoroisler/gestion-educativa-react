import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { seedDb, getToken } from './helpers.js'

let ids
beforeEach(() => { ids = seedDb() })

describe('GET /api/comisiones', () => {
  it('admin ve todas las comisiones', async () => {
    const token = await getToken('admin@test.com')
    const res = await request(app)
      .get('/api/comisiones')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
  })

  it('docente solo ve sus propias comisiones', async () => {
    const token = await getToken('docente@test.com')
    const res = await request(app)
      .get('/api/comisiones')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].id).toBe(ids.comisionId)
  })
})

describe('POST /api/comisiones/:id/alumnos — inscripción', () => {
  it('inscribe un alumno exitosamente', async () => {
    const token = await getToken('admin@test.com')
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/alumnos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alumno_id: ids.alumno2Id })

    expect(res.status).toBe(201)
  })

  it('rechaza inscripción cuando la comisión llegó al cupo máximo', async () => {
    const token = await getToken('admin@test.com')
    // comision2 tiene cupo 1; inscribimos al alumno2 para llenarlo
    await request(app)
      .post(`/api/comisiones/${ids.comision2Id}/alumnos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alumno_id: ids.alumno2Id })

    // Intentamos inscribir un segundo alumno en la misma comisión llena
    const res = await request(app)
      .post(`/api/comisiones/${ids.comision2Id}/alumnos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alumno_id: ids.alumnoId })

    expect(res.status).toBe(409)
  })

  it('rechaza doble inscripción activa del mismo alumno en la misma comisión', async () => {
    // alumnoId ya está inscripto en comisionId por el seed
    const token = await getToken('admin@test.com')
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/alumnos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alumno_id: ids.alumnoId })

    expect(res.status).toBe(409)
  })
})

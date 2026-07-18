import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import db from '../db/connection.js'
import app from '../app.js'
import { seedDb, getToken } from './helpers.js'

let ids
beforeEach(() => { ids = seedDb() })

describe('POST /api/comisiones/:id/asistencias — registro bulk', () => {
  it('guarda la asistencia del día para todos los alumnos en un solo request', async () => {
    const token = await getToken('docente@test.com')
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/asistencias`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fecha: '2026-08-01',
        alumnos: [{ alumno_id: ids.alumnoId, presente: true }],
      })

    expect(res.status).toBe(201)
    expect(res.body.registros).toBe(1)

    const row = db.prepare(
      'SELECT presente FROM asistencias WHERE inscripcion_id = ? AND fecha = ?'
    ).get(ids.inscripcionId, '2026-08-01')
    expect(row.presente).toBe(1)
  })

  it('upsert: registrar la misma fecha dos veces actualiza el valor, no duplica', async () => {
    const token = await getToken('docente@test.com')
    const payload = {
      fecha: '2026-08-02',
      alumnos: [{ alumno_id: ids.alumnoId, presente: true }],
    }

    await request(app)
      .post(`/api/comisiones/${ids.comisionId}/asistencias`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)

    // Segunda llamada con el mismo alumno y fecha pero ausente
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/asistencias`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fecha: '2026-08-02', alumnos: [{ alumno_id: ids.alumnoId, presente: false }] })

    expect(res.status).toBe(201)

    const registros = db.prepare(
      'SELECT * FROM asistencias WHERE inscripcion_id = ? AND fecha = ?'
    ).all(ids.inscripcionId, '2026-08-02')

    // Solo debe existir un registro (no se duplicó)
    expect(registros.length).toBe(1)
    // El valor fue actualizado al segundo registro (ausente)
    expect(registros[0].presente).toBe(0)
  })

  it('docente no puede registrar asistencia en una comisión que no es suya', async () => {
    const token = await getToken('docente2@test.com')
    const res = await request(app)
      .post(`/api/comisiones/${ids.comisionId}/asistencias`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fecha: '2026-08-01',
        alumnos: [{ alumno_id: ids.alumnoId, presente: true }],
      })

    expect(res.status).toBe(403)
  })
})

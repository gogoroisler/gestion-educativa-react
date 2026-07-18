import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import db from '../db/connection.js'
import app from '../app.js'
import { seedDb, getToken } from './helpers.js'

let ids
beforeEach(() => { ids = seedDb() })

describe('GET /api/alumnos', () => {
  it('requiere autenticación', async () => {
    const res = await request(app).get('/api/alumnos')
    expect(res.status).toBe(401)
  })

  it('permite acceso al docente', async () => {
    const token = await getToken('docente@test.com')
    const res = await request(app)
      .get('/api/alumnos')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /api/alumnos', () => {
  it('admin puede crear un alumno', async () => {
    const token = await getToken('admin@test.com')
    const res = await request(app)
      .post('/api/alumnos')
      .set('Authorization', `Bearer ${token}`)
      .send({ dni: '99999999', nombre: 'Carlos', apellido: 'Ruiz', email: 'carlos@test.com' })

    expect(res.status).toBe(201)
    expect(res.body.dni).toBe('99999999')
    expect(res.body.nombre).toBe('Carlos')
    expect(res.body.apellido).toBe('Ruiz')
  })

  it('docente no puede crear alumnos', async () => {
    const token = await getToken('docente@test.com')
    const res = await request(app)
      .post('/api/alumnos')
      .set('Authorization', `Bearer ${token}`)
      .send({ dni: '99999999', nombre: 'Carlos', apellido: 'Ruiz' })

    expect(res.status).toBe(403)
  })

  it('rechaza DNI duplicado con 409', async () => {
    const token = await getToken('admin@test.com')
    await request(app)
      .post('/api/alumnos')
      .set('Authorization', `Bearer ${token}`)
      .send({ dni: '55555555', nombre: 'Pedro', apellido: 'Sosa' })

    const res = await request(app)
      .post('/api/alumnos')
      .set('Authorization', `Bearer ${token}`)
      .send({ dni: '55555555', nombre: 'Pedro', apellido: 'Sosa' })

    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/alumnos/:id', () => {
  it('hace baja lógica: el alumno queda inactivo, no se borra', async () => {
    const token = await getToken('admin@test.com')
    const res = await request(app)
      .delete(`/api/alumnos/${ids.alumnoId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    const alumno = db.prepare('SELECT estado FROM alumnos WHERE id = ?').get(ids.alumnoId)
    expect(alumno.estado).toBe('inactivo')
  })
})

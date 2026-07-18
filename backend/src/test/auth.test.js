import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import db from '../db/connection.js'
import app from '../app.js'
import { seedDb } from './helpers.js'

beforeEach(() => seedDb())

describe('POST /api/auth/login', () => {
  it('devuelve token, id, nombre y rol con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin1234' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('id')
    expect(res.body.rol).toBe('admin')
    expect(res.body.nombre).toBe('Admin')
  })

  it('responde 401 con email no registrado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@test.com', password: 'admin1234' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Credenciales inválidas')
  })

  it('responde 401 con contraseña incorrecta usando el mismo mensaje', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'incorrecta' })

    expect(res.status).toBe(401)
    // El mensaje es idéntico al caso anterior: no se puede deducir si el email existe
    expect(res.body.error).toBe('Credenciales inválidas')
  })

  it('rechaza login de usuario inactivo', async () => {
    db.prepare("UPDATE usuarios SET estado = 'inactivo' WHERE email = ?")
      .run('admin@test.com')

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin1234' })

    expect(res.status).toBe(401)
  })
})

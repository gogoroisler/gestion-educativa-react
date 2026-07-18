import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Cada archivo de test corre en su propio proceso (pool: forks es el default).
    // Combinado con DB_PATH=:memory:, cada archivo obtiene una base de datos
    // SQLite en memoria completamente aislada — los tests no se contaminan entre sí.
    pool: 'forks',
    env: {
      DB_PATH: ':memory:',
      JWT_SECRET: 'test-secret-key',
      JWT_EXPIRES_IN: '1h',
    },
  },
})

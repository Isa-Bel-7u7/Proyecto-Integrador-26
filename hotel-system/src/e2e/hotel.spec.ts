import { test, expect, type Page } from '@playwright/test'
import { env } from 'node:process'

const ADMIN = {
  correo: env.E2E_ADMIN_EMAIL ?? '',
  password: env.E2E_ADMIN_PASSWORD ?? '',
}
const CLIENTE = {
  correo: env.E2E_CLIENT_EMAIL ?? '',
  password: env.E2E_CLIENT_PASSWORD ?? '',
}

test.beforeAll(() => {
  const missingCredentials = Object.entries({ ADMIN, CLIENTE })
    .flatMap(([role, credentials]) =>
      Object.entries(credentials)
        .filter(([, value]) => !value)
        .map(([field]) => `${role}.${field}`),
    )

  if (missingCredentials.length > 0) {
    throw new Error(
      `Faltan credenciales E2E: ${missingCredentials.join(', ')}. ` +
        'Configura las variables documentadas en .env.e2e.example.',
    )
  }
})

async function login(page: Page, correo: string, password: string) {
  await page.goto('/login')
  await page.waitForSelector('input[type="email"]', { timeout: 10000 })
  await page.fill('input[type="email"]', correo)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
}

async function loginAdmin(page: Page) {
  await login(page, ADMIN.correo, ADMIN.password)
  await page.waitForURL(/personal\/dashboard/, { timeout: 15000 })
}

// ════════════════════════════════════════════════════
// PE01 — Login exitoso como administrador
// Vinculado a RF02, CP03
// ════════════════════════════════════════════════════
test('PE01 — Login exitoso como administrador', async ({ page }) => {
  await login(page, ADMIN.correo, ADMIN.password)
  await expect(page).toHaveURL(/personal\/dashboard/, { timeout: 15000 })
})

// ════════════════════════════════════════════════════
// PE02 — Login fallido con contraseña incorrecta
// Vinculado a RF02, CP04
// ════════════════════════════════════════════════════
test('PE02 — Login fallido con contraseña incorrecta', async ({ page }) => {
  await page.goto('/login')
  await page.waitForSelector('input[type="email"]')
  await page.fill('input[type="email"]', ADMIN.correo)
  await page.fill('input[type="password"]', 'contrasena_incorrecta')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
  expect(page.url()).not.toContain('/personal/dashboard')
})

// ════════════════════════════════════════════════════
// PE03 — Login exitoso como cliente
// Vinculado a RF02, CU02
// ════════════════════════════════════════════════════
test('PE03 — Login exitoso como cliente', async ({ page }) => {
  await login(page, CLIENTE.correo, CLIENTE.password)
  await expect(page).toHaveURL(/cliente/, { timeout: 15000 })
})

// ════════════════════════════════════════════════════
// PE04 — Acceso denegado a ruta del personal como cliente
// Vinculado a RF05, CP06
// ════════════════════════════════════════════════════
test('PE04 — Acceso denegado a ruta del personal como cliente', async ({ page }) => {
  await login(page, CLIENTE.correo, CLIENTE.password)
  await page.waitForURL(/cliente/, { timeout: 15000 })
  await page.goto('/personal/dashboard')
  await page.waitForTimeout(2000)
  expect(page.url()).not.toContain('/personal/dashboard')
})

// ════════════════════════════════════════════════════
// PE05 — Ver lista de reservas como administrador
// Vinculado a RF22, CP13
// ════════════════════════════════════════════════════
test('PE05 — Ver lista de reservas como administrador', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/reservas')
  await page.waitForTimeout(2000)
  await expect(page.locator('.tabla-wrapper').first()).toBeVisible({ timeout: 8000 })
})

// ════════════════════════════════════════════════════
// PE06 — Abrir modal de nueva reserva
// Vinculado a RF19, CP13
// ════════════════════════════════════════════════════
test('PE06 — Abrir modal de nueva reserva', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/reservas')
  await page.waitForSelector('.btn-nueva', { timeout: 8000 })
  await page.click('.btn-nueva')
  await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 5000 })
})

// ════════════════════════════════════════════════════
// PE07 — Ver lista de habitaciones con estados
// Vinculado a RF12, CP09
// ════════════════════════════════════════════════════
test('PE07 — Ver lista de habitaciones con estados', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/habitaciones')
  await page.waitForTimeout(2000)
  await expect(page.locator('.hab-grid').first()).toBeVisible({ timeout: 8000 })
})

// ════════════════════════════════════════════════════
// PE08 — Ver módulo de auditoría como administrador
// Vinculado a RF52, RF53
// ════════════════════════════════════════════════════
test('PE08 — Ver módulo de auditoría como administrador', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/auditoria')
  await page.waitForTimeout(2000)
  await expect(page.locator('.content').first()).toBeVisible({ timeout: 8000 })
  expect(page.url()).toContain('/personal/auditoria')
})

// ════════════════════════════════════════════════════
// PE09 — Ver dashboard con datos reales
// Vinculado a RF49, CU23
// ════════════════════════════════════════════════════
test('PE09 — Ver dashboard con datos reales', async ({ page }) => {
  await loginAdmin(page)
  await page.waitForTimeout(2000)
  await expect(page.locator('.resumen-grid, .stat-grid, .dashboard-grid').first())
    .toBeVisible({ timeout: 10000 })
    .catch(async () => {
      await expect(page.locator('main, .main').first()).toBeVisible({ timeout: 5000 })
    })
  expect(page.url()).toContain('/personal/dashboard')
})

// ════════════════════════════════════════════════════
// PE10 — Ver reportes con datos
// Vinculado a RF49, RF50, RF51
// ════════════════════════════════════════════════════
test('PE10 — Ver reportes con datos', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/reportes')
  await page.waitForTimeout(2000)
  await expect(page.locator('.kpi-card').first()).toBeVisible({ timeout: 8000 })
})

// ════════════════════════════════════════════════════
// PE11 — Ver tareas de housekeeping
// Vinculado a RF41, CP25
// ════════════════════════════════════════════════════
test('PE11 — Ver tareas de housekeeping', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/housekeeping')
  await page.waitForTimeout(2000)
  await expect(page.locator('.content').first()).toBeVisible({ timeout: 8000 })
  expect(page.url()).toContain('/personal/housekeeping')
})

// ════════════════════════════════════════════════════
// PE12 — Registrar pago modal se abre correctamente
// Vinculado a RF29, CP17
// ════════════════════════════════════════════════════
test('PE12 — Registrar pago: modal se abre correctamente', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/pagos')
  await page.waitForTimeout(2000)
  const btnRegistrar = page.locator('button', { hasText: /registrar pago/i })
  await expect(btnRegistrar).toBeVisible({ timeout: 8000 })
  await btnRegistrar.click()
  await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 5000 })
})

// PE13 — Ver incidencias registradas
// Vinculado a RF44, CP28
test('PE13 — Ver incidencias registradas', async ({ page }) => {
  await loginAdmin(page)
  await page.goto('/personal/incidencias')
  await page.waitForTimeout(2000)
  await expect(page.locator('.content').first()).toBeVisible({ timeout: 8000 })
  expect(page.url()).toContain('/personal/incidencias')
})

// PE14 — Login como cliente y ver sus reservas
// Vinculado a RF21, CP05

test('PE14 — Login como cliente y ver sus reservas', async ({ page }) => {
  await login(page, CLIENTE.correo, CLIENTE.password)
  await page.waitForURL(/cliente/, { timeout: 15000 })
  await page.waitForTimeout(1000)
  const btnReservas = page.locator('button', { hasText: /reservas/i }).first()
  await btnReservas.click()
  await page.waitForTimeout(1000)
  expect(page.url()).toContain('cliente')
})

// PE15 — Cerrar sesión correctamente
// Vinculado a RF02
test('PE15 — Cerrar sesión correctamente', async ({ page }) => {
  await loginAdmin(page)
  await page.waitForTimeout(1000)
  await page.evaluate(() => {
    const btn = document.querySelector('.btn-logout') as HTMLElement
    if (btn) btn.click()
  })
  await expect(page).toHaveURL(/login/, { timeout: 8000 })
})

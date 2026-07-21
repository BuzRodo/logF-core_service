# Matriz de permisos — LogFood Core Service

Refleja el estado **real** del código a la fecha de este documento (no el deseado).
Roles: `admin`, `supervisor`, `cashier`. "—" significa que el endpoint no existe o el rol
no tiene acceso (RolesGuard responde 403; si además falta el JWT, responde 401).

Todos los endpoints requieren `JwtAuthGuard` (JWT válido de un usuario **activo** — el
login y la estrategia JWT rechazan usuarios con `active=false`) salvo los explícitamente
marcados como públicos.

## Convenciones de esta tabla

- `RW` = lectura y escritura completas.
- `R` = solo lectura.
- `R*` = lectura, pero con campos de costo/margen filtrados por backend (ver sección
  "Visibilidad de costos" más abajo). El campo nunca sale en el JSON para ese rol.
- `—` = sin acceso (403).

## Usuarios (`/api/users`) — nuevo módulo

| Endpoint | admin | supervisor | cashier |
|---|---|---|---|
| `GET /api/users` | RW | — | — |
| `GET /api/users/:id` | RW | — | — |
| `POST /api/users` | RW | — | — |
| `PATCH /api/users/:id` (username/nombre/rol) | RW | — | — |
| `PATCH /api/users/:id/password` (reset por admin) | RW | — | — |
| `PATCH /api/users/:id/active` (activar/desactivar) | RW | — | — |
| `PATCH /api/users/me/password` (cambiar mi propia contraseña) | RW | RW | RW |

Reglas de integridad aplicadas en `UsersService` (con tests unitarios):
- Username único **case-insensitive** (comparación vía `mode: 'insensitive'` en Postgres).
- Contraseñas hasheadas con bcrypt, cost factor 10 (mismo que usa `prisma/seed.ts`).
- Un admin **no puede desactivarse a sí mismo** ni **quitarse el rol admin a sí mismo**
  (incondicional, aunque existan otros admins).
- **No se puede desactivar ni degradar al último admin activo del sistema** (lo intente
  quien lo intente): siempre debe quedar al menos un admin activo.
- No hay `DELETE`: los usuarios tienen ventas y sesiones de caja asociadas (relaciones en
  `Sale`/`CashSession`), por lo que solo se soportan bajas lógicas vía `active=false`.
- Las respuestas nunca incluyen `passwordHash`: se arman con un mapper explícito
  (`toSafeUser`) sobre un `select` de Prisma que ya lo excluye (doble defensa).

## Catálogo (`/api/products`, `/api/categories`, `/api/ingredients`, `/api/catalog`)

| Endpoint | admin | supervisor | cashier |
|---|---|---|---|
| `GET /api/catalog` (catálogo liviano para POS, sin costos) | R | R | R |
| `GET /api/products` | R* | R* | R* |
| `GET /api/products/:id` | R* | R* | R* |
| `GET /api/products/:id/cost` (desglose de costo/margen) | R | — | — |
| `POST/PATCH/DELETE /api/products` | RW | — | — |
| `GET /api/categories`, `GET /api/categories/:id` | R | R | R |
| `POST/PATCH/DELETE /api/categories` | RW | — | — |
| `GET /api/ingredients`, `GET /api/ingredients/:id` | R* | R* | R* |
| `GET /api/ingredients/cost-changes` (historial de costo) | R | — | — |
| `POST/PATCH/DELETE /api/ingredients` | RW | — | — |

**Criterio aplicado:** lectura de catálogo (productos/categorías/ingredientes/recetas)
abierta a los 3 roles porque es información operativa de bajo riesgo (nombre, precio de
venta, unidad, stock); escritura (alta/edición/baja de productos, categorías,
ingredientes, precios) exclusiva de `admin`. Los endpoints cuyo contenido es 100% costo
(`GET /:id/cost`, `GET /ingredients/cost-changes`) son admin-only completos, no tiene
sentido "filtrarlos" porque no queda nada útil sin el costo.

## Stock (`/api/stock-entries`)

| Endpoint | admin | supervisor | cashier |
|---|---|---|---|
| `GET /api/stock-entries`, `GET /api/stock-entries/expiring` | R* | R* | — |
| `POST /api/stock-entries` (ingresar lote) | RW | RW | — |
| `DELETE /api/stock-entries/:id` (revertir carga errónea) | RW | — | — |

**Criterio aplicado:** ingresar stock es una operación de depósito habitual →
`admin` + `supervisor`. Eliminar un lote revierte cantidades ya sumadas al ingrediente
(corrección contable delicada) → solo `admin`. Cashier no participa de la gestión de
stock. `lineTotal` (importe pagado por el lote) se filtra para `supervisor`.

## Compras (`/api/suppliers`, `/api/purchase-orders`, `/api/purchase-invoices`)

| Endpoint | admin | supervisor | cashier |
|---|---|---|---|
| `GET /api/suppliers`, `GET /api/suppliers/:id` | R | R | — |
| `POST/PATCH/DELETE /api/suppliers` | RW | — | — |
| `GET /api/purchase-orders`, `GET /api/purchase-orders/:id` | R* | R* | — |
| `POST /api/purchase-orders`, `POST /api/purchase-orders/:id/cancel` | RW | — | — |
| `GET /api/purchase-invoices`, `GET /api/purchase-invoices/:id` | R* | R* | — |
| `POST/PATCH/DELETE /api/purchase-invoices` | RW | — | — |

**Criterio aplicado:** cashier no interviene en compras. Lectura de proveedores/OC/
facturas es admin+supervisor (necesitan verlas para recepción de mercadería); toda
escritura (dar de alta OC, cargar facturas, editar proveedores) es admin-only. El
`totalAmount` de la factura y el `lineTotal` de los lotes que trae (y el
`invoice.totalAmount` embebido en la orden de compra que la cerró) se filtran para
`supervisor`.

## Ventas y caja (`/api/sales`, `/api/cash-sessions`, `/api/cash-movements`)

Todo detrás de `FEATURE_POS` (y `salesReports`/`cash` según endpoint). ✓ = acceso, — = 403.

| Endpoint | admin | supervisor | cashier |
|---|---|---|---|
| `POST /api/sales` (registrar venta) | ✓* | ✓* | ✓* |
| `GET /api/sales` (listar) | ✓* | ✓* | — |
| `GET /api/sales/:id` (detalle) | ✓* | ✓* | ✓* |
| `GET /api/sales/summary`, `/by-product`, `/by-driver` (requiere `FEATURE_SALES_REPORTS`) | ✓ | ✓ | — |
| `POST /api/sales/void-by-invoice` (anular por ticket, autoservicio del POS) | ✓ | ✓ | ✓ |
| `POST /api/sales/:id/void` (anular por id) | ✓ | ✓ | — |
| `GET /api/cash-sessions` (listar todas) | ✓ | ✓ | — |
| `GET /active/:registerId`, `GET /:id/summary`, `GET /:id`, `POST /open`, `POST /:id/close` | ✓ | ✓ | ✓ |
| `POST /api/cash-movements` (registrar ingreso/egreso) | ✓ | ✓ | ✓ |
| `GET /api/cash-movements` (listar) | ✓ | ✓ | — |

**Campo filtrado:** `SaleItem.costAtSale` (snapshot del costo de receta al momento de la
venta) se filtra para `supervisor` y `cashier` — solo `admin` lo ve.

## Clientes y repartidores (`/api/customers`, `/api/drivers`)

Detrás de `FEATURE_CUSTOMERS`. Sin campos de costo (no aplica filtrado). ✓ = acceso, — = 403.

| Endpoint | admin | supervisor | cashier |
|---|---|---|---|
| `GET /api/customers` (listar) | ✓ | ✓ | — |
| `GET /api/customers/search` (buscar por teléfono) | ✓ | ✓ | ✓ |
| `GET /api/customers/:id` | ✓ | ✓ | — |
| `POST /api/customers` (crear) | ✓ | ✓ | ✓ |
| `PATCH/DELETE /api/customers/:id` | ✓ | — | — |
| `GET /api/drivers` (listar) | ✓ | ✓ | ✓ |
| `GET /api/drivers/:id` | ✓ | ✓ | — |
| `POST/PATCH /api/drivers` | ✓ | ✓ | — |
| `DELETE /api/drivers/:id` | ✓ | — | — |

## POS — pagos con tarjeta (`/api/pos/transactions`, `/api/pos/health`)

Detrás de `FEATURE_POS`. **Hueco de seguridad cerrado en esta tarea:** el controller no
tenía `@Roles` (cualquier autenticado podía ejecutar una devolución o anular una
transacción ya asentada) y `HealthController` no tenía **ningún** guard (ni JWT).

| Endpoint | admin | supervisor | cashier |
|---|---|---|---|
| `POST /purchase`, `/query`, `/confirm`, `/cancel` (flujo normal de cobro) | ✓ | ✓ | ✓ |
| `GET /:transactionId/ticket` | ✓ | ✓ | ✓ |
| `POST /reverse`, `/void`, `/refund` (deshacen una transacción asentada) | ✓ | ✓ | — |
| `POST /search` (historial completo de transacciones, auditoría) | ✓ | ✓ | — |
| `POST /api/pos/health/echo` (health check del pinpad) | ✓ | ✓ | ✓ |

## Llamadas entrantes, features y auth (intencionalmente sin RolesGuard — no tocados)

| Endpoint | Acceso |
|---|---|
| `POST /api/incoming-calls` | Público con API key propia (`X-Agent-Key`, `AgentApiKeyGuard`), no usa JWT — lo llama el capturador local. |
| `GET /api/incoming-calls` | Cualquier usuario autenticado (JWT), sin restricción de rol. |
| `GET /api/features` | Público, sin JWT — se consulta antes de loguearse para armar el menú. |
| `POST /api/auth/login` | Público, sin JWT (es el propio login). Rechaza usuarios con `active=false`. |

## Visibilidad de costos por rol (backend, no solo UI)

Implementado en `src/common/utils/cost-visibility.util.ts` (`filterCostFieldsForRole`):
función reutilizable que recorre recursivamente cualquier respuesta (objeto, array, o
relaciones anidadas incluidas por Prisma) y elimina los siguientes campos si el rol no es
`admin`, en vez de si-dispersar `delete obj.campo` en cada servicio/controller:

| Campo | Dónde aparece | Endpoints donde se filtra |
|---|---|---|
| `costPerUnit` | `Ingredient`, y anidado en `Product.recipeItems[].ingredient` | `GET /api/ingredients`, `GET /api/ingredients/:id`, `GET /api/products`, `GET /api/products/:id` |
| `costHistory` | `Ingredient.costHistory[]` | `GET /api/ingredients/:id` |
| `oldCost` / `newCost` | `IngredientCostHistory` | (dentro de `costHistory`, ya filtrado completo) |
| `totalCost`, `margin`, `marginPct`, `cost` | `ProductCostBreakdown` / `CostLineItem` | `GET /api/products/:id/cost` — este endpoint es admin-only completo, no se filtra parcialmente |
| `totalAmount` | `PurchaseInvoice`, y embebido en `PurchaseOrder.invoice` | `GET /api/purchase-invoices`, `GET /api/purchase-invoices/:id`, `GET /api/purchase-orders`, `GET /api/purchase-orders/:id` |
| `lineTotal` | `StockEntry`, y anidado en `PurchaseInvoice.stockEntries[]` | `GET /api/stock-entries`, `GET /api/stock-entries/expiring`, `POST /api/stock-entries`, `GET /api/purchase-invoices/:id` |
| `costAtSale` | `SaleItem` | `POST /api/sales`, `GET /api/sales`, `GET /api/sales/:id` |

Cobertura de tests: `src/common/utils/cost-visibility.util.spec.ts` (la función en sí,
incluyendo filtrado anidado y arrays) y `src/users/users.service.spec.ts` (reglas de
integridad de usuarios). Autorización: `src/auth/guards/roles.guard.spec.ts` (mecanismo
de `RolesGuard`), `src/catalog/write-endpoints.roles.spec.ts` y
`src/pos/transactions/transactions.controller.roles.spec.ts` (metadata real de los
controllers, para que quede probado que cashier/supervisor son rechazados en los
endpoints de escritura correspondientes).

## Frontend (logF-UI/admin) — defensa en profundidad, no reemplazo del backend

El admin ya bloqueaba `cashier` por completo (`RequireAdmin` en el router redirige a
`/admin/login` si `user.role === 'cashier'`), así que ese rol nunca entra a la app de
administración. Lo nuevo en esta tarea:

- **Sidebar** (`src/admin/components/layout/Sidebar.tsx`): los items de nav soportan
  `requireRole` además del `feature` existente; se ocultan si el usuario no tiene ese rol
  exacto. "Usuarios" quedó con `requireRole: 'admin'`.
- **Router** (`src/admin/app/router/index.tsx`): nuevo guard `RequireAdminRole` (redirige
  a `/admin/dashboard` si el usuario no es admin). Envuelve las rutas `/admin/usuarios`,
  `/admin/products`, `/admin/ingredients`, `/admin/facturas` y `/admin/analisis`.
- **Por qué esas 4 páginas de catálogo/compras quedaron admin-only en el frontend** aunque
  el backend permite a `supervisor` leer esos endpoints (para casos de uso operativos,
  como listar ingredientes al cargar una entrada de stock): sus componentes actuales
  muestran costo/margen entremezclado con el resto de la información de forma
  inseparable sin una reescritura mayor (`CostPanel` en el modal de productos, columna
  de costo + historial en ingredientes, casi todas las columnas de Facturas, y Análisis
  de costos es 100% margen). Bloquear la página evita que supervisor vea un "$NaN" o un
  "$0" engañoso donde antes había un costo real. Las pantallas donde el costo es solo un
  dato secundario (Inventario, Órdenes de compra, listado/detalle de Ventas) se dejaron
  disponibles para supervisor y se les agregaron guards null-safe (`?? 0`, `!= null ? … :
  '—'`) que ocultan puntualmente la columna/KPI de costo en vez de bloquear la pantalla
  entera — ver `InventoryPage.tsx` (KPI "Valor inventario" y columna "Costo/unidad"),
  `OrdenesPage.tsx` (línea de factura que cerró la OC), `DashboardPage.tsx` (KPIs
  "Compras · 30d" y "Margen bruto", columna "Margen" y card "Análisis de costos") y
  `SalesPage.tsx` de admin (columna "Costo unit." y línea "Costo total/Margen" en el
  detalle de venta expandido).
- **Tipos** (`src/admin/services/admin-api.ts`): `Ingredient.costPerUnit`,
  `RecipeItem.ingredient.costPerUnit`, `SaleItem.costAtSale`, `PurchaseInvoice.totalAmount`
  y `PurchaseOrder.invoice.totalAmount` pasaron a opcionales, reflejando que el backend
  puede omitirlos según el rol — obliga a los componentes a manejarlos como
  potencialmente ausentes en vez de asumir que siempre vienen.
- **Hook de rol** (`src/hooks/useRole.ts`): `can(role, allowedRoles)` / `isAdmin(role)`,
  reutilizado por Sidebar, router, Dashboard y Sales (admin) para no repetir
  `role === 'admin'` disperso.
- **Cambiar contraseña propia**: `src/shared/ChangePasswordModal.tsx` (componente
  compartido, no duplicado entre apps), invocado desde el footer del Sidebar (admin) y
  desde la barra superior de `pos/pages/sales/SalesPage.tsx` (POS/cashier).

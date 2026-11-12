# Matriz de Permisos por Rol — ConectaResto Backend

Documentación de la tarea **SCRUM-7**: Definir y documentar matriz de permisos por rol (SUPER_ADMIN, ADMIN, WAITER, CASHIER).

Este documento establece el diseño funcional aprobado de permisos y autorizaciones para el backend de ConectaResto. Separa claramente los permisos ya implementados, los ajustes pendientes sobre el código existente y las funcionalidades futuras que aún no existen.

---

## 1. Actores del Sistema

| Actor | Tipo | Autenticación | Alcance |
|-------|------|---------------|---------|
| SUPER_ADMIN | Rol del sistema | JWT (autenticado) | Todos los restaurantes (alcance global) |
| ADMIN | Rol del sistema | JWT (autenticado) | Su propio restaurante |
| WAITER | Rol del sistema | JWT (autenticado) | Su propio restaurante |
| CASHIER | Rol del sistema | JWT (autenticado) | Su propio restaurante |
| KITCHEN | Rol del sistema | JWT (autenticado) | Su propio restaurante |
| CLIENT | Actor público | **Sin autenticación** | Público: acceso al menú vía QR |

**Nota:** El CLIENT no es un rol del sistema. No requiere JWT ni autenticación. El endpoint `POST /auth/login` es público, pero eso no significa que CLIENT tenga un permiso de autenticación: el cliente no inicia sesión ni posee credenciales en el sistema.

**Nota sobre alcance:** SUPER_ADMIN tiene alcance global sobre todos los restaurantes. ADMIN, WAITER y CASHIER están limitados a su propio restaurante mediante `restaurantId`. Este aislamiento está implementado en los servicios existentes para los módulos actuales (Restaurants, Categories, Products, Tables, Users), pero debe verificarse individualmente por servicio y operación antes de asumir que se aplica a módulos nuevos.

---

## 2. Reglas de Negocio Aprobadas (D1-D11)

| ID | Regla |
|----|-------|
| D1 | WAITER y CASHIER pueden consultar las mesas de su restaurante. SUPER_ADMIN y ADMIN también, según su alcance. |
| D2 | WAITER puede modificar la disponibilidad (`isAvailable`) de las mesas de su restaurante. ADMIN y SUPER_ADMIN también. CASHIER no puede. |
| D3 | WAITER y CASHIER pueden consultar categorías y productos de su propio restaurante. Además, el cliente (CLIENT) puede consultar categorías y productos mediante el menú público, sin autenticación. No hay filtros de disponibilidad en los productos por ahora. |
| D4 | ADMIN no puede desactivar su propio restaurante modificando `isActive`. La desactivación corresponde exclusivamente a SUPER_ADMIN. Esta regla está aprobada pero **su implementación está pendiente**. |
| D5 | El cliente no necesita autenticarse. Al escanear el QR se inicia un Service asociado a una mesa. Ese Service agrupa los pedidos que realice el cliente. |
| D6 | El cliente, el WAITER, el ADMIN y el SUPER_ADMIN pueden crear Services y Orders, mediante sus respectivos flujos (cliente vía QR público; WAITER, ADMIN y SUPER_ADMIN mediante interfaz autenticada). CASHIER no puede crear Services ni Orders por ahora. |
| D7 | Los Orders creados quedan inicialmente en estado `PENDING`. Permanecen en `PENDING` hasta que un WAITER o ADMIN del restaurante correspondiente, o un SUPER_ADMIN con alcance global, los autorice. Crear un pedido no equivale a autorizarlo. La creación siempre produce `PENDING` y la autorización es una operación independiente. |
| D8 | CASHIER no tendrá permisos definidos sobre Services ni Orders hasta diseñar el módulo de caja. |
| D9 | SUPER_ADMIN conserva alcance global y los demás roles respetan el aislamiento por restaurante. |
| D10 | No se definen permisos ni estados adicionales más allá de los listados en este documento. |
| D11 | Los permisos de consulta de Services y Orders son: SUPER_ADMIN puede consultar de cualquier restaurante; ADMIN puede consultar de su propio restaurante; WAITER puede consultar de su propio restaurante; CASHIER tiene permisos pendientes de definir (módulo de caja); CLIENT no tiene acceso a las consultas internas de Services ni Orders. |

---

## 3. Matriz Definitiva de Permisos

### Leyenda
- ✅ **Implementado**: Ya existe en el código actual para todos los roles aplicables
- ⚠️ **Parcialmente implementado**: Ya existe para algunos roles, pero requiere ajustes para otros
- 🔄 **Ajuste pendiente**: El código existe pero requiere modificación para aplicar el permiso o regla
- 🔜 **Futuro**: No existe todavía (nuevo módulo, endpoint o modelo)
- ❌ **No aplica**: El rol no tiene este permiso

### Notas sobre los estados de lectura
- **Lectura autenticada**: requiere JWT y pertenece a un rol del sistema (SUPER_ADMIN, ADMIN, WAITER, CASHIER, KITCHEN).
- **Lectura pública**: accesible sin autenticación (solo CLIENT, a través del menú público).
- No se mezclan ambos estados en una misma celda.

| Recurso | Operación | SUPER_ADMIN | ADMIN | WAITER | CASHIER | CLIENT (público) | Estado |
|---------|-----------|-------------|-------|--------|---------|------------------|--------|
| Restaurant | Crear | ✅ | ❌ | ❌ | ❌ | ❌ | Implementado |
| Restaurant | Leer todos | ✅ | ❌ | ❌ | ❌ | ❌ | Implementado |
| Restaurant | Leer uno | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Restaurant | Actualizar | ✅ | ✅ (propio)* | ❌ | ❌ | ❌ | 🔄 Ajuste pendiente (D4) |
| Restaurant | Desactivar (`isActive`) | ✅ (exclusivo) | ❌ (D4) | ❌ | ❌ | ❌ | Regla D4 aprobada, no implementado |
| Category | Crear | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Category | Leer todos (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ✅ (propio) | ❌ | ⚠️ Parcialmente implementado |
| Category | Leer todos (pública) | ❌ | ❌ | ❌ | ❌ | ✅ | 🔜 Futuro (menú público) |
| Category | Leer uno (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ✅ (propio) | ❌ | ⚠️ Parcialmente implementado |
| Category | Leer uno (pública) | ❌ | ❌ | ❌ | ❌ | ✅ | 🔜 Futuro (menú público) |
| Product | Crear | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Product | Leer todos (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ✅ (propio) | ❌ | ⚠️ Parcialmente implementado |
| Product | Leer todos (pública) | ❌ | ❌ | ❌ | ❌ | ✅ | 🔜 Futuro (menú público) |
| Product | Leer uno (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ✅ (propio) | ❌ | ⚠️ Parcialmente implementado |
| Product | Leer uno (pública) | ❌ | ❌ | ❌ | ❌ | ✅ | 🔜 Futuro (menú público) |
| Product | Actualizar | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Product | Eliminar | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Product | Asignar categorías | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Product | Quitar categoría | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Table | Crear | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| Table | Leer todos (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ✅ (propio) | ❌ | ⚠️ Parcialmente implementado |
| Table | Leer uno (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ✅ (propio) | ❌ | ⚠️ Parcialmente implementado |
| Table | Actualizar `isAvailable` | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | 🔄 Ajuste pendiente |
| Table | Desactivar (`isActive`, soft delete) | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | 🔜 Futuro (SCRUM-6) |
| User | Crear | ✅ | ✅ (propio, no SUPER_ADMIN) | ❌ | ❌ | ❌ | Implementado |
| User | Leer todos | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| User | Leer uno | ✅ | ✅ (propio) | ❌ | ❌ | ❌ | Implementado |
| User | Actualizar | ✅ | ✅ (propio, no SUPER_ADMIN) | ❌ | ❌ | ❌ | Implementado |
| Auth | Login | ✅ | ✅ | ✅ | ✅ | ❌ | Implementado |
| Auth | Me | ✅ | ✅ | ✅ | ✅ | ❌ | Implementado |
| Menú público | Leer categorías y productos | ❌ | ❌ | ❌ | ❌ | ✅ | 🔜 Futuro |
| Service | Crear (asociado a mesa) | ✅ | ✅ (propio) | ✅ (propio) | ❌ | ✅ (público, vía QR) | 🔜 Futuro |
| Service | Leer (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ❌ (D11) | ❌ | 🔜 Futuro |
| Service | Leer (pública) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ No aplica |
| Order | Crear (desde Service, `PENDING`) | ✅ | ✅ (propio) | ✅ (propio) | ❌ | ✅ (público, vía QR) | 🔜 Futuro |
| Order | Leer (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ❌ (D11) | ❌ | 🔜 Futuro |
| Order | Leer (pública) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ No aplica |
| Order | Autorizar (`PENDING` → `AUTHORIZED`) | ✅ | ✅ (propio) | ✅ (propio) | ❌ | ❌ | 🔜 Futuro |
| KitchenOrder | Crear (al autorizar un Order) | ❌ | ❌ | ❌ | ❌ | ❌ | 🔜 Futuro (SCRUM-23) |
| KitchenOrder | Leer (autenticada) | ✅ | ✅ (propio) | ✅ (propio) | ❌ | ❌ | 🔜 Futuro (SCRUM-23) |
| KitchenOrder | Actualizar estado | ✅ (lectura global) | ❌ | ❌ | ❌ | ❌ | 🔜 Futuro (SCRUM-23) |

*\* Nota sobre `Restaurant > Actualizar`: el endpoint existe y está protegido por `@Roles(SUPER_ADMIN, ADMIN)`, pero la restricción D4 (ADMIN no puede modificar `isActive` de su propio restaurante) **no está implementada** en `RestaurantsService.update`. El DTO `UpdateRestaurantDto` permite enviar el campo `isActive`, pero el DTO por sí solo no garantiza protección. Esta regla está aprobada pero su implementación está pendiente.*

**Nota sobre D11:** CASHIER tiene permisos de lectura pendientes de definir sobre Services y Orders (regla D11). CLIENT no tiene acceso a las consultas internas de Services ni Orders.

**Nota sobre "Parcialmente implementado":** Las operaciones marcadas como ⚠️ Parcialmente implementado ya existen en el código para SUPER_ADMIN y ADMIN, pero requieren ajustes para incluir a WAITER y CASHIER (según D1, D3). Específicamente:
- Category > Leer todos/uno (autenticada): implementado para SUPER_ADMIN y ADMIN; pendiente para WAITER y CASHIER.
- Product > Leer todos/uno (autenticada): implementado para SUPER_ADMIN y ADMIN; pendiente para WAITER y CASHIER.
- Table > Leer todos/uno (autenticada): implementado para SUPER_ADMIN y ADMIN; pendiente para WAITER y CASHIER.

**Nota sobre `Table > Actualizar isAvailable`:** SUPER_ADMIN y ADMIN ya tienen acceso (implementado en el código actual). WAITER **no tiene acceso** porque no está incluido en el `@Roles` de `TablesController`. CASHIER permanece excluido por decisión D2. Este permiso requiere ajuste para agregar a WAITER.

---

## 4. Separación por Estado de Implementación

### 4.1 Permisos ya implementados (código actual)

| Recurso | Operación | Roles | Evidencia en código |
|---------|-----------|-------|---------------------|
| Restaurant | Crear | SUPER_ADMIN | `src/restaurants/restaurants.controller.ts` + `@Roles` |
| Restaurant | Leer todos | SUPER_ADMIN | `src/restaurants/restaurants.controller.ts` + `@Roles` |
| Restaurant | Leer uno | SUPER_ADMIN, ADMIN | `src/restaurants/restaurants.controller.ts` + `@Roles` |
| Category | Crear, Actualizar, Eliminar | SUPER_ADMIN, ADMIN | `src/categories/categories.controller.ts` + `@Roles` |
| Category | Leer todos / Leer uno | SUPER_ADMIN, ADMIN (implementado); WAITER, CASHIER (pendiente) | `src/categories/categories.controller.ts` + `@Roles` |
| Product | Crear, Actualizar, Eliminar, Asignar/Quitar categorías | SUPER_ADMIN, ADMIN | `src/products/products.controller.ts` + `@Roles` |
| Product | Leer todos / Leer uno | SUPER_ADMIN, ADMIN (implementado); WAITER, CASHIER (pendiente) | `src/products/products.controller.ts` + `@Roles` |
| Table | Crear, Actualizar, Eliminar (físico) | SUPER_ADMIN, ADMIN | `src/tables/tables.controller.ts` + `@Roles` |
| Table | Leer todos / Leer uno | SUPER_ADMIN, ADMIN (implementado); WAITER, CASHIER (pendiente) | `src/tables/tables.controller.ts` + `@Roles` |
| Table | Actualizar `isAvailable` | SUPER_ADMIN, ADMIN (implementado); WAITER (pendiente); CASHIER (excluido, D2) | `src/tables/tables.controller.ts` + `@Roles` |
| User | Crear, Leer, Actualizar | SUPER_ADMIN, ADMIN | `src/users/users.controller.ts` + `@Roles` |
| Auth | Login, Me | Todos autenticados; Login público | `src/auth/auth.controller.ts` (`JwtAuthGuard` en `/me`, `/login` sin guard) |

**Nota importante:** El aislamiento por restaurante (`findAll`, `findOne`, `update` filtran por `restaurantId`) está implementado en los servicios individuales existentes (`RestaurantsService`, `CategoriesService`, `ProductsService`, `TablesService`, `UsersService`). Esto debe verificarse individualmente por servicio y operación; no se asume como propiedad general del sistema para módulos nuevos. `Restaurant > Actualizar` no se incluye como completamente implementado porque la restricción D4 (bloquear `isActive` para ADMIN) no está aplicada en el servicio.

### 4.2 Ajustes pendientes (código existe, requiere modificación)

| Recurso | Operación | Roles afectados | Qué cambiar |
|---------|-----------|-----------------|-------------|
| Table | Leer todos / Leer uno (autenticada) | WAITER, CASHIER (D1) | Agregar `WAITER` y `CASHIER` a `@Roles` en `TablesController` |
| Table | Actualizar `isAvailable` | WAITER (agregar), CASHIER (mantener excluido) (D2) | Ajustar `@Roles` en `TablesController`: agregar `WAITER`, no agregar `CASHIER` |
| Category | Leer todos / Leer uno (autenticada) | WAITER, CASHIER (D3) | Agregar `WAITER` y `CASHIER` a `@Roles` en `CategoriesController` |
| Product | Leer todos / Leer uno (autenticada) | WAITER, CASHIER (D3) | Agregar `WAITER` y `CASHIER` a `@Roles` en `ProductsController` |
| Restaurant | Actualizar (bloquear `isActive` para ADMIN) | ADMIN (D4) | Lógica en `RestaurantsService.update`: rechazar cambio de `isActive` cuando `user.role === ADMIN` |

### 4.3 Funcionalidades futuras (no existen todavía)

| Módulo | Qué se debe crear |
|--------|-------------------|
| Service | Modelo Prisma `Service`, servicio, controlador con endpoints de creación (público vía QR y autenticado para WAITER, ADMIN, SUPER_ADMIN) y lectura autenticada |
| Order y OrderItem | Modelos Prisma `Order` y `OrderItem`, servicio, controlador con endpoints de creación (`PENDING`), lectura autenticada y autorización (`PENDING` → `AUTHORIZED`) |
| Menú público | Endpoint público `GET /menu/restaurant/:restaurantId/table/:tableId` sin autenticación (D3, D5) |

**Nota:** La desactivación lógica de mesas (soft delete con `isActive`) corresponde al alcance de **SCRUM-6**, no a SCRUM-7. No se incluye aquí como funcionalidad futura de esta tarea.

---

## 5. Flujos Aprobados

### FLUJO DEL CLIENTE (público, sin autenticación)

1. Escanea el código QR de una mesa.
2. El backend identifica el restaurante y la mesa desde el QR.
3. Se crea un Service o se reutiliza el Service activo de esa mesa.
4. El cliente consulta el menú público (categorías y productos del restaurante).
5. Crea pedidos asociados al Service.
6. Los pedidos quedan en estado `PENDING`.

### FLUJO DEL WAITER (autenticado)

1. Inicia sesión y obtiene JWT.
2. Consulta las mesas de su restaurante (filtrado por `restaurantId`).
3. Selecciona una mesa.
4. Se crea un Service o se reutiliza el Service activo de esa mesa.
5. Consulta el menú del restaurante.
6. Crea pedidos asociados al mismo Service.
7. Los pedidos quedan en estado `PENDING`.

### FLUJO DEL ADMIN (autenticado)

1. Inicia sesión y obtiene JWT.
2. Selecciona una mesa de su restaurante.
3. Se crea un Service o se reutiliza el Service activo de esa mesa.
4. Consulta el menú del restaurante.
5. Crea pedidos asociados al mismo Service.
6. Los pedidos quedan en estado `PENDING`.

### FLUJO DEL SUPER_ADMIN (autenticado)

1. Inicia sesión y obtiene JWT.
2. Selecciona un restaurante y una mesa de ese restaurante.
3. Se crea un Service o se reutiliza el Service activo de esa mesa.
4. Consulta el menú del restaurante.
5. Crea pedidos asociados al mismo Service.
6. Los pedidos quedan en estado `PENDING`.

### Reglas comunes a todos los flujos

- Todos los flujos utilizan la misma estructura de `Service`, `Order` y `OrderItem`.
- No se generan servicios duplicados para una misma atención de mesa (criterio de cierre de Service pendiente de diseño futuro).
- Crear un pedido **no** significa autorizarlo. La creación siempre produce `PENDING`.
- La autorización es una operación independiente de la creación.
- Todos los pedidos quedan `PENDING` independientemente de quién los cree (cliente, WAITER, ADMIN o SUPER_ADMIN).
- Los pedidos quedan `PENDING` hasta que un WAITER o ADMIN del restaurante correspondiente, o un SUPER_ADMIN con alcance global, los autorice (regla D7).
- `SUPER_ADMIN` conserva alcance global sobre cualquier restaurante.
- `CASHIER` no puede crear Services ni Orders (regla D8).
- `CLIENT` no tiene acceso a las consultas internas de Services ni Orders (regla D11).

---

## 6. Criterios de Aceptación para Cerrar SCRUM-7

### Criterios de documentación (esta tarea)

- [x] La matriz refleja D1-D11 sin contradicciones
- [x] CASHIER no puede crear Services ni Orders; sus permisos de consulta quedan pendientes de definición (D8, D11)
- [x] Los estados de Order son únicamente `PENDING` y `AUTHORIZED` (D7)
- [x] Crear un Order siempre produce `PENDING`; la autorización es independiente (D7)
- [x] WAITER puede crear Service y Order (flujo autenticado) (D6)
- [x] ADMIN puede crear Service y Order (flujo autenticado, propio restaurante) (D6)
- [x] SUPER_ADMIN puede crear Service y Order (flujo autenticado, alcance global) (D6)
- [x] Cliente puede crear Service y Order (flujo público vía QR) (D6)
- [x] CLIENT no tiene acceso a consultas internas de Services ni Orders (D11)
- [x] ADMIN no puede desactivar su propio restaurante (regla D4 documentada como pendiente de implementación)
- [x] Se distingue claramente entre permisos implementados, ajustes pendientes y funcionalidades futuras
- [x] El CLIENT está documentado como actor público sin autenticación, independiente de los roles del sistema
- [x] Bloquear la modificación de `isActive` por ADMIN está registrado como regla aprobada con implementación pendiente (D4)
- [x] La desactivación lógica de mesas corresponde a SCRUM-6, no a SCRUM-7
- [x] El cierre de Service y los permisos de CASHIER sobre Orders quedan fuera del alcance de SCRUM-7
- [x] La lectura autenticada y la lectura pública están separadas en la matriz sin estados ambiguos

### Criterios de implementación pendiente (para fases siguientes, no parte del cierre de SCRUM-7)

- [ ] `TablesController` actualizado con `@Roles` para WAITER y CASHIER en lectura (D1)
- [ ] `TablesController` actualizado con `@Roles` para WAITER (no CASHIER) en actualización de `isAvailable` (D2)
- [ ] `CategoriesController` y `ProductsController` actualizados con `@Roles` para WAITER y CASHIER en lectura (D3)
- [ ] `RestaurantsService.update` bloquea modificación de `isActive` por ADMIN (D4)
- [ ] Módulo Service creado (modelo, servicio, controlador con lectura autenticada según D11)
- [ ] Módulo Order y OrderItem creados (modelos, servicio, controlador con lectura autenticada según D11)
- [ ] Endpoint público del menú creado
- [ ] Pruebas unitarias y E2E creadas para nuevos flujos

---

## 7. Notas de Implementación

- Los ajustes pendientes en la sección 4.2 requieren cambios solo en el decorador `@Roles` de los controladores correspondientes y en la lógica de `RestaurantsService.update`. No requieren nuevos modelos ni migraciones.
- Las funcionalidades futuras en la sección 4.3 requieren nuevos modelos Prisma, migraciones, servicios y controladores. Estas corresponden a tareas de fases posteriores.
- El cierre de Service (criterio para determinar cuándo un Service deja de estar "activo" y puede ser reutilizado) queda pendiente de diseño futuro del módulo Service y no bloquea el cierre de SCRUM-7.
- Los permisos de CASHIER sobre Orders quedan pendientes de diseño del módulo de caja y no bloquean el cierre de SCRUM-7 (D8, D11).
- La desactivación lógica de mesas (soft delete con `isActive`) corresponde al alcance de **SCRUM-6**.
- La lectura de Services y Orders para CASHIER queda pendiente de definir (D11) y no se asume ningún permiso por defecto.
- El rol `KITCHEN` solo tiene acceso al módulo Kitchen (`/kitchen/orders`), limitado a su propio restaurante mediante `restaurantId`. `SUPER_ADMIN` conserva alcance global de lectura. `WAITER`, `ADMIN` y `CASHIER` no tienen acceso al módulo Kitchen.

---

*Documento generado como parte del cierre de la tarea SCRUM-7. Proyecto: ConectaResto — Backend v1. Repositorio: ConectaResto/conecta-resto-v1-backend. Proyecto Jira: SCRUM (ConectaResto).*
# Setup logF-core_service

## Arranque local (primera vez)

```bash
# 1. Levantar base de datos (desde la raíz del monorepo)
cd ..
docker compose up -d

# 2. Instalar dependencias
npm install

# 3. Crear la primera migración y aplicarla
npx prisma migrate dev --name init

# 4. Correr el seed (usuarios, categorías, ingredientes, productos)
npx ts-node prisma/seed.ts

# 5. Iniciar en modo dev
npm run start:dev
```

## Credenciales del seed

| Usuario   | Contraseña   | Rol       |
|-----------|-------------|-----------|
| admin     | admin1234   | admin     |
| cajero1   | cajero1234  | cashier   |

## Variables de entorno (.env)

Ver `.env` — en producción cambiar `JWT_SECRET` por un valor aleatorio largo.

## Endpoints principales

- `POST /api/auth/login` → obtener JWT
- `GET  /api/docs` → Swagger UI

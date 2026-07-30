-- CreateTable
CREATE TABLE "Tenant" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "taxId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Montevideo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- Fila única por base: Prisma no expresa "singleton" en el schema, así que el
-- constraint se agrega a mano (ver docs/adr/0001-multi-tenancy-base-por-cliente.md
-- y docs/specs/0001-multi-tenant-vps-compartido.md § 1.1).
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_singleton" CHECK (id = 1);

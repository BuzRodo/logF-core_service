-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('LOCAL', 'DELIVERY', 'TELEFONICO', 'WEB', 'PEDIDOS_YA');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "channel" "SaleChannel" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "channelRef" TEXT;

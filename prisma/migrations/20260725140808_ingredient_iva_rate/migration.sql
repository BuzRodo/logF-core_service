-- CreateEnum
CREATE TYPE "IvaRate" AS ENUM ('EXENTO', 'IVA_10', 'IVA_22');

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "ivaRate" "IvaRate";

-- AlterTable
ALTER TABLE "StockEntry" ADD COLUMN     "ivaRate" "IvaRate";

/*
  Warnings:

  - You are about to drop the column `produto_id` on the `itens_venda` table. All the data in the column will be lost.
  - You are about to drop the column `venda_id` on the `itens_venda` table. All the data in the column will be lost.
  - You are about to drop the column `cliente_id` on the `vendas` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vendaId,produtoId]` on the table `itens_venda` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `produtoId` to the `itens_venda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vendaId` to the `itens_venda` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clienteId` to the `vendas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_venda_id_fkey";

-- DropForeignKey
ALTER TABLE "vendas" DROP CONSTRAINT "vendas_cliente_id_fkey";

-- DropIndex
DROP INDEX "itens_venda_venda_id_produto_id_key";

-- AlterTable
ALTER TABLE "itens_venda" DROP COLUMN "produto_id",
DROP COLUMN "venda_id",
ADD COLUMN     "produtoId" INTEGER NOT NULL,
ADD COLUMN     "vendaId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "vendas" DROP COLUMN "cliente_id",
ADD COLUMN     "clienteId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "itens_venda_vendaId_produtoId_key" ON "itens_venda"("vendaId", "produtoId");

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

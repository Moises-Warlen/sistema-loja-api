-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "senha" TEXT NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "referencia" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "precoCompra" DOUBLE PRECISION NOT NULL,
    "lucro" DOUBLE PRECISION NOT NULL,
    "precoVenda" DOUBLE PRECISION NOT NULL,
    "estoque" INTEGER NOT NULL,
    "estoqueMinimo" INTEGER NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "pagamento" TEXT NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

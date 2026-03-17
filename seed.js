const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.usuario.findUnique({ where: { usuario: "laudinea" } });

  if (!existing) {
    const senhaHash = await bcrypt.hash("lau123", 10);

    await prisma.usuario.create({
      data: {
        usuario: "laudinea",
        senha: senhaHash
      }
    });

    console.log("Usuário criado com sucesso!");
  } else {
    console.log("Usuário já existe!");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
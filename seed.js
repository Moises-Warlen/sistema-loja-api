const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash("lau123", 10);

  await prisma.usuario.create({
    data: {
      usuario: "laudinea",
      senha: senhaHash
    }
  });

  console.log("Usuário criado!");
}

main();
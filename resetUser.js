const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const usuarioAlvo = "laudinea"; // usuário que queremos garantir
  const novaSenha = "lau123"; // senha que queremos definir

  // Verifica se o usuário existe
  let user = await prisma.usuario.findUnique({
    where: { usuario: usuarioAlvo }
  });

  if (!user) {
    // Cria o usuário se não existir
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    user = await prisma.usuario.create({
      data: {
        usuario: usuarioAlvo,
        senha: senhaHash
      }
    });
    console.log(`Usuário "${usuarioAlvo}" criado com sucesso!`);
  } else {
    // Atualiza a senha caso o usuário já exista
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({
      where: { usuario: usuarioAlvo },
      data: { senha: senhaHash }
    });
    console.log(`Senha do usuário "${usuarioAlvo}" resetada com sucesso!`);
  }

  console.log("✅ Tudo pronto, agora você pode logar com o front!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
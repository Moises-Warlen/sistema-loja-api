require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "1q2w3e4r";

/* ================= MIDDLEWARE ================= */

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ error: "Sem token" });

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/* ================= LOGIN ================= */

app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  try {
    const user = await prisma.usuario.findUnique({
      where: { usuario }
    });

    if (!user)
      return res.status(401).json({ error: "Usuário inválido" });

    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida)
      return res.status(401).json({ error: "Senha inválida" });

    const token = jwt.sign({ id: user.id }, SECRET, {
      expiresIn: "1d"
    });

    res.json({ token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= PRODUTOS ================= */

app.post("/produtos", autenticar, async (req, res) => {
  try {
    const produto = await prisma.produto.create({
      data: {
        ...req.body,
        criadoEm: new Date()
      }
    });

    res.json(produto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/produtos", autenticar, async (req, res) => {
  const produtos = await prisma.produto.findMany({
    orderBy: { criadoEm: "desc" }
  });

  res.json(produtos);
});

app.put("/produtos/:id", autenticar, async (req, res) => {
  const produto = await prisma.produto.update({
    where: { id: Number(req.params.id) },
    data: req.body
  });

  res.json(produto);
});

app.delete("/produtos/:id", autenticar, async (req, res) => {
  await prisma.produto.delete({
    where: { id: Number(req.params.id) }
  });

  res.json({ message: "Produto excluído" });
});

/* ================= CLIENTES ================= */

app.post("/clientes", autenticar, async (req, res) => {
  const cliente = await prisma.cliente.create({
    data: req.body
  });

  res.json(cliente);
});

app.get("/clientes", autenticar, async (req, res) => {
  const clientes = await prisma.cliente.findMany();
  res.json(clientes);
});

app.put("/clientes/:id", autenticar, async (req, res) => {
  const cliente = await prisma.cliente.update({
    where: { id: Number(req.params.id) },
    data: req.body
  });

  res.json(cliente);
});

app.delete("/clientes/:id", autenticar, async (req, res) => {
  await prisma.cliente.delete({
    where: { id: Number(req.params.id) }
  });

  res.json({ message: "Cliente excluído" });
});

/* ================= VENDAS ================= */

app.post("/vendas", autenticar, async (req, res) => {
  const { produtoId, clienteId, quantidade, pagamento } = req.body;

  try {
    const produto = await prisma.produto.findUnique({
      where: { id: Number(produtoId) }
    });

    if (!produto)
      return res.status(404).json({ error: "Produto não encontrado" });

    if (produto.estoque < quantidade)
      return res.status(400).json({ error: "Estoque insuficiente" });

    const total = produto.precoVenda * quantidade;

    // baixa estoque
    await prisma.produto.update({
      where: { id: Number(produtoId) },
      data: { estoque: produto.estoque - quantidade }
    });

    // cria venda
    const venda = await prisma.venda.create({
      data: {
        produtoId: Number(produtoId),
        clienteId: Number(clienteId),
        quantidade,
        total,
        pagamento,
        data: new Date()
      }
    });

    res.json(venda);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= RELATÓRIO ================= */

app.get("/relatorio", autenticar, async (req, res) => {
  const { inicio, fim } = req.query;

  try {
    const vendas = await prisma.venda.findMany({
      where: {
        data: {
          gte: new Date(inicio),
          lte: new Date(fim)
        }
      },
      include: {
        produto: true,
        cliente: true
      }
    });

    const totalPeriodo = vendas.reduce(
      (acc, v) => acc + v.total,
      0
    );

    // ranking com nome do produto
    const rankingRaw = await prisma.venda.groupBy({
      by: ["produtoId"],
      _sum: { quantidade: true },
      orderBy: {
        _sum: { quantidade: "desc" }
      }
    });

    const ranking = await Promise.all(
      rankingRaw.map(async (r) => {
        const produto = await prisma.produto.findUnique({
          where: { id: r.produtoId }
        });

        return {
          produto: produto.nome,
          quantidade: r._sum.quantidade
        };
      })
    );

    res.json({
      vendas,
      totalPeriodo,
      ranking
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
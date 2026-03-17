require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();
const SECRET = process.env.JWT_SECRET || "1q2w3e4r";

app.use(cors({ origin: "*" }));
app.use(express.json());

/* ===== HEALTH CHECK ===== */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API Mariá Skincare funcionando!',
    timestamp: new Date().toISOString()
  });
});

/* ===== MIDDLEWARE AUTH ===== */
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Sem token" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

/* ===== LOGIN ===== */
app.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;
  if (!usuario || !senha) return res.status(400).json({ error: "Preencha usuário e senha" });

  try {
    const user = await prisma.usuario.findUnique({ where: { usuario } });
    if (!user) return res.status(401).json({ error: "Usuário inválido" });

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) return res.status(401).json({ error: "Senha inválida" });

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1d" });
    res.json({ token, usuario: user.usuario });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

/* ===== CRUD CLIENTES ===== */
app.post("/clientes", autenticar, async (req, res) => {
  const { nome, telefone } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: "Preencha nome e telefone" });

  try {
    const cliente = await prisma.cliente.create({ data: { nome, telefone, createdAt: new Date() } });
    res.json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/clientes", autenticar, async (req, res) => {
  const clientes = await prisma.cliente.findMany({ orderBy: { createdAt: "desc" } });
  res.json(clientes);
});

/* ===== CRUD PRODUTOS ===== */
app.post("/produtos", autenticar, async (req, res) => {
  const { referencia, nome, precoCompra, precoVenda, estoque } = req.body;
  if (!referencia || !nome) return res.status(400).json({ error: "Preencha referência e nome" });

  try {
    const existe = await prisma.produto.findUnique({ where: { referencia } });
    if (existe) return res.status(400).json({ error: "Referência já existe" });

    const produto = await prisma.produto.create({
      data: { referencia, nome, precoCompra, precoVenda, estoque: estoque || 0, createdAt: new Date() }
    });
    res.json(produto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/produtos", autenticar, async (req, res) => {
  const produtos = await prisma.produto.findMany({ orderBy: { createdAt: "desc" } });
  res.json(produtos);
});

/* ===== SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
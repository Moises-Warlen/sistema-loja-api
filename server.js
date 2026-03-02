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

/* ================= HEALTH CHECK ================= */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API Mariá Skincare está funcionando!'
  });
});

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

    res.json({ token, usuario: user.usuario });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= PRODUTOS ================= */
app.post("/produtos", autenticar, async (req, res) => {
  try {
    // Verifica se referência já existe
    const existente = await prisma.produto.findUnique({
      where: { referencia: req.body.referencia }
    });

    if (existente) {
      return res.status(400).json({ error: "Referência já existe" });
    }

    const produto = await prisma.produto.create({
      data: {
        referencia: req.body.referencia,
        nome: req.body.nome,
        precoCompra: req.body.precoCompra,
        precoVenda: req.body.precoVenda,
        estoque: req.body.estoque || 0,
        createdAt: new Date()
      }
    });

    res.json(produto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/produtos", autenticar, async (req, res) => {
  const produtos = await prisma.produto.findMany({
    orderBy: { createdAt: "desc" }
  });
  res.json(produtos);
});

app.put("/produtos/:id", autenticar, async (req, res) => {
  try {
    const produto = await prisma.produto.update({
      where: { id: Number(req.params.id) },
      data: {
        referencia: req.body.referencia,
        nome: req.body.nome,
        precoCompra: req.body.precoCompra,
        precoVenda: req.body.precoVenda,
        estoque: req.body.estoque
      }
    });
    res.json(produto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/produtos/:id", autenticar, async (req, res) => {
  try {
    // Verifica se tem vendas associadas
    const vendas = await prisma.itemVenda.findMany({
      where: { produtoId: Number(req.params.id) }
    });

    if (vendas.length > 0) {
      return res.status(400).json({ error: "Produto possui vendas associadas" });
    }

    await prisma.produto.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Produto excluído" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= CLIENTES ================= */
app.post("/clientes", autenticar, async (req, res) => {
  try {
    const cliente = await prisma.cliente.create({
      data: {
        nome: req.body.nome,
        telefone: req.body.telefone,
        createdAt: new Date()
      }
    });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/clientes", autenticar, async (req, res) => {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: "desc" }
  });
  res.json(clientes);
});

app.put("/clientes/:id", autenticar, async (req, res) => {
  try {
    const cliente = await prisma.cliente.update({
      where: { id: Number(req.params.id) },
      data: {
        nome: req.body.nome,
        telefone: req.body.telefone
      }
    });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/clientes/:id", autenticar, async (req, res) => {
  try {
    // Verifica se tem vendas associadas
    const vendas = await prisma.venda.findMany({
      where: { clienteId: Number(req.params.id) }
    });

    if (vendas.length > 0) {
      return res.status(400).json({ error: "Cliente possui vendas associadas" });
    }

    await prisma.cliente.delete({
      where: { id: Number(req.params.id) }
    });

    res.json({ message: "Cliente excluído" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= VENDAS ================= */
app.post("/vendas", autenticar, async (req, res) => {
  const { clienteId, produtos, formaPagamento, dataVenda } = req.body;

  // Inicia transação
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Validar estoque de todos os produtos
      for (const item of produtos) {
        const produto = await prisma.produto.findUnique({
          where: { id: Number(item.produtoId) }
        });

        if (!produto) {
          throw new Error(`Produto ID ${item.produtoId} não encontrado`);
        }

        if (produto.estoque < item.quantidade) {
          throw new Error(`Estoque insuficiente para ${produto.nome}`);
        }
      }

      // 2. Calcular total
      let total = 0;
      for (const item of produtos) {
        const produto = await prisma.produto.findUnique({
          where: { id: Number(item.produtoId) }
        });
        total += produto.precoVenda * item.quantidade;
      }

      // 3. Criar venda
      const venda = await prisma.venda.create({
        data: {
          clienteId: Number(clienteId),
          total,
          formaPagamento,
          dataVenda: dataVenda ? new Date(dataVenda) : new Date(),
          createdAt: new Date()
        }
      });

      // 4. Criar itens e baixar estoque
      for (const item of produtos) {
        const produto = await prisma.produto.findUnique({
          where: { id: Number(item.produtoId) }
        });

        await prisma.itemVenda.create({
          data: {
            vendaId: venda.id,
            produtoId: Number(item.produtoId),
            quantidade: item.quantidade,
            subtotal: produto.precoVenda * item.quantidade
          }
        });

        await prisma.produto.update({
          where: { id: Number(item.produtoId) },
          data: {
            estoque: produto.estoque - item.quantidade
          }
        });
      }

      return venda;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/vendas", autenticar, async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      include: {
        cliente: true,
        itens: {
          include: {
            produto: true
          }
        }
      },
      orderBy: { dataVenda: "desc" }
    });
    res.json(vendas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= RELATÓRIOS ================= */
app.get("/relatorio/vendas", autenticar, async (req, res) => {
  const { inicio, fim } = req.query;

  try {
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: new Date(inicio),
          lte: new Date(fim)
        }
      },
      include: {
        cliente: true,
        itens: {
          include: {
            produto: true
          }
        }
      },
      orderBy: { dataVenda: "desc" }
    });

    // Totais
    const totalPeriodo = vendas.reduce((acc, v) => acc + v.total, 0);
    const totalItens = vendas.reduce((acc, v) => 
      acc + v.itens.reduce((sum, i) => sum + i.quantidade, 0), 0
    );
    const ticketMedio = vendas.length > 0 ? totalPeriodo / vendas.length : 0;

    // Ranking de produtos
    const produtosMap = new Map();
    vendas.forEach(v => {
      v.itens.forEach(i => {
        const key = i.produtoId;
        if (!produtosMap.has(key)) {
          produtosMap.set(key, {
            produtoId: i.produtoId,
            nome: i.produto.nome,
            quantidade: 0,
            total: 0
          });
        }
        const item = produtosMap.get(key);
        item.quantidade += i.quantidade;
        item.total += i.subtotal;
      });
    });

    const ranking = Array.from(produtosMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    // Formas de pagamento
    const pagamentos = {};
    vendas.forEach(v => {
      pagamentos[v.formaPagamento] = (pagamentos[v.formaPagamento] || 0) + 1;
    });

    res.json({
      vendas,
      resumo: {
        totalPeriodo,
        quantidadeVendas: vendas.length,
        totalItens,
        ticketMedio,
        pagamentos
      },
      ranking
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
  console.log("📊 Health check: http://localhost:" + PORT + "/health");
});
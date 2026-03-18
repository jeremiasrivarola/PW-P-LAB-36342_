const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const { PrismaClient } = require("@prisma/client");
const { withAccelerate } = require("@prisma/extension-accelerate");

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const PORT = process.env.PORT || process.env.SERVER_PORT || 4242;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido" });
    }
    req.user = user;
    next();
  });
};

// GET - Listar tarefas
app.get("/tasks", authenticateToken, asyncHandler(async (req, res) => {
  const { completed } = req.query;

  const where = {};
  if (completed !== undefined) {
    where.completed = completed === "true";
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({ data: tasks });
}));

// GET - Buscar tarefa por ID
app.get("/tasks/:id", authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;

  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) return res.status(404).json({ message: "Tarefa não encontrada" });

  res.status(200).json({ data: task });
}));

// POST - Criar tarefa
app.post("/tasks", authenticateToken, asyncHandler(async (req, res) => {
  const { title, description, completed, priority } = req.body;

  if (!title) {
    return res.status(400).json({ message: "O campo 'title' é obrigatório" });
  }

  if (!priority || !["low", "medium", "high"].includes(priority)) {
    return res.status(400).json({
      message: "O campo 'priority' é obrigatório e deve ser 'low', 'medium' ou 'high'"
    });
  }

  const newTask = await prisma.task.create({
    data: {
      title,
      description,
      completed: completed === true || completed === "true",
      priority
    }
  });

  res.status(201).json({ data: newTask });
}));

// PUT - Atualizar tarefa
app.put("/tasks/:id", authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { title, description, completed, priority } = req.body;

  if (!title) {
    return res.status(400).json({ message: "O campo 'title' é obrigatório" });
  }

  if (!priority || !["low", "medium", "high"].includes(priority)) {
    return res.status(400).json({
      message: "O campo 'priority' é obrigatório e deve ser 'low', 'medium' ou 'high'"
    });
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        completed: completed === true || completed === "true",
        priority
      }
    });
    res.status(200).json({ data: updatedTask });
  } catch (err) {
    return res.status(404).json({ message: "Tarefa não encontrada" });
  }
}));

// PATCH - Toggle
app.patch("/tasks/:id/toggle", authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ message: "Tarefa não encontrada" });

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { completed: !task.completed }
  });

  res.status(200).json({ data: updatedTask });
}));

// DELETE
app.delete("/tasks/:id", authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;

  try {
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ message: "Tarefa não encontrada" });
  }
}));

//Signup (Registo)
app.post("/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Campos 'name', 'email' e 'password' são obrigatórios" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ message: "Email já registado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: { name, email, password: hashedPassword },
    });

    res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
    });
});

//Signin (Login)
app.post("/auth/signin", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Campos 'email' e 'password' são obrigatórios" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.status(200).json({ token });
});


// 404
app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});


// Middleware global de erro

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Erro interno do servidor" });
});


app.listen(PORT, () => {
  console.log(`✅ Servidor a correr na porta ${PORT}`);
});

module.exports = app;
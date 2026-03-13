const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

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


// GET - Listar todas as tarefas (opcional filtro por completed)
app.get("/tasks", asyncHandler(async (req, res) => {
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
app.get("/tasks/:id", asyncHandler(async (req, res) => {
  const id = req.params.id;

  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) return res.status(404).json({ message: "Tarefa não encontrada" });

  res.status(200).json({ data: task });
}));


// POST - Criar tarefa
app.post("/tasks", asyncHandler(async (req, res) => {
  const { title, description, completed, priority } = req.body;

  // validação obrigatória
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
app.put("/tasks/:id", asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { title, description, completed, priority } = req.body;

  // validação
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


// PATCH - Alternar completed
app.patch("/tasks/:id/toggle", asyncHandler(async (req, res) => {
  const id = req.params.id;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return res.status(404).json({ message: "Tarefa não encontrada" });

  const updatedTask = await prisma.task.update({
    where: { id },
    data: { completed: !task.completed }
  });

  res.status(200).json({ data: updatedTask });
}));


// DELETE - Eliminar tarefa
app.delete("/tasks/:id", asyncHandler(async (req, res) => {
  const id = req.params.id;

  try {
    await prisma.task.delete({ where: { id } });
    res.status(204).send(); // 204 = No Content
  } catch (err) {
    res.status(404).json({ message: "Tarefa não encontrada" });
  }
}));


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
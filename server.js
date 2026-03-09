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

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// GET - Listar todas as tarefas
app.get("/tasks", asyncHandler(async (req, res) => {
  const allTasks = await prisma.task.findMany();
  res.status(200).json({ data: allTasks });
}));


// GET - Buscar tarefa por ID
app.get("/tasks/:id", asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const task = await prisma.task.findUnique({
    where: { id }
  });

  if (!task) {
    return res.status(404).json({ message: "Tarefa não encontrada" });
  }

  res.status(200).json({ data: task });
}));


// POST - Criar tarefa
app.post("/tasks", asyncHandler(async (req, res) => {
  const { title, completed, priority } = req.body;

  if (!title || priority === undefined) {
    return res.status(400).json({
      message: "Campos 'title' e 'priority' são obrigatórios"
    });
  }

  const newTask = await prisma.task.create({
    data: {
      title,
      completed: completed === true || completed === "true",
      priority
    }
  });

  res.status(201).json({ data: newTask });
}));


// PUT - Atualizar tarefa
app.put("/tasks/:id", asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, completed, priority } = req.body;

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title,
      completed: completed === true || completed === "true",
      priority
    }
  });

  res.status(200).json({ data: updatedTask });
}));


// DELETE - Eliminar tarefa
app.delete("/tasks/:id", asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  await prisma.task.delete({
    where: { id }
  });

  res.status(200).json({ message: "Tarefa eliminada com sucesso" });
}));


// GET - Filtrar por prioridade
app.get("/tasks/priority/:priority", asyncHandler(async (req, res) => {
  const priorityTipo = req.params.priority;

  const filtrarTasks = await prisma.task.findMany({
    where: { priority: priorityTipo }
  });

  if (filtrarTasks.length === 0) {
    return res.status(404).json({ message: "Nenhuma tarefa encontrada." });
  }

  res.status(200).json({ data: filtrarTasks });
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
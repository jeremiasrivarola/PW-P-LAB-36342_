let movies = [
  { id: 1, title: "Inception", year: 2010 },
  { id: 2, title: "Interstellar", year: 2014 }
];
let tasks = [
  { id: 1, title: "Estudar Node.js", completed: false, priority: "high" },
  { id: 2, title: "Fazer LAB-1", completed: true, priority: "medium" }
];

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const PORT = process.env.SERVER_PORT || 3000;


//--------------------------------------------------------------------------------//
//--------------------------------------------------------------------------------//
//GET movies
app.get("/movies", (req, res) => {
  res.status(200).json({ data: movies });
});

//GET movies por id
app.get("/movies/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const movie = movies.find((u) => u.id === id);

  if (!movie) {
    return res.status(404).json({ message: "Filme não encontrado" });
  }

  res.status(200).json({ data: movie });
});

//POST movies
app.post("/movies", (req, res) => {
  const { title, year } = req.body;

  // Validação
  if (!title || !year) {
    return res.status(400).json({
      message: "Campos 'title' e 'year' são obrigatórios"
    });
  }

  const newMovie = {
    id: movies.length > 0 ? movies[movies.length - 1].id + 1 : 1,
    title,
    year
  };

  movies.push(newMovie);

  res.status(201).json({ data: newMovie });
});

// PUT /movies/:id
app.put("/movies/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const index = movies.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Filme não encontrado" });
  }

  const { title, year } = req.body;

  if (!title || !year) {
    return res
      .status(400)
      .json({ message: "Campos 'title' e 'year' são obrigatórios" });
  }

  movies[index] = { id, title, year };

  res.status(200).json({ data: movies[index] });
});

//DELETE movies
app.delete("/movies/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = movies.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "filme não encontrado" });
  }

  movies.splice(index, 1);
  res.status(200).json({ message: "filme eliminado com sucesso" });
});
//--------------------------------------------------------------------------------//
//--------------------------------------------------------------------------------//
// GET tasks
app.get("/tasks", (req, res) => {
  res.status(200).json({ data: tasks });
});
//GET tasks por id
app.get("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);

  // Usar outro nome para o resultado
  const task = tasks.find((u) => u.id === id);

  if (!task) {
    return res.status(404).json({ message: "Tarefa não encontrada" });
  }

  res.status(200).json({ data: task });
});
// GET /tasks?completed=true
app.get("/tasks", (req, res) => {
  const { completed } = req.query; // pegar o valor do query string

  // Se não houver query, retorna todas as tasks
  if (completed === undefined) {
    return res.status(200).json({ data: tasks });
  }

  // Converter a string para boolean
  const isCompleted = completed === "true";

  // Filtrar as tasks
  const filteredTasks = tasks.filter((t) => t.completed === isCompleted);

  res.status(200).json({ data: filteredTasks });
});
// ===== POST /tasks =====
// Criar nova task
app.post("/tasks", (req, res) => {
  const { title, completed, priority } = req.body;

  if (!title || !priority) {
    return res
      .status(400)
      .json({ message: "Campos 'title' e 'priority' são obrigatórios" });
  }

  const newTask = {
    id: tasks.length ? tasks[tasks.length - 1].id + 1 : 1,
    title,
    completed: completed || false,
    priority
  };

  tasks.push(newTask);

  res.status(201).json({ data: newTask });
});

// ===== PUT /tasks/:id =====
// Atualizar task existente
app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Tarefa não encontrada" });
  }

  const { title, completed, priority } = req.body;

  if (!title && completed === undefined && !priority) {
    return res.status(400).json({ message: "Deve enviar pelo menos um campo para atualizar" });
  }

  // Atualiza só os campos enviados
  tasks[index] = {
    ...tasks[index],
    title: title !== undefined ? title : tasks[index].title,
    completed: completed !== undefined ? completed : tasks[index].completed,
    priority: priority !== undefined ? priority : tasks[index].priority
  };

  res.status(200).json({ data: tasks[index] });
});

// ===== DELETE /tasks/:id =====
// Apagar task existente
app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Tarefa não encontrada" });
  }

  const deletedTask = tasks.splice(index, 1)[0];

  res.status(200).json({ message: "Tarefa removida", data: deletedTask });
});

// ===== GET /tasks (opcional: filtro completed) =====
app.get("/tasks", (req, res) => {
  const { completed } = req.query;

  if (completed === undefined) return res.json({ data: tasks });

  const isCompleted = completed === "true";
  const filteredTasks = tasks.filter((t) => t.completed === isCompleted);

  res.json({ data: filteredTasks });
});

// ===== GET /tasks/:id =====
app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) return res.status(404).json({ message: "Tarefa não encontrada" });

  res.json({ data: task });
});



// Rota não encontrada (404)
app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erro interno do servidor" });
});

// Para desenvolvimento local
app.listen(PORT, () => {
  console.log(`✅ Servidor a correr em http://localhost:${PORT}`);
});

// Para a Vercel
module.exports = app;
const express = require('express')
const cors = require('cors')
const path = require('path')
const Database = require('better-sqlite3')

const app = express()
const db = new Database('barbearia.db')

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../')))

// ── Cria tabelas ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    telefone TEXT,
    nascimento TEXT,
    tipo TEXT DEFAULT 'cliente'
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    servicos TEXT NOT NULL,
    profissional TEXT NOT NULL,
    horario TEXT NOT NULL,
    data TEXT NOT NULL,
    observacoes TEXT,
    status TEXT DEFAULT 'pendente'
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    produtos TEXT NOT NULL,
    total REAL NOT NULL,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  INSERT OR IGNORE INTO usuarios (nome, email, senha, tipo)
  VALUES ('Admin', 'admin@777barber.com', 'admin123', 'admin');
`)

// ════════════════════════════════════════════════════════
// USUÁRIOS
// ════════════════════════════════════════════════════════

app.post('/api/usuarios/cadastro', (req, res) => {
  try {
    const { nome, email, senha, telefone, nascimento } = req.body
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Campos obrigatórios faltando.' })
    const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)
    if (existe) return res.status(409).json({ erro: 'E-mail já cadastrado.' })
    const result = db.prepare(
      'INSERT INTO usuarios (nome, email, senha, telefone, nascimento) VALUES (?, ?, ?, ?, ?)'
    ).run(nome, email, senha, telefone ?? '', nascimento ?? '')
    res.json({ id: result.lastInsertRowid, mensagem: 'Cadastro realizado com sucesso!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.post('/api/usuarios/login', (req, res) => {
  try {
    const { email, senha } = req.body
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND senha = ?').get(email, senha)
    if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
    if (usuario.tipo === 'admin') return res.status(403).json({ erro: 'Use o painel administrativo.' })
    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.post('/api/usuarios/login-admin', (req, res) => {
  try {
    const { email, senha } = req.body
    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND senha = ? AND tipo = ?').get(email, senha, 'admin')
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas ou sem permissão de administrador.' })
    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// ════════════════════════════════════════════════════════
// AGENDAMENTOS — rotas específicas ANTES das dinâmicas
// ════════════════════════════════════════════════════════

// Listar todos (admin)
app.get('/api/agendamentos', (req, res) => {
  res.json(db.prepare('SELECT * FROM agendamentos ORDER BY data, horario').all())
})

// Horários ocupados — ANTES de /:id
app.get('/api/agendamentos/ocupados', (req, res) => {
  try {
    const { data, profissional } = req.query
    const ocupados = db.prepare(
      `SELECT horario FROM agendamentos
       WHERE data = ? AND profissional = ? AND status != 'cancelado'`
    ).all(data, profissional)
    res.json(ocupados.map(o => o.horario))
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// Listar por usuário — ANTES de /:id
app.get('/api/agendamentos/usuario/:id', (req, res) => {
  res.json(db.prepare(
    'SELECT * FROM agendamentos WHERE usuario_id = ? ORDER BY data DESC, horario'
  ).all(req.params.id))
})

// Criar
app.post('/api/agendamentos', (req, res) => {
  try {
    const { usuario_id, servicos, profissional, horario, data, observacoes } = req.body
    if (!servicos || !profissional || !horario || !data)
      return res.status(400).json({ erro: 'Campos obrigatórios faltando.' })
    const result = db.prepare(
      'INSERT INTO agendamentos (usuario_id, servicos, profissional, horario, data, observacoes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(usuario_id ?? null, servicos, profissional, horario, data, observacoes ?? '')
    res.json({ id: result.lastInsertRowid, mensagem: 'Agendamento criado!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// Atualizar status
app.patch('/api/agendamentos/:id/status', (req, res) => {
  try {
    const { status } = req.body
    db.prepare('UPDATE agendamentos SET status = ? WHERE id = ?').run(status, req.params.id)
    res.json({ mensagem: 'Status atualizado!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// Cancelar
app.delete('/api/agendamentos/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM agendamentos WHERE id = ?').run(req.params.id)
    res.json({ mensagem: 'Agendamento cancelado.' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// ════════════════════════════════════════════════════════
// PEDIDOS
// ════════════════════════════════════════════════════════

app.post('/api/pedidos', (req, res) => {
  try {
    const { usuario_id, produtos, total } = req.body
    const result = db.prepare(
      'INSERT INTO pedidos (usuario_id, produtos, total) VALUES (?, ?, ?)'
    ).run(usuario_id ?? null, produtos, total)
    res.json({ id: result.lastInsertRowid, mensagem: 'Pedido registrado!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// ════════════════════════════════════════════════════════
// PAINEL ADMIN
// ════════════════════════════════════════════════════════

app.get('/api/admin/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as total FROM agendamentos').get().total
    const porServico = db.prepare(
      'SELECT servicos, COUNT(*) as total FROM agendamentos GROUP BY servicos ORDER BY total DESC'
    ).all()
    const porHorario = db.prepare(
      'SELECT horario, COUNT(*) as total FROM agendamentos GROUP BY horario ORDER BY total DESC LIMIT 6'
    ).all()
    const hoje = new Date().toISOString().slice(0, 10)
    const agendaHoje = db.prepare(
      'SELECT * FROM agendamentos WHERE data = ? ORDER BY horario'
    ).all(hoje)
    const totalClientes = db.prepare(
      "SELECT COUNT(*) as total FROM usuarios WHERE tipo = 'cliente'"
    ).get().total

    res.json({ total, porServico, porHorario, agendaHoje, totalClientes })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// Listar todos os agendamentos com filtro (admin)
app.get('/api/admin/agendamentos', (req, res) => {
  try {
    const { status, data } = req.query
    let query = 'SELECT * FROM agendamentos WHERE 1=1'
    const params = []
    if (status && status !== 'todos') { query += ' AND status = ?'; params.push(status) }
    if (data) { query += ' AND data = ?'; params.push(data) }
    query += ' ORDER BY data DESC, horario'
    res.json(db.prepare(query).all(...params))
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// Listar clientes (admin)
app.get('/api/admin/clientes', (req, res) => {
  try {
    res.json(db.prepare("SELECT id, nome, email, telefone, nascimento FROM usuarios WHERE tipo = 'cliente'").all())
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// Fallback — redireciona rotas desconhecidas para index
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'))
})

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'))
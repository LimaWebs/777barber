require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { createClient } = require('@libsql/client')

const app = express()
const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
})

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../')))

// ── Cria tabelas ──────────────────────────────────────────────
async function iniciarDB() {
  await db.executeMultiple(`
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
  `)

  await db.execute({
    sql: `INSERT OR IGNORE INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)`,
    args: ['Admin', 'admin@777barber.com', 'admin123', 'admin']
  })
}

// ════════════════════════════════════════════════════════
// USUÁRIOS
// ════════════════════════════════════════════════════════

app.post('/api/usuarios/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, telefone, nascimento } = req.body
    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Campos obrigatórios faltando.' })
    const existe = await db.execute({ sql: 'SELECT id FROM usuarios WHERE email = ?', args: [email] })
    if (existe.rows.length > 0) return res.status(409).json({ erro: 'E-mail já cadastrado.' })
    const result = await db.execute({
      sql: 'INSERT INTO usuarios (nome, email, senha, telefone, nascimento) VALUES (?, ?, ?, ?, ?)',
      args: [nome, email, senha, telefone ?? '', nascimento ?? '']
    })
    res.json({ id: Number(result.lastInsertRowid), mensagem: 'Cadastro realizado com sucesso!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.post('/api/usuarios/login', async (req, res) => {
  try {
    const { email, senha } = req.body
    const result = await db.execute({
      sql: 'SELECT * FROM usuarios WHERE email = ? AND senha = ?',
      args: [email, senha]
    })
    const usuario = result.rows[0]
    if (!usuario) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
    if (usuario.tipo === 'admin') return res.status(403).json({ erro: 'Use o painel administrativo.' })
    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.post('/api/usuarios/login-admin', async (req, res) => {
  try {
    const { email, senha } = req.body
    const result = await db.execute({
      sql: 'SELECT * FROM usuarios WHERE email = ? AND senha = ? AND tipo = ?',
      args: [email, senha, 'admin']
    })
    const usuario = result.rows[0]
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas ou sem permissão de administrador.' })
    res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// ════════════════════════════════════════════════════════
// AGENDAMENTOS
// ════════════════════════════════════════════════════════

app.get('/api/agendamentos', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM agendamentos ORDER BY data, horario')
    res.json(result.rows)
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.get('/api/agendamentos/ocupados', async (req, res) => {
  try {
    const { data, profissional } = req.query
    const result = await db.execute({
      sql: `SELECT horario FROM agendamentos WHERE data = ? AND profissional = ? AND status != 'cancelado'`,
      args: [data, profissional]
    })
    res.json(result.rows.map(o => o.horario))
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.get('/api/agendamentos/usuario/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM agendamentos WHERE usuario_id = ? ORDER BY data DESC, horario',
      args: [req.params.id]
    })
    res.json(result.rows)
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.post('/api/agendamentos', async (req, res) => {
  try {
    const { usuario_id, servicos, profissional, horario, data, observacoes } = req.body
    if (!servicos || !profissional || !horario || !data)
      return res.status(400).json({ erro: 'Campos obrigatórios faltando.' })
    const result = await db.execute({
      sql: 'INSERT INTO agendamentos (usuario_id, servicos, profissional, horario, data, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [usuario_id ?? null, servicos, profissional, horario, data, observacoes ?? '']
    })
    res.json({ id: Number(result.lastInsertRowid), mensagem: 'Agendamento criado!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.patch('/api/agendamentos/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    await db.execute({
      sql: 'UPDATE agendamentos SET status = ? WHERE id = ?',
      args: [status, req.params.id]
    })
    res.json({ mensagem: 'Status atualizado!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.delete('/api/agendamentos/:id', async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM agendamentos WHERE id = ?',
      args: [req.params.id]
    })
    res.json({ mensagem: 'Agendamento cancelado.' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// ════════════════════════════════════════════════════════
// PEDIDOS
// ════════════════════════════════════════════════════════

app.post('/api/pedidos', async (req, res) => {
  try {
    const { usuario_id, produtos, total } = req.body
    const result = await db.execute({
      sql: 'INSERT INTO pedidos (usuario_id, produtos, total) VALUES (?, ?, ?)',
      args: [usuario_id ?? null, produtos, total]
    })
    res.json({ id: Number(result.lastInsertRowid), mensagem: 'Pedido registrado!' })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// ════════════════════════════════════════════════════════
// PAINEL ADMIN
// ════════════════════════════════════════════════════════

app.get('/api/admin/stats', async (req, res) => {
  try {
    const total = (await db.execute('SELECT COUNT(*) as total FROM agendamentos')).rows[0].total
    const porServico = (await db.execute(
      'SELECT servicos, COUNT(*) as total FROM agendamentos GROUP BY servicos ORDER BY total DESC'
    )).rows
    const porHorario = (await db.execute(
      'SELECT horario, COUNT(*) as total FROM agendamentos GROUP BY horario ORDER BY total DESC LIMIT 6'
    )).rows
    const hoje = new Date().toISOString().slice(0, 10)
    const agendaHoje = (await db.execute({
      sql: 'SELECT * FROM agendamentos WHERE data = ? ORDER BY horario',
      args: [hoje]
    })).rows
    const totalClientes = (await db.execute(
      "SELECT COUNT(*) as total FROM usuarios WHERE tipo = 'cliente'"
    )).rows[0].total

    res.json({ total, porServico, porHorario, agendaHoje, totalClientes })
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.get('/api/admin/agendamentos', async (req, res) => {
  try {
    const { status, data } = req.query
    let query = 'SELECT * FROM agendamentos WHERE 1=1'
    const params = []
    if (status && status !== 'todos') { query += ' AND status = ?'; params.push(status) }
    if (data) { query += ' AND data = ?'; params.push(data) }
    query += ' ORDER BY data DESC, horario'
    const result = await db.execute({ sql: query, args: params })
    res.json(result.rows)
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

app.get('/api/admin/clientes', async (req, res) => {
  try {
    const result = await db.execute(
      "SELECT id, nome, email, telefone, nascimento FROM usuarios WHERE tipo = 'cliente'"
    )
    res.json(result.rows)
  } catch (e) { res.status(500).json({ erro: e.message }) }
})

// Fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'))
})

// ── Inicia servidor ──────────────────────────────────────────
iniciarDB().catch(e => console.error('Erro ao iniciar banco:', e))

module.exports = app
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const path = require('path')
const { createClient } = require('@libsql/client')

const app = express()

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
})

app.use(cors())
app.use(express.json({ limit: '100kb' }))
app.use((req, res, next) => { req.body = req.body ?? {}; next() })

// ── Regras do negócio (fonte única de verdade) ────────────────
const SERVICOS = {
  'Corte masculino': 35,
  'Barba completa': 25,
  'Combo corte + barba': 55,
  'Sobrancelha': 15
}
const PROFISSIONAIS = ['Mazinho', 'Jefferson']
const HORARIOS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const STATUS = ['pendente', 'confirmado', 'cancelado']
const PRODUTOS = {
  'Pomada Matte': 39.9,
  'Gel': 24.9,
  'Minoxidil': 79.9,
  'Óleo para barba': 29.9,
  'Pó modelador': 34.9
}
const FUSO = 'America/Sao_Paulo'

// Data/hora de hoje no fuso do Brasil (toISOString usa UTC e "vira o dia" às 21h)
function hojeBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO })
}
function horaAgoraBR() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
}
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Senhas (scrypt) ───────────────────────────────────────────
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function conferirSenha(senha, guardada) {
  if (typeof guardada !== 'string') return false
  if (guardada.startsWith('scrypt$')) {
    const [, salt, hash] = guardada.split('$')
    const calc = crypto.scryptSync(senha, salt, 64)
    const orig = Buffer.from(hash, 'hex')
    return orig.length === calc.length && crypto.timingSafeEqual(orig, calc)
  }
  return senha === guardada // senha antiga em texto puro (é migrada no login)
}

// ── Token de sessão assinado (HMAC) ───────────────────────────
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.TURSO_TOKEN || 'troque-este-segredo-em-producao'
const TOKEN_VALIDADE_MS = 1000 * 60 * 60 * 24 * 7 // 7 dias

function assinar(payload) {
  const corpo = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(corpo).digest('base64url')
  return `${corpo}.${sig}`
}

function verificar(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [corpo, sig] = token.split('.')
  const esperado = crypto.createHmac('sha256', AUTH_SECRET).update(corpo).digest('base64url')
  const a = Buffer.from(sig), b = Buffer.from(esperado)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(corpo, 'base64url').toString())
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

// Lê o token se existir (não bloqueia)
app.use((req, res, next) => {
  const h = req.headers.authorization || ''
  req.auth = h.startsWith('Bearer ') ? verificar(h.slice(7)) : null
  next()
})

function exigir(...tipos) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ erro: 'Faça login para continuar.' })
    if (tipos.length && !tipos.includes(req.auth.tipo)) return res.status(403).json({ erro: 'Sem permissão.' })
    next()
  }
}

function erroInterno(res, e) {
  console.error(e)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
}

// ── Cria tabelas ──────────────────────────────────────────────
async function iniciarBanco() {
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

  const senhaAdmin = process.env.ADMIN_PASSWORD || 'admin123'
  await db.execute({
    sql: `INSERT OR IGNORE INTO usuarios (nome, email, senha, tipo) VALUES ('Admin', 'admin@777barber.com', ?, 'admin')`,
    args: [hashSenha(senhaAdmin)]
  })
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[777barber] ATENÇÃO: defina ADMIN_PASSWORD no ambiente e troque a senha padrão do admin.')
  }
}

const bancoPronto = iniciarBanco()
bancoPronto.catch(console.error)

// Garante que as tabelas existem antes de qualquer rota (importante no Vercel/serverless)
app.use(async (req, res, next) => {
  try { await bancoPronto; next() }
  catch (e) { erroInterno(res, e) }
})

// ════════════════════════════════════════════════════════
// USUÁRIOS
// ════════════════════════════════════════════════════════

app.post('/api/usuarios/cadastro', async (req, res) => {
  try {
    const nome = String(req.body.nome ?? '').trim()
    const email = String(req.body.email ?? '').trim().toLowerCase()
    const senha = String(req.body.senha ?? '')
    const telefone = String(req.body.telefone ?? '').trim()
    const nascimento = String(req.body.nascimento ?? '').trim()

    if (!nome || !email || !senha) return res.status(400).json({ erro: 'Campos obrigatórios faltando.' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })
    if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter no mínimo 6 caracteres.' })
    if (nascimento) {
      const valida = DATA_RE.test(nascimento) && !Number.isNaN(Date.parse(nascimento)) &&
        nascimento >= '1900-01-01' && nascimento <= hojeBR()
      if (!valida) return res.status(400).json({ erro: 'Data de nascimento inválida.' })
    }

    const existe = await db.execute({ sql: 'SELECT id FROM usuarios WHERE lower(email) = ?', args: [email] })
    if (existe.rows.length > 0) return res.status(409).json({ erro: 'E-mail já cadastrado.' })

    const result = await db.execute({
      sql: 'INSERT INTO usuarios (nome, email, senha, telefone, nascimento) VALUES (?, ?, ?, ?, ?)',
      args: [nome, email, hashSenha(senha), telefone, nascimento]
    })
    res.json({ id: Number(result.lastInsertRowid), mensagem: 'Cadastro realizado com sucesso!' })
  } catch (e) { erroInterno(res, e) }
})

async function autenticar(req, tipoEsperado) {
  const email = String(req.body.email ?? '').trim().toLowerCase()
  const senha = String(req.body.senha ?? '')
  if (!email || !senha) return { status: 400, erro: 'Informe e-mail e senha.' }

  const result = await db.execute({ sql: 'SELECT * FROM usuarios WHERE lower(email) = ?', args: [email] })
  const usuario = result.rows[0]
  if (!usuario || !conferirSenha(senha, usuario.senha)) {
    return { status: 401, erro: tipoEsperado === 'admin' ? 'Credenciais inválidas.' : 'E-mail ou senha incorretos.' }
  }

  // Migra senha antiga (texto puro) para hash
  if (!String(usuario.senha).startsWith('scrypt$')) {
    await db.execute({ sql: 'UPDATE usuarios SET senha = ? WHERE id = ?', args: [hashSenha(senha), usuario.id] })
  }

  if (tipoEsperado === 'admin' && usuario.tipo !== 'admin') return { status: 401, erro: 'Credenciais inválidas.' }
  if (tipoEsperado === 'cliente' && usuario.tipo === 'admin') return { status: 403, erro: 'Use o painel administrativo.' }

  const id = Number(usuario.id)
  const token = assinar({ id, tipo: usuario.tipo, exp: Date.now() + TOKEN_VALIDADE_MS })
  return { ok: { id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo, token } }
}

app.post('/api/usuarios/login', async (req, res) => {
  try {
    const r = await autenticar(req, 'cliente')
    if (r.erro) return res.status(r.status).json({ erro: r.erro })
    res.json(r.ok)
  } catch (e) { erroInterno(res, e) }
})

app.post('/api/usuarios/login-admin', async (req, res) => {
  try {
    const r = await autenticar(req, 'admin')
    if (r.erro) return res.status(r.status).json({ erro: r.erro })
    res.json(r.ok)
  } catch (e) { erroInterno(res, e) }
})

// ════════════════════════════════════════════════════════
// AGENDAMENTOS
// ════════════════════════════════════════════════════════

// Lista completa (somente admin)
app.get('/api/agendamentos', exigir('admin'), async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM agendamentos ORDER BY data, horario')
    res.json(result.rows)
  } catch (e) { erroInterno(res, e) }
})

// Horários ocupados (público: a tela precisa mostrar o que está livre)
app.get('/api/agendamentos/ocupados', async (req, res) => {
  try {
    const { data, profissional } = req.query
    if (!DATA_RE.test(String(data ?? '')) || !profissional) return res.json([])
    const result = await db.execute({
      sql: `SELECT horario FROM agendamentos WHERE data = ? AND profissional = ? AND status != 'cancelado'`,
      args: [data, profissional]
    })
    res.json(result.rows.map(o => o.horario))
  } catch (e) { erroInterno(res, e) }
})

// Agendamentos do próprio cliente (ou admin)
app.get('/api/agendamentos/usuario/:id', exigir('cliente', 'admin'), async (req, res) => {
  try {
    if (req.auth.tipo !== 'admin' && String(req.auth.id) !== String(req.params.id))
      return res.status(403).json({ erro: 'Sem permissão.' })
    const result = await db.execute({
      sql: 'SELECT * FROM agendamentos WHERE usuario_id = ? ORDER BY data DESC, horario',
      args: [req.params.id]
    })
    res.json(result.rows)
  } catch (e) { erroInterno(res, e) }
})

app.post('/api/agendamentos', exigir('cliente'), async (req, res) => {
  try {
    const { servicos, profissional, horario, data } = req.body
    const observacoes = String(req.body.observacoes ?? '').slice(0, 500)

    if (!servicos || !profissional || !horario || !data)
      return res.status(400).json({ erro: 'Campos obrigatórios faltando.' })

    const lista = String(servicos).split(',').map(s => s.trim()).filter(Boolean)
    if (lista.length === 0 || lista.some(s => !(s in SERVICOS))) return res.status(400).json({ erro: 'Serviço inválido.' })
    if (!PROFISSIONAIS.includes(profissional)) return res.status(400).json({ erro: 'Profissional inválido.' })
    if (!HORARIOS.includes(horario)) return res.status(400).json({ erro: 'Horário inválido.' })
    if (!DATA_RE.test(data) || Number.isNaN(Date.parse(data))) return res.status(400).json({ erro: 'Data inválida.' })

    const hoje = hojeBR()
    if (data < hoje) return res.status(400).json({ erro: 'Não é possível agendar em datas passadas.' })
    if (data === hoje && horario <= horaAgoraBR()) return res.status(400).json({ erro: 'Esse horário já passou.' })

    const ocupado = await db.execute({
      sql: `SELECT id FROM agendamentos WHERE data = ? AND profissional = ? AND horario = ? AND status != 'cancelado'`,
      args: [data, profissional, horario]
    })
    if (ocupado.rows.length > 0) return res.status(409).json({ erro: 'Esse horário acabou de ser reservado. Escolha outro.' })

    const result = await db.execute({
      sql: 'INSERT INTO agendamentos (usuario_id, servicos, profissional, horario, data, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [req.auth.id, lista.join(', '), profissional, horario, data, observacoes]
    })
    res.json({ id: Number(result.lastInsertRowid), mensagem: 'Agendamento criado!' })
  } catch (e) { erroInterno(res, e) }
})

// Cliente cancela o próprio agendamento (fica registrado como "cancelado" e libera o horário)
app.patch('/api/agendamentos/:id/cancelar', exigir('cliente'), async (req, res) => {
  try {
    const result = await db.execute({
      sql: `UPDATE agendamentos SET status = 'cancelado' WHERE id = ? AND usuario_id = ? AND status = 'pendente'`,
      args: [req.params.id, req.auth.id]
    })
    if (result.rowsAffected === 0) return res.status(404).json({ erro: 'Agendamento não encontrado ou não pode mais ser cancelado.' })
    res.json({ mensagem: 'Agendamento cancelado.' })
  } catch (e) { erroInterno(res, e) }
})

// Admin confirma/cancela
app.patch('/api/agendamentos/:id/status', exigir('admin'), async (req, res) => {
  try {
    const { status } = req.body
    if (!STATUS.includes(status)) return res.status(400).json({ erro: 'Status inválido.' })
    const result = await db.execute({
      sql: 'UPDATE agendamentos SET status = ? WHERE id = ?',
      args: [status, req.params.id]
    })
    if (result.rowsAffected === 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' })
    res.json({ mensagem: 'Status atualizado!' })
  } catch (e) { erroInterno(res, e) }
})

app.delete('/api/agendamentos/:id', exigir('admin'), async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM agendamentos WHERE id = ?', args: [req.params.id] })
    res.json({ mensagem: 'Agendamento removido.' })
  } catch (e) { erroInterno(res, e) }
})

// ════════════════════════════════════════════════════════
// PEDIDOS (preço calculado no servidor)
// ════════════════════════════════════════════════════════

app.post('/api/pedidos', async (req, res) => {
  try {
    const itens = Array.isArray(req.body.itens) ? req.body.itens : []
    if (itens.length === 0) return res.status(400).json({ erro: 'Carrinho vazio.' })

    let total = 0
    const partes = []
    for (const item of itens) {
      const preco = PRODUTOS[item.produto]
      const qtd = Number(item.qtd)
      if (preco === undefined || !Number.isInteger(qtd) || qtd < 1 || qtd > 50)
        return res.status(400).json({ erro: 'Produto ou quantidade inválidos.' })
      total += preco * qtd
      partes.push(`${qtd}x ${item.produto}`)
    }
    total = Math.round(total * 100) / 100

    const result = await db.execute({
      sql: 'INSERT INTO pedidos (usuario_id, produtos, total) VALUES (?, ?, ?)',
      args: [req.auth?.id ?? null, partes.join(', '), total]
    })
    res.json({ id: Number(result.lastInsertRowid), resumo: partes.join(', '), total, mensagem: 'Pedido registrado!' })
  } catch (e) { erroInterno(res, e) }
})

// ════════════════════════════════════════════════════════
// PÚBLICO
// ════════════════════════════════════════════════════════

app.get('/api/stats', async (req, res) => {
  try {
    const mes = hojeBR().slice(0, 7)
    const r = await db.execute({
      sql: `SELECT COUNT(*) AS total FROM agendamentos WHERE status != 'cancelado' AND data LIKE ?`,
      args: [mes + '%']
    })
    res.json({ atendimentosMes: Number(r.rows[0].total), profissionais: PROFISSIONAIS.length })
  } catch (e) { erroInterno(res, e) }
})

// ════════════════════════════════════════════════════════
// PAINEL ADMIN
// ════════════════════════════════════════════════════════

const SELECT_ADMIN = `
  SELECT a.*, u.nome AS cliente_nome, u.telefone AS cliente_telefone
  FROM agendamentos a
  LEFT JOIN usuarios u ON u.id = a.usuario_id`

app.get('/api/admin/stats', exigir('admin'), async (req, res) => {
  try {
    const hoje = hojeBR()

    const [ativos, porHorario, agendaHoje, totalClientes] = await Promise.all([
      db.execute(`SELECT servicos FROM agendamentos WHERE status != 'cancelado'`),
      db.execute(`SELECT horario, COUNT(*) AS total FROM agendamentos WHERE status != 'cancelado' GROUP BY horario ORDER BY total DESC LIMIT 6`),
      db.execute({ sql: `${SELECT_ADMIN} WHERE a.data = ? ORDER BY a.horario`, args: [hoje] }),
      db.execute(`SELECT COUNT(*) AS total FROM usuarios WHERE tipo = 'cliente'`)
    ])

    // Conta cada serviço individualmente ("Corte, Barba" conta 1 para cada)
    const contagem = {}
    for (const row of ativos.rows) {
      for (const nome of String(row.servicos).split(',').map(s => s.trim()).filter(Boolean)) {
        contagem[nome] = (contagem[nome] || 0) + 1
      }
    }
    const porServico = Object.entries(contagem)
      .map(([servicos, total]) => ({ servicos, total }))
      .sort((a, b) => b.total - a.total)

    const agendaAtiva = agendaHoje.rows.filter(a => a.status !== 'cancelado').length
    const capacidade = HORARIOS.length * PROFISSIONAIS.length

    res.json({
      total: ativos.rows.length,
      porServico,
      porHorario: porHorario.rows,
      agendaHoje: agendaHoje.rows,
      ocupacaoHoje: Math.round((agendaAtiva / capacidade) * 100),
      totalClientes: Number(totalClientes.rows[0].total)
    })
  } catch (e) { erroInterno(res, e) }
})

app.get('/api/admin/agendamentos', exigir('admin'), async (req, res) => {
  try {
    const { status, data } = req.query
    let sql = `${SELECT_ADMIN} WHERE 1=1`
    const args = []
    if (status && status !== 'todos') { sql += ' AND a.status = ?'; args.push(status) }
    if (data) { sql += ' AND a.data = ?'; args.push(data) }
    sql += ' ORDER BY a.data DESC, a.horario'
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (e) { erroInterno(res, e) }
})

app.get('/api/admin/clientes', exigir('admin'), async (req, res) => {
  try {
    const result = await db.execute(`SELECT id, nome, email, telefone, nascimento FROM usuarios WHERE tipo = 'cliente' ORDER BY nome`)
    res.json(result.rows)
  } catch (e) { erroInterno(res, e) }
})

// ── Fallbacks ─────────────────────────────────────────────────
// Serve o site quando rodando localmente (no Vercel os arquivos estáticos vêm da pasta public)
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }))

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' })
  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
})

// Rodar localmente: npm start  (no Vercel o app é exportado)
if (require.main === module) {
  const porta = process.env.PORT || 3000
  app.listen(porta, () => console.log(`777 Barber rodando em http://localhost:${porta}`))
}

module.exports = app

// DIAGNOSTICO TEMPORARIO - apague este arquivo depois de resolver o erro.
module.exports = async (req, res) => {
  const primeiraLinha = e => String((e && e.message) || e).split('\n')[0]
  const out = {
    node: process.version,
    variaveis: {
      TURSO_URL: !!process.env.TURSO_URL,
      TURSO_TOKEN: !!process.env.TURSO_TOKEN,
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD
    },
    modulos: {}
  }

  for (const m of ['express', 'cors', 'dotenv', '@libsql/client']) {
    try { require(m); out.modulos[m] = 'ok' }
    catch (e) { out.modulos[m] = 'ERRO: ' + primeiraLinha(e) }
  }

  try { require('./server.js'); out.server = 'ok' }
  catch (e) {
    out.server = 'ERRO: ' + primeiraLinha(e)
    out.onde = String((e && e.stack) || '').split('\n').slice(1, 5).map(l => l.trim())
  }

  try {
    const { createClient } = require('@libsql/client')
    const c = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN })
    await c.execute('select 1')
    out.banco = 'ok'
  } catch (e) { out.banco = 'ERRO: ' + primeiraLinha(e) }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(out, null, 2))
}
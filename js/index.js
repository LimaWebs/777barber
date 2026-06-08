// Atualiza stat de atendimentos com total real do banco
async function carregarStat() {
  try {
    const resp = await fetch('/api/admin/stats')
    const data = await resp.json()
    document.getElementById('statAtendimentos').textContent = '+' + data.total
  } catch { /* mantém valor padrão */ }
}

carregarStat()
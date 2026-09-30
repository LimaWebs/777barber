// Atualiza os números da home com dados reais (se a API responder)
async function carregarStat() {
  try {
    const resp = await fetch('/api/stats')
    if (!resp.ok) return
    const data = await resp.json()
    if (data.atendimentosMes > 0) document.getElementById('statAtendimentos').textContent = '+' + data.atendimentosMes
    if (data.profissionais) document.getElementById('statProfissionais').textContent = data.profissionais
  } catch { /* mantém valor padrão */ }
}

carregarStat()

const adminLogado = JSON.parse(localStorage.getItem('admin') || 'null')
if (!adminLogado) window.location.href = '/login-admin.html'

// ── Faturamento por serviço ───────────────────────────────────
const PRECOS = {
  'Corte masculino': 35,
  'Barba completa': 25,
  'Combo corte + barba': 55,
  'Sobrancelha': 15
}

function calcularFaturamento(agendamentos) {
  return agendamentos.reduce((total, a) => {
    const servicos = a.servicos.split(',').map(s => s.trim())
    return total + servicos.reduce((s, nome) => s + (PRECOS[nome] || 0), 0)
  }, 0)
}

// ── Carrega tudo ──────────────────────────────────────────────
async function carregarStats() {
  try {
    const [statsResp, todosResp, clientesResp] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/agendamentos'),
      fetch('/api/admin/clientes')
    ])

    const stats = await statsResp.json()
    const todos = await todosResp.json()
    const clientes = await clientesResp.json()

    renderKPIs(stats, todos)
    renderGrafico(stats.porServico)
    renderTabelaHorarios(stats.porHorario)
    renderFaturamento(todos)
    renderAgenda(stats.agendaHoje)
    renderTodosAgendamentos(todos)
    renderClientes(clientes)

  } catch (e) {
    console.error('Erro ao carregar dados:', e)
  }
}

// ── KPIs ──────────────────────────────────────────────────────
function renderKPIs(stats, todos) {
  document.getElementById('kpiAgendamentos').textContent = stats.total

  if (stats.porServico.length > 0) {
    const top = stats.porServico[0].servicos.split(',')[0].trim()
    document.getElementById('kpiServico').textContent = top
  } else {
    document.getElementById('kpiServico').textContent = '—'
  }

  if (stats.porHorario.length > 0) {
    document.getElementById('kpiPico').textContent = stats.porHorario[0].horario
  } else {
    document.getElementById('kpiPico').textContent = '—'
  }

  document.getElementById('kpiOcupacao').textContent = stats.agendaHoje.length + ' hoje'
}

// ── Gráfico de barras ─────────────────────────────────────────
function renderGrafico(porServico) {
  const el = document.getElementById('barList')
  if (porServico.length === 0) {
    el.innerHTML = '<p class="muted">Nenhum dado ainda.</p>'
    return
  }
  const max = porServico[0].total
  el.innerHTML = porServico.map(s => `
    <div style="margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.92rem;">
        <span>${s.servicos}</span>
        <span style="color:var(--gold); font-weight:700;">${s.total}</span>
      </div>
      <div style="background:rgba(255,255,255,0.07); border-radius:999px; height:10px; overflow:hidden;">
        <div style="width:${Math.round(s.total / max * 100)}%; background:linear-gradient(90deg,var(--gold),#f2deaa); height:100%; border-radius:999px; transition:width 0.8s ease;"></div>
      </div>
    </div>
  `).join('')
}

// ── Tabela de horários ────────────────────────────────────────
function renderTabelaHorarios(porHorario) {
  const el = document.getElementById('tabelaHorarios')
  if (porHorario.length === 0) {
    el.innerHTML = '<tr><td colspan="3" style="color:var(--muted)">Nenhum dado ainda.</td></tr>'
    return
  }
  el.innerHTML = porHorario.map(h => `
    <tr>
      <td>${h.horario}</td>
      <td>${h.total}</td>
      <td>
        <span class="tag-status ${h.total > 3 ? 'tag-cancelado' : 'tag-confirmado'}">
          ${h.total > 3 ? 'Lotado' : 'Normal'}
        </span>
      </td>
    </tr>
  `).join('')
}

// ── Faturamento ───────────────────────────────────────────────
function renderFaturamento(todos) {
  const el = document.getElementById('faturamentoGrid')
  const confirmados = todos.filter(a => a.status === 'confirmado')
  const pendentes = todos.filter(a => a.status === 'pendente')
  const cancelados = todos.filter(a => a.status === 'cancelado')

  const fatTotal = calcularFaturamento(confirmados)
  const fatPendente = calcularFaturamento(pendentes)

  el.innerHTML = `
    <div class="card" style="text-align:center;">
      <p class="muted" style="margin-bottom:6px;">Faturamento confirmado</p>
      <strong style="font-size:1.8rem; color:#6fcf97;">R$ ${fatTotal.toFixed(2).replace('.', ',')}</strong>
      <p style="margin-top:6px; font-size:0.85rem;">${confirmados.length} agendamento(s)</p>
    </div>
    <div class="card" style="text-align:center;">
      <p class="muted" style="margin-bottom:6px;">Faturamento pendente</p>
      <strong style="font-size:1.8rem; color:#f4e1ae;">R$ ${fatPendente.toFixed(2).replace('.', ',')}</strong>
      <p style="margin-top:6px; font-size:0.85rem;">${pendentes.length} agendamento(s)</p>
    </div>
    <div class="card" style="text-align:center;">
      <p class="muted" style="margin-bottom:6px;">Cancelamentos</p>
      <strong style="font-size:1.8rem; color:#e05c5c;">${cancelados.length}</strong>
      <p style="margin-top:6px; font-size:0.85rem;">agendamento(s) cancelados</p>
    </div>
  `
}

// ── Agenda do dia ─────────────────────────────────────────────
function renderAgenda(agendaHoje) {
  const el = document.getElementById('agendaDia')
  if (agendaHoje.length === 0) {
    el.innerHTML = '<p class="muted">Nenhum agendamento para hoje.</p>'
    return
  }
  el.innerHTML = agendaHoje.map(a => `
    <div class="card" style="padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span class="badge" style="font-size:0.78rem; padding:4px 10px;">#${a.id}</span>
            <span class="tag-status tag-${a.status}">${capitalizar(a.status)}</span>
          </div>
          <strong style="font-size:1rem;">${a.horario}</strong>
          <p style="margin:4px 0 2px;">✂ ${a.servicos}</p>
          <p style="margin:0;">👤 ${a.profissional}</p>
        </div>
        ${a.status === 'pendente' ? `
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn btn-primary" style="min-height:34px; padding:0 14px; font-size:0.85rem;"
              onclick="atualizarStatus(${a.id}, 'confirmado')">✓ Confirmar</button>
            <button class="btn btn-secondary" style="min-height:34px; padding:0 14px; font-size:0.85rem; color:#e05c5c; border-color:#e05c5c;"
              onclick="atualizarStatus(${a.id}, 'cancelado')">✕ Cancelar</button>
          </div>` : ''}
      </div>
    </div>
  `).join('')
}

// ── Todos os agendamentos com filtro ──────────────────────────
function renderTodosAgendamentos(todos) {
  const el = document.getElementById('todosAgendamentos')
  if (!el) return

  if (todos.length === 0) {
    el.innerHTML = '<p class="muted">Nenhum agendamento registrado.</p>'
    return
  }

  el.innerHTML = todos.map(a => `
    <div class="card" style="padding:14px; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span class="badge" style="font-size:0.75rem; padding:3px 8px;">#${a.id}</span>
            <span class="tag-status tag-${a.status}">${capitalizar(a.status)}</span>
            <span style="color:var(--muted); font-size:0.85rem;">${formatarData(a.data)} às ${a.horario}</span>
          </div>
          <p style="margin:0 0 2px;">✂ ${a.servicos}</p>
          <p style="margin:0; color:var(--muted); font-size:0.88rem;">👤 ${a.profissional}</p>
        </div>
        ${a.status === 'pendente' ? `
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary" style="min-height:32px; padding:0 12px; font-size:0.82rem;"
              onclick="atualizarStatus(${a.id}, 'confirmado')">✓ Confirmar</button>
            <button class="btn btn-secondary" style="min-height:32px; padding:0 12px; font-size:0.82rem; color:#e05c5c; border-color:#e05c5c;"
              onclick="atualizarStatus(${a.id}, 'cancelado')">✕ Cancelar</button>
          </div>` : ''}
      </div>
    </div>
  `).join('')
}

// ── Lista de clientes ─────────────────────────────────────────
function renderClientes(clientes) {
  const el = document.getElementById('listaClientes')
  if (!el) return

  if (clientes.length === 0) {
    el.innerHTML = '<p class="muted">Nenhum cliente cadastrado.</p>'
    return
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Telefone</th>
        </tr>
      </thead>
      <tbody>
        ${clientes.map(c => `
          <tr>
            <td>${c.id}</td>
            <td>${c.nome}</td>
            <td>${c.email}</td>
            <td>${c.telefone || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

// ── Atualizar status ──────────────────────────────────────────
async function atualizarStatus(id, status) {
  try {
    await fetch(`/api/agendamentos/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    carregarStats()
  } catch {
    alert('Erro ao atualizar status.')
  }
}

// ── Helpers ───────────────────────────────────────────────────
function capitalizar(t) { return t.charAt(0).toUpperCase() + t.slice(1) }
function formatarData(d) {
  if (!d) return ''
  const [a, m, dia] = d.split('-')
  return `${dia}/${m}/${a}`
}

document.getElementById('btnAtualizarDados').addEventListener('click', carregarStats)
carregarStats()
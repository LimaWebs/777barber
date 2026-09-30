if (!B777.bloqueado) (function () {
  const { esc, capitalizar, formatarData, moeda } = B777

  const PRECOS = {
    'Corte masculino': 35,
    'Barba completa': 25,
    'Combo corte + barba': 55,
    'Sobrancelha': 15
  }

  function calcularFaturamento(lista) {
    return lista.reduce((total, a) => {
      const nomes = String(a.servicos).split(',').map(s => s.trim())
      return total + nomes.reduce((s, nome) => s + (PRECOS[nome] || 0), 0)
    }, 0)
  }

  const get = url => B777.api(url, { papel: 'admin' })

  // ── Carrega tudo ─────────────────────────────────────────────
  async function carregarStats() {
    try {
      const [statsR, todosR, clientesR] = await Promise.all([
        get('/api/admin/stats'),
        get('/api/admin/agendamentos'),
        get('/api/admin/clientes')
      ])
      if (!statsR.ok || !todosR.ok || !clientesR.ok) throw new Error('Falha ao carregar')

      renderKPIs(statsR.data)
      renderGrafico(statsR.data.porServico)
      renderTabelaHorarios(statsR.data.porHorario)
      renderFaturamento(todosR.data)
      renderAgenda(statsR.data.agendaHoje)
      renderTodosAgendamentos(todosR.data)
      renderClientes(clientesR.data)
    } catch (e) {
      console.error('Erro ao carregar dados:', e)
      document.getElementById('todosAgendamentos').innerHTML =
        '<p style="color:#e05c5c;">Não foi possível carregar os dados. Clique em “Atualizar dados”.</p>'
    }
  }

  // ── KPIs ─────────────────────────────────────────────────────
  function renderKPIs(stats) {
    document.getElementById('kpiAgendamentos').textContent = stats.total
    document.getElementById('kpiServico').textContent = stats.porServico.length ? stats.porServico[0].servicos : '—'
    document.getElementById('kpiPico').textContent = stats.porHorario.length ? stats.porHorario[0].horario : '—'
    document.getElementById('kpiOcupacao').textContent = stats.ocupacaoHoje + '%'
  }

  // ── Gráfico de barras ────────────────────────────────────────
  function renderGrafico(porServico) {
    const el = document.getElementById('barList')
    if (porServico.length === 0) { el.innerHTML = '<p class="muted">Nenhum dado ainda.</p>'; return }
    const max = porServico[0].total
    el.innerHTML = porServico.map(s => `
      <div style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.92rem;">
          <span>${esc(s.servicos)}</span>
          <span style="color:var(--gold); font-weight:700;">${esc(s.total)}</span>
        </div>
        <div style="background:rgba(255,255,255,0.07); border-radius:999px; height:10px; overflow:hidden;">
          <div style="width:${Math.round(s.total / max * 100)}%; background:linear-gradient(90deg,var(--gold),#f2deaa); height:100%; border-radius:999px;"></div>
        </div>
      </div>
    `).join('')
  }

  // ── Tabela de horários ───────────────────────────────────────
  function renderTabelaHorarios(porHorario) {
    const el = document.getElementById('tabelaHorarios')
    if (porHorario.length === 0) {
      el.innerHTML = '<tr><td colspan="3" style="color:var(--muted)">Nenhum dado ainda.</td></tr>'
      return
    }
    el.innerHTML = porHorario.map(h => `
      <tr>
        <td>${esc(h.horario)}</td>
        <td>${esc(h.total)}</td>
        <td><span class="tag-status ${h.total > 3 ? 'tag-cancelado' : 'tag-confirmado'}">${h.total > 3 ? 'Lotado' : 'Normal'}</span></td>
      </tr>
    `).join('')
  }

  // ── Faturamento ──────────────────────────────────────────────
  function renderFaturamento(todos) {
    const el = document.getElementById('faturamentoGrid')
    const confirmados = todos.filter(a => a.status === 'confirmado')
    const pendentes = todos.filter(a => a.status === 'pendente')
    const cancelados = todos.filter(a => a.status === 'cancelado')

    el.innerHTML = `
      <div class="card" style="text-align:center;">
        <p class="muted" style="margin-bottom:6px;">Faturamento confirmado</p>
        <strong style="font-size:1.8rem; color:#6fcf97;">${moeda(calcularFaturamento(confirmados))}</strong>
        <p style="margin-top:6px; font-size:0.85rem;">${confirmados.length} agendamento(s)</p>
      </div>
      <div class="card" style="text-align:center;">
        <p class="muted" style="margin-bottom:6px;">Faturamento pendente</p>
        <strong style="font-size:1.8rem; color:#f4e1ae;">${moeda(calcularFaturamento(pendentes))}</strong>
        <p style="margin-top:6px; font-size:0.85rem;">${pendentes.length} agendamento(s)</p>
      </div>
      <div class="card" style="text-align:center;">
        <p class="muted" style="margin-bottom:6px;">Cancelamentos</p>
        <strong style="font-size:1.8rem; color:#e05c5c;">${cancelados.length}</strong>
        <p style="margin-top:6px; font-size:0.85rem;">agendamento(s) cancelados</p>
      </div>
    `
  }

  // ── Cartão de agendamento (usado na agenda do dia e na lista) ─
  function botoes(a, compacto) {
    if (a.status !== 'pendente') return ''
    const est = compacto ? 'min-height:32px; padding:0 12px; font-size:0.82rem;' : 'min-height:34px; padding:0 14px; font-size:0.85rem;'
    return `
      <div style="display:flex; ${compacto ? '' : 'flex-direction:column;'} gap:6px;">
        <button class="btn btn-primary" style="${est}" data-acao="confirmado" data-id="${esc(a.id)}">✓ Confirmar</button>
        <button class="btn btn-secondary" style="${est} color:#e05c5c; border-color:#e05c5c;" data-acao="cancelado" data-id="${esc(a.id)}">✕ Cancelar</button>
      </div>`
  }

  function renderAgenda(agendaHoje) {
    const el = document.getElementById('agendaDia')
    if (agendaHoje.length === 0) { el.innerHTML = '<p class="muted">Nenhum agendamento para hoje.</p>'; return }
    el.innerHTML = agendaHoje.map(a => `
      <div class="card" style="padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span class="badge" style="font-size:0.78rem; padding:4px 10px;">#${esc(a.id)}</span>
              <span class="tag-status tag-${esc(a.status)}">${esc(capitalizar(a.status))}</span>
            </div>
            <strong style="font-size:1rem;">${esc(a.horario)}</strong>
            ${a.cliente_nome ? `<p style="margin:4px 0 2px;">🙋 ${esc(a.cliente_nome)}</p>` : ''}
            <p style="margin:4px 0 2px;">✂ ${esc(a.servicos)}</p>
            <p style="margin:0;">👤 ${esc(a.profissional)}</p>
          </div>
          ${botoes(a, false)}
        </div>
      </div>
    `).join('')
  }

  function renderTodosAgendamentos(todos) {
    const el = document.getElementById('todosAgendamentos')
    if (todos.length === 0) { el.innerHTML = '<p class="muted">Nenhum agendamento registrado.</p>'; return }
    el.innerHTML = todos.map(a => `
      <div class="card" style="padding:14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <span class="badge" style="font-size:0.75rem; padding:3px 8px;">#${esc(a.id)}</span>
              <span class="tag-status tag-${esc(a.status)}">${esc(capitalizar(a.status))}</span>
              <span style="color:var(--muted); font-size:0.85rem;">${formatarData(a.data)} às ${esc(a.horario)}</span>
            </div>
            ${a.cliente_nome ? `<p style="margin:0 0 2px;">🙋 ${esc(a.cliente_nome)}${a.cliente_telefone ? ' — ' + esc(a.cliente_telefone) : ''}</p>` : ''}
            <p style="margin:0 0 2px;">✂ ${esc(a.servicos)}</p>
            <p style="margin:0; color:var(--muted); font-size:0.88rem;">👤 ${esc(a.profissional)}</p>
            ${a.observacoes ? `<p style="margin:4px 0 0; color:var(--muted); font-size:0.85rem;">💬 ${esc(a.observacoes)}</p>` : ''}
          </div>
          ${botoes(a, true)}
        </div>
      </div>
    `).join('')
  }

  // ── Lista de clientes ────────────────────────────────────────
  function renderClientes(clientes) {
    const el = document.getElementById('listaClientes')
    if (clientes.length === 0) { el.innerHTML = '<p class="muted">Nenhum cliente cadastrado.</p>'; return }
    el.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="table">
          <thead><tr><th>#</th><th>Nome</th><th>E-mail</th><th>Telefone</th></tr></thead>
          <tbody>
            ${clientes.map(c => `
              <tr>
                <td>${esc(c.id)}</td><td>${esc(c.nome)}</td><td>${esc(c.email)}</td><td>${esc(c.telefone) || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`
  }

  // ── Confirmar / cancelar (delegação de eventos) ──────────────
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-acao]')
    if (!btn) return
    btn.disabled = true
    try {
      const { ok, data } = await B777.api(`/api/agendamentos/${btn.dataset.id}/status`, {
        method: 'PATCH', papel: 'admin', body: { status: btn.dataset.acao }
      })
      if (!ok) alert((data && data.erro) || 'Erro ao atualizar status.')
      carregarStats()
    } catch {
      alert('Erro ao atualizar status.')
      btn.disabled = false
    }
  })

  document.getElementById('btnAtualizarDados').addEventListener('click', carregarStats)
  carregarStats()
})()

if (!B777.bloqueado) (function () {
  let agendamentos = []
  let filtroAtual = 'todos'
  let idParaCancelar = null

  async function carregarAgendamentos() {
    try {
      const { ok, data } = await B777.api(`/api/agendamentos/usuario/${B777.usuario.id}`, { papel: 'cliente' })
      if (!ok) throw new Error()
      agendamentos = data
      renderizar()
    } catch {
      document.getElementById('listaAgendamentos').innerHTML = `
        <div class="card" style="text-align:center; padding:32px; color:#e05c5c;">
          <p>Não foi possível carregar seus agendamentos. Tente novamente em instantes.</p>
        </div>`
    }
  }

  function renderizar() {
    const lista = document.getElementById('listaAgendamentos')
    const vazio = document.getElementById('estadoVazio')

    const filtrados = filtroAtual === 'todos' ? agendamentos : agendamentos.filter(a => a.status === filtroAtual)

    if (filtrados.length === 0) {
      lista.innerHTML = ''
      vazio.style.display = 'block'
      return
    }

    vazio.style.display = 'none'
    lista.innerHTML = filtrados.map(a => `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <span class="badge">#${B777.esc(a.id)}</span>
              <span class="tag-status tag-${B777.esc(a.status)}">${B777.esc(B777.capitalizar(a.status))}</span>
            </div>
            <h3 style="margin:0 0 4px;">✂ ${B777.esc(a.servicos)}</h3>
            <p style="margin:2px 0;">👤 ${B777.esc(a.profissional)}</p>
            <p style="margin:2px 0;">📅 ${B777.formatarData(a.data)} às ${B777.esc(a.horario)}</p>
            ${a.observacoes ? `<p style="margin:6px 0; color:var(--muted);">💬 ${B777.esc(a.observacoes)}</p>` : ''}
          </div>
          ${a.status === 'pendente' ? `
            <button class="btn btn-secondary btn-cancelar" data-id="${B777.esc(a.id)}"
              style="background:linear-gradient(135deg,#e05c5c,#c04040); color:#fff; border:none;">
              Cancelar
            </button>` : ''}
        </div>
      </div>
    `).join('')
  }

  // ── Filtros ──────────────────────────────────────────────────
  document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      filtroAtual = btn.dataset.filtro
      renderizar()
    })
  })

  // ── Modal de cancelamento (sem onclick inline) ───────────────
  document.getElementById('listaAgendamentos').addEventListener('click', e => {
    const btn = e.target.closest('.btn-cancelar')
    if (!btn) return
    const a = agendamentos.find(x => String(x.id) === btn.dataset.id)
    if (!a) return
    idParaCancelar = a.id
    document.getElementById('modalCancelarInfo').textContent =
      `${a.servicos} — ${B777.formatarData(a.data)} às ${a.horario}`
    document.getElementById('modalCancelar').style.display = 'flex'
  })

  function fecharModal() {
    document.getElementById('modalCancelar').style.display = 'none'
    idParaCancelar = null
  }
  document.getElementById('btnFecharModal').addEventListener('click', fecharModal)
  document.getElementById('modalCancelar').addEventListener('click', e => {
    if (e.target.id === 'modalCancelar') fecharModal()
  })

  document.getElementById('btnConfirmarCancelamento').addEventListener('click', async () => {
    if (!idParaCancelar) return
    try {
      const { ok, data } = await B777.api(`/api/agendamentos/${idParaCancelar}/cancelar`, { method: 'PATCH', papel: 'cliente' })
      fecharModal()
      if (!ok) alert((data && data.erro) || 'Não foi possível cancelar.')
      await carregarAgendamentos()
    } catch {
      alert('Erro ao cancelar. Tente novamente.')
    }
  })

  carregarAgendamentos()
})()

const API = '/api/agendamentos'
let agendamentos = []
let filtroAtual = 'todos'
let idParaCancelar = null

// ── Carrega os agendamentos da API ────────────────────────────
async function carregarAgendamentos() {
  try {
    const resposta = await fetch(API)
    agendamentos = await resposta.json()
    renderizar()
  } catch (erro) {
    document.getElementById('listaAgendamentos').innerHTML = `
      <div class="card" style="text-align:center; padding:32px; color:#e05c5c;">
        <p>Não foi possível conectar ao servidor. Verifique se o backend está rodando.</p>
      </div>`
  }
}

// ── Renderiza os cards na tela ────────────────────────────────
function renderizar() {
  const lista = document.getElementById('listaAgendamentos')
  const vazio = document.getElementById('estadoVazio')

  let filtrados = agendamentos
  if (filtroAtual !== 'todos') {
    filtrados = agendamentos.filter(a => a.status === filtroAtual)
  }

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
            <span class="badge">#${a.id}</span>
            <span class="tag-status tag-${a.status}">${capitalizar(a.status)}</span>
          </div>
          <h3 style="margin:0 0 4px;">✂ ${a.servicos}</h3>
          <p style="margin:2px 0;">👤 ${a.profissional}</p>
          <p style="margin:2px 0;">📅 ${formatarData(a.data)} às ${a.horario}</p>
          ${a.observacoes ? `<p style="margin:6px 0; color:var(--muted);">💬 ${a.observacoes}</p>` : ''}
        </div>
        ${a.status === 'pendente' ? `
          <button class="btn btn-secondary"
            style="background:linear-gradient(135deg,#e05c5c,#c04040); color:#fff; border:none;"
            onclick="abrirModal(${a.id}, '${a.servicos}', '${a.data}', '${a.horario}')">
            Cancelar
          </button>` : ''}
      </div>
    </div>
  `).join('')
}

// ── Filtros ───────────────────────────────────────────────────
document.querySelectorAll('.btn-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    filtroAtual = btn.dataset.filtro
    renderizar()
  })
})

// ── Modal de cancelamento ─────────────────────────────────────
function abrirModal(id, servicos, data, horario) {
  idParaCancelar = id
  document.getElementById('modalCancelarInfo').textContent =
    `${servicos} — ${formatarData(data)} às ${horario}`
  document.getElementById('modalCancelar').style.display = 'flex'
}

document.getElementById('btnFecharModal').addEventListener('click', () => {
  document.getElementById('modalCancelar').style.display = 'none'
  idParaCancelar = null
})

document.getElementById('btnConfirmarCancelamento').addEventListener('click', async () => {
  if (!idParaCancelar) return

  try {
    await fetch(`${API}/${idParaCancelar}`, { method: 'DELETE' })
    document.getElementById('modalCancelar').style.display = 'none'
    idParaCancelar = null
    await carregarAgendamentos()
  } catch (erro) {
    alert('Erro ao cancelar. Tente novamente.')
  }
})

// ── Helpers ───────────────────────────────────────────────────
function formatarData(data) {
  if (!data) return ''
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// ── Inicia ────────────────────────────────────────────────────
carregarAgendamentos()
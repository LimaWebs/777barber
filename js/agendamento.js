const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || 'null')

let servicosSelecionados = []
let profissionalSelecionado = ''
let horarioSelecionado = ''

// Impede datas passadas
const inputData = document.getElementById('data')
const hoje = new Date().toISOString().slice(0, 10)
inputData.min = hoje

// ── Busca horários ocupados ───────────────────────────────────
async function atualizarHorariosOcupados() {
  const data = document.getElementById('data').value
  if (!data || !profissionalSelecionado) return

  try {
    const resp = await fetch(
      `http://localhost:3000/api/agendamentos/ocupados?data=${data}&profissional=${encodeURIComponent(profissionalSelecionado)}`
    )
    const ocupados = await resp.json()

    document.querySelectorAll('.selectable-slot').forEach(slot => {
      const hora = slot.dataset.value
      if (ocupados.includes(hora)) {
        slot.classList.add('slot-ocupado')
        slot.classList.remove('selected')
        slot.style.opacity = '0.35'
        slot.style.cursor = 'not-allowed'
        slot.title = 'Horário ocupado'
      } else {
        slot.classList.remove('slot-ocupado')
        slot.style.opacity = ''
        slot.style.cursor = ''
        slot.title = ''
      }
    })
  } catch { /* silencioso */ }
}

// ── Serviços ──────────────────────────────────────────────────
const COMBO = 'Combo corte + barba'
const COMBO_ITENS = ['Corte masculino', 'Barba completa']

document.querySelectorAll('.selectable-multi').forEach(opcao => {
  opcao.addEventListener('click', () => {
    const valor = opcao.dataset.value
    const preco = Number(opcao.dataset.price)

    if (opcao.classList.contains('selected')) {
      // Desmarcar
      opcao.classList.remove('selected')
      opcao.querySelector('.check-icon').textContent = '☐'
      servicosSelecionados = servicosSelecionados.filter(s => s.nome !== valor)
    } else {
      // Marcar — verifica conflito com combo
      if (valor === COMBO) {
        // Selecionou o combo — desmarca corte e barba separados
        COMBO_ITENS.forEach(item => {
          const el = [...document.querySelectorAll('.selectable-multi')]
            .find(o => o.dataset.value === item)
          if (el) {
            el.classList.remove('selected')
            el.querySelector('.check-icon').textContent = '☐'
          }
          servicosSelecionados = servicosSelecionados.filter(s => s.nome !== item)
        })
      } else if (COMBO_ITENS.includes(valor)) {
        // Selecionou corte ou barba — desmarca o combo
        const comboEl = [...document.querySelectorAll('.selectable-multi')]
          .find(o => o.dataset.value === COMBO)
        if (comboEl) {
          comboEl.classList.remove('selected')
          comboEl.querySelector('.check-icon').textContent = '☐'
        }
        servicosSelecionados = servicosSelecionados.filter(s => s.nome !== COMBO)
      }

      opcao.classList.add('selected')
      opcao.querySelector('.check-icon').textContent = '☑'
      servicosSelecionados.push({ nome: valor, preco })
    }
    atualizarResumo()
  })
})

// ── Profissional ──────────────────────────────────────────────
document.querySelectorAll('.selectable').forEach(opcao => {
  opcao.addEventListener('click', () => {
    document.querySelectorAll('.selectable').forEach(o => o.classList.remove('selected'))
    opcao.classList.add('selected')
    profissionalSelecionado = opcao.dataset.value
    atualizarResumo()
    atualizarHorariosOcupados()
  })
})

// ── Horário ───────────────────────────────────────────────────
document.querySelectorAll('.selectable-slot').forEach(slot => {
  slot.addEventListener('click', () => {
    if (slot.classList.contains('slot-ocupado')) return
    document.querySelectorAll('.selectable-slot').forEach(s => s.classList.remove('selected'))
    slot.classList.add('selected')
    horarioSelecionado = slot.dataset.value
    atualizarResumo()
  })
})

// ── Data ──────────────────────────────────────────────────────
document.getElementById('data').addEventListener('change', atualizarHorariosOcupados)

// ── Resumo ────────────────────────────────────────────────────
function atualizarResumo() {
  const resumo = document.getElementById('bookingSummary')
  const nenhum = servicosSelecionados.length === 0 && !profissionalSelecionado && !horarioSelecionado
  if (nenhum) { resumo.style.display = 'none'; return }

  resumo.style.display = 'flex'
  const total = servicosSelecionados.reduce((s, i) => s + i.preco, 0)

  document.getElementById('summaryServicos').textContent =
    servicosSelecionados.length ? '✂ ' + servicosSelecionados.map(s => s.nome).join(', ') : ''
  document.getElementById('summaryProfissional').textContent =
    profissionalSelecionado ? '👤 ' + profissionalSelecionado : ''
  document.getElementById('summaryHorario').textContent =
    horarioSelecionado ? '🕐 ' + horarioSelecionado : ''
  document.getElementById('summaryTotal').textContent =
    total > 0 ? 'Total: R$ ' + total : ''
}

// ── Confirmar ─────────────────────────────────────────────────
document.getElementById('btnConfirmar').addEventListener('click', async () => {
  const data = document.getElementById('data').value
  const hoje = new Date().toISOString().slice(0, 10)
  const obs = document.getElementById('obs').value

  if (servicosSelecionados.length === 0) return mostrarAlerta('Selecione pelo menos um serviço.', 'erro')
  if (!profissionalSelecionado) return mostrarAlerta('Selecione um profissional.', 'erro')
  if (!horarioSelecionado) return mostrarAlerta('Selecione um horário.', 'erro')
  if (!data) return mostrarAlerta('Escolha uma data.', 'erro')
  if (data < hoje) return mostrarAlerta('Não é possível agendar em datas passadas.', 'erro')

  const dados = {
    usuario_id: usuarioLogado?.id ?? null,
    servicos: servicosSelecionados.map(s => s.nome).join(', '),
    profissional: profissionalSelecionado,
    horario: horarioSelecionado,
    data,
    observacoes: obs
  }

  try {
    const resp = await fetch('http://localhost:3000/api/agendamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })

    if (!resp.ok) throw new Error()

    const resultado = await resp.json()
    mostrarAlerta('Agendamento confirmado! Código: #' + resultado.id, 'sucesso')

    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'))
    document.querySelectorAll('.check-icon').forEach(el => el.textContent = '☐')
    servicosSelecionados = []
    profissionalSelecionado = ''
    horarioSelecionado = ''
    document.getElementById('data').value = ''
    document.getElementById('obs').value = ''
    atualizarResumo()
    atualizarHorariosOcupados()

  } catch {
    mostrarAlerta('Não foi possível conectar ao servidor.', 'erro')
  }
})

function mostrarAlerta(mensagem, tipo) {
  const alerta = document.getElementById('agendamentoAlert')
  alerta.textContent = mensagem
  alerta.style.display = 'block'
  alerta.style.background = tipo === 'sucesso' ? '#2a5c3f' : '#5c2a2a'
  alerta.style.color = '#fff'
  alerta.style.padding = '12px 16px'
  alerta.style.borderRadius = '8px'
  alerta.style.marginTop = '12px'
}
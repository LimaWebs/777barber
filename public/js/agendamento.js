if (!B777.bloqueado) (function () {
  const COMBO = 'Combo corte + barba'
  const COMBO_ITENS = ['Corte masculino', 'Barba completa']

  let servicosSelecionados = []
  let profissionalSelecionado = ''
  let horarioSelecionado = ''

  const inputData = document.getElementById('data')
  inputData.min = B777.hoje()

  const slots = () => [...document.querySelectorAll('.selectable-slot')]

  // ── Calendário da semana (clicar escolhe a data) ─────────────
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  function renderCalendario() {
    const head = document.getElementById('calendarHead')
    const row = document.getElementById('calendarRow')
    if (!head || !row) return
    const base = new Date()
    base.setHours(12, 0, 0, 0)
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base); d.setDate(base.getDate() + i); return d
    })
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    head.innerHTML = dias.map(d => `<div class="day"><strong>${DIAS[d.getDay()]}</strong></div>`).join('')
    row.innerHTML = dias.map(d => `
      <button type="button" class="day${inputData.value === iso(d) ? ' ocupado' : ''}" data-data="${iso(d)}" style="cursor:pointer; text-align:left;">
        <strong>${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</strong>
        <span>${inputData.value === iso(d) ? 'Selecionado' : 'Escolher'}</span>
      </button>`).join('')
    row.querySelectorAll('[data-data]').forEach(btn => btn.addEventListener('click', () => {
      inputData.value = btn.dataset.data
      aoMudarData()
    }))
  }

  // ── Horários: ocupados no banco + horários que já passaram hoje ─
  function limparSelecaoHorario() {
    horarioSelecionado = ''
    slots().forEach(s => s.classList.remove('selected'))
  }

  function bloquearSlot(slot, motivo) {
    slot.classList.add('slot-ocupado')
    slot.classList.remove('selected')
    slot.title = motivo
    if (slot.dataset.value === horarioSelecionado) horarioSelecionado = ''
  }

  async function atualizarHorarios() {
    const data = inputData.value
    slots().forEach(s => { s.classList.remove('slot-ocupado'); s.title = '' })

    if (data) {
      if (data === B777.hoje()) {
        const agora = B777.horaAgora()
        slots().filter(s => s.dataset.value <= agora).forEach(s => bloquearSlot(s, 'Horário já passou'))
      }
    }

    if (data && profissionalSelecionado) {
      try {
        const { ok, data: ocupados } = await B777.api(
          `/api/agendamentos/ocupados?data=${encodeURIComponent(data)}&profissional=${encodeURIComponent(profissionalSelecionado)}`
        )
        if (ok && Array.isArray(ocupados)) {
          slots().filter(s => ocupados.includes(s.dataset.value)).forEach(s => bloquearSlot(s, 'Horário ocupado'))
        }
      } catch { /* mostra como livre; o servidor confere de novo ao confirmar */ }
    }
    atualizarResumo()
  }

  function aoMudarData() {
    renderCalendario()
    atualizarHorarios()
  }

  // ── Serviços ─────────────────────────────────────────────────
  const opcoesServico = () => [...document.querySelectorAll('.selectable-multi')]
  const achar = nome => opcoesServico().find(o => o.dataset.value === nome)

  function desmarcar(el) {
    if (!el) return
    el.classList.remove('selected')
    el.querySelector('.check-icon').textContent = '☐'
    servicosSelecionados = servicosSelecionados.filter(s => s.nome !== el.dataset.value)
  }

  opcoesServico().forEach(opcao => {
    opcao.addEventListener('click', () => {
      const valor = opcao.dataset.value
      const preco = Number(opcao.dataset.price)

      if (opcao.classList.contains('selected')) {
        desmarcar(opcao)
      } else {
        // Combo e (corte/barba) não podem ficar juntos
        if (valor === COMBO) COMBO_ITENS.forEach(i => desmarcar(achar(i)))
        else if (COMBO_ITENS.includes(valor)) desmarcar(achar(COMBO))

        opcao.classList.add('selected')
        opcao.querySelector('.check-icon').textContent = '☑'
        servicosSelecionados.push({ nome: valor, preco })
      }
      atualizarResumo()
    })
  })

  // ── Profissional ─────────────────────────────────────────────
  document.querySelectorAll('.selectable').forEach(opcao => {
    opcao.addEventListener('click', () => {
      document.querySelectorAll('.selectable').forEach(o => o.classList.remove('selected'))
      opcao.classList.add('selected')
      profissionalSelecionado = opcao.dataset.value
      atualizarHorarios()
    })
  })

  // ── Horário ──────────────────────────────────────────────────
  slots().forEach(slot => {
    slot.addEventListener('click', () => {
      if (slot.classList.contains('slot-ocupado')) return
      slots().forEach(s => s.classList.remove('selected'))
      slot.classList.add('selected')
      horarioSelecionado = slot.dataset.value
      atualizarResumo()
    })
  })

  inputData.addEventListener('change', aoMudarData)

  // ── Resumo ───────────────────────────────────────────────────
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

  // ── Confirmar ────────────────────────────────────────────────
  const btnConfirmar = document.getElementById('btnConfirmar')
  btnConfirmar.addEventListener('click', async () => {
    const data = inputData.value
    const obs = document.getElementById('obs').value.trim()

    if (servicosSelecionados.length === 0) return mostrarAlerta('Selecione pelo menos um serviço.', 'erro')
    if (!profissionalSelecionado) return mostrarAlerta('Selecione um profissional.', 'erro')
    if (!data) return mostrarAlerta('Escolha uma data.', 'erro')
    if (!horarioSelecionado) return mostrarAlerta('Selecione um horário.', 'erro')
    if (data < B777.hoje()) return mostrarAlerta('Não é possível agendar em datas passadas.', 'erro')

    btnConfirmar.disabled = true // evita clique duplo = agendamento duplicado
    try {
      const { ok, data: resultado } = await B777.api('/api/agendamentos', {
        method: 'POST',
        papel: 'cliente',
        body: {
          servicos: servicosSelecionados.map(s => s.nome).join(', '),
          profissional: profissionalSelecionado,
          horario: horarioSelecionado,
          data,
          observacoes: obs
        }
      })

      if (!ok) {
        mostrarAlerta((resultado && resultado.erro) || 'Não foi possível agendar.', 'erro')
        atualizarHorarios() // pode ter sido ocupado por outra pessoa
        return
      }

      mostrarAlerta('Agendamento confirmado! Código: #' + resultado.id, 'sucesso')
      document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'))
      document.querySelectorAll('.check-icon').forEach(el => el.textContent = '☐')
      servicosSelecionados = []
      profissionalSelecionado = ''
      horarioSelecionado = ''
      inputData.value = ''
      document.getElementById('obs').value = ''
      renderCalendario()
      atualizarHorarios()
    } catch {
      mostrarAlerta('Não foi possível conectar ao servidor.', 'erro')
    } finally {
      btnConfirmar.disabled = false
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

  renderCalendario()
})()

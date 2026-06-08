/* =========================================================
   agendamento.js — agendamento.html
   777 Barber
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ── Estado da seleção ──
  const selecao = {
    servicos:     [],   // múltiplos
    profissional: null, // único
    horario:      null, // único
  };

  // Bloqueia datas passadas
  App.bloquearDataPassada('data');

  // ── Seleção MÚLTIPLA de serviços ──
  document.querySelectorAll('.selectable-multi').forEach(el => {
    el.addEventListener('click', () => {
      const valor = el.dataset.value;
      const preco = parseFloat(el.dataset.price);
      const check = el.querySelector('.check-icon');

      if (el.classList.contains('selected')) {
        // Remove
        el.classList.remove('selected');
        if (check) check.textContent = '☐';
        selecao.servicos = selecao.servicos.filter(s => s.valor !== valor);
      } else {
        // Adiciona
        el.classList.add('selected');
        if (check) check.textContent = '☑';
        selecao.servicos.push({ valor, preco });
      }
      atualizarResumo();
    });
  });

  // ── Seleção ÚNICA de profissional ──
  document.querySelectorAll('.selectable[data-group="profissional"]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.selectable[data-group="profissional"]')
        .forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
      selecao.profissional = el.dataset.value;
      atualizarResumo();
    });
  });

  // ── Seleção ÚNICA de horário via slots ──
  document.querySelectorAll('.selectable-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      document.querySelectorAll('.selectable-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      selecao.horario = slot.dataset.value;
      atualizarResumo();
    });
  });

  // ── Resumo dinâmico ──
  function atualizarResumo() {
    const summary = document.getElementById('bookingSummary');

    const temAlgo = selecao.servicos.length > 0 || selecao.profissional || selecao.horario;
    summary.style.display = temAlgo ? 'flex' : 'none';

    const elServicos      = document.getElementById('summaryServicos');
    const elProfissional  = document.getElementById('summaryProfissional');
    const elHorario       = document.getElementById('summaryHorario');
    const elTotal         = document.getElementById('summaryTotal');

    if (selecao.servicos.length > 0) {
      const nomes = selecao.servicos.map(s => s.valor).join(', ');
      elServicos.textContent = `✂ ${nomes}`;
      elServicos.style.display = 'inline-block';
    } else {
      elServicos.style.display = 'none';
    }

    elProfissional.textContent = selecao.profissional ? `👤 ${selecao.profissional}` : '';
    elProfissional.style.display = selecao.profissional ? 'inline-block' : 'none';

    elHorario.textContent = selecao.horario ? `🕐 ${selecao.horario}` : '';
    elHorario.style.display = selecao.horario ? 'inline-block' : 'none';

    if (selecao.servicos.length > 0) {
      const total = selecao.servicos.reduce((acc, s) => acc + s.preco, 0);
      elTotal.textContent = `💰 R$ ${total}`;
      elTotal.style.display = 'inline-block';
    } else {
      elTotal.style.display = 'none';
    }
  }

  // ── Calendário visual ──
  function gerarCalendario() {
    const hoje       = new Date();
    const diasSemana = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    const horarios   = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00'];
    const ocupados   = [0, 3, 6, 2, 5];

    const head = document.getElementById('calendarHead');
    const row  = document.getElementById('calendarRow');
    if (!head || !row) return;

    head.innerHTML = '';
    row.innerHTML  = '';

    diasSemana.forEach((dia, i) => {
      const d = new Date(hoje);
      const diaSemanaAtual = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1;
      d.setDate(hoje.getDate() - diaSemanaAtual + i);
      const div = document.createElement('div');
      div.className = 'day';
      div.innerHTML = `<strong>${dia}</strong>${d.getDate()}`;
      head.appendChild(div);
    });

    horarios.forEach((hora, i) => {
      const isOcupado = ocupados.includes(i);
      const div = document.createElement('div');
      div.className = `day${isOcupado ? ' ocupado' : ''}`;
      div.innerHTML = `${hora}<br>${isOcupado ? 'Ocupado' : 'Aberto'}`;
      row.appendChild(div);
    });
  }

  gerarCalendario();

  // ── Confirmar agendamento ──
  const btnConfirmar = document.getElementById('btnConfirmar');
  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', async () => {
      App.limparErros();

      const data = document.getElementById('data').value;
      let valido = true;

      if (selecao.servicos.length === 0) {
        App.mostrarAlerta('agendamentoAlert', 'Selecione pelo menos um serviço.', 'error');
        valido = false;
      } else if (!selecao.profissional) {
        App.mostrarAlerta('agendamentoAlert', 'Selecione um profissional.', 'error');
        valido = false;
      } else if (!selecao.horario) {
        App.mostrarAlerta('agendamentoAlert', 'Selecione um horário.', 'error');
        valido = false;
      } else if (!data) {
        App.mostrarErroCampo('data', 'dataError', 'Selecione uma data.');
        valido = false;
      }

      if (!valido) return;

      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Agendando...';

      // ── Integração futura com API Python ──
      // const obs = document.getElementById('obs').value;
      // const resp = await fetch('http://localhost:5000/api/agendamentos', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`
      //   },
      //   body: JSON.stringify({
      //     servicos: selecao.servicos,
      //     profissional: selecao.profissional,
      //     data,
      //     hora: selecao.horario,
      //     observacoes: obs
      //   })
      // });

      // ── Simulação: salva no localStorage para "Meus Agendamentos" ──
      setTimeout(() => {
        const obs = document.getElementById('obs').value;
        const total = selecao.servicos.reduce((acc, s) => acc + s.preco, 0);
        const nomes = selecao.servicos.map(s => s.valor).join(' + ');

        const novoAgendamento = {
          id:           Date.now(),
          servicos:     nomes,
          profissional: selecao.profissional,
          data,
          horario:      selecao.horario,
          obs,
          total,
          status:       'confirmado',
          criadoEm:     new Date().toLocaleDateString('pt-BR'),
        };

        // Salva no localStorage (substituir por API futuramente)
        const lista = JSON.parse(localStorage.getItem('agendamentos') || '[]');
        lista.push(novoAgendamento);
        localStorage.setItem('agendamentos', JSON.stringify(lista));

        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar agendamento';

        const servicosTexto = selecao.servicos.map(s => s.valor).join(', ');
        App.mostrarAlerta(
          'agendamentoAlert',
          `✅ Agendamento confirmado! ${servicosTexto} com ${selecao.profissional} em ${formatarData(data)} às ${selecao.horario}.`,
          'success'
        );

        resetarFormulario();
      }, 1200);
    });
  }

  function formatarData(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function resetarFormulario() {
    selecao.servicos     = [];
    selecao.profissional = null;
    selecao.horario      = null;

    document.querySelectorAll('.selectable-multi.selected').forEach(el => {
      el.classList.remove('selected');
      const check = el.querySelector('.check-icon');
      if (check) check.textContent = '☐';
    });
    document.querySelectorAll('.selectable.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.selectable-slot.selected').forEach(el => el.classList.remove('selected'));
    document.getElementById('data').value = '';
    document.getElementById('obs').value  = '';
    document.getElementById('bookingSummary').style.display = 'none';
  }
});

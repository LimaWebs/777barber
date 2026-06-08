/* =========================================================
   profissional.js — painel do proprietário (profissional.html)
   777 Barber | Dados ilustrativos — integração com MySQL via API Python
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ── Dados ilustrativos (serão substituídos pelos retornos da API) ──
  // Quando a API estiver pronta, chame: carregarDados()
  // e substitua os dados abaixo pelos vindos do backend.
  //
  // Exemplo de integração futura:
  // async function carregarDados() {
  //   const resp = await fetch('http://localhost:5000/api/dashboard', {
  //     headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
  //   });
  //   const data = await resp.json();
  //   renderizarDashboard(data);
  // }

  const dadosDashboard = {
    kpis: {
      agendamentos: 124,
      servico:      'Combo',
      pico:         '18h',
      ocupacao:     '87%',
    },
    servicos: [
      { nome: 'Combo corte + barba', percentual: 48 },
      { nome: 'Corte masculino',     percentual: 32 },
      { nome: 'Barba completa',      percentual: 20 },
    ],
    horarios: [
      { hora: '16h', reservas: 18, status: 'Alto' },
      { hora: '17h', reservas: 22, status: 'Alto' },
      { hora: '18h', reservas: 27, status: 'Muito alto' },
      { hora: '19h', reservas: 20, status: 'Alto' },
    ],
    faturamento: [
      { label: 'Faturamento bruto',  valor: 'R$ 6.820,00' },
      { label: 'Ticket médio',       valor: 'R$ 55,00' },
      { label: 'Serviços prestados', valor: '124' },
    ],
    agenda: [
      { hora: '12:00', cliente: 'Professor', servico: 'Corte masculino' },
      { hora: '15:00', cliente: 'Michael',   servico: 'Combo completo' },
      { hora: '18:00', cliente: 'Yansen',    servico: 'Barba + alinhamento' },
    ],
  };

  renderizarDashboard(dadosDashboard);

  // ── Renderização ──
  function renderizarDashboard(data) {
    renderizarKPIs(data.kpis);
    renderizarBarras(data.servicos);
    renderizarTabelaHorarios(data.horarios);
    renderizarFaturamento(data.faturamento);
    renderizarAgenda(data.agenda);
  }

  function renderizarKPIs(kpis) {
    const el = (id) => document.getElementById(id);
    animarContador('kpiAgendamentos', kpis.agendamentos);
    if (el('kpiServico'))  el('kpiServico').textContent  = kpis.servico;
    if (el('kpiPico'))     el('kpiPico').textContent     = kpis.pico;
    if (el('kpiOcupacao')) el('kpiOcupacao').textContent = kpis.ocupacao;
  }

  function renderizarBarras(servicos) {
    const container = document.getElementById('barList');
    if (!container) return;
    container.innerHTML = '';

    servicos.forEach(s => {
      const item = document.createElement('div');
      item.className = 'bar-item';
      item.innerHTML = `
        <div>${s.nome} — ${s.percentual}%</div>
        <div class="bar-track">
          <div class="bar-fill" style="width: 0%;" data-width="${s.percentual}%"></div>
        </div>
      `;
      container.appendChild(item);
    });

    // Anima as barras após inserção
    setTimeout(() => {
      container.querySelectorAll('.bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.width;
      });
    }, 100);
  }

  function renderizarTabelaHorarios(horarios) {
    const tbody = document.getElementById('tabelaHorarios');
    if (!tbody) return;
    tbody.innerHTML = '';

    horarios.forEach(h => {
      const classeStatus = h.status === 'Muito alto' ? 'status-muito-alto' : 'status-alto';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${h.hora}</td>
        <td>${h.reservas}</td>
        <td class="${classeStatus}">${h.status}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderizarFaturamento(itens) {
    const grid = document.getElementById('faturamentoGrid');
    if (!grid) return;
    grid.innerHTML = '';

    itens.forEach(item => {
      const div = document.createElement('div');
      div.className = 'stat';
      div.innerHTML = `
        <strong>${item.valor}</strong>
        <span class="muted">${item.label}</span>
      `;
      grid.appendChild(div);
    });
  }

  function renderizarAgenda(agenda) {
    const grid = document.getElementById('agendaDia');
    if (!grid) return;
    grid.innerHTML = '';

    agenda.forEach(a => {
      const div = document.createElement('div');
      div.className = 'stat';
      div.innerHTML = `
        <strong>${a.hora}</strong>
        <span class="muted">${a.cliente} — ${a.servico}</span>
      `;
      grid.appendChild(div);
    });
  }

  // ── Contador animado para KPIs ──
  function animarContador(elementId, valorFinal) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duracao  = 1000;
    const intervalo = 30;
    const passos   = duracao / intervalo;
    let atual      = 0;

    const timer = setInterval(() => {
      atual += valorFinal / passos;
      if (atual >= valorFinal) {
        atual = valorFinal;
        clearInterval(timer);
      }
      el.textContent = Math.floor(atual);
    }, intervalo);
  }

  // ── Botão de atualizar dados ──
  const btnAtualizar = document.getElementById('btnAtualizarDados');
  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', () => {
      btnAtualizar.textContent = 'Atualizando...';
      btnAtualizar.disabled = true;

      // Futuramente: carregarDados()
      setTimeout(() => {
        renderizarDashboard(dadosDashboard);
        btnAtualizar.textContent = '⟳ Atualizar dados';
        btnAtualizar.disabled = false;
      }, 1000);
    });
  }
});
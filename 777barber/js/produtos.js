/* =========================================================
   produtos.js — tela de cosméticos (produtos.html)
   777 Barber
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ── Estado do carrinho ──
  const carrinho = [];

  // ── Botões "Adicionar ao carrinho" ──
  document.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const card    = btn.closest('.product-card');
      const produto = card.dataset.produto;
      const preco   = parseFloat(card.dataset.preco);

      const itemExistente = carrinho.find(i => i.produto === produto);
      if (itemExistente) {
        itemExistente.quantidade++;
      } else {
        carrinho.push({ produto, preco, quantidade: 1 });
      }

      // Feedback visual no botão
      btn.textContent = 'Adicionado ✓';
      btn.style.background = 'linear-gradient(135deg, #4caf82, #3a9e70)';
      setTimeout(() => {
        btn.textContent = 'Adicionar ao carrinho';
        btn.style.background = '';
      }, 1500);

      atualizarCarrinho();
    });
  });

  // ── Atualiza a barra do carrinho ──
  function atualizarCarrinho() {
    const cartBar  = document.getElementById('cartBar');
    const cartInfo = document.getElementById('cartInfo');

    if (carrinho.length === 0) {
      cartBar.style.display = 'none';
      return;
    }

    cartBar.style.display = 'flex';
    const total     = carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
    const qtdItens  = carrinho.reduce((acc, i) => acc + i.quantidade, 0);
    cartInfo.textContent = `${qtdItens} item(s) — R$ ${total.toFixed(2).replace('.', ',')}`;
  }

  // ── Finalizar compra ──
  const btnFinalizar = document.getElementById('btnFinalizarCompra');
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', () => {
      if (carrinho.length === 0) return;

      // Monta resumo da compra
      const resumo = carrinho
        .map(i => `• ${i.produto} (x${i.quantidade}) — R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}`)
        .join('\n');
      const total = carrinho.reduce((acc, i) => acc + i.preco * i.quantidade, 0);

      const el = document.getElementById('modalResumo');
      if (el) el.textContent = `${resumo}\n\nTotal: R$ ${total.toFixed(2).replace('.', ',')}`;

      document.getElementById('modalCompra').style.display = 'flex';

      // ── Integração futura com API Python ──
      //
      // fetch('http://localhost:5000/api/pedidos', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`
      //   },
      //   body: JSON.stringify({ itens: carrinho })
      // });
    });
  }

  // ── Limpar carrinho ──
  const btnLimpar = document.getElementById('btnLimparCarrinho');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', () => {
      carrinho.length = 0;
      atualizarCarrinho();
    });
  }

  // ── Fechar modal ──
  const btnFechar = document.getElementById('btnFecharModal');
  if (btnFechar) {
    btnFechar.addEventListener('click', () => {
      document.getElementById('modalCompra').style.display = 'none';
      carrinho.length = 0;
      atualizarCarrinho();
    });
  }

  // Fecha modal clicando fora
  const modalOverlay = document.getElementById('modalCompra');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
        carrinho.length = 0;
        atualizarCarrinho();
      }
    });
  }
});
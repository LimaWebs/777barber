let carrinho = []

document.querySelectorAll('.btn-add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.product-card')
    const produto = card.dataset.produto
    const preco = parseFloat(card.dataset.preco)
    const existente = carrinho.find(i => i.produto === produto)

    if (existente) existente.qtd++
    else carrinho.push({ produto, preco, qtd: 1 })

    atualizarCarrinho()
  })
})

function atualizarCarrinho() {
  const bar = document.getElementById('cartBar')
  const info = document.getElementById('cartInfo')
  const total = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0)
  const qtd = carrinho.reduce((s, i) => s + i.qtd, 0)

  if (qtd === 0) { bar.style.display = 'none'; return }
  bar.style.display = 'flex'
  info.textContent = `${qtd} item(s) — R$ ${total.toFixed(2).replace('.', ',')}`
}

document.getElementById('btnLimparCarrinho').addEventListener('click', () => {
  carrinho = []
  atualizarCarrinho()
})

document.getElementById('btnFinalizarCompra').addEventListener('click', async (e) => {
  if (carrinho.length === 0) return
  const btn = e.currentTarget
  btn.disabled = true

  try {
    const { ok, data } = await B777.api('/api/pedidos', {
      method: 'POST',
      body: { itens: carrinho.map(i => ({ produto: i.produto, qtd: i.qtd })) }
    })

    if (!ok) {
      alert((data && data.erro) || 'Não foi possível registrar o pedido.')
      return
    }

    document.getElementById('modalResumo').textContent =
      `${data.resumo} — Total: R$ ${Number(data.total).toFixed(2).replace('.', ',')}`
    document.getElementById('modalCompra').style.display = 'flex'
    carrinho = []
    atualizarCarrinho()
  } catch {
    alert('Não foi possível conectar ao servidor. Seu carrinho foi mantido.')
  } finally {
    btn.disabled = false
  }
})

document.getElementById('btnFecharModal').addEventListener('click', () => {
  document.getElementById('modalCompra').style.display = 'none'
})

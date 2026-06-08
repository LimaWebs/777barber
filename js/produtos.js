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

document.getElementById('btnFinalizarCompra').addEventListener('click', async () => {
  if (carrinho.length === 0) return

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
  const total = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0)
  const resumo = carrinho.map(i => `${i.qtd}x ${i.produto}`).join(', ')

  try {
    await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: usuario?.id ?? null,
        produtos: resumo,
        total
      })
    })
  } catch { /* segue mesmo sem salvar */ }

  document.getElementById('modalResumo').textContent = resumo + ` — Total: R$ ${total.toFixed(2).replace('.', ',')}`
  document.getElementById('modalCompra').style.display = 'flex'
  carrinho = []
  atualizarCarrinho()
})

document.getElementById('btnFecharModal').addEventListener('click', () => {
  document.getElementById('modalCompra').style.display = 'none'
})
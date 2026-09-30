// ══════════════════════════════════════════════════════════════
// 777 Barber — script compartilhado (sessão, menu, helpers)
// Exposto em window.B777 para os scripts de cada página.
// ══════════════════════════════════════════════════════════════
(function () {
  const B = (window.B777 = {})

  function ler(chave) {
    try { return JSON.parse(localStorage.getItem(chave) || 'null') } catch { return null }
  }
  const pad = n => String(n).padStart(2, '0')

  B.usuario = ler('usuario')
  B.admin = ler('admin')
  // Sessões antigas (sem token) não valem mais: força novo login
  if (B.usuario && !B.usuario.token) { localStorage.removeItem('usuario'); B.usuario = null }
  if (B.admin && !B.admin.token) { localStorage.removeItem('admin'); B.admin = null }
  B.sessao = B.admin || B.usuario

  // Data de hoje (YYYY-MM-DD) no fuso do navegador — toISOString() usa UTC e erra a partir das 21h no Brasil
  B.hoje = function () {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  B.horaAgora = function () {
    const d = new Date()
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  // Escapa texto antes de colocar em innerHTML (evita XSS com nome, observações etc.)
  B.esc = function (v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  }
  B.capitalizar = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '')
  B.formatarData = function (d) {
    if (!d) return ''
    const [a, m, dia] = String(d).split('-')
    return `${dia}/${m}/${a}`
  }
  B.moeda = n => 'R$ ' + Number(n).toFixed(2).replace('.', ',')

  B.sair = function () {
    localStorage.removeItem('usuario')
    localStorage.removeItem('admin')
    window.location.href = '/index.html'
  }

  // fetch que já envia o token e trata sessão expirada
  // papel: 'cliente' | 'admin' | undefined (público, mas envia token se houver)
  B.api = async function (url, { method = 'GET', body, papel } = {}) {
    const headers = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const sessao = papel === 'admin' ? B.admin : papel === 'cliente' ? B.usuario : B.sessao
    if (sessao && sessao.token) headers.Authorization = 'Bearer ' + sessao.token

    const resp = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
    let data = null
    try { data = await resp.json() } catch { /* sem corpo */ }

    if (resp.status === 401 && papel) {
      localStorage.removeItem(papel === 'admin' ? 'admin' : 'usuario')
      window.location.replace(papel === 'admin' ? '/login-admin.html' : '/login.html')
    }
    return { ok: resp.ok, status: resp.status, data }
  }

  // ── Proteção de páginas ─────────────────────────────────────
  const pagina = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '')
  B.pagina = pagina
  B.bloqueado = false

  if (['agendamento', 'meus-agendamentos'].includes(pagina) && !(B.usuario && B.usuario.token)) {
    B.bloqueado = true
    // Admin não agenda como cliente: manda para o painel dele
    window.location.replace(B.admin ? '/profissional.html' : '/login.html')
  } else if (pagina === 'profissional' && !(B.admin && B.admin.token)) {
    B.bloqueado = true
    window.location.replace('/login-admin.html')
  }

  // ── Menu (montado igual em todas as páginas) ────────────────
  const nav = document.getElementById('navLinks')
  if (!nav) return

  const links = []
  if (B.admin) {
    links.push(['index', '/index.html', 'Início'], ['produtos', '/produtos.html', 'Cosméticos'], ['profissional', '/profissional.html', 'Painel'])
  } else if (B.usuario) {
    links.push(['index', '/index.html', 'Início'], ['agendamento', '/agendamento.html', 'Agendamento'],
      ['meus-agendamentos', '/meus-agendamentos.html', 'Meus Agendamentos'], ['produtos', '/produtos.html', 'Cosméticos'])
  } else {
    links.push(['login', '/login.html', 'Login'], ['index', '/index.html', 'Início'],
      ['agendamento', '/agendamento.html', 'Agendamento'], ['produtos', '/produtos.html', 'Cosméticos'])
  }

  nav.innerHTML = links
    .map(([id, href, texto]) => `<a href="${href}"${id === pagina ? ' class="active"' : ''}>${texto}</a>`)
    .join('')

  if (B.sessao) {
    const saudacao = document.createElement('span')
    saudacao.className = 'nav-user'
    saudacao.textContent = '👤 ' + B.sessao.nome
    const btnSair = document.createElement('button')
    btnSair.type = 'button'
    btnSair.textContent = 'Sair'
    btnSair.addEventListener('click', B.sair)
    nav.append(saudacao, btnSair)
  }

  const toggle = document.getElementById('menuToggle')
  if (toggle) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'))
    nav.addEventListener('click', e => { if (e.target.closest('a')) nav.classList.remove('open') })
  }
})()

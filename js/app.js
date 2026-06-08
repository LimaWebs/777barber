// ── Menu mobile ───────────────────────────────────────────────
const toggle = document.getElementById('menuToggle')
const nav = document.getElementById('navLinks')
if (toggle && nav) {
  toggle.addEventListener('click', () => nav.classList.toggle('open'))
}

// ── Sessão do usuário ─────────────────────────────────────────
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
const admin = JSON.parse(localStorage.getItem('admin') || 'null')
const sessao = admin || usuario

// Páginas que exigem login de cliente
const paginasProtegidas = ['agendamento.html', 'meus-agendamentos.html']

// Páginas que exigem login de admin
const paginasAdmin = ['profissional.html']

const paginaAtual = window.location.pathname.split('/').pop()

if (paginasProtegidas.includes(paginaAtual) && !usuario && !admin) {
  window.location.href = 'login.html'
}

if (paginasAdmin.includes(paginaAtual) && !admin) {
  window.location.href = 'login-admin.html'
}

// ── Atualiza o menu com nome do usuário + logout ──────────────
if (nav && sessao) {
  // Remove o link de login do menu
  const linkLogin = nav.querySelector('a[href="login.html"]')
  if (linkLogin) linkLogin.remove()

  // Adiciona nome e botão de logout
  const saudacao = document.createElement('span')
  saudacao.style.cssText = 'color:var(--gold); font-size:0.9rem; display:flex; align-items:center; gap:6px;'
  saudacao.innerHTML = `👤 ${sessao.nome}`

  const btnLogout = document.createElement('button')
  btnLogout.textContent = 'Sair'
  btnLogout.style.cssText = `
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    color: var(--muted);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.82rem;
    cursor: pointer;
  `
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('usuario')
    localStorage.removeItem('admin')
    window.location.href = 'login.html'
  })

  nav.appendChild(saudacao)
  nav.appendChild(btnLogout)
}
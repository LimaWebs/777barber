document.getElementById('toggleSenha').addEventListener('click', () => {
  const campo = document.getElementById('senha')
  campo.type = campo.type === 'password' ? 'text' : 'password'
})

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('email').value.trim()
  const senha = document.getElementById('senha').value
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '')

  if (!email) { document.getElementById('emailError').textContent = 'Informe o e-mail.'; return }
  if (!senha) { document.getElementById('senhaError').textContent = 'Informe a senha.'; return }

  try {
    const resp = await fetch('http://localhost:3000/api/usuarios/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    })
    const data = await resp.json()

    if (!resp.ok) return mostrarAlerta(data.erro, 'erro')

    localStorage.setItem('usuario', JSON.stringify(data))
    mostrarAlerta('Login realizado! Redirecionando...', 'sucesso')
    setTimeout(() => window.location.href = 'home.html', 1200)
  } catch {
    mostrarAlerta('Erro ao conectar ao servidor.', 'erro')
  }
})

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('loginAlert')
  el.textContent = msg
  el.style.display = 'block'
  el.style.background = tipo === 'sucesso' ? '#2a5c3f' : '#5c2a2a'
  el.style.color = '#fff'
  el.style.padding = '12px 16px'
  el.style.borderRadius = '8px'
}
document.getElementById('toggleAdminSenha').addEventListener('click', () => {
  const campo = document.getElementById('adminSenha')
  campo.type = campo.type === 'password' ? 'text' : 'password'
})

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('adminEmail').value.trim()
  const senha = document.getElementById('adminSenha').value
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '')

  if (!email) { document.getElementById('adminEmailError').textContent = 'Informe o e-mail.'; return }
  if (!senha) { document.getElementById('adminSenhaError').textContent = 'Informe a senha.'; return }

  try {
    const resp = await fetch('/api/usuarios/login-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    })
    const data = await resp.json()

    if (!resp.ok) return mostrarAlerta(data.erro, 'erro')

    localStorage.setItem('admin', JSON.stringify(data))
    mostrarAlerta('Acesso autorizado! Redirecionando...', 'sucesso')
    setTimeout(() => window.location.href = 'profissional.html', 1200)
  } catch {
    mostrarAlerta('Erro ao conectar ao servidor.', 'erro')
  }
})

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('adminAlert')
  el.textContent = msg
  el.style.display = 'block'
  el.style.background = tipo === 'sucesso' ? '#2a5c3f' : '#5c2a2a'
  el.style.color = '#fff'
  el.style.padding = '12px 16px'
  el.style.borderRadius = '8px'
}
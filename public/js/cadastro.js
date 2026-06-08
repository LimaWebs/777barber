// Máscara de telefone
document.getElementById('telefone').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`
  else if (v.length > 0) v = `(${v}`
  this.value = v
})

// Mostrar/ocultar senha
document.getElementById('toggleSenha').addEventListener('click', () => {
  const campo = document.getElementById('senha')
  campo.type = campo.type === 'password' ? 'text' : 'password'
})
document.getElementById('toggleConfirm').addEventListener('click', () => {
  const campo = document.getElementById('senhaConfirm')
  campo.type = campo.type === 'password' ? 'text' : 'password'
})

// Envio do formulário
document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  let valido = true

  const nome = document.getElementById('nome').value.trim()
  const email = document.getElementById('email').value.trim()
  const telefone = document.getElementById('telefone').value.trim()
  const nascimento = document.getElementById('nascimento').value
  const senha = document.getElementById('senha').value
  const senhaConfirm = document.getElementById('senhaConfirm').value

  document.querySelectorAll('.field-error').forEach(el => el.textContent = '')

  if (!nome) { document.getElementById('nomeError').textContent = 'Informe seu nome.'; valido = false }
  if (!email) { document.getElementById('emailError').textContent = 'Informe seu e-mail.'; valido = false }
  if (senha.length < 6) { document.getElementById('senhaError').textContent = 'Mínimo 6 caracteres.'; valido = false }
  if (senha !== senhaConfirm) { document.getElementById('senhaConfirmError').textContent = 'As senhas não coincidem.'; valido = false }
  if (!valido) return

  try {
    const resp = await fetch('/api/usuarios/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, telefone, nascimento })
    })
    const data = await resp.json()

    if (!resp.ok) return mostrarAlerta(data.erro, 'erro')

    mostrarAlerta('Cadastro realizado! Redirecionando...', 'sucesso')
    setTimeout(() => window.location.href = 'login.html', 1500)
  } catch {
    mostrarAlerta('Erro ao conectar ao servidor.', 'erro')
  }
})

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('cadastroAlert')
  el.textContent = msg
  el.style.display = 'block'
  el.style.background = tipo === 'sucesso' ? '#2a5c3f' : '#5c2a2a'
  el.style.color = '#fff'
  el.style.padding = '12px 16px'
  el.style.borderRadius = '8px'
}
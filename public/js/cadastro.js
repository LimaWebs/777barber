// Máscara de telefone
document.getElementById('telefone').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
  else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`
  else if (v.length > 0) v = `(${v}`
  this.value = v
})

// Máscara de data de nascimento: dd/mm/aaaa (sempre no formato brasileiro)
document.getElementById('nascimento').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').slice(0, 8)
  if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`
  else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`
  this.value = v
})

// Converte dd/mm/aaaa para aaaa-mm-dd. Retorna '' se vazio, null se inválida.
function converterNascimento(texto) {
  if (!texto) return ''
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (!m) return null
  const dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3])
  const data = new Date(ano, mes - 1, dia)
  const real = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia
  if (!real || ano < 1900) return null
  if (data > new Date()) return null // não pode ser no futuro
  return `${m[3]}-${m[2]}-${m[1]}`
}

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
  const nascimentoTexto = document.getElementById('nascimento').value.trim()
  const senha = document.getElementById('senha').value
  const senhaConfirm = document.getElementById('senhaConfirm').value

  document.querySelectorAll('.field-error').forEach(el => el.textContent = '')

  if (!nome) { document.getElementById('nomeError').textContent = 'Informe seu nome.'; valido = false }
  if (!email) { document.getElementById('emailError').textContent = 'Informe seu e-mail.'; valido = false }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { document.getElementById('emailError').textContent = 'E-mail inválido.'; valido = false }
  const nascimento = converterNascimento(nascimentoTexto)
  if (nascimento === null) { document.getElementById('nascimentoError').textContent = 'Data inválida. Use dd/mm/aaaa (não pode ser no futuro).'; valido = false }
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

    if (!resp.ok) return mostrarAlerta(data.erro || 'Erro ao cadastrar.', 'erro')

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
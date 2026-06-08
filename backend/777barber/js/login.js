/* =========================================================
   login.js — tela de login do cliente (login.html)
   777 Barber
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // Configurar toggle de senha
  App.configurarToggleSenha('toggleSenha', 'senha');

  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    App.limparErros();

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    // ── Validações de front-end ──
    let valido = true;

    if (!email) {
      App.mostrarErroCampo('email', 'emailError', 'Informe seu e-mail.');
      valido = false;
    } else if (!App.emailValido(email)) {
      App.mostrarErroCampo('email', 'emailError', 'E-mail inválido.');
      valido = false;
    }

    if (!senha) {
      App.mostrarErroCampo('senha', 'senhaError', 'Informe sua senha.');
      valido = false;
    }

    if (!valido) return;

    // ── Simulação de envio para API ──
    // Quando a API Python estiver pronta, substitua o bloco abaixo por:
    //
    // const btn = document.getElementById('btnEntrar');
    // btn.disabled = true;
    // btn.textContent = 'Entrando...';
    //
    // try {
    //   const resp = await fetch('http://localhost:5000/api/login', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, senha })
    //   });
    //   const data = await resp.json();
    //   if (resp.ok) {
    //     localStorage.setItem('token', data.token);
    //     window.location.href = 'agendamento.html';
    //   } else {
    //     App.mostrarAlerta('loginAlert', data.mensagem || 'Credenciais inválidas.', 'error');
    //   }
    // } catch (err) {
    //   App.mostrarAlerta('loginAlert', 'Erro de conexão com o servidor.', 'error');
    // } finally {
    //   btn.disabled = false;
    //   btn.textContent = 'Entrar';
    // }

    // ── Simulação temporária (remover quando API estiver pronta) ──
    const btn = document.getElementById('btnEntrar');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Entrar';
      // Simula login bem-sucedido e redireciona
      App.mostrarAlerta('loginAlert', 'Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => { window.location.href = 'agendamento.html'; }, 1500);
    }, 1000);
  });
});

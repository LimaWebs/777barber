/* =========================================================
   login-admin.js — login do proprietário (login-admin.html)
   777 Barber | Banco de dados separado do cliente
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  App.configurarToggleSenha('toggleAdminSenha', 'adminSenha');

  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    App.limparErros();

    const email = document.getElementById('adminEmail').value.trim();
    const senha = document.getElementById('adminSenha').value;

    let valido = true;

    if (!email) {
      App.mostrarErroCampo('adminEmail', 'adminEmailError', 'Informe o e-mail do proprietário.');
      valido = false;
    } else if (!App.emailValido(email)) {
      App.mostrarErroCampo('adminEmail', 'adminEmailError', 'E-mail inválido.');
      valido = false;
    }

    if (!senha) {
      App.mostrarErroCampo('adminSenha', 'adminSenhaError', 'Informe a senha administrativa.');
      valido = false;
    }

    if (!valido) return;

    // ── Integração futura com API Python (rota admin separada) ──
    //
    // const resp = await fetch('http://localhost:5000/api/admin/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, senha })
    // });
    // const data = await resp.json();
    // if (resp.ok) {
    //   localStorage.setItem('adminToken', data.token);
    //   window.location.href = 'profissional.html';
    // } else {
    //   App.mostrarAlerta('adminAlert', data.mensagem || 'Acesso negado.', 'error');
    // }

    // ── Simulação temporária ──
    const btn = document.getElementById('btnAdminEntrar');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Acessar painel';
      App.mostrarAlerta('adminAlert', 'Acesso autorizado! Redirecionando...', 'success');
      setTimeout(() => { window.location.href = 'profissional.html'; }, 1500);
    }, 1000);
  });
});
/* =========================================================
   cadastro.js — tela de cadastro (cadastro.html)
   777 Barber
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // Máscara de telefone
  const telInput = document.getElementById('telefone');
  if (telInput) App.aplicarMascaraTelefone(telInput);

  // Toggle de senha
  App.configurarToggleSenha('toggleSenha', 'senha');
  App.configurarToggleSenha('toggleConfirm', 'senhaConfirm');

  const form = document.getElementById('cadastroForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    App.limparErros();

    const nome       = document.getElementById('nome').value.trim();
    const telefone   = document.getElementById('telefone').value.trim();
    const email      = document.getElementById('email').value.trim();
    const nascimento = document.getElementById('nascimento').value;
    const senha      = document.getElementById('senha').value;
    const confirm    = document.getElementById('senhaConfirm').value;

    // ── Validações ──
    let valido = true;

    if (!nome || nome.length < 3) {
      App.mostrarErroCampo('nome', 'nomeError', 'Informe seu nome completo.');
      valido = false;
    }

    if (!telefone || telefone.replace(/\D/g, '').length < 10) {
      App.mostrarErroCampo('telefone', 'telefoneError', 'Informe um telefone válido.');
      valido = false;
    }

    if (!email) {
      App.mostrarErroCampo('email', 'emailError', 'Informe seu e-mail.');
      valido = false;
    } else if (!App.emailValido(email)) {
      App.mostrarErroCampo('email', 'emailError', 'E-mail inválido.');
      valido = false;
    }

    if (!nascimento) {
      App.mostrarErroCampo('nascimento', 'nascimentoError', 'Informe sua data de nascimento.');
      valido = false;
    } else {
      // Verifica se é maior de idade (opcional — ajuste conforme necessidade)
      const dataNasc = new Date(nascimento);
      const hoje     = new Date();
      const idade    = hoje.getFullYear() - dataNasc.getFullYear();
      if (idade < 0 || idade > 120) {
        App.mostrarErroCampo('nascimento', 'nascimentoError', 'Data de nascimento inválida.');
        valido = false;
      }
    }

    if (!senha || senha.length < 6) {
      App.mostrarErroCampo('senha', 'senhaError', 'A senha deve ter pelo menos 6 caracteres.');
      valido = false;
    }

    if (senha !== confirm) {
      App.mostrarErroCampo('senhaConfirm', 'senhaConfirmError', 'As senhas não coincidem.');
      valido = false;
    }

    if (!valido) return;

    // ── Integração futura com API Python ──
    //
    // const btn = document.getElementById('btnCadastrar');
    // btn.disabled = true;
    // btn.textContent = 'Cadastrando...';
    //
    // try {
    //   const resp = await fetch('http://localhost:5000/api/clientes', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ nome, telefone, email, nascimento, senha })
    //   });
    //   const data = await resp.json();
    //   if (resp.ok) {
    //     App.mostrarAlerta('cadastroAlert', 'Cadastro realizado! Redirecionando...', 'success');
    //     setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    //   } else {
    //     App.mostrarAlerta('cadastroAlert', data.mensagem || 'Erro ao cadastrar.', 'error');
    //   }
    // } catch (err) {
    //   App.mostrarAlerta('cadastroAlert', 'Erro de conexão com o servidor.', 'error');
    // } finally {
    //   btn.disabled = false;
    //   btn.textContent = 'Finalizar cadastro';
    // }

    // ── Simulação temporária ──
    const btn = document.getElementById('btnCadastrar');
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Finalizar cadastro';
      App.mostrarAlerta('cadastroAlert', 'Cadastro realizado com sucesso! Redirecionando para o login...', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    }, 1200);
  });
});
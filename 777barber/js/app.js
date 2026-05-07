/* =========================================================
   app.js — funções globais compartilhadas
   777 Barber | Chamado em todas as páginas
   ========================================================= */

// ── Menu mobile ──────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const navLinks   = document.getElementById('navLinks');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Fecha o menu ao clicar em um link (mobile)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });
}

// ── Utilitários globais ───────────────────────────────────

/**
 * Exibe uma mensagem de alerta num elemento.
 * @param {string} elementId - ID do elemento de alerta
 * @param {string} mensagem  - Texto a exibir
 * @param {'success'|'error'} tipo - Tipo visual
 */
function mostrarAlerta(elementId, mensagem, tipo = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = mensagem;
  el.className = `alert alert-${tipo}`;
  el.style.display = 'block';

  if (tipo === 'success') {
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
}

/**
 * Exibe um erro num campo específico.
 * @param {string} inputId  - ID do input
 * @param {string} errorId  - ID do span de erro
 * @param {string} mensagem - Texto do erro (vazio para limpar)
 */
function mostrarErroCampo(inputId, errorId, mensagem = '') {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input)  input.classList.toggle('error', mensagem !== '');
  if (error) error.textContent = mensagem;
}

/**
 * Limpa todos os erros de campo visíveis.
 */
function limparErros() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

/**
 * Valida formato de e-mail.
 * @param {string} email
 * @returns {boolean}
 */
function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Formata número de telefone brasileiro enquanto digita.
 * Ex.: 11999998888 → (11) 99999-8888
 */
function aplicarMascaraTelefone(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length >= 7) {
      v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    } else if (v.length >= 3) {
      v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    }
    input.value = v;
  });
}

/**
 * Configura botão de mostrar/ocultar senha.
 * @param {string} toggleId - ID do botão
 * @param {string} inputId  - ID do input de senha
 */
function configurarToggleSenha(toggleId, inputId) {
  const btn   = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const visivel = input.type === 'text';
    input.type  = visivel ? 'password' : 'text';
    btn.textContent = visivel ? '👁' : '🙈';
  });
}

/**
 * Bloqueia datas passadas num input[type=date].
 * @param {string} inputId
 */
function bloquearDataPassada(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const hoje = new Date().toISOString().split('T')[0];
  input.setAttribute('min', hoje);
}

// Expõe para uso nos outros scripts
window.App = {
  mostrarAlerta,
  mostrarErroCampo,
  limparErros,
  emailValido,
  aplicarMascaraTelefone,
  configurarToggleSenha,
  bloquearDataPassada,
};
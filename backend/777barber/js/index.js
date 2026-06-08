/* =========================================================
   index.js — página inicial (index.html)
   777 Barber
   ========================================================= */

/*
 * Animação dos números nos cards de estatística.
 * Quando a API estiver pronta, os valores virão do backend.
 * Ex. de chamada futura:
 *   fetch('/api/stats').then(r => r.json()).then(data => animarContador(...))
 */
function animarContador(elementId, valorFinal, prefixo = '', sufixo = '') {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duracao  = 1200; // ms
  const intervalo = 30;
  const passos   = duracao / intervalo;
  let atual      = 0;

  const timer = setInterval(() => {
    atual += valorFinal / passos;
    if (atual >= valorFinal) {
      atual = valorFinal;
      clearInterval(timer);
    }
    el.textContent = prefixo + Math.floor(atual) + sufixo;
  }, intervalo);
}

// Dispara as animações ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  animarContador('statAtendimentos', 120, '+');
  animarContador('statProfissionais', 4);
});
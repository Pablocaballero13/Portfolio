/**
 * page-transitions.js — Slide horizontal sin cortes
 * El fondo estrellado (canvas fixed) permanece siempre visible.
 * Solo el contenido (nav + main) hace el slide.
 *
 * Uso: solo en index.html para navegar hacia cv.html / cartaPresentación.html
 * En cv.html y carta no se aplica (solo se usa para volver, sin animación especial).
 */
(function () {
  'use strict';

  /* ── Orden circular de páginas ── */
  const ORDER = ['index.html', 'cv.html', 'cartaPresentación.html'];

  function pageFile() {
    const p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function pageIndex(file) {
    const f = file.split('/').pop().split('?')[0];
    const i = ORDER.indexOf(f);
    return i === -1 ? 0 : i;
  }

  /* ── Solo actuar si estamos en index.html ── */
  const current = pageFile();
  if (!ORDER.includes(current)) return;

  /* ── Inyectar estilos ── */
  const style = document.createElement('style');
  style.textContent = `
    /* El body NO tiene overflow-x hidden para no cortar el canvas fixed */
    body { overflow-x: clip; }

    #page-content {
      position: relative;
      will-change: transform, opacity;
    }

    /* Overlay de la página entrante — aparece desde fuera */
    #page-incoming {
      position: fixed;
      inset: 0;
      z-index: 800;           /* por encima del starfield (z:0), debajo del lang-btn (9998) */
      overflow-y: auto;
      overflow-x: hidden;
      pointer-events: none;
      opacity: 0;
    }

    /* Animaciones */
    @keyframes pcSlideOutLeft  { from{transform:translateX(0);opacity:1} to{transform:translateX(-100%);opacity:.4} }
    @keyframes pcSlideOutRight { from{transform:translateX(0);opacity:1} to{transform:translateX(100%);opacity:.4} }
    @keyframes pcSlideInLeft   { from{transform:translateX(100%);opacity:.4} to{transform:translateX(0);opacity:1} }
    @keyframes pcSlideInRight  { from{transform:translateX(-100%);opacity:.4} to{transform:translateX(0);opacity:1} }

    .pc-out-left   { animation: pcSlideOutLeft  0.55s cubic-bezier(0.77,0,0.18,1) forwards; }
    .pc-out-right  { animation: pcSlideOutRight 0.55s cubic-bezier(0.77,0,0.18,1) forwards; }
    .pc-in-left    { animation: pcSlideInLeft   0.55s cubic-bezier(0.77,0,0.18,1) forwards; pointer-events:auto; opacity:1 !important; }
    .pc-in-right   { animation: pcSlideInRight  0.55s cubic-bezier(0.77,0,0.18,1) forwards; pointer-events:auto; opacity:1 !important; }
  `;
  document.head.appendChild(style);

  /* ── Envolver el contenido existente en #page-content ── */
  function wrapContent() {
    if (document.getElementById('page-content')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'page-content';
    // Mover todos los hijos directos del body (excepto canvas, scripts y fixed elements)
    const children = Array.from(document.body.childNodes);
    children.forEach(node => {
      // Saltarse canvas starfield, scripts, y el lang-btn (fixed)
      if (node.nodeType === 1) {
        const tag = node.tagName;
        if (tag === 'CANVAS' || tag === 'SCRIPT' || tag === 'STYLE') return;
        if (node.id === 'lang-btn' || node.id === 'loader') return;
        if (getComputedStyle(node).position === 'fixed') return;
      } else if (node.nodeType !== 1) return; // ignorar text nodes sueltos
      wrapper.appendChild(node);
    });
    document.body.appendChild(wrapper);
  }

  document.addEventListener('DOMContentLoaded', wrapContent);

  /* ── Intercepción de clics ── */
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') || a.target === '_blank') return;
    const targetFile = href.split('/').pop().split('?')[0];
    if (!ORDER.includes(targetFile)) return;
    if (targetFile === current) return;

    e.preventDefault();

    /* Determinar dirección */
    const from = pageIndex(current);
    const to   = pageIndex(targetFile);
    const diff = (to - from + ORDER.length) % ORDER.length;
    const forward = diff <= ORDER.length / 2;
    const outClass = forward ? 'pc-out-left'  : 'pc-out-right';
    const inClass  = forward ? 'pc-in-left'   : 'pc-in-right';

    /* Asegurar que el wrapper existe */
    wrapContent();
    const wrapper = document.getElementById('page-content');

    /* Precargar la página destino con fetch */
    fetch(href)
      .then(r => r.text())
      .then(html => {
        /* Parsear el HTML recibido */
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        /* Extraer el contenido visible (nav + contenedor principal) */
        const incoming = document.createElement('div');
        incoming.id = 'page-incoming';

        /* Copiar estilos de la página destino al head */
        doc.querySelectorAll('style').forEach(s => {
          if (!s.id) {
            const clone = s.cloneNode(true);
            clone.setAttribute('data-pc-incoming', '1');
            document.head.appendChild(clone);
          }
        });

        /* Recoger los nodos visibles del body destino */
        Array.from(doc.body.childNodes).forEach(node => {
          if (node.nodeType === 1) {
            const tag = node.tagName;
            if (tag === 'CANVAS' || tag === 'SCRIPT' || tag === 'STYLE') return;
            if (node.id === 'lang-btn' || node.id === 'loader') return;
          } else return;
          incoming.appendChild(document.importNode(node, true));
        });

        /* Inyectar el panel entrante con misma bg para no ver transparencia rara */
        incoming.style.background = 'linear-gradient(135deg,#000000 0%,#020810 50%,#010912 100%)';
        document.body.appendChild(incoming);

        /* Animar: out el actual, in el nuevo */
        wrapper.classList.add(outClass);
        incoming.classList.add(inClass);

        /* Al terminar, navegar realmente (el browser usará caché) */
        setTimeout(() => {
          location.href = href;
        }, 520);
      })
      .catch(() => {
        /* Si falla el fetch (ej. CORS local), navegar directo sin animación */
        location.href = href;
      });
  });

})();
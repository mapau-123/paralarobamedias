/* =================================================================
   CARTA MUSICAL — script.js
   Todo el comportamiento está comentado por bloques para que sea
   fácil de encontrar y modificar cada pieza por separado.
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------------
     1. APERTURA DEL SOBRE
     Al hacer clic en el sello: se rompe con animación, el sobre
     se oculta, la carta aparece y la canción empieza a sonar.
     --------------------------------------------------------------- */
  const sello   = document.getElementById('sello');
  const sobre   = document.getElementById('sobre');
  const carta   = document.getElementById('carta');
  const audio   = document.getElementById('audio');
  const btnPlay = document.getElementById('btn-play');

  sello.addEventListener('click', () => {
    // Evita que se pueda volver a abrir mientras ya se está abriendo
    if (sello.classList.contains('sello--roto')) return;

    sello.classList.add('sello--roto');

    // Espera a que termine la animación de ruptura (0.6s, definida en el CSS)
    // antes de ocultar el sobre y mostrar la carta.
    setTimeout(() => {
      sobre.classList.add('sobre--oculto');
      carta.hidden = false;

      // Pequeño delay para que el navegador registre el cambio de "hidden"
      // antes de activar la transición de aparición.
      requestAnimationFrame(() => {
        carta.classList.add('carta--visible');
      });

      // Intenta reproducir la canción automáticamente al abrir la carta.
      // Si el navegador bloquea el autoplay, el usuario solo tendrá
      // que tocar el botón de play manualmente.
      audio.play().then(() => {
        actualizarIconoPlay(true);
      }).catch(() => {
        // Autoplay bloqueado: no pasa nada, el botón sigue disponible.
      });

    }, 600);
  });

  /* ---------------------------------------------------------------
     2. REPRODUCTOR DE AUDIO
     Controla play/pausa, la barra de progreso y los tiempos.
     --------------------------------------------------------------- */
  const barraProgreso  = document.getElementById('progreso');
  const tiempoActualEl = document.getElementById('tiempo-actual');
  const tiempoTotalEl  = document.getElementById('tiempo-total');
  const iconoPlay      = btnPlay.querySelector('.icono-play');
  const iconoPausa     = btnPlay.querySelector('.icono-pausa');

  function actualizarIconoPlay(reproduciendo) {
    iconoPlay.hidden  = reproduciendo;
    iconoPausa.hidden = !reproduciendo;
    btnPlay.setAttribute('aria-label', reproduciendo ? 'Pausar' : 'Reproducir');
  }

  btnPlay.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      actualizarIconoPlay(true);
    } else {
      audio.pause();
      actualizarIconoPlay(false);
    }
  });

  // Convierte segundos a formato "m:ss"
  function formatoTiempo(segundos) {
    if (!isFinite(segundos)) return '0:00';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Cuando se conocen los metadatos (duración) del audio
  audio.addEventListener('loadedmetadata', () => {
    tiempoTotalEl.textContent = formatoTiempo(audio.duration);
  });

  // Mientras la canción avanza, mueve la barra y actualiza el tiempo
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      barraProgreso.value = (audio.currentTime / audio.duration) * 100;
    }
    tiempoActualEl.textContent = formatoTiempo(audio.currentTime);
  });

  // Al soltar el usuario la barra, salta a ese punto de la canción
  barraProgreso.addEventListener('input', () => {
    if (audio.duration) {
      audio.currentTime = (barraProgreso.value / 100) * audio.duration;
    }
  });

  audio.addEventListener('ended', () => actualizarIconoPlay(false));

  /* ---------------------------------------------------------------
     3. APARICIÓN AL HACER SCROLL
     Usa IntersectionObserver para agregar la clase "--visible"
     a versos y recuerdos cuando entran en pantalla.
     Los versos con nota, además, abren su nota automáticamente
     en escritorio (donde la nota vive al margen).
     --------------------------------------------------------------- */
  const esEscritorio = () => window.matchMedia('(min-width: 900px)').matches;

  const observer = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;

      const el = entrada.target;
      el.classList.add(
        el.classList.contains('verso')    ? 'verso--visible'    :
        el.classList.contains('recuerdo') ? 'recuerdo--visible' : ''
      );

      // En escritorio, si el verso tiene nota asociada, la nota
      // aparece automáticamente junto con el verso (efecto "comentario
      // de Word" que ya está ahí esperando).
      if (esEscritorio() && el.classList.contains('verso--nota')) {
        const nota = document.querySelector(`.nota[data-nota="${el.dataset.nota}"]`);
        if (nota) nota.classList.add('nota--abierta');
      }

      // Deja de observar el elemento una vez que ya apareció,
      // no necesitamos revisarlo de nuevo.
      observer.unobserve(el);
    });
  }, {
    threshold: 0.3 // se activa cuando el 30% del elemento es visible
  });

  document.querySelectorAll('.verso, .recuerdo').forEach((el) => observer.observe(el));

  /* ---------------------------------------------------------------
     4. TOGGLE DE NOTAS EN MÓVIL (Y CLIC MANUAL EN CUALQUIER TAMAÑO)
     En móvil las notas no se abren solas: el usuario toca el verso
     y la nota se despliega debajo. También funciona como respaldo
     en escritorio si alguien quiere volver a mirar una nota puntual.
     --------------------------------------------------------------- */
  document.querySelectorAll('.verso--nota').forEach((verso) => {
    // Hace el verso accesible por teclado, ya que actúa como botón
    verso.setAttribute('tabindex', '0');
    verso.setAttribute('role', 'button');

    const alternarNota = () => {
      const nota = document.querySelector(`.nota[data-nota="${verso.dataset.nota}"]`);
      if (!nota) return;
      nota.classList.toggle('nota--abierta');
    };

    verso.addEventListener('click', alternarNota);
    verso.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        alternarNota();
      }
    });
  });

});

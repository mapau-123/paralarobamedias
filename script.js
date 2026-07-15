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

     Este bloque es OPCIONAL: solo corre si la página tiene sobre
     (el "if" de abajo). Las páginas de canciones que no son la
     primera no tienen sobre, así que este mismo script.js les sirve
     igual, sin tirar error por buscar elementos que no existen.
     --------------------------------------------------------------- */
  const sello   = document.getElementById('sello');
  const sobre   = document.getElementById('sobre');
  const carta   = document.getElementById('carta');
  const audio   = document.getElementById('audio');
  const btnPlay = document.getElementById('btn-play');

  if (sello && sobre && carta) {
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

        // El sobre se desvanece con una transición de 0.8s (definida en el CSS
        // en ".sobre"). "opacity: 0" y "visibility: hidden" lo hacen invisible,
        // pero NO lo sacan del flujo del documento: al tener "min-height: 100vh",
        // seguiría ocupando una pantalla completa de espacio vacío arriba de la
        // carta. Por eso, una vez termina esa transición, lo sacamos del flujo
        // por completo con "display: none".
        setTimeout(() => {
          sobre.style.display = 'none';
        }, 800);

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
  }

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
     3.1. ALINEAR NOTAS AL MARGEN (SOLO ESCRITORIO)
     Las notas usan "position: absolute" para vivir en el margen
     derecho (ver CSS), pero eso significa que el navegador no sabe
     a qué altura ("top") ubicar cada una. Sin esto, todas las notas
     quedan apiladas en el mismo punto en vez de alinearse con su
     verso. Aquí calculamos esa altura comparando la posición del
     verso contra el contenedor ".letra".
     --------------------------------------------------------------- */
  function alinearNotas() {
    if (!esEscritorio()) return; // en móvil las notas van en flujo normal, no hace falta

    const letra = document.querySelector('.letra');
    if (!letra) return;
    const letraTop = letra.getBoundingClientRect().top;

    document.querySelectorAll('.verso--nota').forEach((verso) => {
      const nota = document.querySelector(`.nota[data-nota="${verso.dataset.nota}"]`);
      if (!nota) return;
      const versoTop = verso.getBoundingClientRect().top;
      nota.style.top = `${versoTop - letraTop}px`;
    });
  }

  // Se recalcula cuando termina de cargar todo (incluidas las tipografías,
  // que pueden mover ligeramente el texto) y cada vez que cambia el tamaño
  // de la ventana, por si se pasa de móvil a escritorio o viceversa.
  window.addEventListener('load', alinearNotas);
  window.addEventListener('resize', alinearNotas);
  alinearNotas();

  // Red de seguridad: si por cualquier motivo algo se quedó sin revelar
  // (el observer no lo detectó, un navegador raro, etc.), forzamos que
  // todo el contenido se vea después de unos segundos. Mejor una
  // animación que no se disparó a tiempo, que contenido invisible para siempre.
  setTimeout(() => {
    document.querySelectorAll('.verso, .recuerdo').forEach((el) => {
      el.classList.add(
        el.classList.contains('verso') ? 'verso--visible' : 'recuerdo--visible'
      );
    });
  }, 4000);

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

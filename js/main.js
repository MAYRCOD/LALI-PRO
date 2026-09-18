/* LALI — интерактив лендинга. Ванильный JS, без зависимостей. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ——— 1. Параллакс облаков ———
     Двигаем облака трансформом (не top/left): трансформ считает GPU,
     страница не пересчитывает раскладку и скролл остаётся плавным. */
  (function clouds() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-cloud]'));
    if (!els.length || reduceMotion) return;
    var raf = 0;
    function apply() {
      raf = 0;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      for (var i = 0; i < els.length; i++) {
        var s = parseFloat(els[i].getAttribute('data-speed')) || 0.08;
        els[i].style.transform =
          'translate3d(' + (y * s * 0.35).toFixed(1) + 'px,' + (-y * s).toFixed(1) + 'px,0)';
      }
    }
    // Слушатель только ставит задачу в очередь кадра — так apply() вызывается
    // максимум раз на кадр, а не на каждое событие скролла.
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    apply();
  })();

  /* ——— 2. Видео: грузим и запускаем только то, что видно ———
     Все четыре ролика весят ~18 МБ. Атрибут src заменён на data-src,
     поэтому браузер ничего не качает, пока карточка не появилась на экране. */
  (function videos() {
    var list = Array.prototype.slice.call(document.querySelectorAll('video[data-src]'));
    if (!list.length) return;

    function load(v) {
      if (v.dataset.loaded) return;
      v.dataset.loaded = '1';
      v.src = v.dataset.src;
      v.load();
    }
    if (!('IntersectionObserver' in window)) {
      list.forEach(load);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          load(v);
          var p = v.play();
          // Автовоспроизведение может быть запрещено — тогда останутся
          // штатные controls, и промис не должен падать необработанным.
          if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.25 });
    list.forEach(function (v) { io.observe(v); });
  })();

  /* ——— 3. Отзывы: перетаскивание мышью + стрелки ——— */
  (function reviews() {
    var box = document.querySelector('[data-reviews-scroll]');
    if (!box) return;

    var down = false, startX = 0, startLeft = 0, moved = 0;
    box.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // на тач-экранах хватает нативного скролла
      down = true; moved = 0;
      startX = e.clientX;
      startLeft = box.scrollLeft;
      box.classList.add('is-dragging');
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      box.scrollLeft = startLeft - dx;
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      box.addEventListener(ev, function () {
        down = false;
        box.classList.remove('is-dragging');
      });
    });
    // Клик после перетаскивания гасим, чтобы карточка не «нажималась».
    box.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // Колесо мыши по горизонтали: вертикальную прокрутку страницы не трогаем.
    box.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = box.scrollWidth - box.clientWidth;
      if ((box.scrollLeft <= 0 && e.deltaY < 0) || (box.scrollLeft >= max && e.deltaY > 0)) return;
      e.preventDefault();
      box.scrollLeft += e.deltaY;
    }, { passive: false });
  })();

  /* ——— 4. Кнопка «наверх» ——— */
  (function toTop() {
    var btn = document.getElementById('to-top');
    if (!btn) return;
    var raf = 0;
    function check() {
      raf = 0;
      btn.classList.toggle('is-visible', (window.scrollY || 0) > window.innerHeight);
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(check);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    check();
  })();

  /* ——— 5. Плавный переход по якорям ——— */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });
})();

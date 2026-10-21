/* Rancho Canaã, página única.
   Abertura, topo coberto, parallax, vídeos que só tocam na tela, o dia no
   rancho (arraste o sol), galeria com filtro e lightbox, pedido pro WhatsApp.
   Sem dependências. */
(function () {
  'use strict';

  var d = document.documentElement;
  var reduzido = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ZAP = 'https://wa.me/5531991351079';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function limita(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ------------------------------------------------------------ abertura
     O CSS roda a cena sozinho. Aqui só se decide quando a luz abre: depois
     de ~2,6 s de cena e da foto do topo carregada, nunca depois de 3,7 s
     (rede lenta não prende ninguém na abertura). A abertura é um furo
     redondo na camada escura, então o que aparece é o topo de verdade. */
  var intro = $('#intro');
  if (intro && d.classList.contains('com-intro')) {
    var saiu = false;
    var sair = function () {
      if (saiu) return;
      saiu = true;
      intro.classList.add('sai');
      d.classList.add('pronto');
      try { sessionStorage.setItem('intro-rancho', '1'); } catch (e) {}
      var fundo = $('.intro__fundo', intro);
      var raio = Math.sqrt(innerWidth * innerWidth + innerHeight * innerHeight) / 2 + 220;
      var ini = null, dur = 1300;
      var passo = function (ts) {
        if (ini === null) ini = ts;
        var k = limita((ts - ini) / dur, 0, 1);
        var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        fundo.style.setProperty('--r', (e * raio).toFixed(0) + 'px');
        if (k < 1) requestAnimationFrame(passo);
        else { d.classList.remove('com-intro'); intro.remove(); }
      };
      requestAnimationFrame(passo);
    };
    var fotoPronta = false, tempoPronto = false;
    var tentar = function () { if (fotoPronta && tempoPronto) sair(); };
    var foto = $('.hero__fundo img');
    if (!foto || foto.complete) fotoPronta = true;
    else { foto.addEventListener('load', function () { fotoPronta = true; tentar(); }); foto.addEventListener('error', function () { fotoPronta = true; tentar(); }); }
    setTimeout(function () { tempoPronto = true; tentar(); }, Math.max(0, 2600 - performance.now()));
    setTimeout(sair, Math.max(0, 3700 - performance.now()));
    intro.addEventListener('click', sair);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sair(); });
  } else {
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('pronto'); }); });
  }

  /* ------------------------------------------------------------ rolagem
     Um único laço por frame: topo, botão flutuante, hero coberto, parallax
     e o selo que gira com a rolagem. Por frame só se lê scrollY e o rect
     dos pais das camadas que estão perto da tela. */
  var topo = $('#topo');
  var zap = $('.zap');
  var hero = $('.hero');
  var selo = $('.selo svg');
  var alturaHero = 0, inicioCobre = 0;

  function medirHero() {
    if (!hero) return;
    alturaHero = hero.offsetHeight;
    hero.style.setProperty('--hero-topo', Math.min(0, innerHeight - alturaHero) + 'px');
    inicioCobre = Math.max(0, alturaHero - innerHeight);
  }

  var camadas = reduzido ? [] : $$('[data-parallax]').map(function (el) {
    return { el: el, v: parseFloat(el.getAttribute('data-parallax')) || 0, pai: el.parentElement };
  });

  var pedido = false;
  function quadro() {
    pedido = false;
    var y = window.scrollY;
    if (topo) topo.classList.toggle('is-rolado', y > 10);
    if (zap) zap.classList.toggle('is-visivel', y > innerHeight * .8);

    if (hero) {
      var p = limita((y - inicioCobre) / innerHeight, 0, 1);
      hero.style.setProperty('--cobre', reduzido ? 0 : p.toFixed(3));
      // coberto de vez: some da pintura, ninguém está vendo
      hero.classList.toggle('is-coberto', p >= 1 && y > alturaHero * 1.2);
    }

    var meio = innerHeight / 2;
    var fator = innerWidth < 700 ? .5 : 1;
    for (var i = 0; i < camadas.length; i++) {
      var c = camadas[i];
      var r = c.pai.getBoundingClientRect();
      if (r.bottom < -300 || r.top > innerHeight + 300) continue;
      var dist = (r.top + r.height / 2) - meio;
      c.el.style.translate = '0 ' + (dist * c.v * fator).toFixed(1) + 'px';
    }

    if (selo && !reduzido) selo.style.setProperty('--giro', (y * .06).toFixed(1) + 'deg');
  }
  function pedir() { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } }
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', function () { medirHero(); pedir(); });
  medirHero();
  quadro();

  /* ------------------------------------------------------------ vídeos
     Só baixam e tocam quando aparecem na tela; pausam ao sair. Com
     "reduzir movimento" ficam parados com controles. */
  var videos = $$('video[data-auto]');
  if (reduzido) {
    videos.forEach(function (v) { v.controls = true; });
  } else if ('IntersectionObserver' in window) {
    var ioVideo = new IntersectionObserver(function (itens) {
      itens.forEach(function (it) {
        var v = it.target;
        if (it.isIntersecting) {
          if (v.preload !== 'auto') v.preload = 'auto';
          var t = v.play(); if (t && t.catch) t.catch(function () {});
        } else v.pause();
      });
    }, { threshold: .3 });
    videos.forEach(function (v) { ioVideo.observe(v); });
  }

  /* ------------------------------------------------------------ o dia no rancho
     O range invisível cobre a linha toda: arrastar em qualquer ponto mexe o
     sol, o teclado funciona e o celular rola a página na vertical. As fotos
     ficam empilhadas e cada uma entra por cima da anterior. */
  var dia = $('[data-dia]');
  if (dia) {
    var range = $('.dia__range', dia);
    var fotos = $$('.dia__palco img', dia);
    var astro = $('.dia__astro', dia);
    var arco = $('.dia__arco', dia);
    var feito = $('.dia__arco .feito', dia);
    var tom = $('.dia__tom', dia);
    var legenda = $('.dia__legenda', dia);
    var horas = $$('.dia__horas span', dia);
    var textos = [
      ['Manhã', 'O gramado só pra vocês e a serra limpa no horizonte.'],
      ['Tarde', 'Piscina com cascata, guarda-sol e espreguiçadeira.'],
      ['Pôr do sol', 'O sol se põe atrás da serra, bem na frente do pergolado.'],
      ['Noite', 'Céu de estrelas e o chalé aceso no meio do mato.']
    ];
    var tons = [[255, 236, 190, .18], [255, 214, 150, .12], [255, 130, 50, .32], [40, 60, 130, .4]];
    var atual = -1;

    var pintar = function (v) {
      var t = v / 300;
      for (var i = 1; i < fotos.length; i++) fotos[i].style.opacity = limita((v - 100 * (i - 1)) / 100, 0, 1);
      // ponto na curva do arco (bezier quadrática do SVG)
      var w = arco.clientWidth, h = arco.clientHeight;
      var x = (1 - t) * (1 - t) * 22 + 2 * (1 - t) * t * 300 + t * t * 578;
      var yv = (1 - t) * (1 - t) * 66 + 2 * (1 - t) * t * -40 + t * t * 66;
      astro.style.translate = (x / 600 * w).toFixed(1) + 'px ' + (yv / 70 * h).toFixed(1) + 'px';
      astro.classList.toggle('lua', v > 250);
      feito.setAttribute('stroke-dashoffset', (1 - t).toFixed(3));
      var a = Math.min(2, Math.floor(v / 100)), f = v / 100 - a;
      var c0 = tons[a], c1 = tons[a + 1];
      var mix = function (k) { return c0[k] + (c1[k] - c0[k]) * f; };
      tom.style.setProperty('--tom', 'rgba(' + mix(0).toFixed(0) + ',' + mix(1).toFixed(0) + ',' + mix(2).toFixed(0) + ',' + mix(3).toFixed(2) + ')');
      var n = Math.round(v / 100);
      if (n !== atual) {
        atual = n;
        legenda.innerHTML = '<strong>' + textos[n][0] + '</strong>' + textos[n][1];
        horas.forEach(function (s, k) { s.classList.toggle('is-agora', k === n); });
        range.setAttribute('aria-valuetext', textos[n][0]);
      }
    };
    var mexeu = false;
    range.addEventListener('input', function () { pintar(+range.value); });
    range.addEventListener('pointerdown', function () { mexeu = true; });
    range.addEventListener('keydown', function () { mexeu = true; });
    addEventListener('resize', function () { pintar(+range.value); });
    pintar(0);

    // Uma demonstração só, quando aparece: o sol anda até o fim da tarde.
    if (!reduzido && 'IntersectionObserver' in window) {
      var ioDia = new IntersectionObserver(function (itens) {
        if (!itens[0].isIntersecting) return;
        ioDia.disconnect();
        var ini = null, alvo = 200, dur = 2600;
        var passo = function (ts) {
          if (mexeu) return;
          if (ini === null) ini = ts;
          var k = limita((ts - ini) / dur, 0, 1);
          var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          range.value = Math.round(alvo * e);
          pintar(+range.value);
          if (k < 1) requestAnimationFrame(passo);
        };
        setTimeout(function () { requestAnimationFrame(passo); }, 500);
      }, { threshold: .6 });
      ioDia.observe($('.dia__palco', dia));
    }
  }

  /* ------------------------------------------------------------ galeria */
  var mosaico = $('#mosaico');
  if (mosaico) {
    var itens = $$('.mosaico__item', mosaico);
    var filtros = $$('.filtro');
    var contagem = { todas: itens.length };
    itens.forEach(function (it) { contagem[it.dataset.cat] = (contagem[it.dataset.cat] || 0) + 1; });
    filtros.forEach(function (b) {
      var s = document.createElement('small'); s.textContent = contagem[b.dataset.filtro] || 0; b.appendChild(s);
      b.addEventListener('click', function () {
        var f = b.dataset.filtro;
        filtros.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        itens.forEach(function (it) { it.hidden = f !== 'todas' && it.dataset.cat !== f; });
      });
    });

    var caixa = $('#caixa');
    var foto = $('.caixa__palco img', caixa);
    var credito = $('.caixa__credito', caixa);
    var conta = $('.caixa__conta', caixa);
    var lista = [], pos = 0;
    var mostrar = function (i) {
      pos = (i + lista.length) % lista.length;
      var it = lista[pos], img = $('img', it);
      foto.src = it.dataset.full;
      foto.alt = img.alt;
      credito.textContent = img.alt + ' · ' + it.dataset.credito;
      conta.textContent = (pos + 1) + ' / ' + lista.length;
      [pos + 1, pos - 1].forEach(function (k) { var n = lista[(k + lista.length) % lista.length]; if (n) { var pre = new Image(); pre.src = n.dataset.full; } });
    };
    var abrir = function (it) {
      lista = itens.filter(function (x) { return !x.hidden; });
      if (!caixa.showModal) { window.open(it.dataset.full, '_blank'); return; }
      mostrar(lista.indexOf(it));
      caixa.showModal();
      d.style.overflow = 'hidden';
    };
    itens.forEach(function (it) { it.addEventListener('click', function () { abrir(it); }); });
    caixa.addEventListener('close', function () { d.style.overflow = ''; foto.removeAttribute('src'); });
    $('.caixa__fechar', caixa).addEventListener('click', function () { caixa.close(); });
    $('.caixa__ant', caixa).addEventListener('click', function () { mostrar(pos - 1); });
    $('.caixa__prox', caixa).addEventListener('click', function () { mostrar(pos + 1); });
    caixa.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') mostrar(pos - 1);
      if (e.key === 'ArrowRight') mostrar(pos + 1);
    });
    $('.caixa__palco', caixa).addEventListener('click', function (e) { if (e.target === e.currentTarget) caixa.close(); });
    var x0 = null;
    caixa.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    caixa.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) mostrar(pos + (dx < 0 ? 1 : -1));
    });
  }

  /* ------------------------------------------------------------ pedido
     Monta a mensagem e abre o WhatsApp. Sem emoji: no wa.me ele chega
     como losango com interrogação. */
  var form = $('#pedido');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var tipo = form.querySelector('input[name="tipo"]:checked');
      var quando = form.quando.value;
      var pessoas = form.pessoas.value.trim();
      var linhas = ['Oi! Vi o site do Rancho Canaã e queria consultar uma data.'];
      if (tipo) linhas.push('O que: ' + tipo.value);
      linhas.push('Quando: ' + (quando || 'ainda não sei'));
      if (pessoas) linhas.push('Pessoas: cerca de ' + pessoas);
      var a = document.createElement('a');
      a.href = ZAP + '?text=' + encodeURIComponent(linhas.join('\n'));
      a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    });
  }
})();

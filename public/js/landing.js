/* ===================================================
   YatraKaro — Landing Page (Video Hero + Canvas Particles)
   Lightweight 3D feel without Three.js
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Guard — only run if GSAP is available
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  /* ══════════════════════════════════════════
     CANVAS PARTICLE SYSTEM
     Floating purple/white glass-like particles
     with mouse parallax on desktop
     ══════════════════════════════════════════ */

  const canvas = document.getElementById('heroCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H;
    let mouseX = 0, mouseY = 0;
    let animId;
    const isMobile = window.innerWidth < 768;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PARTICLE_COUNT = isMobile ? 30 : 70;

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking (desktop only)
    if (!isMobile) {
      document.addEventListener('mousemove', e => {
        mouseX = (e.clientX / W - 0.5) * 2;   // -1 to 1
        mouseY = (e.clientY / H - 0.5) * 2;
      });
    }

    // Particle class
    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(initial) {
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : H + 20;
        this.size = Math.random() * 3 + 1;
        this.speedY = -(Math.random() * 0.6 + 0.15);
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.fadeSpeed = Math.random() * 0.002 + 0.001;
        this.growing = true;

        // Purple/white glass palette
        const colors = [
          [123, 57, 252],   // #7b39fc
          [168, 85, 247],   // #a855f7
          [192, 132, 252],  // #c084fc
          [255, 255, 255],  // white
          [139, 92, 246],   // #8b5cf6
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        // Base movement
        this.y += this.speedY;
        this.x += this.speedX;

        // Mouse parallax (desktop)
        if (!isMobile) {
          this.x += mouseX * this.size * 0.15;
          this.y += mouseY * this.size * 0.08;
        }

        // Pulsing opacity
        if (this.growing) {
          this.opacity += this.fadeSpeed;
          if (this.opacity >= 0.6) this.growing = false;
        } else {
          this.opacity -= this.fadeSpeed;
          if (this.opacity <= 0.05) this.growing = true;
        }

        // Reset when off-screen
        if (this.y < -20 || this.x < -20 || this.x > W + 20) {
          this.reset(false);
        }
      }

      draw() {
        const [r, g, b] = this.color;

        // Outer glow
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.size * 4
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.opacity * 0.3})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    const particles = [];
    if (!prefersReduced) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }
    }

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.update();
        p.draw();
      }

      animId = requestAnimationFrame(animate);
    }

    if (!prefersReduced) {
      animate();
    }

    // Cleanup when hero is far off-screen
    ScrollTrigger.create({
      trigger: '.video-hero',
      start: 'bottom top',
      onEnterBack: () => { if (!prefersReduced && !animId) animate(); },
      onLeave: () => { cancelAnimationFrame(animId); animId = null; }
    });
  }

  /* ══════════════════════════════════════════
     HAMBURGER MENU TOGGLE
     ══════════════════════════════════════════ */

  const hamburgerBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeBtn = document.querySelector('.mobile-menu__close');
  const overlay = document.querySelector('.mobile-menu__overlay');
  const mobileLinks = document.querySelectorAll('.mobile-menu__link');

  function openMenu() {
    mobileMenu && mobileMenu.classList.add('is-open');
    hamburgerBtn && hamburgerBtn.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu && mobileMenu.classList.remove('is-open');
    hamburgerBtn && hamburgerBtn.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);

  // Close on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('is-open')) {
      closeMenu();
    }
  });

  /* ══════════════════════════════════════════
     GLASSMORPHISM HEADER ON SCROLL
     ══════════════════════════════════════════ */

  const header = document.querySelector('.header--glass');
  if (header) {
    ScrollTrigger.create({
      start: 'top -80',
      onUpdate: (self) => {
        if (self.direction === 1 && window.scrollY > 80) {
          header.classList.add('header--scrolled');
        } else if (window.scrollY <= 80) {
          header.classList.remove('header--scrolled');
        }
      }
    });
  }

  /* ══════════════════════════════════════════
     EXISTING SECTION ANIMATIONS
     (preserved from previous version)
     ══════════════════════════════════════════ */

  /* ---------- How It Works — horizontal pin ---------- */
  const hiwTrack = document.querySelector('.hiw__track');
  const hiwSection = document.querySelector('.hiw');
  if (hiwTrack && hiwSection) {
    const steps = hiwTrack.querySelectorAll('.hiw__step');
    if (steps.length && window.innerWidth > 768) {
      const totalScroll = hiwTrack.scrollWidth - window.innerWidth;
      gsap.to(hiwTrack, {
        x: () => -totalScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: hiwSection,
          start: 'top top',
          end: () => `+=${totalScroll}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1
        }
      });
      steps.forEach((step, i) => {
        gsap.from(step, {
          opacity: 0, scale: 0.8, rotateY: 15,
          scrollTrigger: {
            trigger: step,
            start: 'left center',
            toggleActions: 'play none none reverse'
          },
          duration: 0.6, delay: i * 0.15
        });
      });
    }
  }

  /* ---------- Feature cards — 3D tilt ---------- */
  document.querySelectorAll('.feat__card[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotateY = ((x - cx) / cx) * 12;
      const rotateX = ((cy - y) / cy) * 12;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`;
      const glow = card.querySelector('.feat__card-glow');
      if (glow) {
        glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(123,57,252,.25), transparent 60%)`;
      }
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      const glow = card.querySelector('.feat__card-glow');
      if (glow) glow.style.background = 'transparent';
    });
  });

  /* Scroll reveal for feature cards */
  gsap.utils.toArray('.feat__card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0, y: 80, rotateX: -15,
      duration: 0.8, delay: i * 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card, start: 'top 85%',
        toggleActions: 'play none none none'
      }
    });
  });

  /* ---------- Stats counter (ScrollTrigger) ---------- */
  document.querySelectorAll('.stats-v2__number').forEach(counter => {
    const target = parseInt(counter.dataset.target);
    ScrollTrigger.create({
      trigger: counter,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          innerText: target,
          duration: 2,
          snap: { innerText: 1 },
          ease: 'power1.out'
        });
      }
    });
  });

  /* Stats items reveal */
  gsap.utils.toArray('.stats-v2__item').forEach((item, i) => {
    gsap.from(item, {
      opacity: 0, y: 50, duration: 0.7, delay: i * 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 85%' }
    });
  });

  /* ---------- Tour cards — 3D stagger reveal ---------- */
  gsap.utils.toArray('.tours-v2__card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0, y: 100, rotateY: 8, scale: 0.95,
      duration: 0.9, delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 90%' }
    });

    // Hover 3D tilt
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateY: x * 10, rotateX: -y * 10,
        transformPerspective: 800, duration: 0.3
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power3.out' });
    });
  });

  /* ---------- Testimonial carousel ---------- */
  const slides = document.querySelectorAll('.testi__slide');
  const prevBtn = document.querySelector('.testi__btn--prev');
  const nextBtn = document.querySelector('.testi__btn--next');
  const dotsWrap = document.querySelector('.testi__dots');

  if (slides.length) {
    let cur = 0;
    slides.forEach((_, i) => {
      if (dotsWrap) {
        const dot = document.createElement('span');
        dot.className = 'testi__dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      }
    });

    const goTo = idx => {
      slides[cur].classList.remove('active');
      cur = (idx + slides.length) % slides.length;
      slides[cur].classList.add('active');
      if (dotsWrap) {
        dotsWrap.querySelectorAll('.testi__dot').forEach((d, i) => {
          d.classList.toggle('active', i === cur);
        });
      }
    };

    if (nextBtn) nextBtn.addEventListener('click', () => goTo(cur + 1));
    if (prevBtn) prevBtn.addEventListener('click', () => goTo(cur - 1));
    setInterval(() => goTo(cur + 1), 6000);

    // Touch swipe
    let sx = 0;
    const car = document.querySelector('.testi__carousel');
    if (car) {
      car.addEventListener('touchstart', e => { sx = e.touches[0].clientX; });
      car.addEventListener('touchend', e => {
        const diff = sx - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) goTo(diff > 0 ? cur + 1 : cur - 1);
      });
    }
  }

  /* ---------- CTA parallax ---------- */
  const ctaBg = document.querySelector('.cta-v2__bg');
  if (ctaBg) {
    gsap.to(ctaBg, {
      yPercent: -20, ease: 'none',
      scrollTrigger: {
        trigger: '.cta-v2', start: 'top bottom', end: 'bottom top', scrub: true
      }
    });
  }
  gsap.from('.cta-v2__title', {
    opacity: 0, y: 60, duration: 1,
    scrollTrigger: { trigger: '.cta-v2', start: 'top 70%' }
  });
  gsap.from('.cta-v2__sub', {
    opacity: 0, y: 40, duration: 1, delay: 0.2,
    scrollTrigger: { trigger: '.cta-v2', start: 'top 70%' }
  });
  gsap.from('.cta-v2__actions', {
    opacity: 0, y: 40, duration: 1, delay: 0.4,
    scrollTrigger: { trigger: '.cta-v2', start: 'top 70%' }
  });

  /* ---------- Newsletter reveal ---------- */
  gsap.from('.nl__inner', {
    opacity: 0, y: 60, duration: 1,
    scrollTrigger: { trigger: '.nl', start: 'top 80%' }
  });

  /* Newsletter form */
  const nlForm = document.querySelector('.nl__form');
  if (nlForm) {
    nlForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = nlForm.querySelector('.nl__btn');
      const og = btn.textContent;
      btn.textContent = 'Subscribing...';
      btn.disabled = true;
      try {
        await new Promise(r => setTimeout(r, 1000));
        btn.textContent = '✓ Subscribed!';
        nlForm.reset();
        setTimeout(() => { btn.textContent = og; btn.disabled = false; }, 3000);
      } catch {
        btn.textContent = 'Error';
        setTimeout(() => { btn.textContent = og; btn.disabled = false; }, 3000);
      }
    });
  }

  /* ---------- Smooth scroll for anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elementPosition - headerOffset,
          behavior: 'smooth'
        });
      }
    });
  });

  /* ---------- Section titles reveal ---------- */
  gsap.utils.toArray('.feat__title, .feat__sub, .tours-v2__title, .tours-v2__sub, .testi__title, .testi__sub').forEach(el => {
    gsap.from(el, {
      opacity: 0, y: 50, duration: 0.8,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  /* ---------- Magnetic button effect ---------- */
  document.querySelectorAll('.hero-v2__btn, .video-hero__btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, { x: x * 0.15, y: y * 0.15, duration: 0.3 });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.5)' });
    });
  });
});

/* Auth page gradient animation */
(function() {
  const gradient = document.querySelector('.auth-page__gradient');
  if (!gradient || typeof gsap === 'undefined') return;

  document.querySelectorAll('.auth-page__shape').forEach((shape, i) => {
    gsap.to(shape, {
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      rotation: 360,
      duration: 15 + i * 5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  });
})();

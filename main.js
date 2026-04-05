/* ===================================================================
   TABLEAU BI PORTFOLIO — main.js
   =================================================================== */

'use strict';

// ─── 1. THEME TOGGLE ─────────────────────────────────────────────────────────

const THEME_KEY = 'bi-portfolio-theme';

function getStoredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(theme === 'dark'));
  const label = btn.querySelector('.theme-toggle__label');
  const icon  = btn.querySelector('.theme-toggle__icon');
  if (label) label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark BI';
  if (icon)  icon.textContent  = theme === 'dark' ? '◈' : '☀';
}

function initThemeToggle() {
  applyTheme(getStoredTheme());
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// ─── 2. NAV SCROLL + HAMBURGER ───────────────────────────────────────────────

function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav--scrolled', window.scrollY > 60);
  }, { passive: true });

  if (burger) {
    burger.addEventListener('click', () => nav.classList.toggle('nav--open'));
  }

  document.querySelectorAll('.nav__links a').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('nav--open'));
  });
}

// ─── 3. LOAD DATA ────────────────────────────────────────────────────────────

async function loadData() {
  const res = await fetch('portfolio.json');
  if (!res.ok) throw new Error(`Failed to load portfolio.json (${res.status})`);
  return res.json();
}

// ─── 4. HERO ─────────────────────────────────────────────────────────────────

function populateHero(owner) {
  setText('heroName',    owner.name);
  setText('heroTagline', owner.tagline);
  setText('heroBio',     owner.bio);

  const avatarImg = document.getElementById('heroAvatar');
  if (avatarImg) {
    avatarImg.src = owner.avatar;
    avatarImg.alt = owner.name;
    // Hide if image fails to load
    avatarImg.onerror = () => {
      const wrap = document.getElementById('heroAvatarWrap');
      if (wrap) {
        wrap.innerHTML = `<div class="hero__avatar-placeholder">👤</div>`;
      }
    };
  }

  const emailBtn = document.getElementById('heroEmail');
  if (emailBtn && owner.contact?.email) {
    emailBtn.href = `mailto:${owner.contact.email}`;
  }
}

// ─── 5. SKILLS ───────────────────────────────────────────────────────────────

function populateSkills(skills) {
  const grid = document.getElementById('skillsGrid');
  if (!grid) return;

  function renderSkills(filter) {
    const filtered = filter === 'all' ? skills : skills.filter(s => s.category === filter);
    grid.innerHTML = filtered.map(s => `
      <div class="skill-card fade-in" data-category="${escHtml(s.category)}">
        <div class="skill-card__header">
          <span class="skill-card__name">${escHtml(s.name)}</span>
          <span class="skill-card__pct">${s.level}%</span>
        </div>
        <div class="skill-card__bar-track">
          <div class="skill-card__bar-fill" style="--target-width: ${s.level}%"></div>
        </div>
        <span class="skill-card__category">${escHtml(s.category)}</span>
      </div>`).join('');

    // Trigger fade-in and bar animation
    requestAnimationFrame(() => {
      document.querySelectorAll('#skillsGrid .fade-in').forEach(el => el.classList.add('is-visible'));
      animateSkillBars();
    });
  }

  // Tab filter wiring
  const tabsEl = document.getElementById('skillsTabs');
  if (tabsEl) {
    // Build category list dynamically
    const categories = ['all', ...new Set(skills.map(s => s.category))];
    tabsEl.innerHTML = categories.map(cat => `
      <button class="skills__tab${cat === 'all' ? ' is-active' : ''}" data-filter="${escHtml(cat)}">
        ${cat === 'all' ? '全部' : escHtml(cat)}
      </button>`).join('');

    tabsEl.addEventListener('click', e => {
      const tab = e.target.closest('.skills__tab');
      if (!tab) return;
      tabsEl.querySelectorAll('.skills__tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      renderSkills(tab.dataset.filter);
    });
  }

  renderSkills('all');
}

function animateSkillBars() {
  const fills = document.querySelectorAll('.skill-card__bar-fill');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-animated');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  fills.forEach(f => observer.observe(f));
}

// ─── 6. EXPERIENCE ───────────────────────────────────────────────────────────

function populateExperience(experience) {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;

  timeline.innerHTML = experience.map(job => `
    <div class="timeline__entry fade-in">
      <div class="timeline__marker"></div>
      <div class="timeline__card">
        <div class="timeline__card-header">
          <div>
            <h3 class="timeline__role">${escHtml(job.role)}</h3>
            <span class="timeline__company">${escHtml(job.company)}</span>
          </div>
          <div class="timeline__meta">
            <span class="timeline__period">${escHtml(job.period)}</span>
            <span class="timeline__location">${escHtml(job.location)}</span>
          </div>
        </div>
        <ul class="timeline__bullets">
          ${job.bullets.map(b => `<li>${escHtml(b)}</li>`).join('')}
        </ul>
      </div>
    </div>`).join('');

  observeFadeIn('#timeline .fade-in');
}

// ─── 7. PORTFOLIO ─────────────────────────────────────────────────────────────

function populatePortfolio(projects) {
  const grid      = document.getElementById('portfolioGrid');
  const filterBar = document.getElementById('portfolioFilters');
  if (!grid || !filterBar) return;

  // Build unique tag list
  const allTags = ['all', ...new Set(projects.flatMap(p => p.tags))];
  filterBar.innerHTML = allTags.map(tag => `
    <button class="filter-btn${tag === 'all' ? ' is-active' : ''}" data-tag="${escHtml(tag)}">
      ${tag === 'all' ? '全部' : escHtml(tag)}
    </button>`).join('');

  function renderCards(tag) {
    const filtered = tag === 'all' ? projects : projects.filter(p => p.tags.includes(tag));
    const sorted   = [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    grid.innerHTML = sorted.map(p => `
      <article class="project-card${p.featured ? ' project-card--featured' : ''} fade-in"
               data-tags="${escHtml(p.tags.join(' '))}">
        <div class="project-card__img-wrap">
          ${p.image
            ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.title)}" loading="lazy"
                    onerror="this.parentElement.innerHTML='<div class=&quot;project-card__img-placeholder&quot;>📊</div>'">`
            : '<div class="project-card__img-placeholder">📊</div>'
          }
          <div class="project-card__overlay">
            <a href="${escHtml(p.link)}" class="project-card__link-btn"
               target="_blank" rel="noopener noreferrer">
              ${escHtml(p.link_label)} →
            </a>
          </div>
        </div>
        <div class="project-card__body">
          <h3 class="project-card__title">${escHtml(p.title)}</h3>
          <p class="project-card__desc">${escHtml(p.description)}</p>
          <div class="project-card__tags">
            ${p.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
          </div>
        </div>
      </article>`).join('');

    requestAnimationFrame(() => observeFadeIn('#portfolioGrid .fade-in'));
  }

  // Filter wiring
  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    renderCards(btn.dataset.tag);
  });

  renderCards('all');
}

// ─── 8. FOOTER ───────────────────────────────────────────────────────────────

function populateFooter(owner) {
  const copy = document.getElementById('footerCopy');
  if (copy) copy.textContent = `© ${new Date().getFullYear()} ${owner.name}. All rights reserved.`;

  const socials = document.getElementById('footerSocials');
  if (!socials) return;

  const links = [
    { key: 'linkedin',       label: 'LinkedIn',       text: 'LinkedIn' },
    { key: 'github',         label: 'GitHub',         text: 'GitHub' },
    { key: 'tableau_public', label: 'Tableau Public', text: 'Tableau Public' },
    { key: 'email',          label: 'Email',          text: 'Email',
      href: owner.contact?.email ? `mailto:${owner.contact.email}` : null },
  ];

  socials.innerHTML = links
    .filter(l => (l.href || owner.contact?.[l.key]))
    .map(l => {
      const href = l.href ?? owner.contact[l.key];
      return `<a href="${escHtml(href)}" aria-label="${escHtml(l.label)}"
                  target="_blank" rel="noopener noreferrer"
                  class="footer__social-link">${escHtml(l.text)}</a>`;
    }).join('');
}

// ─── 9. SCROLL SPY ───────────────────────────────────────────────────────────

function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__links a');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('is-active'));
        const active = document.querySelector(`.nav__links a[href="#${e.target.id}"]`);
        if (active) active.classList.add('is-active');
      }
    });
  }, { threshold: 0.35 });

  sections.forEach(s => observer.observe(s));
}

// ─── 10. FADE-IN OBSERVER ────────────────────────────────────────────────────

function observeFadeIn(selector) {
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => observer.observe(el));
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────

(async function init() {
  initThemeToggle();
  initNav();

  try {
    const data = await loadData();
    populateHero(data.owner);
    populateSkills(data.skills);
    populateExperience(data.experience);
    populatePortfolio(data.portfolio);
    populateFooter(data.owner);
    initScrollSpy();

    // Fade in hero elements immediately
    document.querySelectorAll('.hero .fade-in').forEach(el => el.classList.add('is-visible'));
  } catch (err) {
    console.error('[Portfolio] Failed to load data:', err);
  }
})();

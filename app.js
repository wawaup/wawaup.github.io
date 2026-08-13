/* ── Blog posts data ── */
const BLOG_POSTS = [];

/* ── Section config ── */
const SECTION_CONFIG = [
  { key: "education", containerId: "education-list", sectionId: "education", type: "education" },
  { key: "work",      containerId: "work-list",      sectionId: "work",       type: "work" },
  { key: "dev",       containerId: "dev-list",        sectionId: "dev-project",type: "project" },
  { key: "pm",        containerId: "pm-list",         sectionId: "pm-project", type: "project" }
];

const LABELS = {
  gpa:           { zh: "加权 / GPA",  en: "Weighted Avg / GPA" },
  honors:        { zh: "荣誉",        en: "Honors" },
  campusRoles:   { zh: "在校担任",    en: "Campus Roles" },
  coreCourses:   { zh: "核心课程",    en: "Core Courses" },
  onlineLink:    { zh: "在线展示",    en: "Online Link" },
  schoolWebsite: { zh: "学校官网",    en: "School Website" }
};

/* ── State ── */
let currentLang     = getInitialLanguage();
let currentPage     = "resume";
let currentSection  = "education";
let resumeDataPromise;
let cardRevealObserver;
let galleryResizeQueued = false;
let galleryResizeHandlerBound = false;
const imageModalState = { galleryButtons: [], currentIndex: 0 };

/* Blog state */
let blogActiveTag    = null;   /* null = all */
let blogSearchQuery  = "";
let blogCurrentPostId = null;

/* ── Boot ── */
document.addEventListener("DOMContentLoaded", async () => {
  setupWordmarkDraw();
  setupLanguageSwitch();
  setupPageTabs();
  setupImageModal();
  setupGalleryResizeHandler();
  setupBlogControls();
  await initPage();
});

function setupWordmarkDraw() {
  const mark = document.querySelector(".site-wordmark");
  if (!mark) return;

  const start = () => {
    mark.classList.add("is-ready");
    mark.addEventListener("animationend", () => mark.classList.add("is-drawn"), { once: true });
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    mark.classList.add("is-ready", "is-drawn");
    return;
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(start);
    return;
  }
  start();
}

function getInitialLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved) return saved;
  const b = navigator.language || "zh";
  return b.toLowerCase().startsWith("en") ? "en" : "zh";
}

async function initPage() {
  const data = await loadResumeData();
  applyStaticLanguage();
  renderAllSections(data);
  refreshProjectGalleries();
  renderSectionTabs();
  activateLanguageButton();
  activatePageTab();
  activateSectionTab();
  revealCardsOnScroll();
  renderBlogPage();
}

async function loadResumeData() {
  if (!resumeDataPromise) {
    resumeDataPromise = fetch("./data.json").then(r => {
      if (!r.ok) throw new Error(`data.json: ${r.status}`);
      return r.json();
    });
  }
  return resumeDataPromise;
}

/* ── Language ── */
function setupLanguageSwitch() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const next = btn.dataset.lang;
      if (!next || next === currentLang) return;
      currentLang = next;
      localStorage.setItem("lang", next);
      await initPage();
    });
  });
}

function activateLanguageButton() {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  document.title = currentLang === "zh" ? "wawaup 的个人主页" : "wawaup's homepage";
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.lang === currentLang);
  });
}

function applyStaticLanguage() {
  document.querySelectorAll("[data-zh][data-en]").forEach(el => {
    const text = el.dataset[currentLang];
    if (typeof text !== "string") return;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.placeholder = text;
      return;
    }
    el.textContent = text;
  });
}

/* ── Page tabs ── */
function setupPageTabs() {
  document.querySelectorAll(".page-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (!page || page === currentPage) return;
      currentPage = page;
      activatePageTab();
    });
  });
}

function activatePageTab() {
  document.querySelectorAll(".page-tab").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.page === currentPage);
  });
  document.getElementById("resume-view")?.classList.toggle("is-active", currentPage === "resume");
  document.getElementById("blog-view")?.classList.toggle("is-active",   currentPage === "blog");
  const nav = document.getElementById("section-tabs");
  if (nav) nav.classList.toggle("is-hidden", currentPage !== "resume");
}

/* ── Section tabs ── */
function renderSectionTabs() {
  const container = document.getElementById("section-tabs");
  if (!container) return;
  container.innerHTML = "";
  document.querySelectorAll(".resume-section").forEach(section => {
    const btn = createElement("button", "section-tab");
    btn.type = "button";
    btn.dataset.section = section.id;
    btn.textContent = currentLang === "zh" ? section.dataset.navZh : section.dataset.navEn;
    btn.addEventListener("click", () => {
      if (currentSection === section.id) return;
      currentSection = section.id;
      activateSectionTab();
    });
    container.appendChild(btn);
  });
}

function activateSectionTab() {
  document.querySelectorAll(".section-tab").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.section === currentSection);
  });
  document.querySelectorAll(".resume-section").forEach(section => {
    section.classList.toggle("is-active", section.id === currentSection);
  });
  revealCardsOnScroll();
  refreshProjectGalleries();
}

/* ── Render all resume sections ── */
function renderAllSections(data) {
  SECTION_CONFIG.forEach(section => {
    const container = document.getElementById(section.containerId);
    if (!container) return;
    container.innerHTML = "";
    const items = Array.isArray(data[section.key]) ? data[section.key] : [];
    items.forEach((item, index) => {
      container.appendChild(renderItemCard(item, section.type, getCardId(section.key, index)));
    });
  });
}

function renderItemCard(item, type, cardId) {
  const article = createElement("article", `resume-card ${type}-card`);
  article.id = cardId;
  article.appendChild(renderHeader(item, type));
  if (type === "education") {
    article.appendChild(renderEducationBody(item));
  } else {
    article.appendChild(renderBulletList(item.bullets, type));
    if (item.link?.url) article.appendChild(renderExternalLink(item.link));
    if (type === "project" && Array.isArray(item.images) && item.images.length > 0) {
      article.appendChild(renderGallery(item.images));
    }
  }
  return article;
}

function renderHeader(item, type) {
  const header = createElement("div", "item-header");
  const line = createElement("div", "item-title-line");

  if (item.logo && (type === "work" || type === "education")) {
    const logo = createElement("img", type === "education" ? "school-logo" : "company-logo");
    logo.src = item.logo;
    logo.alt = type === "education" ? getLocalizedText(item.school) : getLocalizedText(item.company);
    line.appendChild(logo);
  }

  const titleText = createElement("div", "item-title-text");
  const title = createElement("h3", "item-title");

  if (type === "education") {
    title.appendChild(renderSchoolLink(item));
  } else {
    title.textContent = getEntryTitle(item, type);
  }

  titleText.appendChild(title);
  const subtitle = buildSubtitle(item, type);
  if (subtitle) {
    titleText.appendChild(createElement("p", "item-subtitle", subtitle));
  }
  line.appendChild(titleText);

  header.appendChild(line);
  header.appendChild(createElement("span", "item-period", formatPeriod(item.period)));
  return header;
}

function renderSchoolLink(item) {
  const name = getLocalizedText(item.school);
  if (!item.schoolUrl) return document.createTextNode(name);
  const a = createElement("a", "title-link", name);
  a.href = item.schoolUrl;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.setAttribute("aria-label", `${name} - ${getLocalizedText(LABELS.schoolWebsite)}`);
  return a;
}

function buildSubtitle(item, type) {
  if (type === "education") {
    return [getLocalizedText(item.college), getLocalizedText(item.major), getLocalizedText(item.grade)]
      .filter(Boolean).join(" / ");
  }
  if (type === "work") {
    return [getLocalizedText(item.department), getLocalizedText(item.position)]
      .filter(Boolean).join(" / ");
  }
  return getLocalizedText(item.role);
}

function formatPeriod(period) {
  const raw = getLocalizedText(period);
  if (!raw) return "";
  const localized = currentLang === "en" ? raw.replace(/至今/g, "NOW") : raw;
  return localized.replace(/\s*-\s*/g, " - ");
}

function renderEducationBody(item) {
  const body = createElement("div", "education-body");
  const summaryParts = [];
  if (item.gpa) summaryParts.push(renderMetaPair(LABELS.gpa, item.gpa));
  const honors = getLocalizedText(item.honors);
  if (honors) summaryParts.push(renderMetaPair(LABELS.honors, honors));
  if (summaryParts.length) {
    const row = createElement("div", "meta-row");
    row.append(...summaryParts);
    body.appendChild(row);
  }
  const campusRoles = getLocalizedText(item.campusRoles);
  if (campusRoles) body.appendChild(renderMetaRow(LABELS.campusRoles, campusRoles));
  const coreCourses = getLocalizedCoreCourses(item.coreCourses);
  if (coreCourses) body.appendChild(renderMetaRow(LABELS.coreCourses, coreCourses));
  return body;
}

function getLocalizedCoreCourses(cc) {
  if (!cc) return "";
  const v = cc[currentLang] ?? cc.zh ?? cc.en;
  if (Array.isArray(v)) return v.filter(Boolean).join(currentLang === "zh" ? "；" : ", ");
  return v || "";
}

function renderMetaRow(label, value) {
  const row = createElement("div", "meta-row");
  row.appendChild(renderMetaPair(label, value));
  return row;
}

function renderMetaPair(label, value) {
  const pair = createElement("span", "meta-pair");
  pair.append(
    createElement("strong", "meta-label", `${getLocalizedText(label)}：`),
    createElement("span", "meta-value", value || "")
  );
  return pair;
}

function renderBulletList(bullets, type) {
  const items = Array.isArray(bullets?.[currentLang]) ? bullets[currentLang] : [];
  const list = createElement("ul", "bullet-list");
  items.forEach(text => list.appendChild(createElement("li", "bullet-item", text)));
  return list;
}

function renderExternalLink(link) {
  const wrapper = createElement("div", "item-link-row");
  const a = createElement("a", "item-link", getLocalizedText(link.label || LABELS.onlineLink));
  a.href = link.url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.appendChild(createElement("span", "item-link-arrow", "↗"));
  wrapper.appendChild(a);
  return wrapper;
}

function renderGallery(images) {
  const gallery = createElement("div", "project-gallery");
  gallery.dataset.count = String(images.length);
  images.forEach((image, index) => {
    const btn = createElement("button", "gallery-button");
    btn.type = "button";
    btn.dataset.fullsrc  = image.src;
    btn.dataset.caption  = getLocalizedText(image.alt);
    btn.dataset.index    = String(index);
    const img = createElement("img", "gallery-image");
    img.src = image.src;
    img.alt = getLocalizedText(image.alt);
    img.loading = "lazy";
    img.decoding = "async";
    btn.appendChild(img);
    gallery.appendChild(btn);
  });
  return gallery;
}

/* ── Gallery layout ── */
function setupGalleryResizeHandler() {
  if (galleryResizeHandlerBound) return;
  galleryResizeHandlerBound = true;
  window.addEventListener("resize", () => {
    if (galleryResizeQueued) return;
    galleryResizeQueued = true;
    requestAnimationFrame(() => { galleryResizeQueued = false; refreshProjectGalleries(); });
  }, { passive: true });
}

function refreshProjectGalleries() {
  document.querySelectorAll(".project-gallery").forEach(g => layoutProjectGallery(g));
}

function layoutProjectGallery(gallery) {
  const styles = getComputedStyle(gallery);
  const rowH   = parseFloat(styles.getPropertyValue("grid-auto-rows")) || 8;
  const gap    = parseFloat(styles.gap) || 8;
  const cols   = styles.gridTemplateColumns.split(" ").filter(Boolean).length || 1;

  gallery.querySelectorAll(".gallery-button").forEach(btn => {
    const img = btn.querySelector(".gallery-image");
    if (!img) return;
    if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
      img.addEventListener("load", refreshProjectGalleries, { once: true });
      return;
    }
    const ratio = img.naturalWidth / img.naturalHeight;
    const { shape, colSpan } = getGalleryShape(ratio, cols);
    btn.dataset.shape = shape;
    btn.style.setProperty("--gallery-col-span", String(colSpan));
    const w = btn.clientWidth || img.clientWidth;
    if (!w) return;
    const adj = shape === "panorama" ? 0.8 : shape === "landscape" ? 0.92 : shape === "poster" ? 1.1 : 1;
    const h   = w * (img.naturalHeight / img.naturalWidth) * adj;
    const span = Math.max(14, Math.min(48, Math.ceil((h + gap) / (rowH + gap))));
    btn.style.setProperty("--gallery-span", String(span));
  });
}

function getGalleryShape(ratio, cols) {
  if (cols <= 1)             return { shape: "standard",  colSpan: 1 };
  if (ratio >= 2.1 && cols >= 3) return { shape: "panorama",  colSpan: Math.min(3, cols) };
  if (ratio >= 1.45)         return { shape: "landscape", colSpan: Math.min(2, cols) };
  if (ratio <= 0.62)         return { shape: "poster",    colSpan: 1 };
  if (ratio <= 0.84)         return { shape: "portrait",  colSpan: 1 };
  return { shape: "standard", colSpan: 1 };
}

/* ── Card reveal on scroll ── */
function revealCardsOnScroll() {
  if (cardRevealObserver) cardRevealObserver.disconnect();
  cardRevealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        cardRevealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  const active = document.getElementById(currentSection);
  if (!active) return;
  active.querySelectorAll(".resume-card").forEach(card => {
    card.classList.remove("is-visible");
    cardRevealObserver.observe(card);
  });
}

/* ── Image modal ── */
function setupImageModal() {
  const modal   = document.getElementById("image-modal");
  const img     = document.getElementById("image-modal-img");
  const caption = document.getElementById("image-modal-caption");
  const close   = document.getElementById("image-modal-close");
  const prev    = document.getElementById("image-modal-prev");
  const next    = document.getElementById("image-modal-next");
  if (!modal || !img || !caption || !close || !prev || !next) return;

  document.addEventListener("click", e => {
    const trigger = e.target.closest(".gallery-button");
    if (trigger) {
      const gallery = trigger.closest(".project-gallery");
      const buttons = gallery ? [...gallery.querySelectorAll(".gallery-button")] : [trigger];
      openModal(buttons, Number(trigger.dataset.index) || 0);
      return;
    }
    if (e.target === modal || e.target.closest("#image-modal-close")) { closeModal(); return; }
    if (e.target.closest("#image-modal-prev")) { navigate(-1); return; }
    if (e.target.closest("#image-modal-next")) { navigate(1); }
  });

  document.addEventListener("keydown", e => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape")      { closeModal(); return; }
    if (e.key === "ArrowLeft")   { e.preventDefault(); navigate(-1); return; }
    if (e.key === "ArrowRight")  { e.preventDefault(); navigate(1); }
  });

  function openModal(buttons, startIndex) {
    imageModalState.galleryButtons = buttons;
    imageModalState.currentIndex   = clamp(startIndex, 0, buttons.length - 1);
    updateDisplay();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function navigate(dir) {
    const total = imageModalState.galleryButtons.length;
    if (!total) return;
    imageModalState.currentIndex = (imageModalState.currentIndex + dir + total) % total;
    updateDisplay();
  }

  function updateDisplay() {
    const btn = imageModalState.galleryButtons[imageModalState.currentIndex];
    if (!btn) return;
    img.src       = btn.dataset.fullsrc || "";
    img.alt       = btn.dataset.caption || "";
    caption.textContent = btn.dataset.caption || "";
    const multi   = imageModalState.galleryButtons.length > 1;
    prev.hidden   = !multi;
    next.hidden   = !multi;
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    img.src = "";
    img.alt = "";
    caption.textContent = "";
    imageModalState.galleryButtons = [];
    imageModalState.currentIndex   = 0;
    document.body.classList.remove("modal-open");
  }
}

/* ── Blog ── */
function setupBlogControls() {
  const searchInput = document.getElementById("blog-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      blogSearchQuery = searchInput.value.trim().toLowerCase();
      renderBlogList();
    });
  }

  const backBtn = document.getElementById("blog-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => showBlogIndex());
  }
}

function renderBlogPage() {
  renderBlogTagFilters();
  renderBlogList();
  applyStaticLanguage();
}

function renderBlogTagFilters() {
  const container = document.getElementById("blog-tags");
  if (!container) return;
  container.innerHTML = "";

  const allTags = [...new Set(BLOG_POSTS.flatMap(p => p.tags))].sort();

  const allBtn = createElement("button", `tag-filter-btn${blogActiveTag === null ? " is-active" : ""}`);
  allBtn.type = "button";
  allBtn.textContent = currentLang === "zh" ? "全部" : "All";
  allBtn.addEventListener("click", () => { blogActiveTag = null; renderBlogTagFilters(); renderBlogList(); });
  container.appendChild(allBtn);

  allTags.forEach(tag => {
    const btn = createElement("button", `tag-filter-btn${blogActiveTag === tag ? " is-active" : ""}`);
    btn.type = "button";
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      blogActiveTag = (blogActiveTag === tag) ? null : tag;
      renderBlogTagFilters();
      renderBlogList();
    });
    container.appendChild(btn);
  });
}

function getFilteredPosts() {
  return BLOG_POSTS
    .filter(p => !blogActiveTag || p.tags.includes(blogActiveTag))
    .filter(p => {
      if (!blogSearchQuery) return true;
      const title = getLocalizedText(p.title).toLowerCase();
      return title.includes(blogSearchQuery);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderBlogList() {
  const list  = document.getElementById("blog-list");
  const empty = document.getElementById("blog-empty");
  if (!list || !empty) return;

  const posts = getFilteredPosts();
  list.innerHTML = "";

  if (posts.length === 0) {
    empty.hidden = false;
    const mainEl = empty.querySelector(".blog-empty-main");
    const subEl  = empty.querySelector(".blog-empty-sub");
    const hasFilter = blogActiveTag || blogSearchQuery;
    if (mainEl) mainEl.textContent = currentLang === "zh"
      ? (hasFilter ? "没找到相关文章" : "努力整理中.....^^")
      : (hasFilter ? "No posts match" : "Working on it.....^^");
    if (subEl) subEl.hidden = !hasFilter;
    return;
  }

  empty.hidden = true;
  posts.forEach(post => list.appendChild(renderBlogCard(post)));
}

function renderBlogCard(post) {
  const card = createElement("article", "blog-card");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");

  const head    = createElement("div", "blog-card-head");
  const title   = createElement("h3", "blog-card-title", getLocalizedText(post.title));
  const dateEl  = createElement("time", "blog-card-date", post.date);
  dateEl.setAttribute("datetime", post.date);
  head.append(title, dateEl);

  const excerpt = createElement("p", "blog-card-excerpt",
    getLocalizedText(post.excerpt) || "");

  const tags    = createElement("div", "blog-card-tags");
  post.tags.forEach(t => tags.appendChild(createElement("span", "blog-tag", t)));

  card.append(head, excerpt, tags);

  const open = () => showBlogPost(post.id);
  card.addEventListener("click", open);
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });

  return card;
}

function showBlogPost(id) {
  const post = BLOG_POSTS.find(p => p.id === id);
  if (!post) return;
  blogCurrentPostId = id;

  const indexEl = document.getElementById("blog-index");
  const postEl  = document.getElementById("blog-post-view");
  const bodyEl  = document.getElementById("blog-post-content");
  if (!indexEl || !postEl || !bodyEl) return;

  const content = getLocalizedText(post.content) || getLocalizedText(post.excerpt) || "";

  const metaHtml = `
    <div class="post-meta-header">
      <p class="post-date">${post.date}</p>
      <h1>${getLocalizedText(post.title)}</h1>
      <div class="post-tags">
        ${post.tags.map(t => `<span class="blog-tag">${t}</span>`).join("")}
      </div>
    </div>
  `;

  const mdHtml = typeof marked !== "undefined"
    ? marked.parse(content)
    : content.replace(/\n/g, "<br>");

  bodyEl.innerHTML = metaHtml + mdHtml;

  indexEl.hidden = true;
  postEl.hidden  = false;
  postEl.scrollIntoView({ behavior: "instant" });

  const backSpan = postEl.querySelector("[data-zh]");
  if (backSpan) backSpan.textContent = currentLang === "zh" ? "返回列表" : "Back to list";
}

function showBlogIndex() {
  const indexEl = document.getElementById("blog-index");
  const postEl  = document.getElementById("blog-post-view");
  if (indexEl) indexEl.hidden = false;
  if (postEl)  postEl.hidden  = true;
  blogCurrentPostId = null;
}

/* ── Utilities ── */
function getLocalizedText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value[currentLang] || value.zh || value.en || "";
}

function getCardId(key, index) { return `${key}-item-${index + 1}`; }

function getEntryTitle(item, type) {
  if (type === "work")      return getLocalizedText(item.company);
  if (type === "education") return getLocalizedText(item.school);
  return getLocalizedText(item.name);
}

function createElement(tagName, className, text) {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  if (typeof text === "string") el.textContent = text;
  return el;
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

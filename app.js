const SECTION_CONFIG = [
    { key: 'education', containerId: 'education-list', type: 'education' },
    { key: 'work', containerId: 'work-list', type: 'work' },
    { key: 'dev', containerId: 'dev-list', type: 'project' },
    { key: 'pm', containerId: 'pm-list', type: 'project' }
];

const LABELS = {
    gpa: { zh: '加权 / GPA', en: 'Weighted Avg / GPA' },
    honors: { zh: '荣誉', en: 'Honors' },
    campusRoles: { zh: '在校担任', en: 'Campus Roles' },
    onlineLink: { zh: '在线展示', en: 'Online Link' },
    schoolWebsite: { zh: '学校官网', en: 'School Website' }
};

let currentLang = getInitialLanguage();
let resumeDataPromise;
let sectionObserver;
let cardObserver;

document.addEventListener('DOMContentLoaded', async () => {
    setupLanguageSwitch();
    setupImageModal();
    await initPage();
});

function getInitialLanguage() {
    const savedLang = localStorage.getItem('lang');
    if (savedLang) return savedLang;

    const browserLang = navigator.language || navigator.userLanguage || 'zh';
    return browserLang.toLowerCase().includes('en') ? 'en' : 'zh';
}

async function initPage() {
    const data = await loadResumeData();
    applyStaticLanguage();
    renderAllSections(data);
    renderNavigation();
    activateLanguageButton();
    observeSections();
    observeCards();
}

async function loadResumeData() {
    if (!resumeDataPromise) {
        resumeDataPromise = fetch('./data.json').then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load data.json: ${response.status}`);
            }
            return response.json();
        });
    }

    return resumeDataPromise;
}

function setupLanguageSwitch() {
    document.querySelectorAll('.lang-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const nextLang = button.dataset.lang;
            if (!nextLang || nextLang === currentLang) return;

            currentLang = nextLang;
            localStorage.setItem('lang', nextLang);
            await initPage();
        });
    });
}

function activateLanguageButton() {
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    document.title = currentLang === 'zh' ? 'wawaup的个人主页' : "wawaup's homepage";

    document.querySelectorAll('.lang-btn').forEach(button => {
        button.classList.toggle('is-active', button.dataset.lang === currentLang);
    });
}

function applyStaticLanguage() {
    document.querySelectorAll('[data-zh][data-en]').forEach(element => {
        const text = element.dataset[currentLang];
        if (typeof text === 'string') {
            element.textContent = text;
        }
    });
}

function renderAllSections(data) {
    SECTION_CONFIG.forEach(section => {
        const container = document.getElementById(section.containerId);
        if (!container) return;

        container.innerHTML = '';
        const items = Array.isArray(data[section.key]) ? data[section.key] : [];
        items.forEach(item => {
            const card = renderItemCard(item, section.type);
            container.appendChild(card);
        });
    });
}

function renderItemCard(item, type) {
    const article = createElement('article', `resume-card ${type}-card`);
    article.appendChild(renderHeader(item, type));

    if (type === 'education') {
        article.appendChild(renderEducationBody(item));
    } else {
        article.appendChild(renderBulletList(item.bullets, type));

        if (item.link?.url) {
            article.appendChild(renderExternalLink(item.link));
        }

        if (type === 'project' && Array.isArray(item.images) && item.images.length > 0) {
            article.appendChild(renderGallery(item.images));
        }
    }

    return article;
}

function renderHeader(item, type) {
    const header = createElement('div', 'item-header');
    const titleGroup = createElement('div', 'item-title-group');
    const titleLine = createElement('div', 'item-title-line');
    const period = createElement('span', 'item-period', item.period || '');

    if (type === 'work' && item.logo) {
        const logo = createElement('img', 'company-logo');
        logo.src = item.logo;
        logo.alt = getLocalizedText(item.company);
        titleLine.appendChild(logo);
    }

    const titleText = createElement('div', 'item-title-text');
    const title = createElement('h3', 'item-title');
    const inlineMeta = createElement('span', 'item-title-inline');
    inlineMeta.textContent = buildInlineMeta(item, type);

    if (type === 'education') {
        title.appendChild(renderSchoolLink(item));
    } else {
        title.textContent = getLocalizedText(type === 'work' ? item.company : item.name);
    }
    title.appendChild(inlineMeta);
    titleText.appendChild(title);
    titleLine.appendChild(titleText);
    titleGroup.append(titleLine, period);
    header.appendChild(titleGroup);

    return header;
}

function renderSchoolLink(item) {
    const schoolName = getLocalizedText(item.school);
    if (!item.schoolUrl) {
        return document.createTextNode(schoolName);
    }

    const anchor = createElement('a', 'title-link', schoolName);
    anchor.href = item.schoolUrl;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.setAttribute('aria-label', `${schoolName} - ${getLocalizedText(LABELS.schoolWebsite)}`);
    return anchor;
}

function buildInlineMeta(item, type) {
    if (type === 'education') {
        const parts = [
            getLocalizedText(item.college),
            getLocalizedText(item.major),
            getLocalizedText(item.grade)
        ].filter(Boolean);
        return parts.length ? ` | ${parts.join(' | ')}` : '';
    }

    if (type === 'work') {
        const parts = [
            getLocalizedText(item.department),
            getLocalizedText(item.position)
        ].filter(Boolean);
        return parts.length ? ` | ${parts.join(' | ')}` : '';
    }

    const role = getLocalizedText(item.role);
    return role ? ` | ${role}` : '';
}

function renderEducationBody(item) {
    const body = createElement('div', 'education-body');
    body.appendChild(renderEducationSummaryRow(item));
    body.appendChild(renderMetaRow(LABELS.campusRoles, getLocalizedText(item.campusRoles)));
    return body;
}

function renderEducationSummaryRow(item) {
    const row = createElement('div', 'meta-row meta-row-split');
    row.append(
        renderMetaPair(LABELS.gpa, item.gpa),
        renderMetaPair(LABELS.honors, getLocalizedText(item.honors))
    );
    return row;
}

function renderMetaRow(label, value) {
    const row = createElement('div', 'meta-row');
    row.appendChild(renderMetaPair(label, value));
    return row;
}

function renderMetaPair(label, value) {
    const pair = createElement('span', 'meta-pair');
    const labelElement = createElement('strong', 'meta-label', `${getLocalizedText(label)}：`);
    const valueElement = createElement('span', 'meta-value', value || '');
    pair.append(labelElement, valueElement);
    return pair;
}

function renderBulletList(bullets, type) {
    const localizedBullets = Array.isArray(bullets?.[currentLang]) ? bullets[currentLang] : [];
    const list = createElement('ul', `bullet-list ${type === 'work' ? 'work-bullets' : 'project-bullets'}`);

    localizedBullets.forEach(text => {
        const item = createElement('li', 'bullet-item', text);
        list.appendChild(item);
    });

    return list;
}

function renderExternalLink(link) {
    const wrapper = createElement('div', 'item-link-row');
    const anchor = createElement('a', 'item-link', getLocalizedText(link.label || LABELS.onlineLink));
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.appendChild(createElement('span', 'item-link-arrow', '->'));
    wrapper.appendChild(anchor);
    return wrapper;
}

function renderGallery(images) {
    const gallery = createElement('div', 'project-gallery');

    images.forEach(image => {
        const button = createElement('button', 'gallery-button');
        button.type = 'button';
        button.dataset.fullsrc = image.src;
        button.dataset.caption = getLocalizedText(image.alt);

        const img = createElement('img', 'gallery-image');
        img.src = image.src;
        img.alt = getLocalizedText(image.alt);

        button.appendChild(img);
        gallery.appendChild(button);
    });

    return gallery;
}

function renderNavigation() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    navLinks.innerHTML = '';
    document.querySelectorAll('.resume-section').forEach(section => {
        const link = createElement('a', 'nav-link');
        link.href = `#${section.id}`;
        link.dataset.target = section.id;
        link.textContent = currentLang === 'zh' ? section.dataset.navZh : section.dataset.navEn;
        navLinks.appendChild(link);
    });
}

function observeSections() {
    if (sectionObserver) {
        sectionObserver.disconnect();
    }

    const navLinks = [...document.querySelectorAll('.nav-link')];
    sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            navLinks.forEach(link => {
                link.classList.toggle('is-active', link.dataset.target === entry.target.id);
            });
        });
    }, {
        rootMargin: '-35% 0px -50% 0px',
        threshold: 0.1
    });

    document.querySelectorAll('.resume-section').forEach(section => {
        sectionObserver.observe(section);
    });
}

function observeCards() {
    if (cardObserver) {
        cardObserver.disconnect();
    }

    cardObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                cardObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15
    });

    document.querySelectorAll('.resume-card').forEach(card => {
        cardObserver.observe(card);
    });
}

function setupImageModal() {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('image-modal-img');
    const modalCaption = document.getElementById('image-modal-caption');
    const closeButton = document.getElementById('image-modal-close');

    if (!modal || !modalImage || !modalCaption || !closeButton) return;

    document.addEventListener('click', event => {
        const trigger = event.target.closest('.gallery-button');
        if (trigger) {
            modalImage.src = trigger.dataset.fullsrc || '';
            modalImage.alt = trigger.dataset.caption || '';
            modalCaption.textContent = trigger.dataset.caption || '';
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            return;
        }

        if (event.target === modal || event.target === closeButton) {
            closeImageModal();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeImageModal();
        }
    });

    function closeImageModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modalImage.src = '';
        modalImage.alt = '';
        modalCaption.textContent = '';
        document.body.classList.remove('modal-open');
    }
}

function getLocalizedText(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    return value[currentLang] || value.zh || value.en || '';
}

function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (typeof text === 'string') {
        element.textContent = text;
    }
    return element;
}

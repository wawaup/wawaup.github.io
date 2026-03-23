const SECTION_CONFIG = [
    { key: "education", containerId: "education-list", sectionId: "education", type: "education" },
    { key: "work", containerId: "work-list", sectionId: "work", type: "work" },
    { key: "dev", containerId: "dev-list", sectionId: "dev-project", type: "project" },
    { key: "pm", containerId: "pm-list", sectionId: "pm-project", type: "project" }
];

const LABELS = {
    gpa: { zh: "加权 / GPA", en: "Weighted Avg / GPA" },
    honors: { zh: "荣誉", en: "Honors" },
    campusRoles: { zh: "在校担任", en: "Campus Roles" },
    onlineLink: { zh: "在线展示", en: "Online Link" },
    schoolWebsite: { zh: "学校官网", en: "School Website" }
};

const TIMELINE_SHORT_LABELS = {
    zh: {
        "基于机器学习的海洋牧场生物分布与环境因子的关系建模": "海洋牧场建模（毕设）",
        "基于树莓派的语音交互系统": "树莓派语音交互",
        "知识工程与问答系统系列实践": "知识工程与 KGQA",
        "天津大学校友之家小程序": "校友之家小程序",
        "TWT Studio（天津大学）": "TWT Studio Leadership",
        "方寸流年摄影比赛平台": "方寸流年摄影平台",
        "微北洋 4.0": "微北洋 4.0",
        "天外天招募中心": "招募中心"
    },
    en: {
        "Modeling the Relationship Between Marine Ranching Species Distribution and Environmental Factors Using Machine Learning": "Marine Ranching Modeling",
        "Raspberry Pi-based Voice Interaction System": "Raspberry Pi Voice System",
        "Knowledge Engineering and KGQA Practice Series": "Knowledge Engineering & KGQA",
        "Tianjin University Alumni Home Mini-Program": "Alumni Home Mini-Program",
        "TWT Studio (Tianjin University)": "TWT Studio Leadership",
        "Fangcun Liunian Photography Competition Platform": "Photography Platform",
        "WePeiyang 4.0": "WePeiyang 4.0",
        "TWT Recruitment Center": "Recruitment Center"
    }
};

let currentLang = getInitialLanguage();
let resumeDataPromise;
let sectionObserver;
let cardRevealObserver;
let timelineObserver;
let galleryResizeQueued = false;
let galleryResizeHandlerBound = false;
const imageModalState = {
    galleryButtons: [],
    currentIndex: 0
};

document.addEventListener("DOMContentLoaded", async () => {
    setupLanguageSwitch();
    setupTimelineToggle();
    setupImageModal();
    setupGalleryResizeHandler();
    await initPage();
});

function getInitialLanguage() {
    const savedLang = localStorage.getItem("lang");
    if (savedLang) return savedLang;

    const browserLang = navigator.language || navigator.userLanguage || "zh";
    return browserLang.toLowerCase().includes("en") ? "en" : "zh";
}

async function initPage() {
    const data = await loadResumeData();
    applyStaticLanguage();
    renderAllSections(data);
    refreshProjectGalleries();
    renderNavigation();
    renderTimeline(data);
    activateLanguageButton();
    observeSections();
    observeTimelineItems();
    revealCardsOnScroll();
}

async function loadResumeData() {
    if (!resumeDataPromise) {
        resumeDataPromise = fetch("./data.json").then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load data.json: ${response.status}`);
            }
            return response.json();
        });
    }

    return resumeDataPromise;
}

function setupLanguageSwitch() {
    document.querySelectorAll(".lang-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const nextLang = button.dataset.lang;
            if (!nextLang || nextLang === currentLang) return;

            currentLang = nextLang;
            localStorage.setItem("lang", nextLang);
            await initPage();
        });
    });
}

function setupTimelineToggle() {
    const toggle = document.getElementById("timeline-toggle");
    const sidebar = document.getElementById("timeline-sidebar");
    if (!toggle || !sidebar) return;

    toggle.addEventListener("click", () => {
        const collapsed = sidebar.classList.toggle("is-collapsed");
        toggle.setAttribute("aria-expanded", String(!collapsed));
        toggle.setAttribute("aria-label", collapsed ? "Expand timeline" : "Collapse timeline");
    });
}

function activateLanguageButton() {
    document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
    document.title = currentLang === "zh" ? "wawaup的个人主页" : "wawaup's homepage";

    document.querySelectorAll(".lang-btn").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.lang === currentLang);
    });
}

function applyStaticLanguage() {
    document.querySelectorAll("[data-zh][data-en]").forEach((element) => {
        const text = element.dataset[currentLang];
        if (typeof text === "string") {
            element.textContent = text;
        }
    });
}

function renderAllSections(data) {
    SECTION_CONFIG.forEach((section) => {
        const container = document.getElementById(section.containerId);
        if (!container) return;

        container.innerHTML = "";
        const items = Array.isArray(data[section.key]) ? data[section.key] : [];

        items.forEach((item, index) => {
            const cardId = getCardId(section.key, index);
            const card = renderItemCard(item, section.type, cardId);
            container.appendChild(card);
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

        if (item.link?.url) {
            article.appendChild(renderExternalLink(item.link));
        }

        if (type === "project" && Array.isArray(item.images) && item.images.length > 0) {
            article.appendChild(renderGallery(item.images));
        }
    }

    return article;
}

function renderHeader(item, type) {
    const header = createElement("div", "item-header");
    const titleGroup = createElement("div", "item-title-group");
    const titleLine = createElement("div", "item-title-line");
    const period = createElement("span", "item-period", item.period || "");

    if (type === "work" && item.logo) {
        const logo = createElement("img", "company-logo");
        logo.src = item.logo;
        logo.alt = getLocalizedText(item.company);
        titleLine.appendChild(logo);
    }

    const titleText = createElement("div", "item-title-text");
    const title = createElement("h3", "item-title");
    const inlineMeta = createElement("span", "item-title-inline");
    inlineMeta.textContent = buildInlineMeta(item, type);

    if (type === "education") {
        title.appendChild(renderSchoolLink(item));
    } else {
        title.textContent = getEntryTitle(item, type);
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

    const anchor = createElement("a", "title-link", schoolName);
    anchor.href = item.schoolUrl;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.setAttribute("aria-label", `${schoolName} - ${getLocalizedText(LABELS.schoolWebsite)}`);
    return anchor;
}

function buildInlineMeta(item, type) {
    if (type === "education") {
        const parts = [
            getLocalizedText(item.college),
            getLocalizedText(item.major),
            getLocalizedText(item.grade)
        ].filter(Boolean);
        return parts.length ? ` | ${parts.join(" | ")}` : "";
    }

    if (type === "work") {
        const parts = [
            getLocalizedText(item.department),
            getLocalizedText(item.position)
        ].filter(Boolean);
        return parts.length ? ` | ${parts.join(" | ")}` : "";
    }

    const role = getLocalizedText(item.role);
    return role ? ` | ${role}` : "";
}

function renderEducationBody(item) {
    const body = createElement("div", "education-body");
    body.appendChild(renderEducationSummaryRow(item));
    body.appendChild(renderMetaRow(LABELS.campusRoles, getLocalizedText(item.campusRoles)));
    return body;
}

function renderEducationSummaryRow(item) {
    const row = createElement("div", "meta-row meta-row-split");
    row.append(
        renderMetaPair(LABELS.gpa, item.gpa),
        renderMetaPair(LABELS.honors, getLocalizedText(item.honors))
    );
    return row;
}

function renderMetaRow(label, value) {
    const row = createElement("div", "meta-row");
    row.appendChild(renderMetaPair(label, value));
    return row;
}

function renderMetaPair(label, value) {
    const pair = createElement("span", "meta-pair");
    const labelElement = createElement("strong", "meta-label", `${getLocalizedText(label)}：`);
    const valueElement = createElement("span", "meta-value", value || "");
    pair.append(labelElement, valueElement);
    return pair;
}

function renderBulletList(bullets, type) {
    const localizedBullets = Array.isArray(bullets?.[currentLang]) ? bullets[currentLang] : [];
    const list = createElement("ul", `bullet-list ${type === "work" ? "work-bullets" : "project-bullets"}`);

    localizedBullets.forEach((text) => {
        const item = createElement("li", "bullet-item", text);
        list.appendChild(item);
    });

    return list;
}

function renderExternalLink(link) {
    const wrapper = createElement("div", "item-link-row");
    const anchor = createElement("a", "item-link", getLocalizedText(link.label || LABELS.onlineLink));
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.appendChild(createElement("span", "item-link-arrow", "->"));
    wrapper.appendChild(anchor);
    return wrapper;
}

function renderGallery(images) {
    const gallery = createElement("div", "project-gallery");
    gallery.dataset.count = String(images.length);

    images.forEach((image, index) => {
        const button = createElement("button", "gallery-button");
        button.type = "button";
        button.dataset.fullsrc = image.src;
        button.dataset.caption = getLocalizedText(image.alt);
        button.dataset.index = String(index);

        const img = createElement("img", "gallery-image");
        img.src = image.src;
        img.alt = getLocalizedText(image.alt);
        img.loading = "lazy";
        img.decoding = "async";

        button.appendChild(img);
        gallery.appendChild(button);
    });

    return gallery;
}

function setupGalleryResizeHandler() {
    if (galleryResizeHandlerBound) return;

    galleryResizeHandlerBound = true;
    window.addEventListener("resize", queueGalleryLayout, { passive: true });
}

function queueGalleryLayout() {
    if (galleryResizeQueued) return;

    galleryResizeQueued = true;
    window.requestAnimationFrame(() => {
        galleryResizeQueued = false;
        refreshProjectGalleries();
    });
}

function refreshProjectGalleries() {
    document.querySelectorAll(".project-gallery").forEach((gallery) => {
        layoutProjectGallery(gallery);
    });
}

function layoutProjectGallery(gallery) {
    const styles = window.getComputedStyle(gallery);
    const rowHeight = parseFloat(styles.getPropertyValue("grid-auto-rows")) || 8;
    const gap = parseFloat(styles.getPropertyValue("gap")) || 10;
    const columnCount = styles.gridTemplateColumns.split(" ").filter(Boolean).length || 1;

    gallery.querySelectorAll(".gallery-button").forEach((button) => {
        const image = button.querySelector(".gallery-image");
        if (!image) return;

        if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
            image.addEventListener("load", queueGalleryLayout, { once: true });
            return;
        }

        const ratio = image.naturalWidth / image.naturalHeight;
        const { shape, colSpan } = getGalleryShape(ratio, columnCount);
        button.dataset.shape = shape;
        button.style.setProperty("--gallery-col-span", String(colSpan));

        const renderedWidth = button.clientWidth || image.clientWidth;
        if (!renderedWidth) return;

        const heightAdjustment = getGalleryHeightAdjustment(shape);
        const estimatedHeight = renderedWidth * (image.naturalHeight / image.naturalWidth) * heightAdjustment;
        const span = Math.max(14, Math.min(48, Math.ceil((estimatedHeight + gap) / (rowHeight + gap))));
        button.style.setProperty("--gallery-span", String(span));
    });
}

function getGalleryShape(ratio, columnCount) {
    if (columnCount <= 1) {
        return { shape: "standard", colSpan: 1 };
    }

    if (ratio >= 2.1 && columnCount >= 3) {
        return { shape: "panorama", colSpan: Math.min(3, columnCount) };
    }

    if (ratio >= 1.45) {
        return { shape: "landscape", colSpan: Math.min(2, columnCount) };
    }

    if (ratio <= 0.62) {
        return { shape: "poster", colSpan: 1 };
    }

    if (ratio <= 0.84) {
        return { shape: "portrait", colSpan: 1 };
    }

    return { shape: "standard", colSpan: 1 };
}

function getGalleryHeightAdjustment(shape) {
    if (shape === "panorama") return 0.8;
    if (shape === "landscape") return 0.92;
    if (shape === "poster") return 1.1;
    return 1;
}

function renderNavigation() {
    const navLinks = document.getElementById("nav-links");
    if (!navLinks) return;

    navLinks.innerHTML = "";
    document.querySelectorAll(".resume-section").forEach((section) => {
        const link = createElement("a", "nav-link");
        link.href = `#${section.id}`;
        link.dataset.target = section.id;
        link.textContent = currentLang === "zh" ? section.dataset.navZh : section.dataset.navEn;
        navLinks.appendChild(link);
    });
}

function renderTimeline(data) {
    const timelineLinks = document.getElementById("timeline-links");
    if (!timelineLinks) return;

    timelineLinks.innerHTML = "";

    SECTION_CONFIG.forEach((section) => {
        const items = Array.isArray(data[section.key]) ? data[section.key] : [];
        const sectionElement = document.getElementById(section.sectionId);
        if (!sectionElement || items.length === 0) return;

        const group = createElement("section", "timeline-group");
        const groupTitle = createElement(
            "a",
            "timeline-group-title",
            currentLang === "zh" ? sectionElement.dataset.navZh : sectionElement.dataset.navEn
        );
        groupTitle.href = `#${section.sectionId}`;
        group.appendChild(groupTitle);

        const list = createElement("div", "timeline-group-list");
        items.forEach((item, index) => {
            const link = createElement("a", "timeline-link");
            link.href = `#${getCardId(section.key, index)}`;
            link.dataset.target = getCardId(section.key, index);

            const period = createElement("span", "timeline-link-period", item.period || "");
            const text = createElement("span", "timeline-link-text", getTimelineLabel(item, section.type));

            link.append(period, text);
            list.appendChild(link);
        });

        group.appendChild(list);
        timelineLinks.appendChild(group);
    });
}

function observeSections() {
    if (sectionObserver) {
        sectionObserver.disconnect();
    }

    const navLinks = [...document.querySelectorAll(".nav-link")];
    sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            navLinks.forEach((link) => {
                link.classList.toggle("is-active", link.dataset.target === entry.target.id);
            });
        });
    }, {
        rootMargin: "-28% 0px -58% 0px",
        threshold: 0.1
    });

    document.querySelectorAll(".resume-section").forEach((section) => {
        sectionObserver.observe(section);
    });
}

function observeTimelineItems() {
    if (timelineObserver) {
        timelineObserver.disconnect();
    }

    const timelineLinks = [...document.querySelectorAll(".timeline-link")];
    timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            timelineLinks.forEach((link) => {
                link.classList.toggle("is-active", link.dataset.target === entry.target.id);
            });
        });
    }, {
        rootMargin: "-22% 0px -64% 0px",
        threshold: 0.12
    });

    document.querySelectorAll(".resume-card").forEach((card) => {
        timelineObserver.observe(card);
    });
}

function revealCardsOnScroll() {
    if (cardRevealObserver) {
        cardRevealObserver.disconnect();
    }

    cardRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                cardRevealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15
    });

    document.querySelectorAll(".resume-card").forEach((card) => {
        cardRevealObserver.observe(card);
    });
}

function setupImageModal() {
    const modal = document.getElementById("image-modal");
    const modalImage = document.getElementById("image-modal-img");
    const modalCaption = document.getElementById("image-modal-caption");
    const closeButton = document.getElementById("image-modal-close");
    const prevButton = document.getElementById("image-modal-prev");
    const nextButton = document.getElementById("image-modal-next");

    if (!modal || !modalImage || !modalCaption || !closeButton || !prevButton || !nextButton) return;

    document.addEventListener("click", (event) => {
        const trigger = event.target.closest(".gallery-button");
        if (trigger) {
            const gallery = trigger.closest(".project-gallery");
            openImageModal(gallery ? [...gallery.querySelectorAll(".gallery-button")] : [trigger], Number(trigger.dataset.index) || 0);
            return;
        }

        if (event.target === modal || event.target === closeButton) {
            closeImageModal();
            return;
        }

        if (event.target.closest("#image-modal-prev")) {
            showAdjacentImage(-1);
            return;
        }

        if (event.target.closest("#image-modal-next")) {
            showAdjacentImage(1);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!modal.classList.contains("is-open")) return;

        if (event.key === "Escape") {
            closeImageModal();
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            showAdjacentImage(-1);
            return;
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            showAdjacentImage(1);
        }
    });

    function openImageModal(buttons, startIndex) {
        imageModalState.galleryButtons = buttons;
        imageModalState.currentIndex = clampModalIndex(startIndex);
        updateModalImage();
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    function showAdjacentImage(direction) {
        if (!imageModalState.galleryButtons.length) return;

        const total = imageModalState.galleryButtons.length;
        imageModalState.currentIndex = (imageModalState.currentIndex + direction + total) % total;
        updateModalImage();
    }

    function updateModalImage() {
        const currentButton = imageModalState.galleryButtons[imageModalState.currentIndex];
        if (!currentButton) return;

        modalImage.src = currentButton.dataset.fullsrc || "";
        modalImage.alt = currentButton.dataset.caption || "";
        modalCaption.textContent = currentButton.dataset.caption || "";
        updateModalButtons();
    }

    function updateModalButtons() {
        const multiple = imageModalState.galleryButtons.length > 1;
        prevButton.hidden = !multiple;
        nextButton.hidden = !multiple;
        prevButton.disabled = !multiple;
        nextButton.disabled = !multiple;
    }

    function clampModalIndex(index) {
        if (!imageModalState.galleryButtons.length) return 0;
        return Math.max(0, Math.min(index, imageModalState.galleryButtons.length - 1));
    }

    function closeImageModal() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        modalImage.src = "";
        modalImage.alt = "";
        modalCaption.textContent = "";
        imageModalState.galleryButtons = [];
        imageModalState.currentIndex = 0;
        document.body.classList.remove("modal-open");
    }
}

function getLocalizedText(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";
    return value[currentLang] || value.zh || value.en || "";
}

function getCardId(sectionKey, index) {
    return `${sectionKey}-item-${index + 1}`;
}

function getEntryTitle(item, type) {
    if (type === "work") return getLocalizedText(item.company);
    if (type === "education") return getLocalizedText(item.school);
    return getLocalizedText(item.name);
}

function getTimelineLabel(item, type) {
    if (type === "work") {
        return getLocalizedText(item.company);
    }

    if (type === "education") {
        return getLocalizedText(item.school);
    }

    const fullName = getLocalizedText(item.name);
    const customLabel = getLocalizedText(item.timelineLabel);
    if (customLabel) {
        return customLabel;
    }

    return TIMELINE_SHORT_LABELS[currentLang]?.[fullName] || fullName;
}

function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (typeof text === "string") {
        element.textContent = text;
    }
    return element;
}

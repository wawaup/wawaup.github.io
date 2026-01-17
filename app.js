// 设置默认语言，优先从本地存储读取
let currentLang = localStorage.getItem('lang') || 'zh';

document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

async function initPage() {
    // 1. 更新所有带有 data-zh 属性的静态文本
    updateStaticText();
    
    // 2. 加载 JSON 数据并渲染各个板块
    await loadAllResumes();
    
    // 3. 渲染侧边栏导航 (确保标题显示正确语言)
    renderSidebar();
}

// 切换语言的入口函数
function switchLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang); // 记录用户选择
    initPage(); // 重新刷新内容
}

// 翻译静态文本
function updateStaticText() {
    document.querySelectorAll('[data-zh]').forEach(el => {
        const text = el.getAttribute(`data-${currentLang}`);
        if (text) {
            // 如果内部有图片（如标题里的 icon），只替换文字部分
            if (el.querySelector('img')) {
                const img = el.querySelector('img').outerHTML;
                el.innerHTML = `${img} &nbsp;&nbsp;${text}`;
            } else {
                el.textContent = text;
            }
        }
    });
}

// 核心渲染逻辑
async function loadAllResumes() {
    try {
        const response = await fetch('./data.json');
        const data = await response.json();

        // 对应 data.json 里的三个 key 和 HTML 里的三个 ID
        renderSection(data.work, 'work-resume');
        renderSection(data.dev, 'dev-resume');
        renderSection(data.pm, 'pm-resume');
    } catch (error) {
        console.error("加载数据失败:", error);
    }
}

function renderSection(items, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 

    items.forEach(item => {
        const langData = item[currentLang];
        const expElem = document.createElement('div');
        expElem.classList.add('experience');

        // 修改逻辑：判断是否为工作经历容器 (work-resume)
        // 如果是，则每一行加 💠；如果不是，则直接显示
        const descriptionHTML = langData.desc
            .map(text => {
                if (containerId === 'work-resume') {
                    return `<div>💠${text}</div>`;
                } else {
                    return `<div>${text}</div>`;
                }
            })
            .join('');

        expElem.innerHTML = `
            <div class="header">
                <span>
                    ${item.logo ? `<img src="${item.logo}" style="width: 24px;"/>&nbsp;&nbsp;` : ''}
                    ${langData.title} | ${langData.position}
                </span>
                <span class="period">${langData.period}</span>
            </div>
            <div class="description">
                ${descriptionHTML}
            </div>
        `;
        container.appendChild(expElem);
    });
}

// 生成侧边栏导航
function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    const navTitleText = currentLang === 'zh' ? '导航' : 'Navigation';
    
    // 清空除了标题以外的旧内容
    sidebar.innerHTML = `<p style="font-weight: bold;color: gray;"><img src="public/img/navi.svg" style="width: 24px;"/> &nbsp;&nbsp;${navTitleText}</p>`;

    const titles = document.querySelectorAll('.title');
    titles.forEach((title, index) => {
        if (!title.id) title.id = `section${index + 1}`;
        const anchor = document.createElement('a');
        anchor.href = `#${title.id}`;
        anchor.textContent = title.textContent.trim();
        sidebar.appendChild(anchor);
    });
}
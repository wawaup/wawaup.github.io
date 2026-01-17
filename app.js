// 优先级：1. 用户手动选过的记录 > 2. 浏览器默认语言 > 3. 默认中文
function getInitialLanguage() {
    // 检查本地存储是否有用户之前的选择
    const savedLang = localStorage.getItem('lang');
    if (savedLang) return savedLang;

    // 获取浏览器首选语言 (例如 "en-US" 或 "zh-CN")
    const browserLang = navigator.language || navigator.userLanguage;
    
    // 如果浏览器语言包含 'en'，则默认显示英文
    if (browserLang.toLowerCase().includes('en')) {
        return 'en';
    }

    // 其他情况默认返回中文
    return 'zh';
}

let currentLang = getInitialLanguage();

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

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    const navTitleText = currentLang === 'zh' ? '导航' : 'Navigation';
    
    // 1. 保留切换按钮，重新生成内部 HTML
    // 注意：这里用 innerHTML 会覆盖掉原本写的 button，所以我们要重新塞进去
    sidebar.innerHTML = `
        <button id="toggle-sidebar" class="toggle-btn">
            <i class="fas fa-chevron-left"></i>
        </button>
        <p style="font-weight: bold;color: gray;">
            <img src="public/img/navi.svg" style="width: 24px;"/> &nbsp;&nbsp;${navTitleText}
        </p>
    `;

    // 2. 重新挂载点击事件
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // 3. 填充链接
    const titles = document.querySelectorAll('.title');
    titles.forEach((title, index) => {
        if (!title.id) title.id = `section${index + 1}`;
        const anchor = document.createElement('a');
        anchor.href = `#${title.id}`;
        
        // 如果是中英混合，.textContent 可能会拿到多余空格，用 trim()
        // 且只取文字部分，排除可能存在的子元素
        anchor.textContent = title.innerText.replace(' ', '').trim(); 
        
        sidebar.appendChild(anchor);
    });
}
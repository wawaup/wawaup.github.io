document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const titles = document.querySelectorAll('.title');

    titles.forEach((title, index) => {
        // 确保每个标题都有ID
        if (!title.id) {
            title.id = `section${index + 1}`;
        }

        const anchor = document.createElement('a');
        anchor.href = `#${title.id}`;
        anchor.textContent = title.textContent;
        sidebar.appendChild(anchor);
    });
});


async function loadResume(jsonfile,id) {
    // 使用fetch API从本地获取数据
    const response = await fetch(jsonfile);
    const resumeData = await response.json(); // 解析JSON数据

    const container = document.getElementById(id);
    resumeData.experiences.forEach(exp => {
        const expElem = document.createElement('div');
        expElem.classList.add('experience');

        const header = document.createElement('div');
        header.classList.add('header');

        const titleAndPosition = document.createElement('span');
        titleAndPosition.textContent = `${exp.title} | ${exp.position}`;
        header.appendChild(titleAndPosition);

        const period = document.createElement('span');
        period.classList.add('period');
        period.textContent = exp.period;
        header.appendChild(period);

        expElem.appendChild(header);

        const description = document.createElement('div');
        description.classList.add('description');
        description.textContent = exp.description;
        expElem.appendChild(description);

        container.appendChild(expElem);
    });
}

loadResume('./pmdata.json','pm-resume'); // 调用函数，加载简历数据
loadResume('./devdata.json','dev-resume'); 
async function loadResume() {
    // 使用fetch API从本地获取数据
    const response = await fetch('data.json');
    const resumeData = await response.json(); // 解析JSON数据

    const container = document.getElementById('resume');
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

loadResume(); // 调用函数，加载简历数据

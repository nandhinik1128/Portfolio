const canvas = document.getElementById('skills-globe');
const context = canvas.getContext('2d');
const nameOutput = document.getElementById('skill-name');
const descriptionOutput = document.getElementById('skill-description');
const categoryOutput = document.querySelector('.detail-category');
const skillLevelList = document.getElementById('skill-level-list');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const iconCache = new Map();
let rotation = 0;
let hoveredSkill = -1;
let selectedSkill = -1;
let width = 0;
let height = 0;
let radius = 0;
const levelBars = [];

const points = skills.map((skill, index) => {
    const latitude = Math.asin(-1 + (2 * index + 1) / skills.length);
    const longitude = Math.PI * (3 - Math.sqrt(5)) * index;
    return { skill, latitude, longitude };
});

skills.forEach((skill) => {
    const level = document.createElement('button');
    level.type = 'button';
    level.className = 'skill-level';
    const iconSource = skill.iconUrl || `https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/${skill.icon}`;
    level.innerHTML = `<img src="${iconSource}" alt="${skill.name} icon" title="${skill.name}"><div class="skill-level-heading"><span>${skill.name}</span><span>${skill.level}%</span></div><div class="skill-bar"><span style="--level: ${skill.level}%"></span></div>`;
    const bar = level.querySelector('.skill-bar span');
    const replayBar = () => {
        animateLevel(skills.indexOf(skill));
    };
    level.addEventListener('pointerup', replayBar);
    level.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); replayBar(); }
    });
    skillLevelList.appendChild(level);
    levelBars.push(bar);
});

points.forEach(({ skill }) => {
    const icon = new Image();
    icon.crossOrigin = 'anonymous';
    icon.onload = () => iconCache.set(skill.name, icon);
    icon.src = skill.iconUrl || `https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/${skill.icon}`;
    iconCache.set(skill.name, icon);
});

function resize() {
    const scale = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    radius = Math.min(width, height) * 0.30;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
}

function showSkill(index) {
    if (index < 0 || index >= skills.length) return;
    selectedSkill = index;
    const { skill } = points[index];
    nameOutput.textContent = skill.name;
    descriptionOutput.textContent = skill.description;
    categoryOutput.textContent = skill.category;
}

function animateLevel(index) {
    if (!levelBars[index]) return;
    showSkill(index);
    const bar = levelBars[index];
    document.querySelectorAll('.skill-level').forEach((level) => level.classList.remove('is-selected'));
    bar.closest('.skill-level').classList.add('is-selected');
    bar.style.setProperty('width', '0%', 'important');
    const target = `${skills[index].level}%`;
    requestAnimationFrame(() => { requestAnimationFrame(() => bar.style.setProperty('width', target, 'important')); });
}

function project(point) {
    const longitude = point.longitude + rotation;
    const x = Math.cos(point.latitude) * Math.cos(longitude);
    const y = Math.sin(point.latitude);
    const z = Math.cos(point.latitude) * Math.sin(longitude);
    return { x: width / 2 + x * radius, y: height / 2 - y * radius, z };
}

function draw() {
    context.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = '#443315';
    context.fill();
    context.strokeStyle = 'rgba(238, 239, 220, .5)';
    context.lineWidth = 1.2;
    context.stroke();

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
    context.clip();
    for (let line = -2; line <= 2; line += 1) {
        const offset = line * radius * .22;
        context.beginPath();
        context.ellipse(centerX, centerY, Math.max(8, Math.sqrt(radius * radius - offset * offset)), radius, 0, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(238, 239, 220, .16)';
        context.stroke();
        context.beginPath();
        context.ellipse(centerX, centerY, radius, Math.max(8, Math.sqrt(radius * radius - offset * offset)), 0, 0, Math.PI * 2);
        context.stroke();
    }
    context.restore();

    const projected = points.map((item, index) => ({ ...project(item), index })).sort((a, b) => a.z - b.z);
    projected.forEach((point) => {
        const index = point.index;
        const active = index === hoveredSkill || index === selectedSkill;
        const front = Math.max(0.16, (point.z + 1) / 2);
        const size = active ? 28 : 21;
        context.globalAlpha = active ? 1 : 0.48 + front * .52;
        context.beginPath();
        context.arc(point.x, point.y, size, 0, Math.PI * 2);
        context.fillStyle = active ? '#eadbb6' : '#d8c9a3';
        context.fill();
        context.strokeStyle = '#443315';
        context.lineWidth = 2;
        context.stroke();
        const icon = iconCache.get(points[index].skill.name);
        if (icon && !(icon instanceof HTMLImageElement) || (icon && icon.complete && icon.naturalWidth)) {
            context.drawImage(icon, point.x - size * .62, point.y - size * .62, size * 1.24, size * 1.24);
        }
        if (active || point.z > .25) {
            context.globalAlpha = active ? 1 : 0.35 + front * .65;
            context.fillStyle = '#f8f4e7';
            context.font = `600 ${active ? 13 : 10}px Poppins, sans-serif`;
            context.fillText(points[index].skill.name, point.x, point.y + size + 12);
        }
    });
    context.globalAlpha = 1;
    if (hoveredSkill < 0 && !reducedMotion) rotation += .0025;
    requestAnimationFrame(draw);
}

function pick(event, activate = false) {
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let nearest = -1;
    let distance = 30;
    points.forEach((point, index) => {
        const projectedPoint = project(point);
        const currentDistance = Math.hypot(projectedPoint.x - x, projectedPoint.y - y);
        if (currentDistance < distance) { nearest = index; distance = currentDistance; }
    });
    hoveredSkill = nearest;
    if (nearest >= 0) {
        if (activate) animateLevel(nearest);
        else showSkill(nearest);
    }
}

canvas.tabIndex = 0;
canvas.addEventListener('pointermove', pick);
canvas.addEventListener('pointerleave', () => { hoveredSkill = -1; });
canvas.addEventListener('pointerdown', (event) => pick(event, true));
canvas.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    showSkill((selectedSkill + direction + skills.length) % skills.length);
});
window.addEventListener('resize', resize);
resize();
draw();

// ===== Modo oscuro =====
const toggle = document.getElementById("darkToggle");
toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
});

// ===== Estadísticas animadas =====
function animateNumber(id, target, duration = 1500) {
    const element = document.getElementById(id);
    let start = 0;
    const step = target / (duration / 16);

    const interval = setInterval(() => {
        start += step;
        if (start >= target) {
            start = target;
            clearInterval(interval);
        }
        element.textContent = Math.floor(start);
    }, 16);
}

animateNumber("stat-posts", 1824);
animateNumber("stat-users", 932);
animateNumber("stat-comments", 5460);
animateNumber("stat-growth", 38);

// ===== Categorías dinámicas =====
const categories = [
    { name: "Tecnología", icon: "fa-microchip" },
    { name: "Noticias", icon: "fa-newspaper" },
    { name: "Arte & Diseño", icon: "fa-palette" },
    { name: "Programación", icon: "fa-code" },
    { name: "Viajes", icon: "fa-plane" },
    { name: "Gastronomía", icon: "fa-bowl-food" },
];

const container = document.getElementById("categoryContainer");

categories.forEach(cat => {
    const card = document.createElement("div");
    card.className = "category-card";
    card.innerHTML = `
        <i class="fa-solid ${cat.icon}"></i>
        <h4>${cat.name}</h4>
    `;
    container.appendChild(card);
});

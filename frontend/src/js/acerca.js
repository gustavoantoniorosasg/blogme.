// ===== Modo oscuro =====
const toggle = document.getElementById("darkToggle");
if (toggle) {
    toggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
    });
}

// ===== Animación simple para miembros (efecto aparición) =====
document.addEventListener("DOMContentLoaded", () => {
    const members = document.querySelectorAll(".member");
    members.forEach((m, i) => {
        m.style.opacity = 0;
        m.style.transform = "translateY(10px)";
        setTimeout(() => {
            m.style.transition = "all .45s ease";
            m.style.opacity = 1;
            m.style.transform = "translateY(0)";
        }, 120 * i);
    });
});

// ===== CTA botones (ejemplos interactivos) =====
document.querySelectorAll(".btn-primary, .btn-outline").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("Función de ejemplo: reemplaza este comportamiento por la acción real (abrir repo, contactar, etc.).");
    });
});

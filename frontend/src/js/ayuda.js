// ===== Modo oscuro =====
const toggle = document.getElementById("darkToggle");
if (toggle) {
    toggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
    });
}

// ===== Datos FAQ dinámicos =====
const faqs = [
    { q: "¿Cómo creo mi primera publicación?", a: "Ve a Crear > Nueva Publicación, rellena título, cuerpo y etiquetas. Usa vista previa antes de publicar. Puedes programarla desde el icono del calendario." , tags: ["publicar"] },
    { q: "¿Cómo agrego etiquetas y categorías?", a: "En el formulario de publicación, escribe etiquetas separadas por comas y elige una categoría. Las etiquetas mejoran el descubrimiento." , tags: ["publicar"] },
    { q: "¿Cómo cambio mi foto de perfil?", a: "Ingresa a Perfil > Editar > Subir foto. Aceptamos jpg/png hasta 2MB." , tags: ["perfil"] },
    { q: "¿Cómo controlo la privacidad de mis publicaciones?", a: "En cada publicación puedes elegir: Pública, Solo seguidores o Privada. También hay ajustes globales en Configuración > Privacidad." , tags:["privacidad"] },
    { q: "¿Olvidé mi contraseña, qué hago?", a: "Usa 'Olvidé mi contraseña' en la pantalla de login. Recibirás un email con instrucciones." , tags:["cuenta"] },
    { q: "¿Cómo reporto contenido inapropiado?", a: "Usa el menú de tres puntos en la publicación > Reportar. Nuestro equipo revisará en menos de 72 horas." , tags:["otros"] },
];

const faqContainer = document.getElementById("faqContainer");
faqs.forEach((f, idx) => {
    const item = document.createElement("div");
    item.className = "faq-item";
    item.innerHTML = `
        <h4>${f.q}</h4>
        <div class="faq-answer"><p>${f.a}</p></div>
    `;
    // toggle answer
    item.addEventListener("click", () => {
        const ans = item.querySelector(".faq-answer");
        if (ans.style.maxHeight && ans.style.maxHeight !== "0px") {
            ans.style.maxHeight = "0";
        } else {
            // close others
            document.querySelectorAll(".faq-answer").forEach(el => el.style.maxHeight = "0");
            ans.style.maxHeight = ans.scrollHeight + "px";
        }
    });
    faqContainer.appendChild(item);
});

// ===== Buscador y filtros =====
const searchInput = document.getElementById("helpSearch");
const searchBtn = document.getElementById("searchBtn");
const quickButtons = document.querySelectorAll(".quick");

function filterFaqs(term) {
    const items = document.querySelectorAll(".faq-item");
    items.forEach(it => {
        const title = it.querySelector("h4").textContent.toLowerCase();
        if (!term || title.includes(term.toLowerCase())) it.style.display = "";
        else it.style.display = "none";
    });
}

if (searchBtn) {
    searchBtn.addEventListener("click", () => {
        filterFaqs(searchInput.value.trim());
    });
    searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") filterFaqs(searchInput.value.trim());
        if (searchInput.value.trim() === "") filterFaqs("");
    });
}

quickButtons.forEach(b => {
    b.addEventListener("click", () => {
        const f = b.dataset.filter;
        // filter by tag (simple)
        const items = document.querySelectorAll(".faq-item");
        items.forEach((it, i) => {
            const tags = faqs[i].tags || [];
            if (tags.includes(f) || f === "") it.style.display = "";
            else it.style.display = "none";
        });
        // open first visible
        const first = document.querySelector(".faq-item:not([style*='display: none'])");
        if (first) first.click();
    });
});

// ===== Formulario de soporte (simulado) =====
const supportForm = document.getElementById("supportForm");
const formMsg = document.getElementById("formMsg");
if (supportForm) {
    supportForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const topic = document.getElementById("topic").value;
        const msg = document.getElementById("message").value.trim();

        if (!name || !email || !topic || !msg) {
            formMsg.style.color = "crimson";
            formMsg.textContent = "Por favor completa todos los campos.";
            return;
        }

        // simulación de envío
        formMsg.style.color = "green";
        formMsg.textContent = "Mensaje enviado. Nuestro equipo te responderá pronto.";
        supportForm.reset();
        setTimeout(() => formMsg.textContent = "", 7000);
    });
}
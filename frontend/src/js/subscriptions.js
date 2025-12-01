// 🎬 Control del modal de suscripciones + Sistema completo de planes
document.addEventListener("DOMContentLoaded", () => {

  /* -----------------------------------------
      SISTEMA DE PLANES Y PRIVILEGIOS
  ----------------------------------------- */

  const PRIVILEGIOS = {
    "Plan Básico": {
      publicaciones: 10,
      comentarios: true,
      favoritos: true,
      portada: false,
      herramientas: false,
    },
    "Plan Pro": {
      publicaciones: 999,
      comentarios: true,
      favoritos: true,
      portada: true,
      herramientas: true,
    },
    "Plan Premium": {
      publicaciones: Infinity,
      comentarios: true,
      favoritos: true,
      portada: true,
      herramientas: true,
    }
  };

  // Obtener plan actual del usuario
  const currentPlan = localStorage.getItem("blogme_plan") || null;


  /* -----------------------------------------
      FUNCIÓN: MENSAJE CENTRAL MODERNO
  ----------------------------------------- */

  function showSuccessMessage(message) {
    const msgBox = document.createElement("div");
    msgBox.classList.add("success-message");
    msgBox.textContent = message;
    document.body.appendChild(msgBox);

    setTimeout(() => msgBox.classList.add("visible"), 50);

    setTimeout(() => {
      msgBox.classList.remove("visible");
      setTimeout(() => msgBox.remove(), 400);
    }, 3000);
  }


  /* -----------------------------------------
      MODAL DE SUSCRIPCIÓN
  ----------------------------------------- */

  const modal = document.getElementById("subscriptionModal");
  const closeModal = document.querySelector(".close-modal");
  const subscribeButtons = document.querySelectorAll(".btn-primary:not(.submit)");

  subscribeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const planName = btn.closest(".sub-card").querySelector("h3").textContent;
      document.getElementById("plan").value = planName;
      modal.classList.add("active");
    });
  });

  if (closeModal) {
    closeModal.addEventListener("click", () => modal.classList.remove("active"));
  }

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });


  /* -----------------------------------------
      PROCESO DE SUSCRIPCIÓN
  ----------------------------------------- */

  const form = document.querySelector(".subscription-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = form.querySelector("#name").value.trim();
      const plan = form.querySelector("#plan").value;

      if (!name) {
        showSuccessMessage("⚠️ Por favor ingresa tu nombre.");
        return;
      }

      // Guardamos el plan
      localStorage.setItem("blogme_plan", plan);
      localStorage.setItem("blogme_privilegios", JSON.stringify(PRIVILEGIOS[plan]));

      modal.classList.remove("active");
      form.reset();

      // Toast elegante centrado
      showSuccessMessage(`🎉 ¡Gracias ${name}! Ahora estás en ${plan}`);
      
      actualizarBotonesPlanes();
    });
  }


  /* -----------------------------------------
      OCULTAR BOTONES Y CREAR NUEVO BOTÓN
  ----------------------------------------- */

  function actualizarBotonesPlanes() {
    const cards = document.querySelectorAll(".sub-card");

    cards.forEach(card => {
      const planNombre = card.querySelector("h3").textContent;
      const originalBtn = card.querySelector(".btn-primary");

      // Si el usuario ya está con ese plan
      if (planNombre === currentPlan || planNombre === localStorage.getItem("blogme_plan")) {

        // Ocultar botón original
        if (originalBtn) originalBtn.style.display = "none";

        // Evitar duplicar botones
        if (card.querySelector(".manage-btn")) return;

        // Crear nuevo botón
        const manageBtn = document.createElement("button");
        manageBtn.classList.add("btn-primary", "manage-btn");
        manageBtn.style.background = "#fff";
        manageBtn.style.color = "#004e92";
        manageBtn.textContent = "Administrar suscripción";

        manageBtn.addEventListener("click", () => {
          showSuccessMessage(`🔧 Estás administrando tu plan: ${planNombre}`);
        });

        card.appendChild(manageBtn);
      }
    });
  }

  actualizarBotonesPlanes();


  /* -----------------------------------------
      FUNCIONES PARA OTROS MÓDULOS (PRIVILEGIOS)
      Puedes usarlas en publicaciones.js, perfil.js, etc.
  ----------------------------------------- */

  window.BlogMePlan = {
    getPlan: () => localStorage.getItem("blogme_plan"),
    getPrivilegios: () => JSON.parse(localStorage.getItem("blogme_privilegios") || "{}"),

    verificarPermiso(clave) {
      const privilegios = this.getPrivilegios();
      return privilegios[clave] ?? false;
    },

    limitarPublicaciones(cantidadActual) {
      const privilegios = this.getPrivilegios();
      if (!privilegios.publicaciones) return false;
      return cantidadActual < privilegios.publicaciones;
    }
  };

});

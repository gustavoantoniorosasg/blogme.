// ===============================================================
//  REGISTRO REAL DE USUARIO — BlogMe
// ===============================================================

// URL del backend
const API_USUARIOS = "http://localhost:4000/api/usuarios";

// Inputs correctos con ID
const registerForm = document.getElementById("register-form");
const registerMsg = document.getElementById("register-msg");

const regUsername = document.getElementById("reg-username");
const regCorreo = document.getElementById("reg-correo");
const regPassword = document.getElementById("reg-password");

/* ===========================================================
   🔵 VALIDACIONES PROFESIONALES
=========================================================== */
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function mostrarMsg(elemento, mensaje, tipo = "error") {
  elemento.textContent = mensaje;
  elemento.style.color = tipo === "ok" ? "#00c851" : "#ff4444";

  setTimeout(() => {
    elemento.textContent = "";
  }, 3000);
}

/* ===========================================================
   🟣 REGISTRO REAL
=========================================================== */
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = regUsername.value.trim();
  const correo = regCorreo.value.trim();
  const password = regPassword.value.trim();

  // ⛔ Validaciones
  if (!username || !correo || !password) {
    return mostrarMsg(registerMsg, "Todos los campos son obligatorios");
  }

  if (!validarEmail(correo)) {
    return mostrarMsg(registerMsg, "Correo inválido");
  }

  if (password.length < 6) {
    return mostrarMsg(registerMsg, "La contraseña debe tener al menos 6 caracteres");
  }

  try {
    const resp = await fetch(`${API_USUARIOS}/registrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, correo, password }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return mostrarMsg(registerMsg, data.msg || "Error en el registro");
    }

    // Éxito
    mostrarMsg(registerMsg, "Cuenta creada correctamente ✔", "ok");

    setTimeout(() => {
      document.getElementById("login-tab").click();
      registerForm.reset();
    }, 1500);

  } catch (error) {
    mostrarMsg(registerMsg, "Error al conectar con el servidor");
    console.error("Error registro:", error);
  }
});

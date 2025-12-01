// perfil.js - Lógica perfil (versión corregida e integrada con comments.js y comments.css)
(() => {
  const $ = sel => document.querySelector(sel);
  const LS = window.localStorage;

  // Utilities
  const genId = () => 'id_' + Math.random().toString(36).slice(2,10);
  const timeAgo = ts => {
    const s = Math.floor((Date.now()-ts)/1000);
    if(s<60) return `${s}s`; if(s<3600) return `${Math.floor(s/60)}m`;
    if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`;
  };
  const escapeHtml = s => (s+"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));

  // Toast -> usa el #toast ya presente en perfil.html (y compatible con comments.css)
  const toastEl = $("#toast");
  function toast(msg, t=1800){
    if(!toastEl) {
      console.warn("Toast element not found");
      return;
    }
    toastEl.textContent = msg;
    toastEl.classList.add("toast-show");
    setTimeout(()=> toastEl.classList.remove("toast-show"), t);
  }

  // Modal confirmación (para eliminar posts) - insertado dinámicamente
  let postToDelete = null;
  const confirmModal = document.createElement("div");
  confirmModal.id = "confirmModal";
  confirmModal.style.cssText = `
    position: fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    background: #fff; padding: 20px 28px; border-radius:14px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index:9999; display:none;
    text-align:center; max-width:320px; font-family:sans-serif;
  `;
  confirmModal.innerHTML = `
    <p style="font-size:1rem; margin-bottom:20px;">¿Deseas eliminar la publicación?</p>
    <div style="display:flex; justify-content:space-around;">
      <button id="confirmYes" style="background:#3a7bfc;color:#fff;padding:8px 16px;border:none;border-radius:10px;cursor:pointer;font-weight:600;">Sí</button>
      <button id="confirmNo" style="background:#ccc;color:#333;padding:8px 16px;border:none;border-radius:10px;cursor:pointer;font-weight:600;">Cancelar</button>
    </div>
  `;
  document.body.appendChild(confirmModal);

  // Recupera botones tras insertarlo
  const confirmYesBtn = confirmModal.querySelector("#confirmYes");
  const confirmNoBtn = confirmModal.querySelector("#confirmNo");
  confirmNoBtn.onclick = () => { postToDelete = null; confirmModal.style.display = "none"; };
  confirmYesBtn.onclick = () => {
    if(postToDelete){
      const postsArr = JSON.parse(LS.getItem("blogme_posts")||"[]");
      // eliminar comentarios asociados al post
      LS.removeItem(`blogme_comments_${postToDelete}`);
      LS.setItem("blogme_posts", JSON.stringify(postsArr.filter(x=>x.id!==postToDelete)));
      renderProfilePosts();
      toast("Publicación eliminada",2000);
      postToDelete = null;
      confirmModal.style.display = "none";
    }
  };

  // Usuario activo y perfil key
  const user = LS.getItem("usuarioActivo") || "Invitado";
  const profileKey = `blogme_profile_${user}`;
  if(!LS.getItem(profileKey)){
    const def = { 
      name: user, 
      avatar: "../../public/images/decoraciones/avatar-placeholder.png",
      bio: "Hola! Soy nuevo en BlogMe.",
      notes: [{ id: genId(), text: "¡Mi primera nota!", ts: Date.now() }]
    };
    LS.setItem(profileKey, JSON.stringify(def));
  }
  const getUser = () => JSON.parse(LS.getItem(profileKey) || "{}");

  // DOM
  const topAvatar = $("#topAvatar");
  const topName = $("#topName");
  const topNotesCount = $("#topNotesCount");
  const goFeed = $("#goFeed");
  const logoutBtn = $("#logoutBtn");
  const profileAvatar = $("#profileAvatar");
  const profileName = $("#profileName");
  const profileBio = $("#profileBio");
  const profileNotesList = $("#profileNotesList");
  const profilePosts = $("#profilePosts");
  const postsCountEl = $("#postsCount");
  const notesCountEl = $("#notesCount");
  const editProfileBtn = $("#editProfileBtn");
  const profileModal = $("#profileModal");
  const closeProfile = $("#closeProfile");
  // NOTE: HTML tiene input id="avatarUpload" y botón con clase .btn-upload
  const avatarUpload = $("#avatarUpload");
  const btnUpload = document.querySelector(".btn-upload");
  const profileNameInput = $("#profileNameInput");
  const profileBioInput = $("#profileBioInput");
  const saveProfile = $("#saveProfile");
  const cancelProfile = $("#cancelProfile");
  const addNoteBtnProfile = $("#addNoteBtnProfile");

  // Funciones de carga
  function loadProfileInfo(){
    const prof = getUser();
    profileName.textContent = prof.name || "Invitado";
    profileBio.textContent = prof.bio || "Sin bio — ¡edítala!";
    profileAvatar.src = prof.avatar || "../../public/images/decoraciones/avatar-placeholder.png";
    if(topAvatar) topAvatar.src = prof.avatar || "../../public/images/decoraciones/avatar-placeholder.png";
    if(topName) topName.textContent = prof.name || "Invitado";
    if(topNotesCount) topNotesCount.textContent = `${(prof.notes||[]).length} notas`;
    if(notesCountEl) notesCountEl.textContent = (prof.notes||[]).length;
    renderNotes(prof.notes||[]);
  }

  // Render notas
  function renderNotes(notes){
    if(!profileNotesList) return;
    profileNotesList.innerHTML = "";
    (notes||[]).forEach(n=>{
      const div = document.createElement("div");
      div.className = "note-item";
      div.innerHTML = `
        <div class="note-text" contenteditable="false">${escapeHtml(n.text)}</div>
        <div class="note-actions">
          <button class="edit-note" data-id="${n.id}">Editar</button>
          <button class="del-note" data-id="${n.id}">Eliminar</button>
        </div>`;
      profileNotesList.appendChild(div);

      const noteTextEl = div.querySelector(".note-text");

      // Editar nota
      div.querySelector(".edit-note").onclick = () => {
        const btn = div.querySelector(".edit-note");
        if(btn.textContent==="Editar") {
          noteTextEl.contentEditable = "true";
          noteTextEl.classList.add("editing-note");
          noteTextEl.focus();
          btn.textContent = "Guardar";
        } else {
          noteTextEl.contentEditable = "false";
          noteTextEl.classList.remove("editing-note");
          const prof = getUser();
          const idx = prof.notes.findIndex(x=>x.id===n.id);
          if(idx!==-1){
            prof.notes[idx].text = noteTextEl.textContent.trim();
            prof.notes[idx].ts = Date.now();
            LS.setItem(profileKey, JSON.stringify(prof));
            loadProfileInfo();
            toast("Nota actualizada");
          }
          btn.textContent = "Editar";
        }
      };

      // Eliminar nota
      div.querySelector(".del-note").onclick = () => {
        const prof = getUser();
        prof.notes = (prof.notes||[]).filter(x=>x.id!==n.id);
        LS.setItem(profileKey, JSON.stringify(prof));
        loadProfileInfo();
        toast("Nota eliminada", 1600);
      };
    });
  }

  // Render publicaciones del usuario
  function renderProfilePosts(){
    if(!profilePosts) return;
    const posts = JSON.parse(LS.getItem("blogme_posts")||"[]");
    const prof = getUser();
    const mine = posts.filter(p=>p.author===prof.name);
    profilePosts.innerHTML="";
    postsCountEl && (postsCountEl.textContent = mine.length);
    if(mine.length===0){
      profilePosts.innerHTML = `<div style="color:#6b7280">Aún no has publicado nada.</div>`;
      return;
    }
    mine.sort((a,b)=>b.ts-b.ts);
    mine.forEach(p=>{
      const card = document.createElement("div");
      card.className="post-card";
      card.innerHTML = `
        <div class="post-header" style="display:flex;gap:10px;align-items:center">
          <img src="${p.authorAvatar}" style="width:42px;height:42px;border-radius:10px;border:2px solid var(--primary);">
          <div><strong>${escapeHtml(p.author)}</strong><div style="font-size:0.85rem;color:#6b7280">${timeAgo(p.ts)}</div></div>
        </div>
        <div class="post-content" contenteditable="false" style="margin-top:8px;">
          <p>${escapeHtml(p.content)}</p>
          ${p.img ? `<div class="post-media"><img src="${p.img}" alt="img"></div>` : ""}
        </div>
        <div style="margin-top:10px;display:flex;gap:6px;justify-content:flex-end;">
          <button class="btn-comment" data-id="${p.id}">Comentar</button>
          <button class="btn-edit-post" data-id="${p.id}">Editar</button>
          <button class="btn-del-post" data-id="${p.id}">Eliminar</button>
        </div>`;
      profilePosts.appendChild(card);

      // Comentar -> usa comments.js window.openComments
      const commentBtn = card.querySelector(".btn-comment");
      commentBtn && (commentBtn.onclick = ev=>{
        const id = ev.currentTarget.dataset.id;
        if(typeof window.openComments==="function") window.openComments(id);
        else toast("Función de comentarios no disponible");
      });

      // Editar post (edita contenido inline)
      const editBtn = card.querySelector(".btn-edit-post");
      editBtn && (editBtn.onclick = ()=>{
        const contentEl = card.querySelector(".post-content");
        const btn = editBtn;
        if(btn.textContent==="Editar"){
          contentEl.contentEditable="true";
          contentEl.style.border="1px solid var(--primary)";
          contentEl.style.background="#FDF2F8";
          contentEl.focus();
          btn.textContent="Guardar";
        } else {
          contentEl.contentEditable="false";
          contentEl.style.border="none";
          contentEl.style.background="transparent";
          const postsArr = JSON.parse(LS.getItem("blogme_posts")||"[]");
          const idx = postsArr.findIndex(x=>x.id===p.id);
          if(idx!==-1){
            postsArr[idx].content = contentEl.innerText.trim();
            LS.setItem("blogme_posts", JSON.stringify(postsArr));
            renderProfilePosts();
            toast("Publicación actualizada");
          }
          btn.textContent="Editar";
        }
      });

      // Eliminar -> usa modal de confirmación
      const delBtn = card.querySelector(".btn-del-post");
      delBtn && (delBtn.onclick = ev=>{
        postToDelete = ev.currentTarget.dataset.id;
        confirmModal.style.display = "block";
      });
    });
  }

  // Handlers del modal de editar perfil
  editProfileBtn && (editProfileBtn.onclick = ()=>{
    const prof = getUser();
    // si existe campo de avatar en modal, lo cargamos; aquí el modal no tiene input para avatar,
    // la carga de avatar se maneja con avatarUpload.
    profileNameInput && (profileNameInput.value = prof.name || "");
    profileBioInput && (profileBioInput.value = prof.bio || "");
    // Mostrar modal: quitar hidden y añadir show (consistent con tu CSS .modal.show)
    if(profileModal){
      profileModal.classList.remove("hidden");
      profileModal.classList.add("show");
    }
  });

  closeProfile && (closeProfile.onclick = cancelProfile && (cancelProfile.onclick = ()=> {
    if(profileModal){
      profileModal.classList.add("hidden");
      profileModal.classList.remove("show");
    }
  }));

  saveProfile && (saveProfile.onclick = ()=>{
    const prof = getUser();
    prof.name = profileNameInput.value.trim() || prof.name;
    prof.bio = profileBioInput.value.trim() || prof.bio;
    // avatar ya se actualiza por avatarUpload onchange
    LS.setItem(profileKey, JSON.stringify(prof));
    if(profileModal){ profileModal.classList.add("hidden"); profileModal.classList.remove("show"); }
    loadProfileInfo();
    renderProfilePosts();
    toast("Perfil actualizado", 1600);
  });

  // Avatar upload: abre el file input y guarda dataURL en profile
  if(btnUpload && avatarUpload){
    btnUpload.onclick = () => avatarUpload.click();
    avatarUpload.onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      // validar tamaño si quieres: (ej. < 2MB)
      const maxMB = 3;
      if(f.size > maxMB * 1024 * 1024) {
        return toast(`Imagen demasiado grande (máx ${maxMB}MB)`);
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const prof = getUser();
        prof.avatar = dataUrl;
        LS.setItem(profileKey, JSON.stringify(prof));
        loadProfileInfo();
        toast("Avatar actualizado", 1400);
      };
      reader.readAsDataURL(f);
      // limpiar input para futuras cargas
      avatarUpload.value = "";
    };
  }

  // Agregar nota (modal simple)
  addNoteBtnProfile && (addNoteBtnProfile.onclick = () => {
    const noteModal = document.createElement("div");
    noteModal.style.cssText = `
      position: fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background: #fff; padding: 20px; border-radius:16px;
      box-shadow:0 8px 24px rgba(0,0,0,0.3); z-index:10000;
      width: 90%; max-width:400px; display:flex; flex-direction:column; gap:12px;
      font-family:sans-serif;
    `;
    noteModal.innerHTML = `
      <textarea placeholder="Escribe tu nota..." style="width:100%; height:120px; padding:10px; border:1px solid #ccc; border-radius:10px; resize:none; font-size:1rem;"></textarea>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="cancelNote" style="padding:8px 16px; border:none; border-radius:10px; cursor:pointer; background:#ccc; color:#333; font-weight:600;">Cancelar</button>
        <button id="saveNote" style="padding:8px 16px; border:none; border-radius:10px; cursor:pointer; background:#3a7bfc; color:#fff; font-weight:600;">Guardar</button>
      </div>
    `;
    document.body.appendChild(noteModal);

    const textarea = noteModal.querySelector("textarea");
    const cancelNote = noteModal.querySelector("#cancelNote");
    const saveNote = noteModal.querySelector("#saveNote");

    cancelNote.onclick = () => noteModal.remove();

    saveNote.onclick = () => {
      const txt = textarea.value.trim();
      if(!txt) return toast("La nota está vacía",1500);
      const prof = getUser();
      prof.notes ||= [];
      prof.notes.unshift({ id: genId(), text: txt, ts: Date.now() });
      LS.setItem(profileKey, JSON.stringify(prof));
      noteModal.remove();
      loadProfileInfo();
      toast("Nota agregada",1600);
    };
  });

  // Top buttons
  goFeed && (goFeed.onclick = ()=> window.location.href="../pages/publicaciones.html");
  logoutBtn && (logoutBtn.onclick = ()=>{
    LS.removeItem("usuarioActivo");
    window.location.href="../pages/login.html";
  });

  // Init
  loadProfileInfo();
  renderProfilePosts();

})();

/* comments.js - versión final integrada
   Modal edit/delete + composer global (reply/edit/delete via modales)
   Open: window.openComments(postId)
*/

(() => {
  const $ = s => document.querySelector(s);
  const LS = localStorage;

  const genId = () => 'id_' + Math.random().toString(36).slice(2, 10);

  const esc = s => (s + "").replace(/[&<>\"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;"
  }[m]));

  const timeAgo = ts => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  // ---- Toast centrado ----
  const toast = (msg, t = 1500) => {
    const box = document.createElement("div");
    box.className = "toast-center";
    box.textContent = msg;
    document.body.appendChild(box);

    setTimeout(() => {
      box.classList.add("hide");
      setTimeout(() => box.remove(), 300);
    }, t);
  };

  // ---- Storage ----
  const key = id => `blogme_comments_${id}`;
  const load = id => JSON.parse(LS.getItem(key(id)) || "[]");
  const save = (id, arr) => LS.setItem(key(id), JSON.stringify(arr));

  // ---- State for composer modes ----
  let replyTarget = null; // { postId, commentId, author }
  let editingTarget = null; // { postId, commentId }

  function renderReactions(reactions, userChoice) {
  const emojis = ["❤️","😂","😮","😢","😡"];

  return emojis.map(e => {
    const count = reactions[e] || 0;
    const active = userChoice === e ? "active" : "";

    return `
      <button class="react-btn ${active}" data-react="${e}">
        ${e} <span>${count}</span>
      </button>
    `;
  }).join("");
}


  // ---- Render Comments ----
  function renderComments(postId) {
    const list = $("#commentsList");
    const comments = load(postId);
    list.innerHTML = "";

    if (comments.length === 0) {
      list.innerHTML = `<div class="no-comments">Sé el primero en comentar</div>`;
      return;
    }

    const me = getCurrentUserName();

    comments.forEach(c => {
      const block = document.createElement("div");
      block.className = "comment-block glass-card";

      block.innerHTML = `
        <img src="${c.authorAvatar}" class="c-avatar">
        <div class="comment-body">

          <div class="c-header">
            <strong>${c.author}</strong>
            <small>${timeAgo(c.ts)}</small>
          </div>

          <p class="c-text">${esc(c.text)}</p>
<div class="reactions" data-id="${c.id}">
  ${renderReactions(c.reactions || {}, c.userReaction)}
</div>

          <div class="comment-actions">
         
            <button class="c-reply" data-id="${c.id}" data-author="${c.author}">Responder</button>

            ${c.author === me ? `
              <button class="c-edit" data-id="${c.id}">Editar</button>
              <button class="c-del" data-id="${c.id}">Eliminar</button>
            ` : ""}
          </div>

          <div class="replies">
            ${(c.replies||[]).map(r => `
              <div class="reply glass-mini">
                <img src="${r.authorAvatar}" class="reply-avatar">
                <div class="reply-body">
                  <div class="reply-meta">
                    <strong>${r.author}</strong>
                    <small>${timeAgo(r.ts)}</small>
                  </div>
                  <p>${esc(r.text)}</p>
                </div>
              </div>
            `).join("")}
          </div>

        </div>
      `;

      list.appendChild(block);
    });

    bindActions(postId);
  }

  // ---- Bind Actions ----
  function bindActions(postId) {
    const comments = load(postId);

    // LIKE
    document.querySelectorAll(".c-like").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const i = comments.findIndex(c => c.id === id);
        if (i === -1) return;
        comments[i].likes = (comments[i].likes||0) + 1;
        save(postId, comments);
        renderComments(postId);
      };
      // --- REACCIONES ---
document.querySelectorAll(".react-btn").forEach(btn => {
  btn.onclick = () => {
    const emoji = btn.dataset.react;
    const id = btn.closest(".reactions").dataset.id;

    const i = comments.findIndex(c => c.id === id);
    comments[i].reactions ||= {};
    comments[i].userReaction ||= null;

    const prev = comments[i].userReaction;

    // Cancelar reacción si es la misma
    if (prev === emoji) {
      comments[i].reactions[emoji]--;
      if (comments[i].reactions[emoji] < 0) comments[i].reactions[emoji] = 0;
      comments[i].userReaction = null;
    } 
    else {
      // Quitar la reacción anterior si existía
      if (prev) {
        comments[i].reactions[prev]--;
        if (comments[i].reactions[prev] < 0) comments[i].reactions[prev] = 0;
      }

      // Agregar nueva reacción
      comments[i].reactions[emoji] = (comments[i].reactions[emoji] || 0) + 1;
      comments[i].userReaction = emoji;
    }

    save(postId, comments);
    renderComments(postId);
  };
});

    });

    // REPLY -> sets global composer into reply mode (single composer)
    document.querySelectorAll(".c-reply").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const author = btn.dataset.author || '';
        replyTarget = { postId, commentId: id, author };

        // Show indicator in global composer
        const composer = $(".composer-main");
        if (!composer) return;

        // add or update reply indicator
        let indicator = composer.querySelector('.composer-reply');
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.className = 'composer-reply';
          composer.prepend(indicator);
        }
        indicator.innerHTML = `Respondiendo a <strong>${esc(author)}</strong> <button class="reply-cancel">Cancelar</button>`;

        // focus textarea
        const ta = $("#newComment");
        if (ta) ta.focus();

        // cancel handler
        indicator.querySelector('.reply-cancel').onclick = () => {
          replyTarget = null;
          indicator.remove();
        };
      };
    });

    // EDIT -> open edit modal (we reuse #confirmModal)
    document.querySelectorAll('.c-edit').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const commentsArr = load(postId);
        const i = commentsArr.findIndex(c => c.id === id);
        if (i === -1) return;

        // populate confirm modal with edit UI
        editingTarget = { postId, commentId: id };
        const confirmModal = $('#confirmModal');
        const confirmBody = $('#confirmBody');
        const ok = $('#confirmOk');
        const cancel = $('#confirmCancel');

        confirmBody.innerHTML = `<textarea id="editText" class="edit-modal-text">${esc(commentsArr[i].text)}</textarea>`;
        ok.textContent = 'Guardar';

        confirmModal.classList.remove('hidden');

        // one-time handlers
        const onSave = () => {
          const newTxt = $('#editText').value.trim();
          if (!newTxt) return toast('No puede quedar vacío');

          commentsArr[i].text = newTxt;
          save(postId, commentsArr);
          confirmModal.classList.add('hidden');
          renderComments(postId);
          toast('Comentario actualizado');
          cleanup();
        };
        const onCancel = () => { confirmModal.classList.add('hidden'); cleanup(); };

        function cleanup(){
          ok.onclick = null; cancel.onclick = null; editingTarget = null; confirmBody.innerHTML = '';
          ok.textContent = 'Confirmar';
        }

        ok.onclick = onSave;
        cancel.onclick = onCancel;
      };
    });

    // DELETE -> open confirm modal
    document.querySelectorAll('.c-del').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const commentsArr = load(postId);
        const confirmModal = $('#confirmModal');
        const confirmBody = $('#confirmBody');
        const ok = $('#confirmOk');
        const cancel = $('#confirmCancel');

        confirmBody.innerHTML = `<div>¿Eliminar este comentario?</div>`;
        ok.textContent = 'Eliminar';
        confirmModal.classList.remove('hidden');

        const onDelete = () => {
          const filtered = commentsArr.filter(c => c.id !== id);
          save(postId, filtered);
          confirmModal.classList.add('hidden');
          renderComments(postId);
          toast('Comentario eliminado');
          cleanup();
        };
        const onCancel = () => { confirmModal.classList.add('hidden'); cleanup(); };

        function cleanup(){ ok.onclick = null; cancel.onclick = null; confirmBody.innerHTML = ''; ok.textContent = 'Confirmar'; }

        ok.onclick = onDelete;
        cancel.onclick = onCancel;
      };
    });
  }

  // ---- Modal & Composer wiring ----
  const modal = $('#commentsModal');
  const area = $('#commentsArea');

  function getCurrentUser() {
    const key = `blogme_profile_${LS.getItem("usuarioActivo") || "Invitado"}`;
    return JSON.parse(LS.getItem(key) || "{}" ) ;
  }
  function getCurrentUserName(){ return getCurrentUser().name || 'Invitado'; }

  window.openComments = function (postId) {
    modal.classList.remove('hidden');
    area.innerHTML = '';

    const post = JSON.parse(LS.getItem('blogme_posts') || '[]').find(p => p.id === postId) || { author:'?', authorAvatar:'../images/avatar-placeholder.png', content:'' };

    // HEADER
    area.innerHTML += `
      <div class="comments-post-header glass-card">
        <div class="ph-left">
          <img src="${post.authorAvatar}" class="ph-avatar">
          <div>
            <strong>${post.author}</strong>
            <small>${timeAgo(post.ts)}</small>
          </div>
        </div>
        <p class="ph-text">${esc(post.content)}</p>
        ${post.img ? `<img src="${post.img}" class="ph-img">` : ''}
      </div>
    `;

    // LIST
    area.innerHTML += `<div id="commentsList" class="comments-list"></div>`;

    // GLOBAL COMPOSER (single)
    const usr = getCurrentUser();
    area.innerHTML += `
      <div class="composer glass-card">
        <img src="${usr.avatar}" class="composer-avatar">
        <div class="composer-main">
          <textarea id="newComment" class="composer-text" placeholder="Escribe un comentario..."></textarea>
          <div class="composer-actions">
            <button id="sendComment" class="btn-blue">Comentar</button>
          </div>
        </div>
      </div>
    `;

    renderComments(postId);

    // composer send handler
    $('#sendComment').onclick = () => {
      const txtEl = $('#newComment');
      const txt = txtEl.value.trim();
      if (!txt) return toast('Escribe un comentario');

      // reply mode?
      if (replyTarget && replyTarget.postId === postId) {
        const commentsArr = load(postId);
        const i = commentsArr.findIndex(c => c.id === replyTarget.commentId);
        if (i === -1) { toast('Hilo no encontrado'); return; }

        const usr = getCurrentUser();
        commentsArr[i].replies ||= [];
        commentsArr[i].replies.push({ id: genId(), author: usr.name, authorAvatar: usr.avatar, text: txt, ts: Date.now() });
        save(postId, commentsArr);
        txtEl.value = '';
        // clear indicator
        const indicator = document.querySelector('.composer-reply'); if (indicator) indicator.remove();
        replyTarget = null;
        renderComments(postId);
        toast('Respuesta enviada');
        return;
      }

      // normal new comment
      const arr = load(postId);
      arr.push({ id: genId(), author: usr.name, authorAvatar: usr.avatar, text: txt, ts: Date.now(), likes: 0, replies: [] });
      save(postId, arr);
      txtEl.value = '';
      renderComments(postId);
      toast('Comentario publicado');
    };

    // close button already in HTML
  };

  $('#closeComments').onclick = () => {
    // clear any composer state when closing
    replyTarget = null; editingTarget = null;
    modal.classList.add('hidden');
  };

})();

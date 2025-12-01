/* publicaciones.js — Integrado con backend (/api/publicaciones) + fallback localStorage
   - Usa endpoints REST cuando estén disponibles
   - Fallback localStorage si el backend no responde
   - Reacciones por usuario (toggle)
   - Imágenes persistentes (intenta upload, si no: dataURL local)
   - Integración con comments.js via window.openComments(postId)
   - Optimistic UI y parcheo (solo actualiza HTML necesario)
*/

(() => {
  'use strict';

  /* =======================
     CONFIG / SELECTORS
  ======================= */
  const API_BASE = '/api/publicaciones';
  const POSTS_KEY = 'blogme_posts';
  const SAVED_KEY = 'blogme_saved';
  const PROFILE_PREFIX = 'blogme_profile_';
  const PAGE_SIZE = 8;
  const DEFAULT_AVATAR = '../images/avatar-placeholder.png';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const feedEl = $('#feed');
  const loaderEl = $('#infiniteLoader');
  const editorEl = $('#editor');
  const btnPublish = $('#btnPublish');
  const postCategoryEl = $('#postCategory');

  // Optional inputs for file upload in the page (if exist)
  const inputFileGlobal = $('#newImg'); // could be present in page

  /* =======================
     STATE
  ======================= */
  let currentUser = { id: 'anon', name: 'Invitado', avatar: DEFAULT_AVATAR };
  let posts = [];        // array local posts normalized
  let saved = [];        // array of saved post ids
  let offset = 0;
  let loading = false;
  let pendingImageFile = null; // file dropped into editor for publish

  /* =======================
     UTIL
  ======================= */
  const escapeHtml = (s='') => (s + '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  function genId(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,10); }
  function timeAgo(ts){
    if (!ts) return '';
    const s = Math.floor((Date.now() - ts)/1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s/60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h/24)}d`;
  }
  function storageGet(key, fallback=null){
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; }
  }
  function storageSet(key, val){
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){ console.warn('storage set fail', e); }
  }

  /* =======================
     LOAD CURRENT USER
  ======================= */
  function loadCurrentUser(){
    const ukey = localStorage.getItem('usuarioActivo') || null;
    if (!ukey) { currentUser = { id:'anon', name:'Invitado', avatar: DEFAULT_AVATAR }; return; }
    const profile = storageGet(PROFILE_PREFIX + ukey, null);
    if (profile) currentUser = { id: ukey, name: profile.name || ukey, avatar: profile.avatar || DEFAULT_AVATAR };
    else currentUser = { id: ukey, name: ukey, avatar: DEFAULT_AVATAR };
  }

  /* =======================
     NETWORK HELPERS (timeouts)
  ======================= */
  async function fetchWithTimeout(url, opts={}, timeout=8000){
    const controller = new AbortController();
    const id = setTimeout(()=> controller.abort(), timeout);
    try {
      const res = await fetch(url, {...opts, signal: controller.signal});
      clearTimeout(id);
      return res;
    } catch(err){
      clearTimeout(id);
      throw err;
    }
  }

  /* =======================
     API LAYER (graceful)
  ======================= */
  async function apiFetchPosts(){
    try {
      const r = await fetchWithTimeout(API_BASE, {}, 7000);
      if (!r.ok) throw new Error('no-ok');
      return await r.json();
    } catch(e) {
      console.warn('apiFetchPosts failed, using local fallback', e);
      return null;
    }
  }

  async function apiCreatePost(payload, file=null){
    try {
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k,v]) => fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v));
        fd.append('image', file);
        const r = await fetchWithTimeout(API_BASE, { method:'POST', body: fd }, 15000);
        if (!r.ok) throw new Error('no-ok');
        return await r.json();
      } else {
        const r = await fetchWithTimeout(API_BASE, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }, 9000);
        if (!r.ok) throw new Error('no-ok');
        return await r.json();
      }
    } catch(e) {
      console.warn('apiCreatePost failed', e);
      return null;
    }
  }

  async function apiSendReaction(postId, emoji){
    try {
      const r = await fetchWithTimeout(`${API_BASE}/${postId}/reaction`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reaction: emoji, user: currentUser.id }) }, 7000);
      if (!r.ok) throw new Error('no-ok');
      return await r.json();
    } catch(e) {
      console.warn('apiSendReaction failed or unsupported', e);
      return null;
    }
  }

  async function apiUpdatePost(postId, payload){
    try {
      const r = await fetchWithTimeout(`${API_BASE}/${postId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }, 8000);
      if (!r.ok) throw new Error('no-ok');
      return await r.json();
    } catch(e) {
      console.warn('apiUpdatePost failed', e);
      return null;
    }
  }

  async function apiDeletePost(postId){
    try {
      const r = await fetchWithTimeout(`${API_BASE}/${postId}`, { method:'DELETE' }, 7000);
      if (!r.ok) throw new Error('no-ok');
      return true;
    } catch(e) {
      console.warn('apiDeletePost failed', e);
      return null;
    }
  }

  async function apiUploadImageForPost(postId, file){
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await fetchWithTimeout(`${API_BASE}/${postId}/image`, { method:'POST', body: fd }, 15000);
      if (!r.ok) throw new Error('no-ok');
      return await r.json();
    } catch(e) {
      console.warn('apiUploadImageForPost failed', e);
      return null;
    }
  }

  /* =======================
     Local storage helpers
  ======================= */
  function saveLocalPosts(){ storageSet(POSTS_KEY, posts); }
  function loadLocalPosts(){ const arr = storageGet(POSTS_KEY, []); return Array.isArray(arr) ? arr : []; }
  function loadSaved(){ saved = storageGet(SAVED_KEY, []) || []; }

  /* =======================
     REACTIONS HTML & RENDER
  ======================= */
  function buildReactionsHTML(post){
    const emojis = ["❤️","😂","😮","😢","😡"];
    const uid = currentUser.id || 'anon';
    const userChoice = (post.userReactions && post.userReactions[uid]) || null;

    return `<div class="post-reactions" data-post="${post.id}">
      ${emojis.map(e => {
        const count = (post.reactions && post.reactions[e]) ? post.reactions[e] : 0;
        const active = userChoice === e ? 'active' : '';
        return `<button class="react-btn ${active}" data-emoji="${encodeURIComponent(e)}" data-post="${post.id}" aria-pressed="${active? 'true':'false'}">
                  <span class="emoji">${e}</span>
                  <span class="count">${count}</span>
                </button>`;
      }).join('')}
    </div>`;
  }

  function renderPostCard(post){
    const imgsHtml = (post.imgs && post.imgs.length) ? `<div class="post-media">${post.imgs.map(src => `<img src="${escapeHtml(src)}" alt="media">`).join('')}</div>` : '';
    const authorAvatar = post.authorAvatar || DEFAULT_AVATAR;
    return `
      <article class="post glass-card" data-id="${post.id}" role="article">
        <div class="post-header">
          <img src="${escapeHtml(authorAvatar)}" class="post-avatar" alt="${escapeHtml(post.author)}">
          <div class="meta">
            <strong class="author-name">${escapeHtml(post.author)}</strong>
            <small class="meta-sub">${timeAgo(post.ts)} · ${escapeHtml(post.category || '')}</small>
          </div>
          <div class="post-options">
            <button class="btn-options">⋯</button>
            <div class="post-menu" role="menu" aria-hidden="true" style="display:none">
              <button data-action="edit">Editar</button>
              <button data-action="delete">Eliminar</button>
              <button data-action="hide">${post.hidden ? 'Mostrar' : 'Ocultar'}</button>
              <button data-action="report">Reportar</button>
            </div>
          </div>
        </div>

        <div class="post-content">${post.content}</div>

        ${imgsHtml}

        <div class="post-actions">
          <div class="left">
            ${buildReactionsHTML(post)}
            <button class="action-btn comment" data-id="${post.id}" title="Comentarios">💬 <span class="count">${post.commentsCount||0}</span></button>
            <button class="action-btn save" data-id="${post.id}" title="Guardar">🔖</button>
          </div>
          <div class="right">
            <button class="action-btn readmode" data-id="${post.id}" title="Leer">📖</button>
            <button class="action-btn share" data-id="${post.id}" title="Compartir">🔁</button>
          </div>
        </div>
      </article>
    `;
  }

  /* =======================
     RENDER / PAGINATION
  ======================= */
  function renderPage(reset=false){
    if (!feedEl) return;
    if (reset) { feedEl.innerHTML = ''; offset = 0; }
    const slice = posts.slice(offset, offset + PAGE_SIZE);
    if (!slice.length && offset === 0) {
      feedEl.innerHTML = '<div class="hint">No hay publicaciones</div>';
      return;
    }
    slice.forEach(p => feedEl.insertAdjacentHTML('beforeend', renderPostCard(p)));
    offset += PAGE_SIZE;
    attachListenersToVisible();
    loaderEl && (loaderEl.style.display = offset < posts.length ? 'block' : 'none');
  }

  /* =======================
     PATCH UI: reactions only
  ======================= */
  function patchReactionsUIForPost(postId){
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const article = feedEl.querySelector(`.post[data-id="${postId}"]`);
    if (!article) return;
    const oldRow = article.querySelector('.post-reactions');
    const newRow = document.createElement('div');
    newRow.innerHTML = buildReactionsHTML(post);
    if (oldRow) oldRow.outerHTML = newRow.innerHTML;
    else {
      const left = article.querySelector('.post-actions .left');
      if (left) left.insertAdjacentHTML('afterbegin', buildReactionsHTML(post));
    }
    attachReactionButtons(article);
  }

  /* =======================
     ATTACH LISTENERS TO VISIBLE POSTS
  ======================= */
  function attachReactionButtons(article){
    article.querySelectorAll('.react-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const postId = btn.dataset.post;
        const emoji = decodeURIComponent(btn.dataset.emoji);
        toggleReaction(postId, emoji);
      };
    });
  }

  function attachCommentButtons(article){
    article.querySelectorAll('.comment').forEach(btn => {
      btn.onclick = () => {
        const postId = btn.dataset.id;
        if (typeof window.openComments === 'function') window.openComments(postId);
        else showToast('Módulo de comentarios no disponible', 'warn');
      };
    });
  }

  function attachSaveButtons(article){
    article.querySelectorAll('.save').forEach(btn => {
      btn.onclick = () => toggleSave(btn.dataset.id);
    });
  }

  function attachPostMenu(article){
    const btnOpt = article.querySelector('.btn-options');
    if (!btnOpt) return;
    const menu = article.querySelector('.post-menu');
    btnOpt.onclick = (ev) => {
      ev.stopPropagation();
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };
    // menu actions
    menu.querySelectorAll('button').forEach(b => {
      b.onclick = (ev) => {
        const action = b.getAttribute('data-action') || b.textContent.trim().toLowerCase();
        const postId = article.dataset.id;
        if (action.includes('edit')) openEdit(postId);
        else if (action.includes('delete')) openConfirmDelete(postId);
        else if (action.includes('hide')) toggleHidePost(postId);
        else if (action.includes('report')) openConfirmReport(postId);
        menu.style.display = 'none';
      };
    });
  }

  function attachReadButtons(article){
    article.querySelectorAll('.readmode').forEach(btn => {
      btn.onclick = () => openReadMode(btn.dataset.id);
    });
  }

  function attachShareButtons(article){
    article.querySelectorAll('.share').forEach(btn => {
      btn.onclick = () => sharePost(btn.dataset.id);
    });
  }

  function attachListenersToVisible(){
    $$('.post').forEach(article => {
      attachReactionButtons(article);
      attachCommentButtons(article);
      attachSaveButtons(article);
      attachPostMenu(article);
      attachReadButtons(article);
      attachShareButtons(article);
    });
  }

  /* =======================
     REACTION LOGIC (single reaction per user)
  ======================= */
  async function toggleReaction(postId, emoji){
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    post.reactions ||= {};
    post.userReactions ||= {};
    const uid = currentUser.id || 'anon';
    const prev = post.userReactions[uid] || null;

    // Ensure keys exist
    post.reactions[emoji] = post.reactions[emoji] || 0;
    if (prev) post.reactions[prev] = post.reactions[prev] || 0;

    if (prev === emoji) {
      // cancel reaction
      post.reactions[emoji] = Math.max(0, post.reactions[emoji] - 1);
      delete post.userReactions[uid];
    } else if (!prev) {
      // add new
      post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
      post.userReactions[uid] = emoji;
    } else {
      // change reaction
      post.reactions[prev] = Math.max(0, post.reactions[prev] - 1);
      post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
      post.userReactions[uid] = emoji;
    }

    // optimistic UI patch
    patchReactionsUIForPost(postId);

    // persist locally
    saveLocalPosts();

    // send to backend (best-effort)
    const res = await apiSendReaction(postId, emoji).catch(()=>null);
    if (res && res.reactions) {
      // backend returned canonical counts and maybe userReactions map
      post.reactions = res.reactions;
      if (res.userReactions) post.userReactions = res.userReactions;
      saveLocalPosts();
      patchReactionsUIForPost(postId);
    }
  }

  /* =======================
     SAVE (guardados)
  ======================= */
  function toggleSave(postId){
    const idx = saved.indexOf(postId);
    if (idx === -1) saved.unshift(postId);
    else saved.splice(idx, 1);
    storageSet(SAVED_KEY, saved);
    showToast(idx === -1 ? 'Guardado' : 'Quitado de guardados', 'success');
    // toggle UI class
    const art = feedEl.querySelector(`.post[data-id="${postId}"]`);
    if (art) {
      const btn = art.querySelector('.save');
      if (btn) btn.classList.toggle('saved', idx === -1);
    }
  }

  /* =======================
     PUBLISH / EDIT / DELETE
  ======================= */
  async function publish(){
    const raw = editorEl?.innerHTML || '';
    if (!raw || !stripHtml(raw).trim()) { showToast('Escribe algo para publicar','warn'); return; }

    const payload = {
      author: currentUser.name,
      authorId: currentUser.id,
      authorAvatar: currentUser.avatar,
      content: sanitizeHtml(raw),
      category: postCategoryEl?.value || '',
      ts: Date.now()
    };

    // If user attached an image file via input or drag-drop (pendingImageFile)
    let backendResult = null;
    try {
      backendResult = await apiCreatePost(payload, pendingImageFile);
    } catch(e) { backendResult = null; }

    if (backendResult && (backendResult.publicacion || backendResult.id || backendResult._id)) {
      // Normalized server response support
      const serverPost = backendResult.publicacion || backendResult;
      // Ensure our normalized shape
      const p = {
        id: serverPost.id || serverPost._id || genId('post'),
        author: serverPost.author || payload.author,
        authorAvatar: serverPost.authorAvatar || payload.authorAvatar,
        content: serverPost.content || payload.content,
        imgs: serverPost.imgs || (serverPost.img ? [serverPost.img] : []) || [],
        ts: serverPost.ts ? (typeof serverPost.ts === 'number' ? serverPost.ts : new Date(serverPost.ts).getTime()) : Date.now(),
        category: serverPost.category || payload.category,
        commentsCount: serverPost.commentsCount || 0,
        reactions: serverPost.reactions || {},
        userReactions: serverPost.userReactions || {}
      };
      posts.unshift(p);
      saveLocalPosts();
      renderPage(true);
      showToast('Publicado ✅', 'success');
      editorEl.innerHTML = '';
      pendingImageFile = null;
      return;
    }

    // fallback local post (offline)
    const localPost = {
      id: genId('post'),
      author: payload.author,
      authorAvatar: payload.authorAvatar,
      content: payload.content,
      imgs: [],
      ts: payload.ts,
      category: payload.category,
      commentsCount: 0,
      reactions: { "❤️":0,"😂":0,"😮":0,"😢":0,"😡":0 },
      userReactions: {}
    };

    // If we had a pending image file, read as dataURL and attach to post for persistence locally
    if (pendingImageFile) {
      try {
        const dataUrl = await fileToDataURL(pendingImageFile);
        localPost.imgs.push(dataUrl);
      } catch(e){ console.warn('file to dataURL fail', e); }
      pendingImageFile = null;
    }

    posts.unshift(localPost);
    saveLocalPosts();
    renderPage(true);
    showToast('Publicado (offline)', 'info');
    editorEl.innerHTML = '';
  }

  function openEdit(postId){
    const p = posts.find(x => x.id === postId);
    if (!p) return;
    editorEl.focus();
    editorEl.innerHTML = p.content || '';
    btnPublish.textContent = 'Guardar cambios';
    const handler = async function handler(){
      const raw = editorEl.innerHTML;
      if (!raw || !stripHtml(raw).trim()) { showToast('Contenido vacío','warn'); return; }
      p.content = sanitizeHtml(raw);
      saveLocalPosts();
      renderPage(true);
      showToast('Guardado', 'success');
      btnPublish.textContent = 'Publicar';
      btnPublish.removeEventListener('click', handler);
      // attempt backend update
      const res = await apiUpdatePost(p.id, { content: p.content }).catch(()=>null);
      if (res && (res.updated || res.publicacion)) {
        // optionally update local canonical
      }
    };
    btnPublish.addEventListener('click', handler);
  }

  async function openConfirmDelete(postId){
    const ok = confirm('¿Eliminar esta publicación?');
    if (!ok) return;
    posts = posts.filter(p => p.id !== postId);
    saveLocalPosts();
    renderPage(true);
    showToast('Eliminada', 'success');
    await apiDeletePost(postId).catch(()=>null);
  }

  function deletePost(postId){ openConfirmDelete(postId); }

  function toggleHidePost(postId){
    const p = posts.find(p=>p.id===postId);
    if (!p) return;
    p.hidden = !p.hidden;
    saveLocalPosts();
    renderPage(true);
    showToast(p.hidden ? 'Publicación oculta' : 'Publicación visible', 'info');
  }

  function openConfirmReport(postId){
    const reason = prompt('¿Por qué reportas esta publicación? (opcional)');
    if (!reason) { showToast('Reporte cancelado', 'info'); return; }
    // Try sending to backend if endpoint exists
    fetchWithTimeout(`${API_BASE}/${postId}/report`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reason, reporter: currentUser.id }) }, 7000)
      .then(()=> showToast('Reporte enviado', 'success'))
      .catch(()=> showToast('No fue posible enviar el reporte (offline)', 'info'));
  }

  /* =======================
     READ MODE (overlay)
  ======================= */
  function openReadMode(postId){
    const p = posts.find(x => x.id === postId);
    if (!p) return;
    let overlay = document.getElementById('readerOverlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'readerOverlay';
    overlay.className = 'reader-overlay';
    overlay.innerHTML = `
      <div class="reader-inner glass-card">
        <button id="closeReader" class="close-reader">✕</button>
        <header><img src="${escapeHtml(p.authorAvatar)}" class="reader-avatar"><div><h3>${escapeHtml(p.author)}</h3><small>${timeAgo(p.ts)}</small></div></header>
        <article class="reader-content">${p.content}${(p.imgs && p.imgs.length) ? `<div class="reader-imgs">${p.imgs.map(i=>`<img src="${escapeHtml(i)}">`).join('')}</div>` : ''}</article>
        <footer><button id="readerComments" data-id="${p.id}" class="btn-primary">Comentarios</button> <button id="readerSave" data-id="${p.id}" class="btn-ghost">Guardar</button></footer>
      </div>
    `;
    document.body.appendChild(overlay);
    $('#closeReader').onclick = () => overlay.remove();
    $('#readerComments').onclick = (e) => {
      const id = e.currentTarget.dataset.id;
      overlay.remove();
      if (typeof window.openComments === 'function') window.openComments(id);
    };
    $('#readerSave').onclick = (e) => toggleSave(e.currentTarget.dataset.id);
  }

  /* =======================
     FILE / IMAGES helpers
  ======================= */
  function fileToDataURL(file){
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = ()=> res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  /* =======================
     Sanitizers & small utils
  ======================= */
  function stripHtml(html=''){
    const tmp = document.createElement('div'); tmp.innerHTML = html || ''; return tmp.textContent || tmp.innerText || '';
  }
  function sanitizeHtml(html=''){
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allowed = ['P','A','IMG','STRONG','B','I','EM','BR','DIV','UL','LI','OL','SPAN'];
    function clean(node){
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 1){
          if (!allowed.includes(child.nodeName)){
            while(child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
            child.parentNode.removeChild(child);
          } else {
            if (child.nodeName === 'A'){
              const href = child.getAttribute('href') || '';
              if (!/^https?:\/\//i.test(href)) child.removeAttribute('href');
            }
            if (child.nodeName === 'IMG'){
              const src = child.getAttribute('src') || '';
              if (!/^data:|^https?:\/\//i.test(src)) child.removeAttribute('src');
            }
            clean(child);
          }
        }
      });
    }
    clean(doc.body);
    return doc.body.innerHTML;
  }

  /* =======================
     Small UI helpers
  ======================= */
  function showToast(msg, type='info'){
    if (window.ui && typeof window.ui.showToast === 'function') { window.ui.showToast(msg, type); return; }
    const t = document.createElement('div'); t.className = `mini-toast ${type}`; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(()=> t.classList.add('visible'));
    setTimeout(()=> { t.classList.remove('visible'); setTimeout(()=> t.remove(), 300); }, 2200);
  }

  /* =======================
     INIT / BOOT
  ======================= */
  async function boot(){
    loadCurrentUser();
    loadSaved();
    // local posts first
    posts = loadLocalPosts();

    // try load from API
    const remote = await apiFetchPosts().catch(()=>null);
    if (Array.isArray(remote) && remote.length) {
      // normalize remote posts to local shape
      posts = remote.map(p => ({
        id: p.id || p._id || genId('post'),
        author: p.author || p.user || 'Anon',
        authorId: p.authorId || p.userId || null,
        authorAvatar: p.authorAvatar || p.avatar || DEFAULT_AVATAR,
        content: p.content || '',
        imgs: p.imgs || (p.img ? [p.img] : []) || [],
        ts: p.ts ? (typeof p.ts === 'number' ? p.ts : new Date(p.ts).getTime()) : Date.now(),
        category: p.category || '',
        commentsCount: p.commentsCount || p.comments?.length || 0,
        reactions: p.reactions || {},
        userReactions: p.userReactions || {},
        hidden: p.hidden || false
      }));
      saveLocalPosts();
    } else {
      if (!posts || !posts.length) {
        posts = [{
          id: genId('post'),
          author: 'BlogMe',
          authorAvatar: DEFAULT_AVATAR,
          content: '<p>Bienvenido a BlogMe — escribe tu primera publicación ✨</p>',
          imgs: [],
          ts: Date.now() - 3600*1000,
          category: 'Inicio',
          commentsCount: 0,
          reactions: {},
          userReactions: {}
        }];
        saveLocalPosts();
      }
    }

    renderPage(true);

    // infinite loader observer
    if (loaderEl) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting && !loading) renderPage(false);
        });
      }, { threshold: 0.5 });
      obs.observe(loaderEl);
    }

    // publish binding
    if (btnPublish) btnPublish.addEventListener('click', publish);

    // editor drag & drop to attach images
    if (editorEl) {
      editorEl.addEventListener('dragover', e => { e.preventDefault(); editorEl.classList.add('drag-over'); });
      editorEl.addEventListener('dragleave', e => { editorEl.classList.remove('drag-over'); });
      editorEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        editorEl.classList.remove('drag-over');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          // preview insert and mark pending image for upload
          try {
            const dataUrl = await fileToDataURL(file);
            const imgEl = document.createElement('img');
            imgEl.src = dataUrl;
            imgEl.style.maxWidth = '100%';
            imgEl.style.borderRadius = '8px';
            editorEl.appendChild(imgEl);
            pendingImageFile = file;
            showToast('Imagen añadida al editor (se intentará subir)', 'info');
          } catch(err){
            console.warn('drop image failed', err);
          }
        }
      });
    }

    // optional file input for image
    if (inputFileGlobal) {
      inputFileGlobal.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file && file.type.startsWith('image/')) {
          pendingImageFile = file;
          showToast('Imagen seleccionada (se intentará subir)', 'info');
        }
      });
    }

    // attach global delegation for dynamic post menus (click outside close)
    document.addEventListener('click', (ev) => {
      $$('.post-menu').forEach(menu => {
        if (!menu.contains(ev.target) && !menu.previousElementSibling?.contains(ev.target)) menu.style.display = 'none';
      });
    });

    // initial listeners for rendered posts
    setTimeout(()=> attachListenersToVisible(), 80);
  }

  // run boot
  boot();

  /* =======================
     EXPORT DEBUG HELPERS
  ======================= */
  window.blogmePosts = {
    getAll: () => posts,
    save: () => saveLocalPosts(),
    toggleReaction: (id, emoji) => toggleReaction(id, emoji)
  };

  /* =======================
     Duplicate helper defs (avoid linter warnings in some envs)
  ======================= */
  function storageSetLocal(key,val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function storageGetLocal(key, fallback=null){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch(e){return fallback;} }
  // keep compatibility with older calls in this file
  function saveLocalPosts(){ storageSetLocal(POSTS_KEY, posts); }
  function loadLocalPosts(){ return storageGetLocal(POSTS_KEY, []) || []; }
  function loadSaved(){ saved = storageGetLocal(SAVED_KEY, []) || []; }

})();

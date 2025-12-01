const newPostForm = document.getElementById('newPostForm');
const postsContainer = document.querySelector('.posts');

newPostForm.addEventListener('submit', function(e) {
  e.preventDefault();

  const title = document.getElementById('newPostTitle').value;
  const content = document.getElementById('newPostContent').value;

  // Crear un nuevo post
  const postCard = document.createElement('div');
  postCard.className = 'post-card';
  postCard.innerHTML = `
    <h2 class="post-title">${title}</h2>
    <p class="post-content">${content}</p>
    <div class="post-footer">
      <span class="post-author">Autor: Admin</span>
      <span class="post-date">Fecha: ${new Date().toLocaleDateString()}</span>
    </div>
  `;

postsContainer.prepend(postCard);

// Animación para el nuevo post
postCard.style.opacity = 0;
postCard.style.transform = "translateY(20px)";
setTimeout(() => {
  postCard.style.transition = "all 0.8s";
  postCard.style.opacity = 1;
  postCard.style.transform = "translateY(0)";
}, 50);


  // Limpiar formulario
  newPostForm.reset();
});
const cards = document.querySelectorAll('.card');
const modal = document.getElementById('modal');
const cerrar = document.getElementById('cerrar');
const modalTitulo = document.getElementById('modalTitulo');

cards.forEach(card => {
  card.addEventListener('click', () => {
    const titulo = card.getAttribute('data-titulo');
    modalTitulo.textContent = titulo;
    modal.style.display = 'flex';
  });
});

cerrar.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
});

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) return;
  const btn = event.target.querySelector('button[type=submit]');
  btn.innerHTML = '<span>Authenticating...</span>';
  btn.disabled = true;
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
}

function togglePw() {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
}

document.querySelectorAll('.role-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const hints = { admin: 'admin@nexstock.ai', manager: 'manager@nexstock.ai', viewer: 'viewer@nexstock.ai' };
    document.getElementById('email').placeholder = hints[tab.dataset.role];
  });
});

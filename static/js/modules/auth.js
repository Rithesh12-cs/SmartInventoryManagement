// ======= AUTHENTICATION MODULE =======
// This module handles all auth-related operations for the dashboard

const AUTH = {
    user: null,
    isAuthenticated: false,
    token: null,

    // Initialize auth on page load
    async init() {
        try {
            const response = await fetch('/api/auth/check');
            const data = await response.json();

            if (data.authenticated) {
                this.isAuthenticated = true;
                this.user = data.user;
                console.log('✓ User authenticated:', this.user.email);
                return true;
            } else {
                console.log('✗ User not authenticated');
                window.location.href = '/login';
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login';
            return false;
        }
    },

    // Get current user profile
    async getProfile() {
        try {
            const response = await fetch('/api/auth/profile');
            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                return data.user;
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
        return null;
    },

    // Logout user
    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.isAuthenticated = false;
            this.user = null;
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    },

    // Check if user has specific role
    hasRole(role) {
        return this.user && this.user.role === role;
    },

    // Check if user has at least the given role
    hasMinRole(role) {
        const roleHierarchy = { viewer: 0, manager: 1, admin: 2 };
        if (!this.user) return false;
        return (roleHierarchy[this.user.role] || 0) >= (roleHierarchy[role] || 0);
    }
};

// ======= USER MANAGEMENT =======
// Initialize default users if empty
if (!USERS || USERS.length === 0) {
  USERS = [
    { id:1, name:'Sarah Chen', email:'sarah.chen@nexstock.ai', role:'Admin', dept:'Operations', lastLogin:'2 min ago', status:'active', avatar:'#3b82f6' },
    { id:2, name:'James Okafor', email:'james.okafor@nexstock.ai', role:'Manager', dept:'Procurement', lastLogin:'1 hour ago', status:'active', avatar:'#10b981' },
    { id:3, name:'Priya Patel', email:'priya.patel@nexstock.ai', role:'Manager', dept:'Sales', lastLogin:'3 hours ago', status:'active', avatar:'#8b5cf6' },
  ];
}

function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    AUTH.logout();
  }
}

function updateUserDisplay() {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');
    const userRoleEl = document.getElementById('userRole');
    const topbarAvatarEl = document.getElementById('topbarAvatar');
    
    if (userNameEl) userNameEl.textContent = AUTH.user ? AUTH.user.name : 'User';
    if (userEmailEl) userEmailEl.textContent = AUTH.user ? AUTH.user.email : '';
    if (userRoleEl) userRoleEl.textContent = AUTH.user ? AUTH.user.role : 'Viewer';
    if (userAvatarEl) {
        userAvatarEl.textContent = AUTH.user ? (AUTH.user.name || 'U')[0].toUpperCase() : 'U';
        userAvatarEl.style.background = AUTH.user ? AUTH.user.avatar : '#3b82f6';
    }
    if (topbarAvatarEl) {
        topbarAvatarEl.textContent = AUTH.user ? (AUTH.user.name || 'U')[0].toUpperCase() : 'U';
        topbarAvatarEl.style.background = AUTH.user ? AUTH.user.avatar : '#3b82f6';
    }
}

let filteredUsers = [...USERS];
let editingUserId = null;

function renderUserTable() {
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = filteredUsers.map(u => `
    <tr>
      <td><input type="checkbox" class="row-check"></td>
      <td><div class="user-cell">
        <div class="uc-avatar" style="background:${u.avatar}">${u.name[0]}</div>
        <div><div class="uc-name">${u.name}</div><div class="uc-email">${u.email}</div></div>
      </div></td>
      <td><span class="badge ${u.role==='Admin'?'badge-purple':u.role==='Manager'?'badge-blue':'badge-gray'}">${u.role}</span></td>
      <td>${u.dept}</td>
      <td style="color:var(--text2)">${u.lastLogin}</td>
      <td><span class="badge ${u.status==='active'?'badge-green':'badge-gray'}">${u.status}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" onclick="editUser(${u.id})" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon danger" onclick="deleteUser(${u.id})" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button>
        </div>
      </td>
    </tr>`).join('');
  renderUserPagination();
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilterU').value;
  filteredUsers = USERS.filter(u =>
    (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
    (role === 'all' || u.role.toLowerCase() === role) &&
    (status === 'all' || u.status === status)
  );
  renderUserTable();
}

function renderUserPagination() {
  document.getElementById('userPagination').innerHTML = [1,2,3].map((n,i) =>
    `<button class="pg-btn${i===0?' active':''}">${n}</button>`).join('') +
    '<button class="pg-btn">›</button>';
}

function toggleSelectAll() {
  document.querySelectorAll('.row-check').forEach(c => c.checked = document.getElementById('selectAll').checked);
}

function openUserModal(id=null) {
  editingUserId = id;
  document.getElementById('modalTitle').textContent = id ? 'Edit User' : 'Add New User';
  if (!id) { ['uName','uEmail'].forEach(f => document.getElementById(f).value = ''); }
  document.getElementById('userModal').classList.add('open');
}

function closeUserModal() { document.getElementById('userModal').classList.remove('open'); }

function editUser(id) {
  const u = USERS.find(x => x.id===id);
  document.getElementById('uName').value = u.name;
  document.getElementById('uEmail').value = u.email;
  document.getElementById('uRole').value = u.role;
  document.getElementById('uDept').value = u.dept;
  openUserModal(id);
}

function deleteUser(id) {
  const idx = USERS.findIndex(x => x.id===id);
  if (idx > -1) { USERS.splice(idx,1); filteredUsers = [...USERS]; renderUserTable(); showToast('User removed successfully'); }
}

function saveUser() {
  const name = document.getElementById('uName').value.trim();
  const email = document.getElementById('uEmail').value.trim();
  if (!name || !email) { showToast('Please fill all required fields','error'); return; }
  if (editingUserId) {
    const u = USERS.find(x => x.id===editingUserId);
    u.name=name; u.email=email; u.role=document.getElementById('uRole').value; u.dept=document.getElementById('uDept').value;
    showToast('User updated successfully');
  } else {
    USERS.unshift({ id:Date.now(), name, email, role:document.getElementById('uRole').value, dept:document.getElementById('uDept').value, lastLogin:'Just now', status:'active', avatar:'#3b82f6' });
    showToast('User added successfully');
  }
  filteredUsers = [...USERS]; renderUserTable(); closeUserModal();
}

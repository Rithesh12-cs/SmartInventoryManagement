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
const USERS = {
    list: [],
    filtered: [],
    editingId: null,

    // Load all users (admin only)
    async load() {
        try {
            if (!AUTH.hasRole('admin')) {
                console.warn('⚠ User access required to view user list');
                return [];
            }

            // For now, return mock data
            // In production, this would fetch from /api/users
            this.list = [
                { id: 1, name: 'Sarah Chen', email: 'sarah.chen@nexstock.ai', role: 'Admin', dept: 'Operations', lastLogin: '2 min ago', status: 'active', avatar: '#3b82f6' },
                { id: 2, name: 'James Okafor', email: 'james.okafor@nexstock.ai', role: 'Manager', dept: 'Procurement', lastLogin: '1 hour ago', status: 'active', avatar: '#10b981' },
                { id: 3, name: 'Priya Patel', email: 'priya.patel@nexstock.ai', role: 'Manager', dept: 'Sales', lastLogin: '3 hours ago', status: 'active', avatar: '#8b5cf6' },
            ];

            console.log('✓ Users loaded:', this.list.length);
            return this.list;
        } catch (error) {
            console.error('Failed to load users:', error);
            return [];
        }
    },

    // Filter users
    filter(query = '', role = 'all', status = 'all') {
        const q = query.toLowerCase();
        this.filtered = this.list.filter(u =>
            (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
            (role === 'all' || u.role.toLowerCase() === role) &&
            (status === 'all' || u.status === status)
        );
        return this.filtered;
    },

    // Get user by ID
    getById(id) {
        return this.list.find(u => u.id === id);
    },

    // Add new user
    add(userData) {
        const newUser = {
            id: Date.now(),
            ...userData,
            lastLogin: 'Never',
            status: 'active',
            avatar: '#3b82f6'
        };
        this.list.unshift(newUser);
        showToast('User added successfully', 'success');
        return newUser;
    },

    // Update user
    update(id, userData) {
        const user = this.getById(id);
        if (user) {
            Object.assign(user, userData);
            showToast('User updated successfully', 'success');
            return user;
        }
        return null;
    },

    // Delete user
    delete(id) {
        const idx = this.list.findIndex(u => u.id === id);
        if (idx > -1) {
            this.list.splice(idx, 1);
            showToast('User removed successfully', 'success');
            return true;
        }
        return false;
    },

    // Render user table
    render() {
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.filtered.map(u => `
            <tr>
                <td><input type="checkbox" class="row-check"></td>
                <td>
                    <div class="user-cell">
                        <div class="uc-avatar" style="background:${u.avatar}">${u.name[0]}</div>
                        <div>
                            <div class="uc-name">${u.name}</div>
                            <div class="uc-email">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge ${u.role === 'Admin' ? 'badge-purple' : u.role === 'Manager' ? 'badge-blue' : 'badge-gray'}">${u.role}</span></td>
                <td>${u.dept}</td>
                <td style="color:var(--text2)">${u.lastLogin}</td>
                <td><span class="badge ${u.status === 'active' ? 'badge-green' : 'badge-gray'}">${u.status}</span></td>
                <td>
                    <div style="display:flex;gap:4px">
                        <button class="btn-icon" onclick="openUserModal(${u.id})" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon danger" onclick="deleteUserConfirm(${u.id})" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
};

// ======= INVENTORY API =======
const INVENTORY = {
    products: [],
    inventory: [],
    alerts: [],
    forecast: {},

    // Fetch all products
    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Failed to fetch products');

            const data = await response.json();
            this.products = data.map((p, idx) => ({
                id: idx + 1,
                name: p.category + ' - ' + p.product_id,
                sku: p.product_id,
                cat: p.category,
                stock: p.stock,
                reorder: p.reorder,
                price: p.price,
                supplier: p.supplier
            }));

            console.log('✓ Products loaded:', this.products.length);
            return this.products;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    },

    // Fetch inventory data
    async loadInventory() {
        try {
            const response = await fetch('/api/inventory');
            if (!response.ok) throw new Error('Failed to fetch inventory');

            this.inventory = await response.json();
            console.log('✓ Inventory data loaded:', this.inventory.length);
            return this.inventory;
        } catch (error) {
            console.error('Error loading inventory:', error);
            return [];
        }
    },

    // Fetch alerts
    async loadAlerts() {
        try {
            const response = await fetch('/api/alerts');
            if (!response.ok) throw new Error('Failed to fetch alerts');

            this.alerts = await response.json();
            console.log('✓ Alerts loaded:', this.alerts.length);
            return this.alerts;
        } catch (error) {
            console.error('Error loading alerts:', error);
            return [];
        }
    },

    // Fetch forecast data
    async loadForecast() {
        try {
            const response = await fetch('/api/forecast');
            if (!response.ok) throw new Error('Failed to fetch forecast');

            const data = await response.json();
            this.forecast = {};
            data.forEach((item, idx) => {
                this.forecast[idx] = {
                    name: item.name || 'Product ' + item._id,
                    pred30: Math.round(item.forecast) || 100,
                    stock: item.stock || 0
                };
            });

            console.log('✓ Forecast data loaded:', Object.keys(this.forecast).length);
            return this.forecast;
        } catch (error) {
            console.error('Error loading forecast:', error);
            return {};
        }
    },

    // Load all data
    async loadAll() {
        console.log('📦 Loading inventory data...');
        try {
            await Promise.all([
                this.loadProducts(),
                this.loadInventory(),
                this.loadAlerts(),
                this.loadForecast()
            ]);
            console.log('✅ All inventory data loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Error loading inventory data:', error);
            return false;
        }
    },

    // Get stock status
    getStockStatus(product) {
        if (product.stock === 0) return 'critical';
        if (product.stock < product.reorder) return 'low';
        return 'normal';
    },

    // Get stock badge HTML
    getStockBadge(product) {
        const status = this.getStockStatus(product);
        if (status === 'critical') return '<span class="badge badge-red">Out of Stock</span>';
        if (status === 'low') return '<span class="badge badge-orange">Low Stock</span>';
        return '<span class="badge badge-green">Normal</span>';
    },

    // Update product stock
    async updateStock(productId, newStock) {
        try {
            const response = await fetch('/api/products/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, stock: newStock })
            });

            if (response.ok) {
                showToast('Product stock updated successfully', 'success');
                await this.loadProducts();
                return true;
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            showToast('Failed to update stock', 'error');
        }
        return false;
    }
};

// ======= UI HELPERS (Dashboard Integration) =======

// Show toast notification
function showToast(msg, type = 'success') {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const container = document.getElementById('toastContainer');
    
    if (!container) return; // Toast container doesn't exist on login page
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-icon">${icons[type] || 'ℹ'}</div><span class="toast-msg">${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

// Initialize dashboard after auth check
async function initDashboard() {
    console.log('🚀 Initializing dashboard...');
    
    // Check authentication
    if (!await AUTH.init()) {
        return;
    }

    // Load inventory data
    if (!await INVENTORY.loadAll()) {
        showToast('Warning: Some data failed to load', 'info');
    }

    // Load users if admin
    if (AUTH.user.role === 'admin') {
        await USERS.load();
    }

    // Update user info in UI
    updateUserDisplay();

    console.log('✅ Dashboard initialized successfully');
}

// Update user info display
function updateUserDisplay() {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) userNameEl.textContent = AUTH.user.name || 'User';
    if (userEmailEl) userEmailEl.textContent = AUTH.user.email || '';
    if (userAvatarEl) {
        userAvatarEl.textContent = (AUTH.user.name || 'U')[0].toUpperCase();
        userAvatarEl.style.background = AUTH.user.avatar || '#3b82f6';
    }
}

// Logout handler
function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        AUTH.logout();
    }
}

// ======= MODAL HANDLERS =======
function openUserModal(id = null) {
    const modal = document.getElementById('userModal');
    if (!modal) return;

    if (id) {
        const user = USERS.getById(id);
        if (user) {
            document.getElementById('modalTitle').textContent = 'Edit User';
            document.getElementById('uName').value = user.name;
            document.getElementById('uEmail').value = user.email;
            document.getElementById('uRole').value = user.role.toLowerCase();
            document.getElementById('uDept').value = user.dept;
            USERS.editingId = id;
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add New User';
        document.getElementById('uName').value = '';
        document.getElementById('uEmail').value = '';
        document.getElementById('uRole').value = 'manager';
        document.getElementById('uDept').value = 'Operations';
        USERS.editingId = null;
    }

    modal.classList.add('open');
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) modal.classList.remove('open');
}

function saveUser() {
    const name = document.getElementById('uName').value.trim();
    const email = document.getElementById('uEmail').value.trim();
    const role = document.getElementById('uRole').value;
    const dept = document.getElementById('uDept').value;

    if (!name || !email) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    if (USERS.editingId) {
        USERS.update(USERS.editingId, { name, email, role: role.charAt(0).toUpperCase() + role.slice(1), dept });
    } else {
        USERS.add({ name, email, role: role.charAt(0).toUpperCase() + role.slice(1), dept });
    }

    USERS.render();
    closeUserModal();
}

function deleteUserConfirm(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        USERS.delete(id);
        USERS.render();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize dashboard if we're on the dashboard page
    if (document.getElementById('dashMain')) {
        initDashboard();
    }
});

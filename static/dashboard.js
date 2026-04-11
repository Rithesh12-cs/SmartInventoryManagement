// ======= DATA =======
const USERS = [
  { id:1, name:'Sarah Chen', email:'sarah.chen@nexstock.ai', role:'Admin', dept:'Operations', lastLogin:'2 min ago', status:'active', avatar:'#3b82f6' },
  { id:2, name:'James Okafor', email:'james.okafor@nexstock.ai', role:'Manager', dept:'Procurement', lastLogin:'1 hour ago', status:'active', avatar:'#10b981' },
  { id:3, name:'Priya Patel', email:'priya.patel@nexstock.ai', role:'Manager', dept:'Sales', lastLogin:'3 hours ago', status:'active', avatar:'#8b5cf6' },
  { id:4, name:'Lena Müller', email:'lena.muller@nexstock.ai', role:'Viewer', dept:'Finance', lastLogin:'Yesterday', status:'active', avatar:'#f59e0b' },
  { id:5, name:'Marcus Reid', email:'marcus.reid@nexstock.ai', role:'Viewer', dept:'IT', lastLogin:'2 days ago', status:'inactive', avatar:'#ef4444' },
  { id:6, name:'Yuki Tanaka', email:'yuki.tanaka@nexstock.ai', role:'Manager', dept:'Operations', lastLogin:'5 hours ago', status:'active', avatar:'#06b6d4' },
  { id:7, name:'Diego Flores', email:'diego.flores@nexstock.ai', role:'Viewer', dept:'Procurement', lastLogin:'1 week ago', status:'inactive', avatar:'#ec4899' },
];

const PRODUCTS = [
  { id:1, name:'Bluetooth Speaker', sku:'BT-SPK-001', cat:'Electronics', stock:12, reorder:8, price:49.99, supplier:'SoundTech Ltd' },
  { id:2, name:'USB-C Charger 65W', sku:'CH-USB-065', cat:'Electronics', stock:5, reorder:10, price:29.99, supplier:'PowerCore Inc' },
  { id:3, name:'Laptop Stand Adj.', sku:'LS-ADJ-002', cat:'Accessories', stock:18, reorder:5, price:39.99, supplier:'ErgoDesign' },
  { id:4, name:'Wireless Mouse', sku:'MS-WL-003', cat:'Electronics', stock:3, reorder:12, price:24.99, supplier:'PeriphTech' },
  { id:5, name:'Mechanical Keyboard', sku:'KB-MCH-004', cat:'Electronics', stock:22, reorder:8, price:89.99, supplier:'KeyCraft' },
  { id:6, name:'Monitor Arm', sku:'MA-DSK-005', cat:'Furniture', stock:0, reorder:4, price:69.99, supplier:'ErgoDesign' },
  { id:7, name:'Notebook A4 Pack', sku:'NB-A4-006', cat:'Stationery', stock:45, reorder:15, price:8.99, supplier:'PaperWorld' },
  { id:8, name:'HDMI 2.1 Cable', sku:'CB-HDM-007', cat:'Accessories', stock:7, reorder:10, price:14.99, supplier:'CablePro' },
  { id:9, name:'USB Hub 7-Port', sku:'HB-USB-008', cat:'Electronics', stock:9, reorder:10, price:34.99, supplier:'PeriphTech' },
  { id:10, name:'Ergonomic Chair', sku:'CH-ERG-009', cat:'Furniture', stock:2, reorder:3, price:299.99, supplier:'ErgoDesign' },
  { id:11, name:'Desk Mat XL', sku:'DM-XL-010', cat:'Accessories', stock:31, reorder:10, price:19.99, supplier:'DeskPro' },
  { id:12, name:'Webcam 4K', sku:'WC-4K-011', cat:'Electronics', stock:6, reorder:8, price:79.99, supplier:'VisionTech' },
];

// ======= NAVIGATION =======
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');
  const titles = { overview:'Overview', users:'User Management', inventory:'Inventory', forecast:'Demand Forecasting', alerts:'Alerts', reports:'Reports & Analytics' };
  document.getElementById('pageTitle').textContent = titles[name] || name;
  document.getElementById('breadcrumb').textContent = 'Dashboard / ' + (titles[name] || name);
  if (name === 'forecast') initForecastCharts();
  if (name === 'reports') initReportCharts();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('dashMain').style.marginLeft =
    document.getElementById('sidebar').classList.contains('collapsed') ? '60px' : 'var(--sidebar-w)';
}

// ======= TOAST =======
function showToast(msg, type='success') {
  const icons = { success:'✓', error:'✕', info:'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="toast-icon">${icons[type]||'ℹ'}</div><span class="toast-msg">${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ======= KPI COUNTER =======
function animateCounters() {
  document.querySelectorAll('.kpi-val[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    let cur = 0;
    const isDecimal = suffix === '%' && target > 100;
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      if (isDecimal) {
        el.textContent = prefix + (cur / 10).toFixed(1) + suffix;
      } else {
        el.textContent = prefix + (cur >= 1000 ? (cur/1000).toFixed(cur>=10000?0:1)+'K' : cur) + suffix;
      }
      if (cur >= target) clearInterval(timer);
    }, 16);
  });
}

// ======= OVERVIEW CHARTS =======
let demandChartInst, donutInst;

function initOverview() {
  renderCategoryBars();
  renderActivityFeed();
  renderMLStatus();
  initDemandChart(30);
  initDonutChart();
  animateCounters();
}

function initDemandChart(days) {
  const ctx = document.getElementById('demandChart').getContext('2d');
  if (demandChartInst) demandChartInst.destroy();
  const labels = Array.from({length:days}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (days-1-i));
    return d.toLocaleDateString('en',{month:'short',day:'numeric'});
  });
  const actual = labels.map((_,i) => Math.round(80 + 40*Math.sin(i/4) + Math.random()*20));
  const forecast = actual.map(v => Math.round(v * (0.92 + Math.random()*0.16)));
  const upper = forecast.map(v => v + Math.round(8 + Math.random()*6));
  const lower = forecast.map(v => v - Math.round(8 + Math.random()*6));
  demandChartInst = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        { type:'line', label:'Actual Demand', data:actual, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.08)', tension:0.4, borderWidth:2.5, pointRadius:0, pointHoverRadius:5, fill:false },
        { type:'line', label:'ML Forecast', data:forecast, borderColor:'#8b5cf6', borderDash:[5,3], tension:0.4, borderWidth:2, pointRadius:0, fill:false },
        { type:'line', label:'Upper Bound', data:upper, borderColor:'rgba(139,92,246,0.2)', backgroundColor:'rgba(139,92,246,0.06)', tension:0.4, borderWidth:1, pointRadius:0, fill:'+1' },
        { type:'line', label:'Lower Bound', data:lower, borderColor:'rgba(139,92,246,0.2)', tension:0.4, borderWidth:1, pointRadius:0, fill:false }
      ]
    },
    options: { ...chartDefaults(), plugins:{ ...chartDefaults().plugins, legend:{ display:true, position:'top', labels:{ color:'#9ba3b8', font:{size:11}, boxWidth:24 } } } }
  });
}

function updateDemandChart(v) { initDemandChart(parseInt(v)); }

function initDonutChart() {
  const ctx = document.getElementById('stockDonut').getContext('2d');
  if (donutInst) donutInst.destroy();
  const data = { Normal:198, 'Low Stock':18, Critical:5, 'Out of Stock':3 };
  const colors = ['#3b82f6','#f59e0b','#ef4444','#6b7280'];
  donutInst = new Chart(ctx, {
    type:'doughnut',
    data:{ labels:Object.keys(data), datasets:[{ data:Object.values(data), backgroundColor:colors, borderWidth:0, hoverOffset:6 }] },
    options:{ cutout:'72%', plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(c) => ` ${c.label}: ${c.raw} items`}} }, animation:{animateRotate:true} }
  });
  const leg = document.getElementById('donutLegend');
  leg.innerHTML = Object.entries(data).map(([ k,v ],i) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div><span>${k}</span><span style="margin-left:auto;font-weight:600;color:var(--text)">${v}</span></div>`
  ).join('');
}

function renderCategoryBars() {
  const cats = [
    { name:'Electronics', val:82, color:'#3b82f6' },
    { name:'Accessories', val:67, color:'#8b5cf6' },
    { name:'Furniture', val:45, color:'#10b981' },
    { name:'Stationery', val:91, color:'#f59e0b' },
  ];
  document.getElementById('categoryBars').innerHTML = cats.map(c => `
    <div class="cat-bar-item">
      <div class="cat-bar-label"><span>${c.name}</span><span>${c.val}%</span></div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${c.val}%;background:${c.color}"></div></div>
    </div>`).join('');
}

function renderActivityFeed() {
  const feed = [
    { text:'USB-C Charger stock fell below reorder level', time:'2 min ago', color:'#ef4444' },
    { text:'Wireless Mouse reordered: 50 units via PeriphTech', time:'18 min ago', color:'#10b981' },
    { text:'ML model retrained — accuracy improved to 98.4%', time:'1 hour ago', color:'#8b5cf6' },
    { text:'Monitor Arm flagged as out of stock', time:'3 hours ago', color:'#f59e0b' },
    { text:'Monthly report generated and emailed', time:'5 hours ago', color:'#3b82f6' },
  ];
  document.getElementById('activityFeed').innerHTML = feed.map(f => `
    <div class="activity-item">
      <div class="act-dot" style="background:${f.color}"></div>
      <div><div class="act-text">${f.text}</div><div class="act-time">${f.time}</div></div>
    </div>`).join('');
}

function renderMLStatus() {
  const models = [
    { name:'LSTM Demand Model', acc:'98.4%', status:'Running', dot:'green' },
    { name:'ARIMA Baseline', acc:'94.1%', status:'Running', dot:'green' },
    { name:'Prophet Seasonal', acc:'96.2%', status:'Retraining', dot:'orange' },
    { name:'Ensemble (Final)', acc:'98.7%', status:'Active', dot:'blue' },
  ];
  document.getElementById('mlStatusList').innerHTML = models.map(m => `
    <div class="ml-status-item">
      <div class="ml-dot ${m.dot}"></div>
      <span class="ml-name">${m.name}</span>
      <span class="ml-acc">${m.acc}</span>
      <span class="ml-badge-sm ${m.status==='Retraining'?'warn':'ok'}">${m.status}</span>
    </div>`).join('');
}

// ======= USER MANAGEMENT =======
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

// ======= INVENTORY =======
let filteredProducts = [...PRODUCTS];

function getStockStatus(p) {
  if (p.stock === 0) return 'critical';
  if (p.stock < p.reorder) return 'low';
  return 'normal';
}

function getStockBadge(p) {
  const s = getStockStatus(p);
  if (s === 'critical') return '<span class="badge badge-red">Out of Stock</span>';
  if (s === 'low') return '<span class="badge badge-orange">Low Stock</span>';
  return '<span class="badge badge-green">Normal</span>';
}

function getForecastBadge(p) {
  const forecasts = { 1:'↑ High', 2:'↓ Low', 3:'→ Stable', 4:'↑↑ Surge', 5:'→ Stable', 6:'→ Stable', 7:'↑ High', 8:'↓ Low', 9:'↑ Moderate', 10:'→ Stable', 11:'→ Stable', 12:'↑ High' };
  const f = forecasts[p.id] || '→ Stable';
  const cl = f.includes('↑')? 'badge-green' : f.includes('↓')? 'badge-red' : 'badge-gray';
  return `<span class="badge ${cl}">${f}</span>`;
}

function renderInventoryTable() {
  document.getElementById('invTableBody').innerHTML = filteredProducts.map(p => {
    const pct = Math.min(100, Math.round((p.stock / (p.reorder * 2)) * 100));
    const fillColor = getStockStatus(p) === 'normal' ? '#10b981' : getStockStatus(p) === 'low' ? '#f59e0b' : '#ef4444';
    return `<tr>
      <td><span style="font-weight:500">${p.name}</span></td>
      <td style="color:var(--text2);font-size:0.82rem">${p.sku}</td>
      <td><span class="badge badge-gray">${p.cat}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700;min-width:24px">${p.stock}</span>
          <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${fillColor}"></div></div>
        </div>
      </td>
      <td style="color:var(--text2)">${p.reorder}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${getStockBadge(p)}</td>
      <td>${getForecastBadge(p)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" onclick="editProduct(${p.id})" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn-icon danger" onclick="deleteProduct(${p.id})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterInventory() {
  const q = (document.getElementById('invSearch').value||'').toLowerCase();
  const cat = document.getElementById('catFilter').value;
  const st = document.getElementById('invStatusFilter').value;
  filteredProducts = PRODUCTS.filter(p =>
    (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
    (cat==='all' || p.cat===cat) &&
    (st==='all' || getStockStatus(p)===st)
  );
  renderInventoryTable();
}

function openProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add New Product';
  ['pName','pSku','pPrice','pStock','pReorder','pSupplier'].forEach(f => document.getElementById(f).value='');
  document.getElementById('productModal').classList.add('open');
}
function closeProductModal() { document.getElementById('productModal').classList.remove('open'); }

function editProduct(id) {
  const p = PRODUCTS.find(x => x.id===id);
  document.getElementById('pName').value = p.name;
  document.getElementById('pSku').value = p.sku;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pStock').value = p.stock;
  document.getElementById('pReorder').value = p.reorder;
  document.getElementById('pSupplier').value = p.supplier;
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productModal').classList.add('open');
}

function deleteProduct(id) {
  const idx = PRODUCTS.findIndex(x => x.id===id);
  if (idx > -1) { PRODUCTS.splice(idx,1); filteredProducts = [...PRODUCTS]; renderInventoryTable(); showToast('Product removed'); }
}

function saveProduct() {
  const name = document.getElementById('pName').value.trim();
  if (!name) { showToast('Product name is required','error'); return; }
  PRODUCTS.unshift({ id:Date.now(), name, sku:document.getElementById('pSku').value, cat:document.getElementById('pCat').value, stock:parseInt(document.getElementById('pStock').value)||0, reorder:parseInt(document.getElementById('pReorder').value)||5, price:parseFloat(document.getElementById('pPrice').value)||0, supplier:document.getElementById('pSupplier').value });
  filteredProducts=[...PRODUCTS]; renderInventoryTable(); closeProductModal(); showToast('Product saved successfully');
}

// ======= FORECAST =======
let forecastChartInst;

const FORECAST_DATA = {
  0:{ name:'Bluetooth Speaker', acc:98.4, mae:3.2, rmse:4.1, mape:3.8, pred30:142, stock:12 },
  1:{ name:'USB-C Charger', acc:96.1, mae:4.8, rmse:6.2, mape:5.1, pred30:210, stock:5 },
  2:{ name:'Laptop Stand', acc:97.8, mae:2.9, rmse:3.8, mape:3.2, pred30:88, stock:18 },
  3:{ name:'Wireless Mouse', acc:95.3, mae:5.1, rmse:6.8, mape:5.9, pred30:178, stock:3 },
  4:{ name:'Mechanical Keyboard', acc:98.1, mae:3.6, rmse:4.4, mape:4.0, pred30:64, stock:22 },
};

function initForecastCharts() {
  updateForecast();
  renderForecastTable();
}

function updateForecast() {
  const pid = document.getElementById('forecastProduct').value;
  const horizon = parseInt(document.getElementById('forecastHorizon').value)||30;
  const fd = FORECAST_DATA[pid] || FORECAST_DATA[0];
  document.getElementById('forecastTitle').textContent = `${fd.name} — Demand Forecast`;
  document.getElementById('forecastAccBadge').textContent = `${fd.acc}% accuracy`;
  renderForecastChart(fd, horizon);
  renderForecastMetrics(fd);
  renderReorderRec(fd);
}

function runForecast() {
  showToast('ML model running forecast...', 'info');
  setTimeout(() => { updateForecast(); showToast('Forecast updated successfully'); }, 1200);
}

function renderForecastChart(fd, days) {
  const ctx = document.getElementById('forecastChart').getContext('2d');
  if (forecastChartInst) forecastChartInst.destroy();
  const histLen = 20;
  const histLabels = Array.from({length:histLen}, (_,i) => { const d=new Date(); d.setDate(d.getDate()-(histLen-i)); return d.toLocaleDateString('en',{month:'short',day:'numeric'}); });
  const futureLabels = Array.from({length:days}, (_,i) => { const d=new Date(); d.setDate(d.getDate()+i+1); return d.toLocaleDateString('en',{month:'short',day:'numeric'}); });
  const allLabels = [...histLabels, ...futureLabels];
  const baseVal = Math.round(fd.pred30 / 30);
  const hist = histLabels.map(() => Math.round(baseVal * (0.8 + Math.random()*0.5)));
  const futureNull = new Array(histLen).fill(null);
  const futureFc = futureLabels.map((_,i) => Math.round(baseVal * (0.9 + 0.2*Math.sin(i/5) + Math.random()*0.15)));
  const upper = futureFc.map(v => v + Math.round(fd.mae * 2));
  const lower = futureFc.map(v => v - Math.round(fd.mae * 2));
  forecastChartInst = new Chart(ctx, {
    data:{
      labels: allLabels,
      datasets:[
        { type:'line', label:'Historical', data:[...hist,...futureNull], borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.07)', tension:0.4, borderWidth:2.5, pointRadius:0, fill:true },
        { type:'line', label:'Forecast', data:[...futureNull,...futureFc], borderColor:'#10b981', borderDash:[5,3], tension:0.4, borderWidth:2, pointRadius:0 },
        { type:'line', label:'Upper CI', data:[...futureNull,...upper], borderColor:'rgba(16,185,129,0.2)', tension:0.4, borderWidth:1, pointRadius:0, fill:'+1', backgroundColor:'rgba(16,185,129,0.05)' },
        { type:'line', label:'Lower CI', data:[...futureNull,...lower], borderColor:'rgba(16,185,129,0.2)', tension:0.4, borderWidth:1, pointRadius:0 },
      ]
    },
    options:{ ...chartDefaults(), plugins:{ ...chartDefaults().plugins, legend:{ display:true, position:'top', labels:{ color:'#9ba3b8', font:{size:11}, boxWidth:24 } } } }
  });
}

function renderForecastMetrics(fd) {
  document.getElementById('forecastMetrics').innerHTML = [
    { label:'Model Accuracy', val:fd.acc+'%', color:'var(--green)' },
    { label:'MAE', val:fd.mae.toFixed(1)+' units', color:'var(--text)' },
    { label:'RMSE', val:fd.rmse.toFixed(1)+' units', color:'var(--text)' },
    { label:'MAPE', val:fd.mape.toFixed(1)+'%', color:'var(--text)' },
    { label:'30-Day Prediction', val:fd.pred30+' units', color:'var(--blue)' },
  ].map(m => `<div class="metric-item"><label>${m.label}</label><span style="color:${m.color}">${m.val}</span></div>`).join('');
}

function renderReorderRec(fd) {
  const reorderQty = Math.max(0, fd.pred30 - fd.stock + 10);
  const risk = Math.min(100, Math.round((1 - fd.stock/fd.pred30)*100));
  document.getElementById('reorderRec').innerHTML = `
    <div class="rec-qty">${reorderQty} units</div>
    <div class="rec-label">Recommended reorder quantity</div>
    <div class="risk-bar">
      <div class="risk-label"><span>Stockout Risk</span><span style="color:${risk>60?'var(--red)':risk>30?'var(--orange)':'var(--green)'}">${risk}%</span></div>
      <div class="risk-track"><div class="risk-fill" style="width:${risk}%"></div></div>
    </div>`;
}

function renderForecastTable() {
  document.getElementById('forecastTableBody').innerHTML = Object.values(FORECAST_DATA).map(fd => {
    const risk = Math.min(100,Math.round((1-fd.stock/fd.pred30)*100));
    const riskBadge = risk>60? '<span class="badge badge-red">High</span>' : risk>30? '<span class="badge badge-orange">Medium</span>' : '<span class="badge badge-green">Low</span>';
    return `<tr>
      <td><span style="font-weight:500">${fd.name}</span></td>
      <td>${fd.stock}</td>
      <td style="font-weight:700;color:var(--blue)">${fd.pred30}</td>
      <td>${riskBadge}</td>
      <td><span style="color:var(--green);font-weight:600">${Math.max(0,fd.pred30-fd.stock+10)} units</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:4px;background:var(--surface2);border-radius:999px"><div style="width:${fd.acc}%;height:100%;background:var(--green);border-radius:999px"></div></div>
          <span style="font-size:0.82rem;color:var(--text2)">${fd.acc}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ======= ALERTS =======
const ALERTS = [
  { id:1, type:'critical', title:'Out of Stock: Monitor Arm', desc:'SKU MA-DSK-005 has 0 units. Immediate reorder required.', time:'5 min ago', icon:'⚠' },
  { id:2, type:'critical', title:'Critical Low: Wireless Mouse', desc:'Only 3 units remain. Below critical threshold of 5.', time:'12 min ago', icon:'⚠' },
  { id:3, type:'warning', title:'Low Stock: USB-C Charger 65W', desc:'5 units remain, reorder level is 10. Forecast shows high demand.', time:'30 min ago', icon:'◉' },
  { id:4, type:'warning', title:'Demand Spike Detected', desc:'Bluetooth Speaker demand 35% above ML forecast this week.', time:'1 hour ago', icon:'↑' },
  { id:5, type:'info', title:'ML Model Retrained', desc:'Prophet seasonal model updated. Accuracy improved by 1.2%.', time:'2 hours ago', icon:'ℹ' },
];

const NOTIF_HISTORY = [
  { type:'resolved', title:'Laptop Stand Restocked', desc:'50 units received from ErgoDesign supplier.', time:'Yesterday, 14:32', icon:'✓' },
  { type:'resolved', title:'Auto PO Created', desc:'Purchase order #PO-2024-089 sent to PowerCore Inc.', time:'Yesterday, 11:15', icon:'✓' },
  { type:'info', title:'Weekly Report Generated', desc:'Inventory report for Week 15 is ready for download.', time:'Mon, 09:00', icon:'ℹ' },
];

function initAlerts() {
  renderAlerts();
  renderAlertSummary();
}

function renderAlerts() {
  document.getElementById('alertsList').innerHTML = ALERTS.map(a => `
    <div class="alert-item ${a.type}" id="alert-${a.id}">
      <div class="alert-icon">${a.icon}</div>
      <div class="alert-content">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.desc}</div>
        <div class="alert-time">${a.time}</div>
      </div>
      <div class="alert-actions">
        <button class="btn-ghost sm" onclick="resolveAlert(${a.id})">Resolve</button>
      </div>
    </div>`).join('');
  document.getElementById('notifHistory').innerHTML = NOTIF_HISTORY.map(n => `
    <div class="alert-item ${n.type}">
      <div class="alert-icon">${n.icon}</div>
      <div class="alert-content">
        <div class="alert-title">${n.title}</div>
        <div class="alert-desc">${n.desc}</div>
        <div class="alert-time">${n.time}</div>
      </div>
    </div>`).join('');
}

function renderAlertSummary() {
  document.getElementById('alertSummary').innerHTML = [
    { label:'Critical', val:2, cls:'red' },
    { label:'Warnings', val:2, cls:'orange' },
    { label:'Info', val:1, cls:'blue' },
    { label:'Resolved', val:3, cls:'green' },
  ].map(s => `<div class="as-item ${s.cls}"><span>${s.val}</span><small>${s.label}</small></div>`).join('');
}

function resolveAlert(id) {
  const el = document.getElementById('alert-' + id);
  if (el) { el.style.opacity='0'; setTimeout(()=>el.remove(),300); showToast('Alert marked as resolved'); }
}

function clearAlerts() {
  document.getElementById('alertsList').innerHTML = '<div style="color:var(--text3);padding:20px;text-align:center">No active alerts</div>';
  showToast('All alerts cleared');
}

function updateThresholdLabel(el, labelId) {
  document.getElementById(labelId).textContent = el.value + ' units';
}

// ======= REPORTS =======
let reportChartsInited = false;

function showReport(name, btn) {
  document.querySelectorAll('.report-content').forEach(r => r.classList.remove('active'));
  document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
  document.getElementById('report-' + name).classList.add('active');
  btn.classList.add('active');
}

function initReportCharts() {
  if (reportChartsInited) return;
  reportChartsInited = true;
  initRevenueChart();
  initTopProductsChart();
  initTurnoverChart();
  renderTurnoverTable();
  initSupplierChart();
  initLeadTimeChart();
  initMLAccuracyChart();
  renderMLInsights();
}

function initRevenueChart() {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  const months = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  new Chart(ctx, {
    data:{ labels:months, datasets:[
      { type:'bar', label:'Revenue ($K)', data:[210,245,198,260,240,275,284], backgroundColor:'rgba(59,130,246,0.6)', borderRadius:6 },
      { type:'line', label:'Orders', data:[420,510,389,540,480,550,580], borderColor:'#10b981', tension:0.4, yAxisID:'y2', borderWidth:2.5, pointRadius:0 }
    ]},
    options:{ ...chartDefaults(), scales:{ ...chartDefaults().scales, y2:{ type:'linear', display:true, position:'right', grid:{drawOnChartArea:false}, ticks:{color:'#9ba3b8'} } }, plugins:{ ...chartDefaults().plugins, legend:{ display:true, position:'top', labels:{ color:'#9ba3b8', font:{size:11}, boxWidth:24 } } } }
  });
}

function initTopProductsChart() {
  const ctx = document.getElementById('topProductsChart').getContext('2d');
  new Chart(ctx, {
    type:'bar',
    data:{ labels:['Mech. Keyboard','Bluetooth Spkr','Laptop Stand','USB-C Charger','Wireless Mouse'], datasets:[{ data:[89,72,58,54,41], backgroundColor:['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'], borderRadius:6 }] },
    options:{ ...chartDefaults(), indexAxis:'y', plugins:{ ...chartDefaults().plugins, legend:{display:false} } }
  });
}

function initTurnoverChart() {
  const ctx = document.getElementById('turnoverChart').getContext('2d');
  const months = ['Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  new Chart(ctx, {
    type:'line',
    data:{ labels:months, datasets:[
      { label:'Electronics', data:[8.2,8.8,9.1,8.6,9.3,9.8,10.1], borderColor:'#3b82f6', tension:0.4, borderWidth:2.5, pointRadius:3, fill:false },
      { label:'Accessories', data:[6.1,6.4,7.0,6.8,7.2,7.6,7.9], borderColor:'#10b981', tension:0.4, borderWidth:2.5, pointRadius:3, fill:false },
      { label:'Furniture', data:[4.2,4.0,4.5,4.3,4.8,5.0,5.2], borderColor:'#f59e0b', tension:0.4, borderWidth:2.5, pointRadius:3, fill:false },
    ]},
    options:{ ...chartDefaults(), plugins:{ ...chartDefaults().plugins, legend:{ display:true, position:'top', labels:{ color:'#9ba3b8', font:{size:11}, boxWidth:24 } } } }
  });
}

function renderTurnoverTable() {
  const rows = [
    { name:'Bluetooth Speaker', cogs:5840, avg:720, turnover:8.1, dsi:45 },
    { name:'Mechanical Keyboard', cogs:4940, avg:520, turnover:9.5, dsi:38 },
    { name:'Laptop Stand', cogs:3200, avg:480, turnover:6.7, dsi:54 },
    { name:'USB-C Charger', cogs:6200, avg:890, turnover:7.0, dsi:52 },
    { name:'Wireless Mouse', cogs:4100, avg:380, turnover:10.8, dsi:34 },
  ];
  document.getElementById('turnoverTableBody').innerHTML = rows.map(r => `
    <tr>
      <td><span style="font-weight:500">${r.name}</span></td>
      <td>$${r.cogs.toLocaleString()}</td>
      <td>$${r.avg.toLocaleString()}</td>
      <td style="font-weight:700;color:var(--blue)">${r.turnover}×</td>
      <td>${r.dsi} days</td>
      <td><span class="badge ${r.turnover>9?'badge-green':r.turnover>7?'badge-blue':'badge-orange'}">${r.turnover>9?'Excellent':r.turnover>7?'Good':'Average'}</span></td>
    </tr>`).join('');
}

function initSupplierChart() {
  const ctx = document.getElementById('supplierChart').getContext('2d');
  new Chart(ctx, {
    type:'radar',
    data:{ labels:['On-Time','Quality','Price','Flexibility','Support'], datasets:[
      { label:'ErgoDesign', data:[92,88,75,80,90], borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.1)', pointBackgroundColor:'#3b82f6' },
      { label:'PeriphTech', data:[85,92,80,70,78], borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', pointBackgroundColor:'#10b981' },
      { label:'PowerCore', data:[78,80,90,85,72], borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.1)', pointBackgroundColor:'#f59e0b' },
    ]},
    options:{ plugins:{ legend:{ display:true, labels:{ color:'#9ba3b8', font:{size:11} } } }, scales:{ r:{ grid:{color:'rgba(255,255,255,0.07)'}, ticks:{color:'#5e6680',backdropColor:'transparent'}, pointLabels:{color:'#9ba3b8'}, angleLines:{color:'rgba(255,255,255,0.07)'}, suggestedMin:60, suggestedMax:100 } } }
  });
}

function initLeadTimeChart() {
  const ctx = document.getElementById('leadTimeChart').getContext('2d');
  new Chart(ctx, {
    type:'bar',
    data:{ labels:['ErgoDesign','PeriphTech','PowerCore Inc','SoundTech','DeskPro'], datasets:[{ label:'Avg Lead Days', data:[3.8,5.2,6.1,4.4,7.0], backgroundColor:['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'], borderRadius:6 }] },
    options:{ ...chartDefaults(), plugins:{ ...chartDefaults().plugins, legend:{display:false} }, scales:{ ...chartDefaults().scales, y:{ ...chartDefaults().scales.y, title:{ display:true, text:'Days', color:'#9ba3b8' } } } }
  });
}

function initMLAccuracyChart() {
  const ctx = document.getElementById('mlAccuracyChart').getContext('2d');
  const weeks = ['W10','W11','W12','W13','W14','W15','W16'];
  new Chart(ctx, {
    type:'line',
    data:{ labels:weeks, datasets:[
      { label:'LSTM', data:[96.1,96.8,97.2,97.0,97.9,98.1,98.4], borderColor:'#3b82f6', tension:0.4, borderWidth:2.5, pointRadius:4, fill:false },
      { label:'ARIMA', data:[92.4,92.8,93.1,93.5,93.8,94.0,94.1], borderColor:'#8b5cf6', tension:0.4, borderWidth:2, pointRadius:4, fill:false },
      { label:'Ensemble', data:[96.8,97.3,97.8,97.6,98.2,98.5,98.7], borderColor:'#10b981', tension:0.4, borderWidth:2.5, pointRadius:4, fill:false },
    ]},
    options:{ ...chartDefaults(), plugins:{ ...chartDefaults().plugins, legend:{ display:true, position:'top', labels:{ color:'#9ba3b8', font:{size:11}, boxWidth:24 } } } }
  });
}

function renderMLInsights() {
  const insights = [
    { title:'Ensemble Model', val:'98.7%', sub:'Overall accuracy this week', color:'var(--green)' },
    { title:'Predictions Made', val:'1,248', sub:'Across all SKUs (7-day)', color:'var(--blue)' },
    { title:'Anomalies Detected', val:'7', sub:'Unusual demand patterns', color:'var(--orange)' },
    { title:'Auto Reorders Triggered', val:'12', sub:'Based on ML forecasts', color:'var(--purple)' },
    { title:'Cost Saved (Est.)', val:'$18,400', sub:'Optimized stock levels', color:'var(--green)' },
    { title:'Next Training Cycle', val:'2 days', sub:'Weekly retraining schedule', color:'var(--text2)' },
  ];
  document.getElementById('mlInsightsGrid').innerHTML = insights.map(i => `
    <div class="ml-insight-card">
      <h4>${i.title}</h4>
      <div class="mli-val" style="color:${i.color}">${i.val}</div>
      <div class="mli-sub">${i.sub}</div>
    </div>`).join('');
}

// ======= CHART DEFAULTS =======
function chartDefaults() {
  return {
    responsive:true,
    maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#1e2330', titleColor:'#eef0f6', bodyColor:'#9ba3b8', borderColor:'rgba(255,255,255,0.1)', borderWidth:1, padding:12 } },
    scales:{
      x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#9ba3b8',font:{size:11}} },
      y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#9ba3b8',font:{size:11}} }
    }
  };
}

// ======= INIT =======
window.addEventListener('DOMContentLoaded', () => {
  initOverview();
  renderUserTable();
  renderInventoryTable();
  initAlerts();
});

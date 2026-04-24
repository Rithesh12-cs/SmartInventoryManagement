// ======= IMPORTS FROM MODULES =======
// api.js: USERS, PRODUCTS, FORECAST_DATA, ALERTS, NOTIF_HISTORY
// ui.js: UI utilities, chart functions, page navigation
// auth.js: User management functions

// ======= MODULE REFERENCES =======
// This file integrates all modules and contains inventory, forecast, alerts, and reports logic

// ======= CHART INSTANCES =======
let forecastChartInst;

// ======= INVENTORY MANAGEMENT =======
let filteredProducts = [...PRODUCTS];

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

let currentUser = null;

async function fetchCurrentUser() {
  try {
    const response = await fetch('/current-user');
    if (!response.ok) return null;
    const payload = await response.json();
    currentUser = payload.user;
    AUTH.user = payload.user;  // Set AUTH.user for consistency
    showManagerUploadSection();
    updateUserDisplay();  // Update the sidebar profile
    if (currentUser) {
      document.querySelectorAll('.user-role-badge').forEach(el => { el.textContent = currentUser.role; });
    }
    return currentUser;
  } catch (error) {
    console.error('Unable to load current user', error);
    return null;
  }
}

function showManagerUploadSection() {
  const uploadSection = document.getElementById('managerUploadSection');
  if (!uploadSection) return;
  uploadSection.style.display = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin') ? 'block' : 'none';
}

function renderPredictionOutput(result) {
  const body = document.getElementById('predictionOutputBody');
  if (!body) return;
  if (!result) {
    body.innerHTML = '<tr><td colspan="3" style="color:var(--text3);text-align:center">Upload CSV to generate predictions</td></tr>';
    return;
  }
  body.innerHTML = `
    <tr><td>ARIMA</td><td>${result.summary.arima_first.toFixed(1)}</td><td>${result.summary.arima_total.toFixed(1)}</td></tr>
    <tr><td>Prophet</td><td>${result.summary.prophet_first.toFixed(1)}</td><td>${result.summary.prophet_total.toFixed(1)}</td></tr>
  `;
}

function renderResultsTable(results) {
  const body = document.getElementById('resultsTableBody');
  if (!body) return;
  if (!results || !results.length) {
    body.innerHTML = '<tr><td colspan="6" style="color:var(--text3);text-align:center">No prediction results available yet.</td></tr>';
    return;
  }
  body.innerHTML = results.map(r => `
    <tr>
      <td>${new Date(r.created_at).toLocaleString()}</td>
      <td>${r.user_email}</td>
      <td>${r.horizon}d</td>
      <td>${r.arima_total ? r.arima_total.toFixed(1) : '—'}</td>
      <td>${r.prophet_total ? r.prophet_total.toFixed(1) : '—'}</td>
      <td>${r.uploaded_file || 'CSV upload'}</td>
    </tr>
  `).join('');
}

async function submitCsv() {
  const fileInput = document.getElementById('csvFile');
  const horizonSelect = document.getElementById('predictionHorizon');
  const status = document.getElementById('uploadStatus');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('Please select a CSV file before predicting.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const horizon = parseInt(horizonSelect.value || '30', 10);
  status.textContent = 'Uploading CSV and running models...';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const uploadResp = await fetch('/api/upload', { method: 'POST', body: formData });
    const uploadData = await uploadResp.json();
    if (!uploadResp.ok) {
      status.textContent = uploadData.message || 'Upload failed';
      return;
    }

    const predictResp = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadData.upload_id, horizon })
    });
    const predictData = await predictResp.json();
    if (!predictResp.ok) {
      status.textContent = predictData.message || 'Prediction failed';
      return;
    }

    status.textContent = `Predictions generated for ${horizon} days.`;
    renderPredictionOutput(predictData.result);
    fetchResults();
  } catch (error) {
    status.textContent = 'Unable to submit CSV. Please try again.';
    console.error('Prediction error', error);
  }
}

async function fetchResults() {
  try {
    const response = await fetch('/results');
    if (!response.ok) throw new Error('Unable to load results');
    const results = await response.json();
    renderResultsTable(results);
  } catch (error) {
    console.error('Failed to fetch results', error);
  }
}

// ======= FORECAST =======

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
      { label:'ARIMA', data:[92.4,92.8,93.1,93.5,93.8,94.0,94.1], borderColor:'#8b5cf6', tension:0.4, borderWidth:2, pointRadius:4, fill:false },
      { label:'Prophet', data:[94.2,94.5,94.9,95.1,95.4,95.7,95.9], borderColor:'#10b981', tension:0.4, borderWidth:2.5, pointRadius:4, fill:false },
    ]},
    options:{ ...chartDefaults(), plugins:{ ...chartDefaults().plugins, legend:{ display:true, position:'top', labels:{ color:'#9ba3b8', font:{size:11}, boxWidth:24 } } } }
  });
}

function renderMLInsights() {
  const insights = [
    { title:'Prophet Model', val:'95.9%', sub:'Latest weekly accuracy', color:'var(--green)' },
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


// ======= INITIALIZATION =======
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize data from MongoDB
  const dataLoaded = await initializeDataFromMongoDB();
  await fetchCurrentUser();
  await fetchResults();
  
  if (dataLoaded) {
    initOverview();
    renderUserTable();
    renderInventoryTable();
    initAlerts();
  } else {
    showToast('Error loading data from MongoDB', 'error');
  }
});

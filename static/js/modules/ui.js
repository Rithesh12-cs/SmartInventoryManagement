// ======= UI UTILITIES =======
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

function showToast(msg, type='success') {
  const icons = { success:'✓', error:'✕', info:'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="toast-icon">${icons[type]||'ℹ'}</div><span class="toast-msg">${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

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

// ======= MODALS & HELPER FUNCTIONS =======
function updateThresholdLabel(el, labelId) {
  document.getElementById(labelId).textContent = el.value + ' units';
}

function showReport(name, btn) {
  document.querySelectorAll('.report-content').forEach(r => r.classList.remove('active'));
  document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
  document.getElementById('report-' + name).classList.add('active');
  btn.classList.add('active');
}

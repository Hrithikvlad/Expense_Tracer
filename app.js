// Simple Expense Tracker - separated JS
const LS_KEY = 'et_expenses_v1';
let expenses = JSON.parse(localStorage.getItem(LS_KEY) || '[]');

// DOM refs
const $ = id => document.getElementById(id);
const expenseForm = $('expenseForm');
const titleInput = $('title');
const amountInput = $('amount');
const categoryInput = $('category');
const dateInput = $('date');
const expensesList = $('expensesList');
const totalBalance = $('totalBalance');
const totalSpent = $('totalSpent');
const thisMonth = $('thisMonth');
const monthFilter = $('monthFilter');
const searchInput = $('search');
const exportBtn = $('exportBtn');
const clearAllBtn = $('clearAll');
const resetFormBtn = $('resetForm');
const addSampleBtn = $('addSample');

const catCtx = $('catChart') ? $('catChart').getContext('2d') : null;
const monthCtx = $('monthChart') ? $('monthChart').getContext('2d') : null;
let catChart, monthChart;

const CATEGORY_LIST = ['Food','Transport','Shopping','Bills','Other'];

function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(expenses)); }catch(e){ console.warn('Could not save to localStorage', e); } }
function uid(){ return Math.random().toString(36).slice(2,9); }
function formatCurrency(n){ return '₹' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

// safe escape
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// init date
if(dateInput) dateInput.valueAsDate = new Date();

// populate months safely
(function populateMonths(){
  if(!monthFilter) return;
  const now = new Date();
  for(let i=0;i<12;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const val = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = d.toLocaleString(undefined,{month:'short',year:'numeric'});
    monthFilter.appendChild(opt);
  }
})();

// category color
function generatePalette(n){ const base = ['#06b6d4','#7c3aed','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef7ac7']; const out=[]; for(let i=0;i<n;i++) out.push(base[i%base.length]); return out; }
function categoryColor(cat){ const palette = generatePalette(CATEGORY_LIST.length); const idx = Math.max(0, CATEGORY_LIST.indexOf(cat)); return palette[idx % palette.length]; }

// render
function render(){
  try{
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const mf = monthFilter ? monthFilter.value : 'all';
    if(expensesList) expensesList.innerHTML = '';

    const filtered = expenses.filter(exp=>{
      if(mf !== 'all'){
        const [y,m] = mf.split('-');
        const ed = new Date(exp.date);
        if(ed.getFullYear() != y || (ed.getMonth()+1) != m) return false;
      }
      if(!q) return true;
      return (exp.title||'').toLowerCase().includes(q) || (exp.category||'').toLowerCase().includes(q);
    }).sort((a,b)=> new Date(b.date) - new Date(a.date));

    if(filtered.length===0 && expensesList) expensesList.innerHTML = '<p style="color:var(--muted)">No expenses yet.</p>';

    filtered.forEach(exp=>{
      const item = document.createElement('div'); item.className='expense-item';
      item.innerHTML = `
        <div class="exp-left">
          <div class="chip">${escapeHtml(exp.category || 'Other')}</div>
          <div>
            <div class="title">${escapeHtml(exp.title)}</div>
            <div class="meta">${new Date(exp.date).toLocaleDateString()} • ${escapeHtml(exp.category || 'Other')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center">
          <div style="text-align:right;margin-right:12px">
            <div style="font-weight:700" class="amt">${formatCurrency(exp.amount)}</div>
          </div>
          <div class="actions">
            <button title="Edit" onclick="editItem('${exp.id}')">✏️</button>
            <button title="Delete" onclick="deleteItem('${exp.id}')">🗑️</button>
          </div>
        </div>
      `;
      if(expensesList) expensesList.appendChild(item);
      const chip = item.querySelector('.chip'); if(chip) { chip.style.background = categoryColor(exp.category); chip.style.color='#021022'; }
    });

    // summaries
    const total = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    if($('totalSpent')) $('totalSpent').textContent = formatCurrency(total);
    const bal = 0 - total;
    if($('totalBalance')) { $('totalBalance').textContent = formatCurrency(bal); $('totalBalance').className = bal < 0 ? 'neg' : 'pos'; }

    // this month
    const now = new Date();
    const thisMonthVal = expenses.filter(e=>{ const d=new Date(e.date); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() }).reduce((s,e)=>s+Number(e.amount||0),0);
    if($('thisMonth')) $('thisMonth').textContent = formatCurrency(thisMonthVal || 0);

    // charts (guarded)
    try{ renderCategoryChart(); }catch(e){ console.warn('Category chart skipped',e); }
    try{ renderMonthlyChart(); }catch(e){ console.warn('Monthly chart skipped',e); }

  }catch(err){
    console.error('Render error', err);
  }
}

// add expense
if(expenseForm){
  expenseForm.addEventListener('submit', e=>{
    e.preventDefault();
    const title = titleInput ? titleInput.value.trim() : '';
    const amount = amountInput ? parseFloat(amountInput.value) : NaN;
    const category = categoryInput ? categoryInput.value : 'Other';
    const date = dateInput ? dateInput.value : (new Date()).toISOString().slice(0,10);
    if(!title || isNaN(amount) || !date) return alert('Please fill valid data');
    expenses.push({id: uid(), title, amount: Math.abs(amount), category, date});
    save(); if(expenseForm) expenseForm.reset(); if(dateInput) dateInput.valueAsDate = new Date(); render();
  });
}

if(resetFormBtn) resetFormBtn.addEventListener('click', ()=>{ if(expenseForm) expenseForm.reset(); if(dateInput) dateInput.valueAsDate = new Date(); });

window.editItem = function(id){
  const it = expenses.find(x=>x.id===id); if(!it) return;
  if(titleInput) titleInput.value = it.title;
  if(amountInput) amountInput.value = it.amount;
  if(categoryInput) categoryInput.value = it.category;
  if(dateInput) dateInput.value = it.date;
  expenses = expenses.filter(x=>x.id!==id);
  save(); render();
}

window.deleteItem = function(id){ if(!confirm('Delete this expense?')) return; expenses = expenses.filter(x=>x.id!==id); save(); render(); }

if(clearAllBtn) clearAllBtn.addEventListener('click', ()=>{ if(!confirm('Clear all expenses? This cannot be undone.')) return; expenses=[]; save(); render(); });

if(exportBtn) exportBtn.addEventListener('click', ()=>{
  if(!expenses || expenses.length===0) return alert('No data to export');
  const csv = ['id,title,amount,category,date', ...expenses.map(e=>`${e.id},"${(e.title||'').replace(/"/g,'""')}",${e.amount},${e.category},${e.date}`)].join('\n');
  const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='expenses.csv'; a.click(); URL.revokeObjectURL(url);
});

// sample data
if(addSampleBtn){
  addSampleBtn.addEventListener('click', ()=>{ const sample=[{id:uid(),title:'Grocery',amount:520,category:'Food',date:daysAgo(2)},{id:uid(),title:'Bus pass',amount:120,category:'Transport',date:daysAgo(10)},{id:uid(),title:'Electricity bill',amount:980,category:'Bills',date:daysAgo(25)},{id:uid(),title:'Shoes',amount:2400,category:'Shopping',date:daysAgo(40)},{id:uid(),title:'Coffee',amount:80,category:'Food',date:daysAgo(5)}]; expenses = expenses.concat(sample); save(); render(); });
}
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }


if(searchInput) searchInput.addEventListener('input', ()=>render());
if(monthFilter) monthFilter.addEventListener('change', ()=>render());


function renderCategoryChart(){
  if(!catCtx || typeof Chart === 'undefined') return;
  const start = new Date(); start.setMonth(start.getMonth()-5); start.setDate(1);
  const sums = {};
  expenses.forEach(e=>{ const d = new Date(e.date); if(d < start) return; sums[e.category] = (sums[e.category]||0) + Number(e.amount||0); });
  const labels = Object.keys(sums); const data = labels.map(l=>sums[l]);
  try{ if(catChart) catChart.destroy(); catChart = new Chart(catCtx,{ type:'doughnut', data:{labels, datasets:[{data, backgroundColor:generatePalette(labels.length)}]}, options:{plugins:{legend:{position:'bottom',labels:{color:'#cfeaf8'}}}} }); }catch(e){ console.warn('Could not render category chart',e); }
}

function renderMonthlyChart(){
  if(!monthCtx || typeof Chart === 'undefined') return;
  const months = getLastMonths(6); const labels = months.map(m=>m.label);
  const data = months.map(m=> expenses.filter(e=>{const d=new Date(e.date); return d.getFullYear()===m.year && d.getMonth()===m.month}).reduce((s,e)=>s+Number(e.amount||0),0));
  try{ if(monthChart) monthChart.destroy(); monthChart = new Chart(monthCtx,{ type:'bar', data:{labels, datasets:[{label:'Spent',data, backgroundColor:generatePalette(data.length)}]}, options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}} }); }catch(e){ console.warn('Could not render monthly chart',e); }
}

function getLastMonths(n){ const arr=[]; const now=new Date(); for(let i=n-1;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i,1); arr.push({year:d.getFullYear(),month:d.getMonth(),label:d.toLocaleString(undefined,{month:'short',year:'numeric'})}); } return arr; }


render();

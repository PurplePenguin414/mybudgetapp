const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  accounts: [],
  totalChart: null,
  acctChart: null
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

async function checkSession() {
  const res = await fetch('/api/session');
  const data = await res.json();
  if (!data.loggedIn) {
    window.location.href = 'index.html';
    return;
  }
  init();
}

document.getElementById('prev-month').addEventListener('click', () => {
  state.month--;
  if (state.month < 1) { state.month = 12; state.year--; }
  refreshMonth();
});
document.getElementById('next-month').addEventListener('click', () => {
  state.month++;
  if (state.month > 12) { state.month = 1; state.year++; }
  refreshMonth();
});

function renderMonthLabel() {
  document.getElementById('month-label').textContent = `${MONTH_NAMES[state.month - 1]} ${state.year}`;
}

document.getElementById('add-acct-link').addEventListener('click', async () => {
  const name = prompt('New account name (e.g. lender or plan name):');
  if (!name || !name.trim()) return;
  const type = prompt('Account type (e.g. "traditional", "roth") — optional:') || null;
  const res = await fetch('/api/retirement/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), account_type: type })
  });
  if (res.ok) {
    refreshMonth();
    loadTrend();
  } else {
    const err = await res.json();
    alert(err.error || 'Could not add account');
  }
});

async function refreshMonth() {
  renderMonthLabel();
  const res = await fetch(`/api/retirement/balances/${state.year}/${state.month}`);
  const data = await res.json();
  state.accounts = data.accounts;
  renderAccountList(data.accounts);
  await renderMetrics(data.accounts);
}

function renderAccountList(accounts) {
  const container = document.getElementById('acct-list');
  if (accounts.length === 0) {
    container.innerHTML = '<div class="empty-msg">No accounts added yet.</div>';
    return;
  }
  container.innerHTML = accounts
    .map(
      (a) => `
    <div class="acct-row">
      <div class="acct-name">
        <div class="name">${a.name}</div>
        ${a.account_type ? `<div class="type">${a.account_type}</div>` : ''}
      </div>
      <div class="acct-input-wrap">
        <span>balance $</span>
        <input type="number" step="0.01" min="0" data-field="balance" data-account-id="${a.account_id}" value="${a.balance !== null ? a.balance : ''}" placeholder="balance" />
      </div>
      <div class="acct-input-wrap">
        <span>you $</span>
        <input type="number" step="0.01" min="0" data-field="contribution" data-account-id="${a.account_id}" value="${a.contribution !== null && a.contribution !== undefined ? a.contribution : ''}" placeholder="optional" />
      </div>
      <div class="acct-input-wrap">
        <span>employer $</span>
        <input type="number" step="0.01" min="0" data-field="employer_contribution" data-account-id="${a.account_id}" value="${a.employer_contribution !== null && a.employer_contribution !== undefined ? a.employer_contribution : ''}" placeholder="optional" />
      </div>
      <span class="save-hint" id="hint-${a.account_id}">saved</span>
    </div>`
    )
    .join('');

  container.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', async () => {
      const accountId = input.dataset.accountId;

      const balanceInput = container.querySelector(`input[data-field="balance"][data-account-id="${accountId}"]`);
      const contribInput = container.querySelector(`input[data-field="contribution"][data-account-id="${accountId}"]`);
      const employerInput = container.querySelector(`input[data-field="employer_contribution"][data-account-id="${accountId}"]`);

      const balance = parseFloat(balanceInput.value);
      if (isNaN(balance) || balance < 0) return;
      const contribRaw = contribInput.value;
      const contribution = contribRaw === '' ? null : parseFloat(contribRaw);
      const employerRaw = employerInput.value;
      const employer_contribution = employerRaw === '' ? null : parseFloat(employerRaw);

      await fetch('/api/retirement/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, year: state.year, month: state.month, balance, contribution, employer_contribution })
      });

      const hint = document.getElementById(`hint-${accountId}`);
      hint.classList.add('show');
      setTimeout(() => hint.classList.remove('show'), 1500);

      state.accounts = state.accounts.map((a) =>
        a.account_id == accountId ? { ...a, balance, contribution, employer_contribution } : a
      );
      await renderMetrics(state.accounts);
      loadTrend();
    });
  });
}

async function renderMetrics(accounts) {
  const logged = accounts.filter((a) => a.balance !== null && a.balance !== undefined);
  const total = logged.reduce((s, a) => s + a.balance, 0);
  const yourContrib = accounts.reduce((s, a) => s + (a.contribution || 0), 0);
  const employerContrib = accounts.reduce((s, a) => s + (a.employer_contribution || 0), 0);

  document.getElementById('r-total').textContent = fmt(total);
  document.getElementById('r-count').textContent = `${logged.length} / ${accounts.length}`;
  document.getElementById('r-contrib').textContent = `${fmt(yourContrib)} + ${fmt(employerContrib)}`;

  const trendRes = await fetch('/api/retirement/trend');
  const trend = await trendRes.json();
  const curKey = `${state.year}-${String(state.month).padStart(2, '0')}`;
  const priorMonths = trend.months.filter((m) => m.key < curKey);
  const changeEl = document.getElementById('r-change');

  if (priorMonths.length === 0 || logged.length === 0) {
    changeEl.textContent = '—';
    changeEl.className = 'metric-value';
  } else {
    const prevTotal = priorMonths[priorMonths.length - 1].total;
    const change = total - prevTotal;
    changeEl.textContent = (change >= 0 ? '+' : '−') + fmt(Math.abs(change));
    changeEl.className = 'metric-value ' + (change >= 0 ? 'v-green' : 'v-red');
  }
}

async function loadTrend() {
  const res = await fetch('/api/retirement/trend');
  const data = await res.json();
  renderTotalChart(data.months);
  renderAccountSelect(data.byAccount);
}

function renderTotalChart(months) {
  const labels = months.map((m) => {
    const [y, mo] = m.key.split('-');
    return `${MONTH_NAMES[parseInt(mo, 10) - 1].slice(0, 3)} ${y.slice(2)}`;
  });
  const totals = months.map((m) => m.total);

  const ctx = document.getElementById('total-retirement-chart').getContext('2d');
  if (state.totalChart) state.totalChart.destroy();
  state.totalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total retirement',
        data: totals,
        borderColor: '#2a8a5f',
        backgroundColor: 'rgba(42,138,95,0.15)',
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (v) => '$' + v } },
        x: { ticks: { font: { family: 'DM Mono', size: 10 } } }
      }
    }
  });
}

function renderAccountSelect(byAccount) {
  const sel = document.getElementById('acct-trend-select');
  const names = Object.keys(byAccount);
  const prev = sel.value;
  sel.innerHTML = names.map((n) => `<option value="${n}">${n}</option>`).join('');
  if (names.length === 0) {
    document.getElementById('acct-trend-chart').style.display = 'none';
    return;
  }
  document.getElementById('acct-trend-chart').style.display = 'block';
  sel.value = names.includes(prev) ? prev : names[0];
  renderAccountChart(byAccount, sel.value);
  sel.onchange = () => renderAccountChart(byAccount, sel.value);
}

function renderAccountChart(byAccount, name) {
  const monthMap = byAccount[name] || {};
  const keys = Object.keys(monthMap).sort();
  const labels = keys.map((k) => {
    const [y, m] = k.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1].slice(0, 3)} ${y.slice(2)}`;
  });
  const values = keys.map((k) => monthMap[k]);

  const ctx = document.getElementById('acct-trend-chart').getContext('2d');
  if (state.acctChart) state.acctChart.destroy();
  state.acctChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: name,
        data: values,
        borderColor: '#2761a0',
        backgroundColor: 'rgba(39,97,160,0.15)',
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: (v) => '$' + v } } }
    }
  });
}

async function init() {
  await refreshMonth();
  await loadTrend();
}

checkSession();

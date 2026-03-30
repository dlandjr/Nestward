// ── Main Run Loop ──
function run() {
  const sal = gv('gSalary');
  const status = gsel('gFiling');
  const state = gsel('gState') || 'No state tax';
  const stateR = (STATES[state] || {})[status === 'married' ? 'm' : 's'] || 0;
  const fe = effectiveFedRate(sal, status);
  const fica = 0.0765;

  document.getElementById('taxInfo').innerHTML =
    `<strong>Tax estimate</strong> &nbsp;·&nbsp; ` +
    `Federal effective: <strong>${(fe * 100).toFixed(1)}%</strong> &nbsp;·&nbsp; ` +
    `State (${state === 'No state tax' ? 'none' : state}): <strong>${(stateR * 100).toFixed(1)}%</strong> &nbsp;·&nbsp; ` +
    `FICA: <strong>7.65%</strong> &nbsp;·&nbsp; ` +
    `Combined: <strong>${((fe + stateR + fica) * 100).toFixed(1)}%</strong><br>` +
    `<span style="font-size:11px;opacity:0.65;font-style:italic">Pre-tax contributions go in at full value; post-tax are reduced by effective rate. Approximate only.</span>`;

  const expIdx = accounts.length;
  const combIdx = accounts.length + 1;

  if (activeTab < accounts.length) {
    renderAccountCharts(activeTab);
  } else if (activeTab === expIdx) {
    renderExpPanel();
  } else {
    runComb();
  }
}

// ── Init ──
function init() {
  populateStates();
  renderTabs();

  // Attach listeners to all global inputs
  document.querySelectorAll('input:not(.acct-name-input), select').forEach(el => {
    if (['gState', 'gFiling'].includes(el.id)) return; // already handled by onchange
    el.addEventListener('input', run);
  });

  run();
}

document.addEventListener('DOMContentLoaded', init);

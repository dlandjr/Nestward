// ── Chart Registry ──
let chartMap = {};

function dChart(key) {
  if (chartMap[key]) { chartMap[key].destroy(); delete chartMap[key]; }
}

function bScales() {
  return {
    x: { ticks: { maxTicksLimit: 12, color: '#9a9a94', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
    y: { ticks: { color: '#9a9a94', font: { size: 11 }, callback: v => fmt(v) }, grid: { color: 'rgba(0,0,0,0.06)' } }
  };
}

// ── Account Charts ──
function renderAccountCharts(i) {
  const a = accounts[i];
  const low  = (a.gLow  ?? 4) / 100;
  const high = (a.gHigh ?? 10) / 100;
  const avg  = (low + high) / 2;
  const yrs = getYears(), sy = getStartYear();
  const labels = Array.from({ length: yrs + 1 }, (_, y) => String(sy + y));

  const dL = simAccount(a, low);
  const dA = simAccount(a, avg);
  const dH = simAccount(a, high);

  const lp = (low * 100).toFixed(1) + '%';
  const ap = (avg * 100).toFixed(1) + '%';
  const hp = (high * 100).toFixed(1) + '%';
  const ey = getEndYear();
  const col = a.color;
  const v = acctViews[i] || 'nominal';
  const tt = c => ' ' + c.dataset.label + ': ' + fmt(c.parsed.y);

  // Cap notice
  const cn = document.getElementById('cap-notice-' + i);
  if (cn && a.type === 'roth') {
    const incYrs = dA.capReasons.filter(r => r === 'income').length;
    const phYrs  = dA.capReasons.filter(r => r === 'phaseout').length;
    const limYrs = dA.capReasons.filter(r => r === 'limit').length;
    const parts = [];
    if (incYrs > 0)  parts.push(`zeroed by income limit in ${incYrs} yr${incYrs > 1 ? 's' : ''}`);
    if (phYrs > 0)   parts.push(`phased out in ${phYrs} yr${phYrs > 1 ? 's' : ''}`);
    if (limYrs > 0)  parts.push(`capped at annual limit in ${limYrs} yr${limYrs > 1 ? 's' : ''}`);
    cn.style.display = parts.length > 0 ? 'block' : 'none';
    if (parts.length > 0) cn.textContent = 'Roth contributions: ' + parts.join(' · ') + '.';
  }

  // Metrics
  const mEl = document.getElementById('metrics-' + i);
  if (mEl) mEl.innerHTML = `
    <div class="mc"><div class="ml">Low (${lp})</div><div class="mv">${fmt(dL.nom[yrs])}</div><div class="ms">by ${ey}</div></div>
    <div class="mc"><div class="ml">Average (${ap})</div><div class="mv">${fmt(dA.nom[yrs])}</div><div class="ms">by ${ey}</div></div>
    <div class="mc"><div class="ml">High (${hp})</div><div class="mv">${fmt(dH.nom[yrs])}</div><div class="ms">by ${ey}</div></div>
  `;

  // Balance chart
  dChart('b' + i);
  const c1 = document.getElementById('cb-' + i);
  if (!c1) return;
  const lEl = document.getElementById('leg-' + i);

  if (v === 'nominal') {
    if (lEl) lEl.innerHTML = `
      <span><i style="border-top:2px dashed ${col};background:none"></i> Low (${lp})</span>
      <span><i style="background:${col}"></i> Average (${ap})</span>
      <span><i style="border-top:2px dashed ${col};opacity:.5;background:none"></i> High (${hp})</span>`;
    chartMap['b' + i] = new Chart(c1.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Low (' + lp + ')',  data: dL.nom, borderColor: col, backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2, borderDash: [6, 4] },
        { label: 'Avg (' + ap + ')',  data: dA.nom, borderColor: col, backgroundColor: hexToRgba(col, 0.1), fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2.5 },
        { label: 'High (' + hp + ')', data: dH.nom, borderColor: col, backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 2, borderDash: [2, 3] }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: tt } } }, scales: bScales() }
    });
  } else {
    if (lEl) lEl.innerHTML = `
      <span><i style="background:${hexToRgba(col, .75)}"></i> Contributions</span>
      <span><i style="background:${hexToRgba(col, .35)}"></i> Investment gains</span>`;
    chartMap['b' + i] = new Chart(c1.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Contributions',   data: dA.contrib, backgroundColor: hexToRgba(col, .75), stack: 's' },
        { label: 'Gains',           data: dA.growth,  backgroundColor: hexToRgba(col, .35), stack: 's' }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: tt } } }, scales: { ...bScales(), x: { ...bScales().x, stacked: true }, y: { ...bScales().y, stacked: true } } }
    });
  }

  // Contribution chart
  dChart('c' + i);
  const c2 = document.getElementById('cc-' + i);
  if (!c2) return;

  const capColorFn = r => {
    if (r === 'income')   return 'rgba(163,45,45,0.4)';
    if (r === 'phaseout') return 'rgba(133,79,11,0.7)';
    if (r === 'limit')    return 'rgba(133,79,11,0.85)';
    return hexToRgba(col, .75);
  };
  const bcs = dA.annC.map((_, y) => {
    if (a.type === 'roth') return capColorFn(dA.capReasons[y]);
    return acctSavingsRate(a, sy + y) === 0 ? 'rgba(180,180,180,0.3)' : hexToRgba(col, .75);
  });

  chartMap['c' + i] = new Chart(c2.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Annual contribution', data: dA.annC, backgroundColor: bcs, borderRadius: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: {
        label: c => {
          const r = dA.capReasons[c.dataIndex];
          const note = r === 'income' ? ' (ineligible)' : r === 'phaseout' ? ' (phased out)' : r === 'limit' ? ' (capped)' : '';
          return `  ${fmt(c.parsed.y)}${note}`;
        }
      }}},
      scales: bScales()
    }
  });
}

// ── Combined Charts ──
function runComb() {
  const yrs = getYears(), sy = getStartYear(), py = Math.round(gv('gPeak')) || 9999;
  const ey = getEndYear();
  const labels = Array.from({ length: yrs + 1 }, (_, y) => String(sy + y));
  const v = combView;

  const sims = accounts.map(a => {
    const low = (a.gLow ?? 4) / 100, high = (a.gHigh ?? 10) / 100, avg = (low + high) / 2;
    return { a: simAccount(a, avg), l: simAccount(a, low), h: simAccount(a, high) };
  });

  const cA = Array.from({ length: yrs + 1 }, (_, y) => sims.reduce((s, d) => s + d.a.nom[y], 0));
  const cL = Array.from({ length: yrs + 1 }, (_, y) => sims.reduce((s, d) => s + d.l.nom[y], 0));
  const cH = Array.from({ length: yrs + 1 }, (_, y) => sims.reduce((s, d) => s + d.h.nom[y], 0));

  // Monthly breakdown
  const mbEl = document.getElementById('monthly-bd');
  if (mbEl) mbEl.innerHTML = buildMonthlyHTML();

  // Summary metrics
  const cmEl = document.getElementById('comb-metrics');
  if (cmEl) cmEl.innerHTML = `
    <div class="mc"><div class="ml">Total (low)</div><div class="mv">${fmt(cL[yrs])}</div><div class="ms">by ${ey}</div></div>
    <div class="mc"><div class="ml">Total (avg)</div><div class="mv">${fmt(cA[yrs])}</div><div class="ms">by ${ey}</div></div>
    <div class="mc"><div class="ml">Total (high)</div><div class="mv">${fmt(cH[yrs])}</div><div class="ms">by ${ey}</div></div>
    <div class="mc"><div class="ml">Total contributed</div><div class="mv">${fmt(sims.reduce((s, d) => s + d.a.contrib[yrs], 0))}</div><div class="ms">all accounts</div></div>
  `;

  // Legend
  const lEl = document.getElementById('comb-leg');
  if (lEl) lEl.innerHTML =
    accounts.map(a => `<span><i style="background:${a.color}"></i> ${a.name} (${((a.gLow + a.gHigh) / 2).toFixed(1)}% avg)</span>`).join('') +
    `<span><i style="background:#555"></i> Combined</span>`;

  const tt = c => ' ' + c.dataset.label + ': ' + fmt(c.parsed.y);

  // Combined balance chart
  dChart('comb');
  const c1 = document.getElementById('chart-comb');
  if (!c1) return;

  if (v === 'nominal') {
    chartMap['comb'] = new Chart(c1.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [
        ...accounts.map((a, i) => ({ label: a.name, data: sims[i].a.nom, borderColor: a.color, backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5, borderDash: [4, 3] })),
        { label: 'Combined (low)',  data: cL, borderColor: '#aaa', backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5, borderDash: [2, 3] },
        { label: 'Combined (avg)',  data: cA, borderColor: '#333', backgroundColor: 'rgba(0,0,0,0.05)', fill: true,  tension: 0.4, pointRadius: 0, borderWidth: 2.5 },
        { label: 'Combined (high)', data: cH, borderColor: '#aaa', backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5, borderDash: [2, 3] }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: tt } } }, scales: bScales() }
    });
  } else {
    const totC = Array.from({ length: yrs + 1 }, (_, y) => sims.reduce((s, d) => s + d.a.contrib[y], 0));
    const totG = Array.from({ length: yrs + 1 }, (_, y) => sims.reduce((s, d) => s + d.a.growth[y], 0));
    chartMap['comb'] = new Chart(c1.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Contributions',   data: totC, backgroundColor: 'rgba(24,95,165,0.7)',  stack: 's' },
        { label: 'Investment gains', data: totG, backgroundColor: 'rgba(15,110,86,0.7)', stack: 's' }
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: tt } } }, scales: { ...bScales(), x: { ...bScales().x, stacked: true }, y: { ...bScales().y, stacked: true } } }
    });
  }

  // Per-account contribution chart
  dChart('comb-c');
  const c2 = document.getElementById('chart-comb-c');
  if (!c2) return;
  chartMap['comb-c'] = new Chart(c2.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: accounts.map((a, i) => ({ label: a.name, data: sims[i].a.annC, backgroundColor: hexToRgba(a.color, .75), stack: 's' })) },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: tt } } }, scales: { ...bScales(), x: { ...bScales().x, stacked: true }, y: { ...bScales().y, stacked: true } } }
  });

  // Salary chart
  dChart('salary');
  const c3 = document.getElementById('chart-salary');
  if (!c3) return;
  const salaries = simSalaries();
  const salColors = salaries.map((_, y) => (sy + y) < py ? hexToRgba('#534AB7', .75) : hexToRgba('#993556', .65));
  chartMap['salary'] = new Chart(c3.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Annual salary', data: salaries, backgroundColor: salColors, borderRadius: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `  Salary: ${fmt(c.parsed.y)}` } } }, scales: bScales() }
  });
}

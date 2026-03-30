// ── Tab / Panel State ──
let activeTab = 0;
let acctViews = {};
let combView = 'nominal';

// ── Populate State Dropdown ──
function populateStates() {
  const sel = document.getElementById('gState');
  Object.keys(STATES)
    .sort((a, b) => a === 'No state tax' ? -1 : b === 'No state tax' ? 1 : a.localeCompare(b))
    .forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      if (s === 'California') o.selected = true;
      sel.appendChild(o);
    });
}

// ── Tab Rendering ──
function renderTabs() {
  const tEl = document.getElementById('acctTabs');
  const pEl = document.getElementById('acctPanels');
  tEl.innerHTML = '';

  accounts.forEach((a, i) => {
    const t = document.createElement('div');
    t.className = 'acct-tab' + (i === activeTab ? ' active' : '');
    t.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${a.color};margin-right:6px;vertical-align:middle"></span>${a.name}`;
    t.onclick = () => { activeTab = i; renderTabs(); run(); };
    tEl.appendChild(t);
  });

  const expIdx = accounts.length;
  const combIdx = accounts.length + 1;

  const et = document.createElement('div');
  et.className = 'acct-tab exp-tab' + (activeTab === expIdx ? ' active' : '');
  et.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#854F0B;margin-right:6px;vertical-align:middle"></span>Expenses`;
  et.onclick = () => { activeTab = expIdx; renderTabs(); run(); };
  tEl.appendChild(et);

  const ct = document.createElement('div');
  ct.className = 'acct-tab combined' + (activeTab === combIdx ? ' active' : '');
  ct.textContent = 'Combined';
  ct.onclick = () => { activeTab = combIdx; renderTabs(); run(); };
  tEl.appendChild(ct);

  pEl.innerHTML = '';
  accounts.forEach((a, i) => {
    const p = document.createElement('div');
    p.className = 'acct-panel' + (i === activeTab ? ' active' : '');
    p.innerHTML = buildAccountPanel(a, i);
    pEl.appendChild(p);
  });

  const ep = document.createElement('div');
  ep.className = 'acct-panel' + (activeTab === expIdx ? ' active' : '');
  ep.innerHTML = buildExpPanel();
  updateExpStats();
  pEl.appendChild(ep);

  const cp = document.createElement('div');
  cp.className = 'acct-panel' + (activeTab === combIdx ? ' active' : '');
  cp.innerHTML = buildCombPanel();
  pEl.appendChild(cp);
}

// ── Account Panel ──
function buildAccountPanel(a, i) {
  const low = a.gLow ?? 4, high = a.gHigh ?? 10, avg = ((low + high) / 2).toFixed(1);
  const is401 = a.type === '401k', isRoth = a.type === 'roth', isTax = a.type === 'taxable';
  const ey = getEndYear();

  const phRows = a.phases.map((p, j) => {
    const displayTo = p.to >= 9000 ? ey : p.to;
    return `<div class="phase-row">
      <div class="fi"><label>From</label><input type="number" value="${p.from}" min="2000" max="2200" step="1" oninput="accounts[${i}].phases[${j}].from=+this.value;run()"></div>
      <div class="fi"><label>To</label><input type="number" value="${displayTo}" min="2000" max="2200" step="1" oninput="accounts[${i}].phases[${j}].to=+this.value;run()"></div>
      <div class="fi"><label>Rate (%)</label><input type="number" value="${p.rate}" min="0" max="100" step="1" oninput="accounts[${i}].phases[${j}].rate=+this.value;run()"></div>
      <div class="fi"><label>Type</label><select onchange="accounts[${i}].phases[${j}].ptype=this.value;run()">
        <option value="pretax" ${(p.ptype||'pretax')==='pretax'?'selected':''}>Pre-tax</option>
        <option value="posttax" ${p.ptype==='posttax'?'selected':''}>Post-tax</option>
      </select></div>
      <div style="display:flex;align-items:flex-end;padding-bottom:2px">${a.phases.length > 1 ? `<button class="del-btn" onclick="accounts[${i}].phases.splice(${j},1);renderTabs();run()">✕</button>` : ''}</div>
    </div>`;
  }).join('');

  const extraF = is401
    ? `<div class="fi"><label>Employer match (%)</label><input type="number" value="${a.match||0}" min="0" max="100" step="1" oninput="accounts[${i}].match=+this.value;run()"><span class="hint">Added on top — not deducted from your pay</span></div>`
    : isTax
    ? `<div class="fi"><label>Bonus saved here (%)</label><input type="number" value="${a.bonusSavePct||0}" min="0" max="100" step="1" oninput="accounts[${i}].bonusSavePct=+this.value;run()"><span class="hint">% of annual bonus deposited here</span></div>`
    : '';

  const rothInputs = isRoth ? `<div style="margin-bottom:14px"><div class="fi" style="max-width:280px">
    <label>Annual contribution ($)</label>
    <div class="dinput" style="width:210px">
      <span class="pre">$</span>
      <input type="number" value="${a.rothAnnual||0}" min="0" max="${ROTH_LIMIT}" step="100" style="width:90px"
        onchange="accounts[${i}].rothAnnual=Math.min(+this.value,${ROTH_LIMIT});this.value=accounts[${i}].rothAnnual;run()"
        oninput="accounts[${i}].rothAnnual=Math.min(+this.value,${ROTH_LIMIT});run()">
      <span class="suf">/yr</span>
    </div>
    <span class="hint">Desired amount — auto-reduced if income exceeds limits</span>
  </div></div>` : '';

  return `
    <div class="acct-header">
      <span style="width:12px;height:12px;border-radius:50%;background:${a.color};display:inline-block;flex-shrink:0;border:2px solid rgba(0,0,0,0.15)"></span>
      <input class="acct-name-input" value="${a.name}" oninput="accounts[${i}].name=this.value;renderTabs();run()">
      ${accounts.length > 1 ? `<button class="del-acct-btn" onclick="removeAcct(${i})">Remove account</button>` : ''}
    </div>
    <div class="${is401 ? 'fg3' : 'fg'}" style="margin-bottom:14px">
      <div class="fi"><label>Account type</label><select onchange="accounts[${i}].type=this.value;renderTabs();run()">
        <option value="401k" ${is401?'selected':''}>401k / 403b</option>
        <option value="roth" ${isRoth?'selected':''}>Roth IRA</option>
        <option value="taxable" ${isTax?'selected':''}>Taxable / Personal</option>
      </select></div>
      <div class="fi"><label>Starting balance ($)</label><input type="number" value="${a.startBal||0}" min="0" step="1000" oninput="accounts[${i}].startBal=+this.value;run()"></div>
      ${extraF}
    </div>
    ${rothInputs}
    ${isRoth ? buildRothNote(a) : ''}
    <div class="growth-box">
      <div class="growth-box-title">Investment growth rate</div>
      <div class="fg3">
        <div class="fi"><label>Low (%)</label><input type="number" value="${low}" min="0" max="30" step="0.5" oninput="accounts[${i}].gLow=+this.value;updateAvgDisplay(${i});run()"></div>
        <div class="fi"><label>High (%)</label><input type="number" value="${high}" min="0" max="30" step="0.5" oninput="accounts[${i}].gHigh=+this.value;updateAvgDisplay(${i});run()"></div>
        <div class="fi"><label>Average</label><div class="avg-val" id="avg-${i}">${avg}%</div></div>
      </div>
    </div>
    ${!isRoth ? `
      <div class="slabel" style="margin-top:.5rem">Savings rate phases</div>
      <div class="phase-hint">Phases run to the end of the time span by default. Set "To" earlier to stop contributions sooner.</div>
      <div class="phases-wrap">${phRows}</div>
      <button class="add-btn" onclick="addPhase(${i})">+ Add phase</button>
    ` : ''}
    <div class="metrics" id="metrics-${i}"></div>
    <div id="cap-notice-${i}" class="cap-notice" style="display:none"></div>
    <div class="trow">
      <button class="tbtn${(acctViews[i]||'nominal')==='nominal'?' active':''}" id="vb-${i}-nominal" onclick="setAcctView(${i},'nominal')">Nominal</button>
      <button class="tbtn${(acctViews[i]||'nominal')==='breakdown'?' active':''}" id="vb-${i}-breakdown" onclick="setAcctView(${i},'breakdown')">Breakdown</button>
    </div>
    <div class="legend" id="leg-${i}"></div>
    <div class="chart-wrap" style="height:240px"><canvas id="cb-${i}"></canvas></div>
    <div class="chart-title">Annual contribution</div>
    <div class="chart-wrap" style="height:180px"><canvas id="cc-${i}"></canvas></div>
  `;
}

// ── Roth Status Note ──
function buildRothNote(a) {
  const sal = gv('gSalary'), status = gsel('gFiling'), sy = getStartYear();
  const po = rothPhaseout(sy, status);
  const r = rothEffectiveContrib(a.rothAnnual || 0, sal, sy, status);
  const annLim = rothAnnualLimit(sy);
  let statusLine = '';
  if (r.capReason === 'income')
    statusLine = `<span style="color:#A32D2D;font-weight:bold">Currently ineligible</span> — income ($${Math.round(sal/1000)}k) exceeds the ${status==='married'?'married':'single'} limit ($${Math.round(po.end/1000)}k).`;
  else if (r.capReason === 'phaseout')
    statusLine = `<span style="color:#854F0B;font-weight:bold">Partially phased out</span> — income is in the phase-out range ($${Math.round(po.start/1000)}k–$${Math.round(po.end/1000)}k). Effective: $${Math.round(r.contrib).toLocaleString()}/yr.`;
  else
    statusLine = `Eligible. Phase-out begins at $${Math.round(po.start/1000)}k (${status==='married'?'married':'single'}).`;
  return `<div class="roth-note">
    Annual limit: <strong>$${annLim.toLocaleString()}</strong> (2025 base, inflation-adjusted) · Post-tax contributions<br>
    Income limit: ${statusLine}<br>
    <span style="font-size:11px;opacity:0.7">Limits inflate at 2.5%/yr. Contributions auto-reduce as salary grows past thresholds.</span>
  </div>`;
}

// ── Combined Panel ──
function buildCombPanel() {
  return `<div style="padding-top:1.25rem">
    <div class="slabel" style="margin-top:0">Monthly breakdown — year 1</div>
    <div id="monthly-bd"></div>
    <div class="combined-metrics" id="comb-metrics"></div>
    <div class="trow">
      <button class="tbtn${combView==='nominal'?' active':''}" id="cvb-nominal" onclick="setCombView('nominal')">Nominal</button>
      <button class="tbtn${combView==='breakdown'?' active':''}" id="cvb-breakdown" onclick="setCombView('breakdown')">Breakdown</button>
    </div>
    <div class="legend" id="comb-leg"></div>
    <div class="chart-title" style="margin-top:.75rem">Combined savings balance</div>
    <div class="chart-wrap" style="height:280px"><canvas id="chart-comb"></canvas></div>
    <div class="chart-title">Annual contributions by account</div>
    <div class="chart-wrap" style="height:220px"><canvas id="chart-comb-c"></canvas></div>
    <div class="chart-title">Annual salary over time</div>
    <div class="legend">
      <span><i style="background:#534AB7"></i> Growth phase</span>
      <span><i style="background:#993556"></i> Post-peak (2.5% raises)</span>
    </div>
    <div class="chart-wrap" style="height:200px"><canvas id="chart-salary"></canvas></div>
  </div>`;
}

// ── Monthly Breakdown HTML ──
function buildMonthlyHTML() {
  const d = buildMonthlyData();
  const { mGross, mFed, mState, mFica, acData, totEmpSav, totMatchSav, totExp, takeHome } = d;
  const pct = v => mGross > 0 ? ((Math.abs(v) / mGross) * 100).toFixed(1) + '%' : '0%';

  const activeFixed = fixedExpenses.filter(e => e.enabled);
  const activeCustom = customExpenses.filter(e => e.enabled);

  const segs = [
    { lbl: 'Federal tax', v: mFed,   c: '#A32D2D' },
    { lbl: 'State tax',   v: mState, c: '#993C1D' },
    { lbl: 'FICA',        v: mFica,  c: '#854F0B' },
    ...acData.map(a => ({ lbl: a.name, v: a.empMonthly, c: a.color })),
    ...activeFixed.map(e => ({ lbl: e.label, v: e.amount, c: e.color })),
    ...activeCustom.map(e => ({ lbl: e.label, v: e.amount, c: '#888' })),
    { lbl: 'Remaining', v: Math.max(0, takeHome), c: '#ccc' }
  ].filter(s => s.v > 0);

  const barHtml = segs.map(s =>
    `<span style="width:${Math.max(0,(s.v/mGross)*100).toFixed(2)}%;background:${s.c};height:100%;display:inline-block"></span>`
  ).join('');

  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:1.5rem">
    <div class="mcard">
      <div class="mcard-title">Monthly paycheck breakdown</div>
      <div class="bar-bg" style="display:flex">${barHtml}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">${segs.map(s => `<span style="font-size:11px;color:#5a5a56;display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:2px;background:${s.c};display:inline-block"></span>${s.lbl}</span>`).join('')}</div>
      <div class="mrow"><span class="lbl">Gross monthly</span><span class="val">${fmtF(mGross)}/mo</span></div>
      <div class="mrow"><span class="lbl">Federal tax</span><span class="val" style="color:#A32D2D">−${fmtF(mFed)}/mo<span class="pct">${pct(mFed)}</span></span></div>
      <div class="mrow"><span class="lbl">State tax</span><span class="val" style="color:#A32D2D">−${fmtF(mState)}/mo<span class="pct">${pct(mState)}</span></span></div>
      <div class="mrow"><span class="lbl">FICA</span><span class="val" style="color:#A32D2D">−${fmtF(mFica)}/mo<span class="pct">${pct(mFica)}</span></span></div>
      ${acData.map(a => `
        <div class="mrow"><span class="lbl"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${a.color};margin-right:6px"></span>${a.name}</span><span class="val">−${fmtF(a.empMonthly)}/mo<span class="pct">${pct(a.empMonthly)}</span></span></div>
        ${a.matchMonthly > 0 ? `<div class="mrow match-row"><span class="lbl">+ employer match (${a.match}%)</span><span class="val">+${fmtF(a.matchMonthly)}/mo</span></div>` : ''}`).join('')}
      ${activeFixed.map(e => `<div class="mrow"><span class="lbl"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${e.color};margin-right:6px"></span>${e.label}</span><span class="val">−${fmtF(e.amount)}/mo<span class="pct">${pct(e.amount)}</span></span></div>`).join('')}
      ${activeCustom.map(e => `<div class="mrow"><span class="lbl"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#888;margin-right:6px"></span>${e.label}</span><span class="val">−${fmtF(e.amount)}/mo<span class="pct">${pct(e.amount)}</span></span></div>`).join('')}
      <div class="mrow"><span class="lbl tot">Take-home</span><span class="val" ${takeHome < 0 ? 'style="color:#A32D2D"' : ''}>${fmtF(Math.max(0, takeHome))}/mo<span class="pct">${pct(Math.max(0, takeHome))}</span></span></div>
    </div>
    <div class="mcard">
      <div class="mcard-title">Monthly savings detail</div>
      ${acData.map(a => `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:13px;color:#5a5a56;display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:${a.color};display:inline-block"></span>${a.name}</span>
          <span style="font-size:13px;font-weight:bold">${fmtF(a.empMonthly + a.matchMonthly)}/mo total</span>
        </div>
        <div class="bar-bg"><div style="width:${Math.min(100, mGross > 0 ? (a.empMonthly + a.matchMonthly) / mGross * 100 : 0).toFixed(1)}%;height:100%;background:${a.color};border-radius:4px"></div></div>
        <div style="font-size:11px;color:#9a9a94;font-style:italic">
          Your contribution: ${fmtF(a.empMonthly)}/mo${a.matchMonthly > 0 ? ` · Employer match: ${fmtF(a.matchMonthly)}/mo` : ''} · ${a.ct === 'pretax' ? 'pre-tax' : 'post-tax'}${a.subNote}
        </div>
      </div>`).join('')}
      <div class="mrow" style="margin-top:6px"><span class="lbl tot">Your total saved</span><span class="val">${fmtF(totEmpSav)}/mo<span class="pct">${pct(totEmpSav)}</span></span></div>
      ${totMatchSav > 0 ? `<div class="mrow"><span class="lbl" style="color:#0F6E56;font-style:italic">+ employer match total</span><span class="val" style="color:#0F6E56">+${fmtF(totMatchSav)}/mo</span></div>` : ''}
      <div class="mrow"><span class="lbl tot">Total into accounts</span><span class="val">${fmtF(totEmpSav + totMatchSav)}/mo<span class="pct">${pct(totEmpSav + totMatchSav)}</span></span></div>
      <div style="font-size:11px;color:#9a9a94;margin-top:6px;font-style:italic;margin-bottom:${totExp > 0 ? '14px' : '0'}">${fmtF((totEmpSav + totMatchSav) * 12)}/yr into accounts · ${fmtF(totEmpSav * 12)}/yr from your pay</div>
      ${totExp > 0 ? `<div class="mrow"><span class="lbl tot">Total expenses</span><span class="val">${fmtF(totExp)}/mo<span class="pct">${pct(totExp)}</span></span></div>` : ''}
      ${takeHome < 0 ? `<div style="font-size:12px;color:#A32D2D;margin-top:10px;font-weight:bold">Budget exceeds income by ${fmtF(Math.abs(takeHome))}/mo</div>` : ''}
    </div>
  </div>`;
}

// ── Expenses Panel ──
function buildExpPanel() {
  const fixedRows = fixedExpenses.map((e, i) => `
    <div class="exp-row">
      <div class="exp-dot" style="background:${e.color}"></div>
      <div class="exp-name">${e.label}</div>
      <div class="dinput" style="width:148px;${!e.enabled ? 'opacity:0.4' : ''}">
        <span class="pre">$</span>
        <input type="number" value="${e.amount}" min="0" step="10" style="width:68px" ${!e.enabled ? 'disabled' : ''}
          oninput="fixedExpenses[${i}].amount=Math.max(0,+this.value);updateExpStats();"
          onchange="fixedExpenses[${i}].amount=Math.max(0,+this.value);updateExpStats();if(activeTab===accounts.length+1)runComb();">
        <span class="suf">/mo</span>
      </div>
      <label style="display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0 6px">
        <input type="checkbox" ${e.enabled ? 'checked' : ''} onchange="fixedExpenses[${i}].enabled=this.checked;renderExpPanel();if(activeTab===accounts.length+1)runComb();" style="width:auto;cursor:pointer;accent-color:#185FA5">
      </label>
    </div>`).join('');

  const customRows = customExpenses.map((e, i) => `
    <div class="custom-exp-row">
      <input type="text" value="${e.label}" placeholder="Expense name" style="font-size:13px"
        oninput="customExpenses[${i}].label=this.value"
        onchange="customExpenses[${i}].label=this.value;if(activeTab===accounts.length+1)runComb();">
      <div class="dinput" style="width:148px">
        <span class="pre">$</span>
        <input type="number" value="${e.amount}" min="0" step="10" style="width:68px"
          oninput="customExpenses[${i}].amount=Math.max(0,+this.value);updateExpStats();"
          onchange="customExpenses[${i}].amount=Math.max(0,+this.value);updateExpStats();if(activeTab===accounts.length+1)runComb();">
        <span class="suf">/mo</span>
      </div>
      <button class="exp-del" onclick="customExpenses.splice(${i},1);renderExpPanel();if(activeTab===accounts.length+1)runComb();">✕</button>
    </div>`).join('');

  return `<div style="padding-top:1.25rem">
    <div id="exp-stats"></div>
    <div class="exp-section-card">
      <div class="exp-section-title">Common expenses <span style="font-size:11px;font-weight:normal;opacity:0.6;margin-left:6px">check to include · edit amounts</span></div>
      <div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;padding-bottom:8px;border-bottom:1px solid rgba(0,0,0,0.08);margin-bottom:2px">
        <div></div>
        <div style="font-size:11px;color:#9a9a94;font-style:italic">Category</div>
        <div style="font-size:11px;color:#9a9a94;font-style:italic;width:148px">Monthly amount</div>
        <div style="font-size:11px;color:#9a9a94;font-style:italic;text-align:center">On</div>
      </div>
      ${fixedRows}
    </div>
    <div class="exp-section-card">
      <div class="exp-section-title">Custom expenses</div>
      ${customRows || `<div style="font-size:13px;color:#9a9a94;font-style:italic;margin-bottom:12px">No custom expenses yet.</div>`}
      <button class="add-btn" style="margin-top:6px" onclick="customExpenses.push({label:'New expense',amount:100,enabled:true});renderExpPanel();">+ Add expense</button>
    </div>
    <div style="font-size:12px;color:#9a9a94;font-style:italic;line-height:1.6">Active expenses appear in the monthly breakdown in the Combined tab.</div>
  </div>`;
}

function renderExpPanel() {
  const expIdx = accounts.length;
  const panels = document.querySelectorAll('.acct-panel');
  if (panels[expIdx]) panels[expIdx].innerHTML = buildExpPanel();
  updateExpStats();
}

function updateExpStats() {
  const totAll = totalMonthlyExpenses();
  const mGross = gv('gSalary') / 12;
  const pct = v => mGross > 0 ? ((v / mGross) * 100).toFixed(1) + '%' : '—';
  const sm = document.getElementById('exp-stats');
  if (!sm) return;
  sm.innerHTML = totAll > 0 ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:1.5rem">
    <div class="mc"><div class="ml">Total monthly</div><div class="mv">${fmtF(totAll)}/mo</div><div class="ms">active expenses</div></div>
    <div class="mc"><div class="ml">Annual total</div><div class="mv">${fmt(totAll * 12)}</div><div class="ms">per year</div></div>
    <div class="mc"><div class="ml">% of gross</div><div class="mv">${pct(totAll)}</div><div class="ms">of monthly salary</div></div>
  </div>` : '';
}

// ── View & Tab Controls ──
function setAcctView(i, v) {
  acctViews[i] = v;
  ['nominal', 'breakdown'].forEach(k => {
    const b = document.getElementById('vb-' + i + '-' + k);
    if (b) b.classList.toggle('active', k === v);
  });
  renderAccountCharts(i);
}

function setCombView(v) {
  combView = v;
  ['nominal', 'breakdown'].forEach(k => {
    const b = document.getElementById('cvb-' + k);
    if (b) b.classList.toggle('active', k === v);
  });
  runComb();
}

function updateAvgDisplay(i) {
  const e = document.getElementById('avg-' + i);
  if (e) e.textContent = ((accounts[i].gLow + accounts[i].gHigh) / 2).toFixed(1) + '%';
}

// ── Account Management ──
function addPhase(i) {
  const sy = getStartYear(), ey = getEndYear();
  const last = accounts[i].phases[accounts[i].phases.length - 1];
  const lastTo = last ? resolvePhaseTo(last) : sy;
  accounts[i].phases.push({
    from: Math.min(lastTo + 1, ey), to: 9999, rate: 10,
    ptype: accounts[i].type === '401k' ? 'pretax' : 'posttax'
  });
  renderTabs(); run();
}

function addAccount() {
  const ci = accounts.length % COLORS.length;
  const sy = getStartYear();
  accounts.push({
    name: 'Account ' + (accounts.length + 1), type: 'taxable', color: COLORS[ci],
    startBal: 0, phases: [{ from: sy, to: 9999, rate: 5, ptype: 'posttax' }],
    match: 0, bonusSavePct: 0, gLow: 4, gHigh: 10
  });
  activeTab = accounts.length - 1;
  renderTabs(); run();
}

function removeAcct(i) {
  accounts.splice(i, 1);
  if (activeTab >= accounts.length) activeTab = Math.max(0, accounts.length - 1);
  renderTabs(); run();
}

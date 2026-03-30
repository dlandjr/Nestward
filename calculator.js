// ── Helpers ──
function gv(id) { return parseFloat(document.getElementById(id).value) || 0; }
function gsel(id) { const e = document.getElementById(id); return e ? e.value : ''; }
function getStartYear() { return Math.round(gv('gStartYear')) || 2025; }
function getYears() { return Math.max(1, Math.round(gv('gYears'))); }
function getEndYear() { return getStartYear() + getYears(); }

function fmt(n) {
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString() + 'K';
  return '$' + Math.round(n).toLocaleString();
}
function fmtF(n) { return '$' + Math.round(n).toLocaleString(); }

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Federal Tax ──
function effectiveFedRate(income, status) {
  const brackets = status === 'married' ? FED_MARRIED : FED_SINGLE;
  let tax = 0, prev = 0;
  for (const br of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, br.l) - prev) * br.r;
    prev = br.l;
  }
  return income > 0 ? tax / income : 0;
}

function getStateRate(status) {
  const state = gsel('gState') || 'No state tax';
  return (STATES[state] || {})[status === 'married' ? 'm' : 's'] || 0;
}

// ── Roth Limits ──
function rothAnnualLimit(yr) {
  const yrsFromBase = yr - getStartYear();
  return Math.round(ROTH_LIMIT * Math.pow(1 + POST_PEAK_RAISE, yrsFromBase) / 500) * 500;
}

function rothPhaseout(yr, status) {
  const key = status === 'married' ? 'married' : 'single';
  const f = Math.pow(1 + POST_PEAK_RAISE, yr - getStartYear());
  return {
    start: Math.round(ROTH_PHASEOUT[key].start * f / 1000) * 1000,
    end:   Math.round(ROTH_PHASEOUT[key].end   * f / 1000) * 1000
  };
}

function rothEffectiveContrib(desired, salary, yr, status) {
  const annualLimit = rothAnnualLimit(yr);
  const po = rothPhaseout(yr, status);
  if (salary >= po.end) return { contrib: 0, capReason: 'income' };
  let lim = desired;
  if (salary > po.start) {
    const frac = (po.end - salary) / (po.end - po.start);
    lim = Math.min(desired, Math.round(annualLimit * frac / 10) * 10);
  }
  const final = Math.min(lim, annualLimit);
  let capReason = null;
  if (salary > po.start) capReason = 'phaseout';
  else if (desired > annualLimit) capReason = 'limit';
  return { contrib: Math.max(0, final), capReason };
}

// ── Phase Helpers ──
function resolvePhaseTo(p) { return p.to >= 9000 ? getEndYear() : p.to; }

function acctSavingsRate(a, yr) {
  let r = 0;
  for (const p of a.phases) if (yr >= p.from && yr <= resolvePhaseTo(p)) r = p.rate;
  return r / 100;
}

function acctContribType(a, yr) {
  for (const p of a.phases) if (yr >= p.from && yr <= resolvePhaseTo(p)) return p.ptype || 'pretax';
  return 'pretax';
}

// ── Salary Simulation ──
function simSalaries() {
  const sal = gv('gSalary'), rr = gv('gRaise') / 100;
  const yrs = getYears(), sy = getStartYear(), py = Math.round(gv('gPeak')) || 9999;
  const arr = [];
  let s = sal;
  for (let y = 0; y <= yrs; y++) {
    arr.push(Math.round(s));
    if (y < yrs) s *= (1 + ((sy + y) >= py ? POST_PEAK_RAISE : rr));
  }
  return arr;
}

// ── Account Simulation ──
function simAccount(a, gr) {
  const sal = gv('gSalary'), rr = gv('gRaise') / 100, bp = gv('gBonus') / 100;
  const yrs = getYears(), sy = getStartYear(), py = Math.round(gv('gPeak')) || 9999;
  const status = gsel('gFiling');
  const stateR = getStateRate(status);

  const nom = [], contrib = [], growth = [], annC = [], annEmployee = [], annMatch = [], capReasons = [];
  let bal = a.startBal || 0, s = sal, tot = a.startBal || 0;

  for (let y = 0; y <= yrs; y++) {
    const yr = sy + y;
    const feR = effectiveFedRate(s, status);

    nom.push(Math.round(bal));
    contrib.push(Math.round(tot));
    growth.push(Math.round(Math.max(0, bal - tot)));

    if (y < yrs) {
      let eff = 0, empOnly = 0, matchOnly = 0, capReason = null;

      if (a.type === 'roth') {
        const result = rothEffectiveContrib(a.rothAnnual || 0, s, yr, status);
        eff = result.contrib;
        capReason = result.capReason;
        empOnly = eff;
        matchOnly = 0;
      } else {
        const em = (a.type === '401k' ? (a.match || 0) : 0) / 100;
        const bonusSave = a.type === 'taxable' ? (a.bonusSavePct || 0) / 100 : 0;
        const ct = acctContribType(a, yr);
        const srRate = acctSavingsRate(a, yr);
        const empGross = s * srRate + s * bp * bonusSave;
        const matchGross = s * em;
        empOnly = ct === 'pretax' ? empGross : empGross * (1 - (feR + stateR));
        matchOnly = matchGross; // employer match: always pre-tax, not from paycheck
        eff = empOnly + matchOnly;
      }

      capReasons.push(capReason);
      annC.push(Math.round(eff));
      annEmployee.push(Math.round(empOnly));
      annMatch.push(Math.round(matchOnly));
      bal = bal * (1 + gr) + eff;
      tot += eff;
      s *= (1 + (yr >= py ? POST_PEAK_RAISE : rr));
    } else {
      annC.push(0); annEmployee.push(0); annMatch.push(0); capReasons.push(null);
    }
  }
  return { nom, contrib, growth, annC, annEmployee, annMatch, capReasons };
}

// ── Expenses ──
function totalMonthlyExpenses() {
  return fixedExpenses.filter(e => e.enabled).reduce((s, e) => s + e.amount, 0)
       + customExpenses.filter(e => e.enabled).reduce((s, e) => s + e.amount, 0);
}

// ── Monthly Breakdown Data ──
function buildMonthlyData() {
  const sal = gv('gSalary');
  const status = gsel('gFiling');
  const stateR = getStateRate(status);
  const fedEff = effectiveFedRate(sal, status);
  const fica = 0.0765;
  const bp = gv('gBonus') / 100;
  const sy = getStartYear();

  const mGross = sal / 12;
  const mFed = sal * fedEff / 12;
  const mState = sal * stateR / 12;
  const mFica = sal * fica / 12;
  const mTax = mFed + mState + mFica;

  const acData = accounts.map(a => {
    let empMonthly = 0, matchMonthly = 0, subNote = '';
    if (a.type === 'roth') {
      const r = rothEffectiveContrib(a.rothAnnual || 0, sal, sy, status);
      empMonthly = Math.round(r.contrib / 12);
      matchMonthly = 0;
      if (r.capReason === 'income')   subNote = ' · ineligible (income too high)';
      else if (r.capReason === 'phaseout') subNote = ' · partially phased out';
      else if (r.capReason === 'limit')    subNote = ' · capped at annual limit';
    } else {
      const srRate = acctSavingsRate(a, sy);
      const ct = acctContribType(a, sy);
      const em = (a.type === '401k' ? (a.match || 0) : 0) / 100;
      const bonusSave = a.type === 'taxable' ? (a.bonusSavePct || 0) / 100 : 0;
      const empGross = sal * srRate + sal * bp * bonusSave;
      empMonthly = Math.round((ct === 'pretax' ? empGross : empGross * (1 - (fedEff + stateR))) / 12);
      matchMonthly = Math.round(sal * em / 12);
      if (a.type === 'taxable' && a.bonusSavePct > 0) subNote = ` · +${a.bonusSavePct}% of bonus`;
    }
    return {
      name: a.name, color: a.color,
      empMonthly, matchMonthly,
      type: a.type, match: a.match,
      ct: a.type === 'roth' ? 'posttax' : acctContribType(a, sy),
      subNote
    };
  });

  const totEmpSav = acData.reduce((s, a) => s + a.empMonthly, 0);
  const totMatchSav = acData.reduce((s, a) => s + a.matchMonthly, 0);
  const totExp = totalMonthlyExpenses();
  const takeHome = Math.round(mGross - mTax - totEmpSav - totExp);

  return { mGross, mFed, mState, mFica, mTax, acData, totEmpSav, totMatchSav, totExp, takeHome, stateR, fedEff };
}

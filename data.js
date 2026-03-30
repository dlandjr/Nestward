// ── Constants ──
const COLORS = ['#185FA5', '#0F6E56', '#534AB7', '#993C1D', '#854F0B', '#993556'];
const ROTH_LIMIT = 7500;
const POST_PEAK_RAISE = 0.025;

const ROTH_PHASEOUT = {
  single:  { start: 150000, end: 165000 },
  married: { start: 236000, end: 246000 }
};

// ── State Tax Rates ──
const STATES = {
  'No state tax':   { s: 0,      m: 0      },
  'Alabama':        { s: .05,    m: .05    },
  'Alaska':         { s: 0,      m: 0      },
  'Arizona':        { s: .025,   m: .025   },
  'Arkansas':       { s: .055,   m: .055   },
  'California':     { s: .093,   m: .093   },
  'Colorado':       { s: .044,   m: .044   },
  'Connecticut':    { s: .065,   m: .065   },
  'Delaware':       { s: .066,   m: .066   },
  'Florida':        { s: 0,      m: 0      },
  'Georgia':        { s: .055,   m: .055   },
  'Hawaii':         { s: .11,    m: .11    },
  'Idaho':          { s: .058,   m: .058   },
  'Illinois':       { s: .0495,  m: .0495  },
  'Indiana':        { s: .0305,  m: .0305  },
  'Iowa':           { s: .057,   m: .057   },
  'Kansas':         { s: .057,   m: .057   },
  'Kentucky':       { s: .045,   m: .045   },
  'Louisiana':      { s: .06,    m: .06    },
  'Maine':          { s: .075,   m: .075   },
  'Maryland':       { s: .0575,  m: .0575  },
  'Massachusetts':  { s: .09,    m: .09    },
  'Michigan':       { s: .0425,  m: .0425  },
  'Minnesota':      { s: .0985,  m: .0985  },
  'Mississippi':    { s: .047,   m: .047   },
  'Missouri':       { s: .048,   m: .048   },
  'Montana':        { s: .059,   m: .059   },
  'Nebraska':       { s: .0664,  m: .0664  },
  'Nevada':         { s: 0,      m: 0      },
  'New Hampshire':  { s: 0,      m: 0      },
  'New Jersey':     { s: .0897,  m: .0897  },
  'New Mexico':     { s: .059,   m: .059   },
  'New York':       { s: .0685,  m: .0685  },
  'North Carolina': { s: .0475,  m: .0475  },
  'North Dakota':   { s: .025,   m: .025   },
  'Ohio':           { s: .035,   m: .035   },
  'Oklahoma':       { s: .0475,  m: .0475  },
  'Oregon':         { s: .099,   m: .099   },
  'Pennsylvania':   { s: .0307,  m: .0307  },
  'Rhode Island':   { s: .0599,  m: .0599  },
  'South Carolina': { s: .064,   m: .064   },
  'South Dakota':   { s: 0,      m: 0      },
  'Tennessee':      { s: 0,      m: 0      },
  'Texas':          { s: 0,      m: 0      },
  'Utah':           { s: .0455,  m: .0455  },
  'Vermont':        { s: .0875,  m: .0875  },
  'Virginia':       { s: .0575,  m: .0575  },
  'Washington':     { s: 0,      m: 0      },
  'West Virginia':  { s: .065,   m: .065   },
  'Wisconsin':      { s: .0765,  m: .0765  },
  'Wyoming':        { s: 0,      m: 0      }
};

// ── Federal Tax Brackets (2025) ──
const FED_SINGLE = [
  { l: 11600,  r: 0.10 },
  { l: 47150,  r: 0.12 },
  { l: 100525, r: 0.22 },
  { l: 191950, r: 0.24 },
  { l: 243725, r: 0.32 },
  { l: 609350, r: 0.35 },
  { l: Infinity, r: 0.37 }
];
const FED_MARRIED = [
  { l: 23200,  r: 0.10 },
  { l: 94300,  r: 0.12 },
  { l: 201050, r: 0.22 },
  { l: 383900, r: 0.24 },
  { l: 487450, r: 0.32 },
  { l: 731200, r: 0.35 },
  { l: Infinity, r: 0.37 }
];

// ── Default Expense Categories ──
const EXP_COLORS = {
  loans:         '#A32D2D',
  rent:          '#993C1D',
  utilities:     '#854F0B',
  groceries:     '#3B6D11',
  transport:     '#185FA5',
  subscriptions: '#534AB7',
  insurance:     '#0F6E56'
};

// ── Mutable App State ──
let accounts = [
  {
    name: '401k', type: '401k', color: COLORS[0],
    startBal: 0,
    phases: [{ from: 2025, to: 9999, rate: 10, ptype: 'pretax' }],
    match: 5, bonusSavePct: 0, gLow: 4, gHigh: 10
  },
  {
    name: 'Roth IRA', type: 'roth', color: COLORS[1],
    startBal: 0, phases: [],
    match: 0, bonusSavePct: 0, gLow: 6, gHigh: 10, rothAnnual: 7000
  },
  {
    name: 'Personal', type: 'taxable', color: COLORS[2],
    startBal: 0,
    phases: [{ from: 2025, to: 9999, rate: 5, ptype: 'posttax' }],
    match: 0, bonusSavePct: 0, gLow: 3, gHigh: 7
  }
];

let fixedExpenses = [
  { key: 'loans',         label: 'Loan payments',              amount: 500,  color: EXP_COLORS.loans,         enabled: false },
  { key: 'rent',          label: 'Rent / mortgage',             amount: 1800, color: EXP_COLORS.rent,          enabled: true  },
  { key: 'utilities',     label: 'Utilities',                   amount: 150,  color: EXP_COLORS.utilities,     enabled: true  },
  { key: 'groceries',     label: 'Groceries',                   amount: 400,  color: EXP_COLORS.groceries,     enabled: true  },
  { key: 'transport',     label: 'Transportation',              amount: 200,  color: EXP_COLORS.transport,     enabled: true  },
  { key: 'subscriptions', label: 'Subscriptions / memberships', amount: 80,   color: EXP_COLORS.subscriptions, enabled: false },
  { key: 'insurance',     label: 'Insurance',                   amount: 250,  color: EXP_COLORS.insurance,     enabled: false }
];

let customExpenses = [];

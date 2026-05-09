'use strict';

// ── RNG ───────────────────────────────────────────────────────────────────────
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function dailySeed() {
  const d = new Date();
  return `casino-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ── Stock pool ────────────────────────────────────────────────────────────────
const STOCKS = [
  { ticker: 'TSLA', name: 'Tesla, Inc.',            desc: "Elon tweeted something. Nobody knows what it means.",                  priceRange: [150, 400] },
  { ticker: 'GME',  name: 'GameStop Corp.',          desc: "Still somehow a publicly traded company. Respect.",                   priceRange: [10,  50]  },
  { ticker: 'AMC',  name: 'AMC Entertainment',       desc: "The original meme stock. Never forget where you came from.",         priceRange: [3,   20]  },
  { ticker: 'NVDA', name: 'NVIDIA Corporation',      desc: "AI goes brrr. Up only. Probably.",                                   priceRange: [400, 900] },
  { ticker: 'PLTR', name: 'Palantir Technologies',   desc: "Tracking your every move. For your benefit, obviously.",             priceRange: [15,  80]  },
  { ticker: 'AAPL', name: 'Apple Inc.',              desc: "They removed the headphone jack and you still bought it.",           priceRange: [150, 230] },
  { ticker: 'META', name: 'Meta Platforms',          desc: "Zuckerberg is definitely a normal human person.",                    priceRange: [300, 600] },
  { ticker: 'RIVN', name: 'Rivian Automotive',       desc: "Electric trucks for people who enjoy losing money outdoors.",        priceRange: [8,   25]  },
  { ticker: 'COIN', name: 'Coinbase Global',         desc: "Crypto but make it a stock. Double the anxiety.",                    priceRange: [100, 280] },
  { ticker: 'HOOD', name: 'Robinhood Markets',       desc: "The app that introduced you to this lifestyle. Blame them.",         priceRange: [8,   25]  },
  { ticker: 'MSTR', name: 'MicroStrategy',           desc: "They just buy Bitcoin. That's the whole company.",                   priceRange: [200, 800] },
  { ticker: 'RBLX', name: 'Roblox Corporation',      desc: "Children's game. Adult gamblers. Maximum chaos.",                    priceRange: [25,  60]  },
  { ticker: 'SNAP', name: 'Snap Inc.',               desc: "Disappearing — just like your gains.",                               priceRange: [8,   20]  },
  { ticker: 'SPCE', name: 'Virgin Galactic',         desc: "To the moon. Literally. Maybe. One day. Not today.",                 priceRange: [1,   8]   },
  { ticker: 'NIO',  name: 'NIO Inc.',                desc: "Chinese Tesla. Everything you love about volatility, times two.",   priceRange: [3,   20]  },
  { ticker: 'LCID', name: 'Lucid Group',             desc: "Promises everything. Delivers a car. Sometimes.",                    priceRange: [2,   10]  },
  { ticker: 'BB',   name: 'BlackBerry Limited',      desc: "A nostalgia play for degenerates who miss the 2021 squeeze.",       priceRange: [2,   8]   },
  { ticker: 'F',    name: 'Ford Motor Company',      desc: "Your grandpa's stock. Now with optional electricity.",              priceRange: [10,  18]  },
  { ticker: 'UBER', name: 'Uber Technologies',       desc: "You could've been a driver instead. Hindsight is 20/20.",           priceRange: [50,  90]  },
  { ticker: 'DIS',  name: 'The Walt Disney Company', desc: "Your childhood, securitized and sold back to you.",                  priceRange: [80,  130] },
  { ticker: 'MSFT', name: 'Microsoft Corporation',   desc: "Makes Office, Azure, and an AI nobody asked for. Still prints money.", priceRange: [300, 480] },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.',         desc: "Delivers packages. Hosts the internet. Charges you for both.",        priceRange: [150, 220] },
  { ticker: 'GOOGL', name: 'Alphabet Inc.',           desc: "Knows everything about you. Monetises that. Shareholders approve.",   priceRange: [140, 200] },
  { ticker: 'NFLX', name: 'Netflix, Inc.',            desc: "Cracked down on password sharing. Raised prices. Bold strategy.",     priceRange: [450, 750] },
  { ticker: 'AMD',  name: 'Advanced Micro Devices',   desc: "Team Red. Nvidia's shadow. Currently extremely relevant.",            priceRange: [100, 200] },
  { ticker: 'INTC', name: 'Intel Corporation',        desc: "Once ruled silicon. Now playing catchup. Your dad's blue chip.",      priceRange: [18,  40]  },
  { ticker: 'SOFI', name: 'SoFi Technologies',        desc: "A bank for people whose portfolio already went down. Poetic.",        priceRange: [6,   18]  },
  { ticker: 'DKNG', name: 'DraftKings Inc.',          desc: "A gambling app listed on a stock market. You are gambling on gambling.", priceRange: [15, 45] },
  { ticker: 'BYND', name: 'Beyond Meat, Inc.',        desc: "Fake meat, real losses. Peak 2021 energy, perfectly preserved.",      priceRange: [3,   12]  },
  { ticker: 'ROKU', name: 'Roku, Inc.',               desc: "Makes the box your TV uses to play Netflix. Worth billions somehow.", priceRange: [50,  120] },
  { ticker: 'SPOT', name: 'Spotify Technology',       desc: "Pays artists $0.003 per stream. Charges $11/month. Loses money.",    priceRange: [250, 450] },
  { ticker: 'LYFT', name: 'Lyft, Inc.',               desc: "Uber but sadder. Never turned a profit. Keeps trying.",               priceRange: [10,  25]  },
  { ticker: 'SHOP', name: 'Shopify Inc.',             desc: "Canadian e-commerce darling. Peaked in 2021. Slowly rebuilding.",    priceRange: [60,  120] },
  { ticker: 'ABNB', name: 'Airbnb, Inc.',             desc: "You complained about the prices. Now you're buying the stock.",       priceRange: [100, 175] },
  { ticker: 'ZM',   name: 'Zoom Video Communications', desc: "Had one good year. The year ended in 2020. Still here though.",     priceRange: [55,  90]  },
  { ticker: 'SMCI', name: 'Super Micro Computer',     desc: "AI server company. Three auditors have quietly resigned. Bullish.",  priceRange: [25,  90]  },
  { ticker: 'ARM',  name: 'Arm Holdings plc',         desc: "Inside every phone. IPO'd at peak hype. SoftBank owned it first.",   priceRange: [80,  180] },
  { ticker: 'MU',   name: 'Micron Technology',        desc: "Makes memory chips. Either brilliant timing or catastrophic timing.", priceRange: [70,  130] },
  { ticker: 'BABA', name: 'Alibaba Group',            desc: "Chinese Amazon. Regulatory risk included at no extra charge.",        priceRange: [70,  120] },
  { ticker: 'PYPL', name: 'PayPal Holdings',          desc: "The original fintech unicorn. Now a large cap nobody talks about.",  priceRange: [55,  90]  },
];

// ── Backstory pool ────────────────────────────────────────────────────────────
const BACKSTORIES = [
  "You just inherited money from your uncle. You've already told your wife's boyfriend it's going to the moon.",
  "You sold your car. Your friends said it was stupid. Prove them wrong. (You won't.)",
  "Your startup failed. This is your last play. The algorithm doesn't care about your feelings.",
  "You found cash in a jacket you forgot you owned. The market opens in five minutes.",
  "You've been banned from three casinos. The stock market has no such restrictions.",
  "Your financial advisor said 'diversify.' You said '0DTE calls.' This is the result.",
  "You read a Reddit post at 2am. It made complete sense at the time.",
  "Your therapist suggested a hobby. This is not what she meant.",
  "You told everyone at Thanksgiving you were 'basically a trader now.' Time to back it up.",
  "You watched a 12-minute YouTube video about options. You are ready.",
  "Your landlord just raised the rent. This is the most logical response.",
  "You've been banned from r/personalfinance. You found your people elsewhere.",
  "You missed GME in 2021. You will not make the same mistake twice. Different mistake, same energy.",
  "Your coworker made 40% last month. He won't say what he bought. This is your revenge.",
  "You've been paper trading for six months. You're ready. (You are not ready.)",
  "The market is irrational. You are also irrational. This is your edge.",
  "You spent three hours reading earnings reports. None of that will help you.",
  "Your ex said you'd never amount to anything. Technically still unproven.",
  "You just got a raise. Your boss will never know where it went.",
  "You maxed out a credit card with 0% APR for 12 months. The clock is ticking.",
  "A stranger on Discord called you 'fren' and shared a chart. You trust him completely.",
  "You've been averaging down for six months. Today you average down one more time.",
  "Your horoscope said today is a good day for bold moves. Gemini season.",
  "You sold your bitcoin at $8,000. You will not discuss this. Moving forward.",
  "Someone on Reddit said this stock 'only goes up.' That's all the DD you need.",
  "You have a spreadsheet. It says buy. The spreadsheet is always right.",
  "You took out a HELOC. Your house believed in you. Honor that.",
  "It's 6am. Pre-market is moving. You haven't slept. You're in the zone.",
  "Your portfolio is down 60% from all-time highs. You are built different.",
];

// ── Starting money pool ───────────────────────────────────────────────────────
const MONEY_SOURCES = [
  "Grandpa's inheritance",
  "Car sold on Facebook Marketplace",
  "Couch cushion money (plus loan)",
  "Saved lunch money (3 years)",
  "Tax return + credit card",
  "\"Investment fund\" (wife doesn't know)",
  "Borrowed from future self",
  "Dog walking side hustle",
  "Last $X in checking account",
  "Go fund me (they think it's for rent)",
];

// ── News event pool ───────────────────────────────────────────────────────────
// expected: conventional market wisdom (often wrong)
const NEWS_POOL = [
  { headline: '{T} CEO tweets rocket emoji, no other context',                    expected: 'up'   },
  { headline: '{T} announces layoffs of 18% of workforce',                        expected: 'up'   }, // layoffs = "efficiency"
  { headline: '{T} beats earnings by 40%. Analysts somehow disappointed.',        expected: 'down' },
  { headline: '{T} misses revenue estimates. Analysts expected worse.',            expected: 'up'   },
  { headline: 'SEC opens informal inquiry into {T}',                              expected: 'down' },
  { headline: '{T} announces $2B stock buyback program',                          expected: 'up'   },
  { headline: '{T} CEO sells 80% of personal stake',                              expected: 'down' },
  { headline: 'Jim Cramer says to buy {T}',                                       expected: 'down' }, // inverse Cramer
  { headline: 'Jim Cramer says to sell {T}',                                      expected: 'up'   }, // inverse Cramer
  { headline: '{T} announces new AI feature nobody asked for',                    expected: 'up'   },
  { headline: '{T} revenue up 200% YoY. Guidance disappoints.',                   expected: 'down' },
  { headline: '{T} reports catastrophic quarter. "Priced in," say analysts.',     expected: 'up'   },
  { headline: 'Elon Musk mentions {T} in a tweet about something else entirely', expected: 'up'   },
  { headline: '{T} announces merger. Other company\'s stock up 30%.',            expected: 'down' },
  { headline: 'Cathie Wood initiates position in {T}',                           expected: 'down' }, // ARK inverse
  { headline: '{T} announces "aggressive cost optimisation." Employees disagree.', expected: 'up' },
  { headline: '{T} data breach exposed. Management says "we take this seriously."', expected: 'up'   },
  { headline: '{T} granted patent for a rectangle',                               expected: 'up'   },
  { headline: '{T} CFO resigns. Replaced by someone named Chad.',                expected: 'up'   },
  { headline: '{T} announces dividend. WSB confused.',                            expected: 'up'   },
  { headline: 'Major hedge fund dumps entire {T} position',                       expected: 'down' },
  { headline: '{T} product recall issued. Details unclear.',                      expected: 'down' },
  { headline: 'Anonymous Reddit post claims {T} has secret moon base',           expected: 'up'   },
  { headline: '{T} bonds downgraded to junk. Equity traders don\'t care.',       expected: 'up'   },
];

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  seed: dailySeed(),
  rng: null,
  startingMoney: 0,
  currentMoney: 0,
  cash: 0,
  sharesOwned:  0,
  shortShares:  0,       // shares currently sold short
  selectedStock: null,   // { ticker, name, desc, startPrice }
  dailyStocks: [],       // 3 stocks shown for selection today
  pricePath:    [],      // pre-generated price array [TICKS]
  currentTick:  0,
  gameInterval: null,
  viewMin:      0,       // dynamic Y-axis lower bound (expands as prices reveal)
  viewMax:      0,       // dynamic Y-axis upper bound
  newsEvents:   [],      // [{tick, reactionTick, headline, direction}]
  newsMap:      {},      // tick -> event, for O(1) lookup
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const els = {
  startingMoney: document.getElementById('starting-money'),
  moneySource:   document.getElementById('money-source'),
  moneyHero:     document.getElementById('money-hero'),
  backstory:     document.getElementById('backstory'),
  btnStart:      document.getElementById('btn-start'),
  seedForm:      document.getElementById('seed-form'),
  seedInput:     document.getElementById('seed-input'),
  btnDaily:      document.getElementById('btn-daily'),
  stocksBody:    document.getElementById('stocks-body'),
  canvasChart:   document.getElementById('canvas-chart'),
  timerDisplay:  document.getElementById('timer-display'),
  pnlDisplay:    document.getElementById('pnl-display'),
  currentPrice:  document.getElementById('current-price'),
  sharesOwned:   document.getElementById('shares-owned'),
  sharesShorted: document.getElementById('shares-shorted'),
  cashDisplay:   document.getElementById('cash-display'),
  tradeTicker:   document.getElementById('trade-ticker'),
  newsTicker:    document.getElementById('news-ticker'),
  resultStats:   document.getElementById('result-stats'),
  finalRank:     document.getElementById('final-rank'),
  finalTagline:  document.getElementById('final-tagline'),
  btnShare:      document.getElementById('btn-share'),
  btnRestart:    document.getElementById('btn-restart'),
};

// ── Screen switching ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Format money ──────────────────────────────────────────────────────────────
function formatMoney(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Init landing screen ───────────────────────────────────────────────────────
function initLanding() {
  const rng = mulberry32(hashSeed(state.seed));
  state.rng = rng;

  // Seeded starting amount: $3,000–$85,000, rounded to nearest $100
  const raw = 3000 + Math.floor(rng() * 82000);
  const amount = Math.round(raw / 100) * 100;
  state.startingMoney = amount;
  state.currentMoney  = amount;

  // Pick backstory and money source
  const backstoryIdx = Math.floor(rng() * BACKSTORIES.length);
  const sourceIdx    = Math.floor(rng() * MONEY_SOURCES.length);

  let backstory = BACKSTORIES[backstoryIdx];
  // Swap placeholder $X in source label with actual amount
  const sourceLabel = MONEY_SOURCES[sourceIdx].replace('$X', formatMoney(amount));

  els.backstory.textContent     = backstory;
  els.startingMoney.textContent = formatMoney(amount);
  els.moneySource.textContent   = sourceLabel;
  els.moneyHero.textContent     = formatMoney(amount);
}

// ── Seed handling ─────────────────────────────────────────────────────────────
function flashSeedLoaded() {
  const card = document.querySelector('.stat-card');
  card.classList.remove('seed-loaded');
  void card.offsetWidth; // reflow to restart animation
  card.classList.add('seed-loaded');
  card.addEventListener('animationend', () => card.classList.remove('seed-loaded'), { once: true });
}

function flashButton(btn, msg, durationMs = 1500) {
  const orig = btn.textContent;
  btn.textContent = msg;
  btn.disabled    = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, durationMs);
}

function loadSeed(seed) {
  state.seed = seed;
  initLanding();
  flashSeedLoaded();
}

els.btnDaily.addEventListener('click', () => {
  loadSeed(dailySeed());
  els.seedInput.value = '';
  flashButton(els.btnDaily, '✓ Loaded');
});

els.seedForm.addEventListener('submit', e => {
  e.preventDefault();
  const val = els.seedInput.value.trim();
  if (!val) return;
  loadSeed(val);
  flashButton(els.seedForm.querySelector('[type="submit"]'), '✓ Loaded');
});

// ── Pick 3 unique stocks from pool (seeded) ───────────────────────────────────
function pickDailyStocks(rng) {
  const pool = [...STOCKS];
  const picks = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(rng() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

// ── Generate seeded starting price within a stock's range ─────────────────────
function seedPrice(rng, stock) {
  const [lo, hi] = stock.priceRange;
  const raw = lo + rng() * (hi - lo);
  return Math.round(raw * 100) / 100;
}

// ── Format price ──────────────────────────────────────────────────────────────
function formatPrice(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Render stock selection cards ──────────────────────────────────────────────
function renderStockCards() {
  els.stocksBody.innerHTML = '';
  state.dailyStocks.forEach((stock, i) => {
    const card = document.createElement('button');
    card.className = 'stock-card';
    card.setAttribute('aria-label', `Select ${stock.ticker}`);
    card.innerHTML = `
      <span class="stock-ticker">${stock.ticker}</span>
      <span class="stock-name">${stock.name}</span>
      <span class="stock-price">${formatPrice(stock.startPrice)}</span>
      <span class="stock-desc">${stock.desc}</span>
      <span class="stock-select-btn">Select →</span>
    `;
    card.addEventListener('click', () => selectStock(stock));
    els.stocksBody.appendChild(card);
  });
}

// ── Rank brackets (ordered by min ROI %) ─────────────────────────────────────
const RANKS = [
  { min: -Infinity, isLoss: true,  emoji: '🪦', name: 'Legendary Regarded',          tagline: 'A historic achievement in value destruction. They will write songs about this.' },
  { min: -50,       isLoss: true,  emoji: '💀', name: 'WSB Hall of Famer',            tagline: 'Lost half your money and never flinched. Deeply regarded. Deeply.' },
  { min: -25,       isLoss: true,  emoji: '📉', name: 'Margin Called',                tagline: 'It was a learning experience. An extremely expensive one.' },
  { min: -10,       isLoss: true,  emoji: '😬', name: 'Bought the Dip (Wrong Dip)',   tagline: "You bought the dip. That was not the dip. The dip was later." },
  { min: -2,        isLoss: false, emoji: '🤷', name: 'SPY Would Have Done Better',   tagline: 'You basically broke even. A perfectly average performance. Boring.' },
  { min:  2,        isLoss: false, emoji: '📊', name: 'Slightly Based',               tagline: "You made money. Barely. Don't get cocky. The market remembers." },
  { min: 10,        isLoss: false, emoji: '🍗', name: 'Tendies Secured',              tagline: "Solid gains. Your wife's boyfriend is begrudgingly impressed." },
  { min: 25,        isLoss: false, emoji: '📈', name: 'Sigma Trader',                 tagline: 'You beat the market. Today. This exact day. Do not generalise.' },
  { min: 50,        isLoss: false, emoji: '🚀', name: 'Hedge Fund Destroyer',         tagline: 'Institutional investors are studying your charts. For legal reasons.' },
  { min: 100,       isLoss: false, emoji: '🎰', name: 'Sir This Was Indeed A Casino', tagline: 'You doubled your money in 60 seconds. Please seek professional help.' },
];

function getRank(roiPct) {
  let result = RANKS[0];
  for (const r of RANKS) {
    if (roiPct >= r.min) result = r;
  }
  return result;
}

// ── Trading constants ─────────────────────────────────────────────────────────
const TICKS   = 600;  // 60 seconds at 10 ticks/s
const TICK_MS = 100;

// ── Generate seeded news events for a trading session ────────────────────────
function generateNewsEvents(rng, ticker) {
  const count = 4 + Math.floor(rng() * 3); // 4–6 events
  const pool  = [...NEWS_POOL];
  const events = [];
  let nextTick = 50 + Math.floor(rng() * 40); // first event: tick 50–90

  for (let i = 0; i < count && pool.length > 0 && nextTick < TICKS - 60; i++) {
    const idx      = Math.floor(rng() * pool.length);
    const template = pool.splice(idx, 1)[0];
    const headline = template.headline.replace('{T}', ticker);

    // 65% follows conventional wisdom, 35% does the opposite
    const expectedUp = template.expected === 'up';
    const actualUp   = rng() < 0.65 ? expectedUp : !expectedUp;
    const magnitude  = 0.020 + rng() * 0.022; // per-tick burst: 0.020–0.042

    events.push({
      tick:         nextTick,
      reactionTick: nextTick + 35,
      headline,
      direction:    actualUp ? 1 : -1,
      magnitude,
    });

    nextTick += 80 + Math.floor(rng() * 40); // gap: 80–120 ticks between events
  }

  return events;
}

// ── Pre-generate full price path from seed ────────────────────────────────────
function generatePricePath(rng, startPrice, events) {
  const prices   = [startPrice];
  let momentum   = 0;
  let newsBurst  = 0;
  const drift    = (rng() - 0.5) * 0.003;

  const eventMap = {};
  events.forEach(e => { eventMap[e.tick] = e; });

  for (let i = 1; i < TICKS; i++) {
    if (eventMap[i]) {
      newsBurst = eventMap[i].direction * eventMap[i].magnitude;
    }
    const noise  = (rng() - 0.5) * 0.014;
    const spike  = rng() < 0.02 ? (rng() - 0.5) * 0.07 : 0; // smaller random spikes — news does the heavy lifting
    momentum  = momentum * 0.65 + noise * 0.35;
    newsBurst *= 0.88; // decays to ~2% after 30 ticks
    prices.push(Math.max(0.01, prices[i - 1] * (1 + momentum + spike + drift + newsBurst)));
  }
  return prices;
}

// ── Chart drawing ─────────────────────────────────────────────────────────────
const PAD_R = 78;
const PAD_Y = 18;

function drawPriceLabels(ctx, chartW, chartH, yMin, yRange) {
  ctx.fillStyle  = 'rgba(100, 116, 139, 0.75)';
  ctx.font       = '11px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign  = 'left';
  for (let i = 0; i <= 5; i++) {
    const p = yMin + (yRange / 5) * (5 - i);
    const y = PAD_Y + (chartH / 5) * i;
    ctx.fillText(formatPrice(p), chartW + 4, y + 4);
  }
}

function drawChart() {
  const canvas = els.canvasChart;
  const ctx    = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, W, H);

  const tick       = state.currentTick;
  const prices     = state.pricePath;
  const startPrice = state.selectedStock.startPrice;
  const chartW     = W - PAD_R;
  const chartH     = H - PAD_Y * 2;
  const yMin       = state.viewMin;
  const yMax       = state.viewMax;
  const yRange     = yMax - yMin || 1;

  const toX = t => (t / (TICKS - 1)) * chartW;
  const toY = p => PAD_Y + chartH - ((p - yMin) / yRange) * chartH;

  // Grid
  ctx.strokeStyle = 'rgba(0, 200, 5, 0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = PAD_Y + (chartH / 5) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
  }

  // Start price dashed line
  const startY = toY(startPrice);
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(0, startY); ctx.lineTo(chartW, startY); ctx.stroke();
  ctx.setLineDash([]);

  // Dim the unplayed future
  if (tick < TICKS - 1) {
    ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
    ctx.fillRect(toX(tick + 1), PAD_Y, chartW - toX(tick + 1), chartH);
  }

  // News event markers (vertical tick lines at event ticks)
  state.newsEvents.forEach(e => {
    if (e.tick > tick) return;
    const mx = toX(e.tick);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(mx, PAD_Y); ctx.lineTo(mx, PAD_Y + chartH); ctx.stroke();
    ctx.setLineDash([]);
    // Arrow indicator
    ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.font      = '11px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.direction > 0 ? '▲' : '▼', mx, PAD_Y + 10);
  });

  drawPriceLabels(ctx, chartW, chartH, yMin, yRange);
  if (tick < 1) return;

  const currentPrice = prices[tick];
  const isUp         = currentPrice >= startPrice;
  const lineColor    = isUp ? '#00c805' : '#ff3b30';
  const fillColor    = isUp ? 'rgba(0, 200, 5, 0.13)' : 'rgba(255, 59, 48, 0.13)';

  // Filled area between line and start price
  ctx.beginPath();
  ctx.moveTo(toX(0), startY);
  for (let t = 0; t <= tick; t++) ctx.lineTo(toX(t), toY(prices[t]));
  ctx.lineTo(toX(tick), startY);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Price line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(prices[0]));
  for (let t = 1; t <= tick; t++) ctx.lineTo(toX(t), toY(prices[t]));
  ctx.strokeStyle = lineColor;
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Current price dot
  const dotX = toX(tick);
  const dotY = toY(currentPrice);
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
  ctx.fillStyle   = lineColor;
  ctx.fill();
  ctx.strokeStyle = '#050810';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Current price label (overlay, right of dot)
  ctx.fillStyle = lineColor;
  ctx.font      = 'bold 12px "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatPrice(currentPrice), chartW + 4, dotY + 4);
}

// ── Portfolio value ───────────────────────────────────────────────────────────
// cash + long value - short liability
function portfolioValue() {
  const price = state.pricePath[state.currentTick];
  return state.cash + state.sharesOwned * price - state.shortShares * price;
}

// ── Refresh all trading HUD elements ─────────────────────────────────────────
function updateTradingUI() {
  const price    = state.pricePath[state.currentTick];
  const pnl      = portfolioValue() - state.startingMoney;
  const secsLeft = Math.ceil((TICKS - state.currentTick) / 10);
  const isUp     = price >= state.selectedStock.startPrice;

  els.currentPrice.textContent  = formatPrice(price);
  els.currentPrice.className    = 'current-price' + (isUp ? '' : ' down');

  els.pnlDisplay.textContent    = (pnl >= 0 ? '+' : '') + formatMoney(pnl);
  els.pnlDisplay.className      = pnl >= 0 ? '' : 'down';

  els.timerDisplay.textContent  = secsLeft;
  els.sharesOwned.textContent   = state.sharesOwned.toLocaleString();
  els.sharesShorted.textContent = state.shortShares.toLocaleString();
  els.cashDisplay.textContent   = formatMoney(state.cash);

  // Long buttons
  document.querySelectorAll('.btn-buy[data-qty]').forEach(btn => {
    btn.disabled = price * parseInt(btn.dataset.qty, 10) > state.cash;
  });
  document.getElementById('btn-buy-max').disabled = price > state.cash;
  document.querySelectorAll('.btn-sell[data-qty]').forEach(btn => {
    btn.disabled = state.sharesOwned < parseInt(btn.dataset.qty, 10);
  });
  document.getElementById('btn-sell-all').disabled = state.sharesOwned === 0;

  // Short buttons — limited to cash available (prevents infinite leverage)
  document.querySelectorAll('.btn-short[data-qty]').forEach(btn => {
    btn.disabled = price * parseInt(btn.dataset.qty, 10) > state.cash;
  });
  document.getElementById('btn-short-max').disabled = price > state.cash;
  document.querySelectorAll('.btn-cover[data-qty]').forEach(btn => {
    btn.disabled = state.shortShares < parseInt(btn.dataset.qty, 10);
  });
  document.getElementById('btn-cover-all').disabled = state.shortShares === 0;
}

// ── Long: Buy / Sell ──────────────────────────────────────────────────────────
function buy(qty) {
  const price  = state.pricePath[state.currentTick];
  const canBuy = Math.min(qty, Math.floor(state.cash / price));
  if (canBuy < 1) return;
  state.cash        -= canBuy * price;
  state.sharesOwned += canBuy;
  updateTradingUI();
}

function buyMax() {
  buy(Math.floor(state.cash / state.pricePath[state.currentTick]));
}

function sell(qty) {
  const price   = state.pricePath[state.currentTick];
  const canSell = Math.min(qty, state.sharesOwned);
  if (canSell < 1) return;
  state.cash        += canSell * price;
  state.sharesOwned -= canSell;
  updateTradingUI();
}

function sellAll() { sell(state.sharesOwned); }

// ── Short: Open / Cover ───────────────────────────────────────────────────────
// Open short: borrow shares and sell them, receiving cash now
// Cover short: buy shares back to close the position
function openShort(qty) {
  const price    = state.pricePath[state.currentTick];
  const canShort = Math.min(qty, Math.floor(state.cash / price));
  if (canShort < 1) return;
  state.cash        += canShort * price;  // receive sale proceeds
  state.shortShares += canShort;
  updateTradingUI();
}

function shortMax() {
  openShort(Math.floor(state.cash / state.pricePath[state.currentTick]));
}

function coverShort(qty) {
  const price    = state.pricePath[state.currentTick];
  const canCover = Math.min(qty, state.shortShares);
  if (canCover < 1) return;
  state.cash        -= canCover * price;  // pay to buy back borrowed shares
  state.shortShares -= canCover;
  updateTradingUI();
}

function coverAll() { coverShort(state.shortShares); }

// ── End of trading day ────────────────────────────────────────────────────────
function endDay() {
  clearInterval(state.gameInterval);
  state.gameInterval = null;

  const finalPrice = state.pricePath[TICKS - 1];
  state.cash       += state.sharesOwned * finalPrice;
  state.cash       -= state.shortShares * finalPrice; // cover shorts at final price
  state.sharesOwned = 0;
  state.shortShares = 0;

  const pnl    = state.cash - state.startingMoney;
  const pnlPct = (pnl / state.startingMoney) * 100;
  const rank   = getRank(pnlPct);

  // Stats pills
  els.resultStats.innerHTML = `
    <div class="stat-pill neutral">
      <span class="label">Stock</span>
      <span class="value">${state.selectedStock.ticker}</span>
    </div>
    <div class="stat-pill neutral">
      <span class="label">Started With</span>
      <span class="value">${formatMoney(state.startingMoney)}</span>
    </div>
    <div class="stat-pill ${pnl >= 0 ? 'gain' : 'loss'}">
      <span class="label">Ended With</span>
      <span class="value">${formatMoney(state.cash)}</span>
    </div>
    <div class="stat-pill ${pnl >= 0 ? 'gain' : 'loss'}">
      <span class="label">P&amp;L</span>
      <span class="value">${pnl >= 0 ? '+' : ''}${formatMoney(pnl)}</span>
    </div>
    <div class="stat-pill ${pnl >= 0 ? 'gain' : 'loss'}">
      <span class="label">Return</span>
      <span class="value">${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%</span>
    </div>
  `;

  // Rank
  els.finalRank.textContent    = rank.emoji + ' ' + rank.name;
  els.finalTagline.textContent = rank.tagline;
  els.finalRank.className      = 'final-title' + (rank.isLoss ? ' loss' : '');

  // News recap
  const recapEl = document.getElementById('news-recap');
  recapEl.innerHTML = '<p class="recap-title">Today\'s news</p>' +
    state.newsEvents.map(e => `
      <div class="recap-event">
        <span class="recap-headline">${e.headline}</span>
        <span class="recap-reaction ${e.direction > 0 ? 'up' : 'down'}">${e.direction > 0 ? '📈' : '📉'}</span>
      </div>
    `).join('');

  showScreen('screen-results');
}

// ── Show news headline ────────────────────────────────────────────────────────
function showHeadline(text, isReaction) {
  els.newsTicker.textContent = text;
  els.newsTicker.classList.remove('breaking', 'reaction');
  void els.newsTicker.offsetWidth; // force reflow for re-trigger
  els.newsTicker.classList.add(isReaction ? 'reaction' : 'breaking');
}

// ── Init trading session ──────────────────────────────────────────────────────
function initTrading() {
  const stock    = state.selectedStock;
  const newsRng  = mulberry32(hashSeed(state.seed + '-news-' + stock.ticker));
  const priceRng = mulberry32(hashSeed(state.seed + '-price-' + stock.ticker));

  state.newsEvents = generateNewsEvents(newsRng, stock.ticker);
  state.newsMap    = {};
  state.newsEvents.forEach(e => {
    state.newsMap[e.tick]         = { type: 'headline', event: e };
    state.newsMap[e.reactionTick] = { type: 'reaction', event: e };
  });

  state.pricePath   = generatePricePath(priceRng, stock.startPrice, state.newsEvents);
  state.currentTick = 0;
  state.shortShares = 0;

  // Start Y-axis centered on start price with ±18% window; expands as prices reveal
  const pad = stock.startPrice * 0.18;
  state.viewMin = stock.startPrice - pad;
  state.viewMax = stock.startPrice + pad;

  els.tradeTicker.textContent = stock.ticker;
  showHeadline('Markets are open. Do something regarded.', false);

  updateTradingUI();
  drawChart();

  state.gameInterval = setInterval(() => {
    state.currentTick++;

    // Expand Y view to fit newly revealed price (never shrink)
    const p = state.pricePath[state.currentTick];
    const padded = (state.viewMax - state.viewMin) * 0.05;
    if (p < state.viewMin + padded) state.viewMin = p - padded;
    if (p > state.viewMax - padded) state.viewMax = p + padded;

    // News events
    const newsEntry = state.newsMap[state.currentTick];
    if (newsEntry) {
      if (newsEntry.type === 'headline') {
        showHeadline('📰 BREAKING: ' + newsEntry.event.headline, false);
      } else {
        const up = newsEntry.event.direction > 0;
        showHeadline((up ? '📈 Market loved it.' : '📉 Market hated it.'), true);
      }
    }

    drawChart();
    updateTradingUI();
    if (state.currentTick >= TICKS - 1) endDay();
  }, TICK_MS);
}

// ── Stock selected ────────────────────────────────────────────────────────────
function selectStock(stock) {
  state.selectedStock = stock;
  state.cash          = state.startingMoney;
  state.sharesOwned   = 0;
  state.shortShares   = 0;
  showScreen('screen-trading');
  initTrading();
}

// ── Init stock selection screen ───────────────────────────────────────────────
function initStockSelection() {
  // Use a fresh RNG fork from the same seed so stock picks are always consistent
  const rng = mulberry32(hashSeed(state.seed + '-stocks'));
  state.dailyStocks = pickDailyStocks(rng).map(s => ({
    ...s,
    startPrice: seedPrice(rng, s),
  }));
  renderStockCards();
}

// ── Start button ──────────────────────────────────────────────────────────────
els.btnStart.addEventListener('click', () => {
  initStockSelection();
  showScreen('screen-stocks');
});

// ── Buy / Sell button listeners ───────────────────────────────────────────────
document.querySelectorAll('.btn-buy[data-qty]').forEach(btn => {
  btn.addEventListener('click', () => buy(parseInt(btn.dataset.qty, 10)));
});
document.getElementById('btn-buy-max').addEventListener('click', buyMax);
document.querySelectorAll('.btn-sell[data-qty]').forEach(btn => {
  btn.addEventListener('click', () => sell(parseInt(btn.dataset.qty, 10)));
});
document.getElementById('btn-sell-all').addEventListener('click', sellAll);
document.querySelectorAll('.btn-short[data-qty]').forEach(btn => {
  btn.addEventListener('click', () => openShort(parseInt(btn.dataset.qty, 10)));
});
document.getElementById('btn-short-max').addEventListener('click', shortMax);
document.querySelectorAll('.btn-cover[data-qty]').forEach(btn => {
  btn.addEventListener('click', () => coverShort(parseInt(btn.dataset.qty, 10)));
});
document.getElementById('btn-cover-all').addEventListener('click', coverAll);

// ── Share ─────────────────────────────────────────────────────────────────────
els.btnShare.addEventListener('click', () => {
  const pnl    = state.cash - state.startingMoney;
  const pnlPct = (pnl / state.startingMoney) * 100;
  const rank   = getRank(pnlPct);
  const d      = new Date();
  const date   = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const newsLine = state.newsEvents.map(e => e.direction > 0 ? '📈' : '📉').join('');
  const pageUrl  = window.location.href.split('?')[0] + '?seed=' + encodeURIComponent(state.seed);

  const text = [
    '🎰 Sir, This Is A Casino',
    `${date} · ${state.selectedStock.ticker}`,
    '',
    `Started: ${formatMoney(state.startingMoney)}`,
    `Ended:   ${formatMoney(state.cash)}`,
    `Return:  ${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`,
    '',
    `${rank.emoji} ${rank.name}`,
    '',
    pageUrl,
  ].join('\n');

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        const orig = els.btnShare.textContent;
        els.btnShare.textContent = '✅ Copied!';
        setTimeout(() => { els.btnShare.textContent = orig; }, 2000);
      })
      .catch(() => { prompt('Copy your result:', text); });
  } else {
    prompt('Copy your result:', text);
  }
});

// ── Restart ───────────────────────────────────────────────────────────────────
els.btnRestart.addEventListener('click', () => {
  if (state.gameInterval) { clearInterval(state.gameInterval); state.gameInterval = null; }
  initLanding();
  showScreen('screen-landing');
});

// ── Boot — auto-load seed from URL param if present ───────────────────────────
const urlSeed = new URLSearchParams(window.location.search).get('seed');
if (urlSeed) {
  els.seedInput.value = urlSeed;
  loadSeed(urlSeed);
} else {
  initLanding();
}

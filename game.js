'use strict';
/* ============================================================
   BUCK TYCOON — a 2D shop-yard tycoon.
   Buy items from 20 themed shops (600 items, unlimited stock),
   place them in each shop's yard, run through them to collect
   yellow "bucks" bills. Sell back at the red carpet for 50%.
   ============================================================ */

// ---------------- utils ----------------
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) {
    const v = n < 10 && n % 1 ? Math.round(n * 10) / 10 : Math.floor(n);
    return String(v);
  }
  let u = 0;
  while (n >= 1000 && u < UNITS.length - 1) { n /= 1000; u++; }
  const v = n >= 100 ? Math.round(n) : n >= 10 ? Math.round(n * 10) / 10 : Math.round(n * 100) / 100;
  return v + UNITS[u];
}
function sig(n, d = 3) { // round to d significant digits
  if (n <= 0) return 0;
  const p = Math.pow(10, d - 1 - Math.floor(Math.log10(n)));
  return Math.round(n * p) / p;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ---------------- item catalog (600 items, unlimited stock) ----------------
const SHOPS = 20, PER_SHOP = 30, ITEM_COUNT = SHOPS * PER_SHOP;
const PRICE_MIN = 50, PRICE_MAX = 100e12;   // 100T
const INC_MIN = 1,   INC_MAX = 50e9;        // 50B/s

const THEMES = [
  { shop: 'Penny Market',      hue: 42,  emojis: ['🍋','🍪','🐷','📰','🍬'], adjs: ['Tiny','Shiny','Lucky','Cozy','Neat','Snug'],       nouns: ['Lemonade Stand','Cookie Jar','Piggy Bank','News Stack','Gumball Machine'] },
  { shop: 'Toy Shop',          hue: 200, emojis: ['🧸','🪁','🤖','🧩','🎲'], adjs: ['Cuddly','Windy','Glassy','Wind-Up','Jumbo','Mini'],   nouns: ['Teddy Bear','Kite','Marble Set','Toy Robot','Puzzle Box'] },
  { shop: 'Snack Stand',       hue: 20,  emojis: ['🌭','🥨','🥤','🍿','🍦'], adjs: ['Toasty','Salty','Fizzy','Buttery','Frosty','Zesty'],  nouns: ['Hot Dog Cart','Pretzel Warmer','Soda Fountain','Popcorn Popper','Ice Cream Tub'] },
  { shop: 'Farm Plot',         hue: 100, emojis: ['🐔','🌽','🐝','🐐','🚜'], adjs: ['Clucky','Dusty','Golden','Buzzy','Grassy','Muddy'],   nouns: ['Chicken Coop','Scarecrow','Corn Row','Beehive','Goat Pen'] },
  { shop: 'Garden Center',     hue: 140, emojis: ['🌹','🪴','⛲','🐟','🌻'], adjs: ['Rosy','Twisty','Splashy','Leafy','Sunny','Fancy'],     nouns: ['Rose Bush','Bonsai Tree','Stone Fountain','Greenhouse','Koi Pond'] },
  { shop: 'Arcade Zone',       hue: 280, emojis: ['🕹️','👾','🎯','💃','🎰'], adjs: ['Neon','Retro','Flashy','Pixel','Cosmic','Turbo'],     nouns: ['Pinball Machine','Claw Crane','Dance Pad','Air Hockey','Prize Wheel'] },
  { shop: 'Auto Garage',       hue: 10,  emojis: ['🛵','🏎️','🔧','🚗','🛞'], adjs: ['Zippy','Chrome','Tuned','Greasy','Slick','Rocket'],    nouns: ['Scooter','Go-Kart','Tuning Bench','Car Lift','Paint Booth'] },
  { shop: 'Tech Store',        hue: 210, emojis: ['🛸','🦾','🖨️','🖥️','🥽'], adjs: ['Quantum','Silent','Laser','Smart','Holo','Nano'],     nouns: ['Drone','Robot Arm','3D Printer','Server Rack','VR Pod'] },
  { shop: 'Boutique',          hue: 320, emojis: ['🧣','⌚','💍','👜','💎'], adjs: ['Silken','Golden','Velvet','Crystal','Plush','Pearly'], nouns: ['Silk Scarf','Wrist Watch','Perfume Case','Diamond Ring','Designer Bag'] },
  { shop: 'Restaurant Row',    hue: 30,  emojis: ['🍣','🍕','🥩','🍜','🍰'], adjs: ['Savory','Cheesy','Sizzling','Steamy','Sweet','Spicy'], nouns: ['Sushi Bar','Pizza Oven','Grill Station','Ramen Cart','Dessert Lab'] },
  { shop: 'Movie Studio',      hue: 260, emojis: ['🎬','🎥','🌟','🎞️','📽️'], adjs: ['Glam','Silver','Epic','Starlit','Reel','Prime'],     nouns: ['Camera Crane','Green Screen','Star Trailer','Prop Vault','Edit Suite'] },
  { shop: 'Bank Branch',       hue: 50,  emojis: ['🏧','🏦','🥇','💰','🪙'], adjs: ['Solid','Gilded','Secure','Marble','Royal','Prime'],   nouns: ['ATM','Vault Door','Gold Bar Stack','Teller Bot','Money Press'] },
  { shop: 'Space Port',        hue: 230, emojis: ['🚀','🛰️','🌕','👽','🛰️'], adjs: ['Lunar','Orbital','Astro','Cosmic','Solar','Stellar'], nouns: ['Rocket','Moon Rover','Satellite','Space Pod','Alien Dome'] },
  { shop: 'Ocean World',       hue: 190, emojis: ['🤿','🐚','🦪','🌊','🐋'], adjs: ['Briny','Pearly','Coral','Tidal','Deep','Frothy'],     nouns: ['Submarine','Coral Farm','Pearl Oyster','Wave Pool','Aqua Lab'] },
  { shop: 'Sky City',          hue: 205, emojis: ['☁️','🚡','💨','🎈','🌩️'], adjs: ['Cloudy','Breezy','Soaring','Stormy','Airy','Misty'],  nouns: ['Cloud Condo','Sky Tram','Wind Turbine','Airship','Storm Catcher'] },
  { shop: 'Volcano Works',     hue: 15,  emojis: ['🌋','🔥','⛏️','🗿','💥'], adjs: ['Molten','Blazing','Smoky','Ember','Ashen','Fiery'],    nouns: ['Lava Forge','Magma Drill','Obsidian Mine','Ember Golem','Ash Refinery'] },
  { shop: 'Time Lab',          hue: 270, emojis: ['⏳','🕰️','🦉','⏰','🔮'], adjs: ['Tick-Tock','Ancient','Swift','Loopy','Chrono','Primeval'], nouns: ['Hourglass','Clockwork Owl','Time Machine','Paradox Box','Chrono Core'] },
  { shop: 'Dream Factory',     hue: 300, emojis: ['💤','🌟','🌙','🎭','😴'], adjs: ['Sleepy','Fluffy','Starry','Misty','Lucid','Silky'],   nouns: ['Cloud Loom','Star Jar','Moon Cradle','Dream Theater','Sandman Bot'] },
  { shop: 'Galaxy Mall',       hue: 250, emojis: ['🌌','⭐','☄️','🕳️','🌠'], adjs: ['Nebula','Comet','Astral','Void','Nova','Hyper'],       nouns: ['Star Forge','Comet Ranch','Black Hole Bin','Galaxy Tree','Meteor Mine'] },
  { shop: 'Infinity Emporium', hue: 175, emojis: ['♾️','🌐','🚪','👑','✨'], adjs: ['Infinite','Eternal','Divine','Omega','Mythic','Celestial'], nouns: ['Universe Seed','Multiverse Gate','Eternity Engine','Omni Crown','Reality Loom'] },
];

const ITEMS = [];
for (let s = 0; s < SHOPS; s++) {
  const T = THEMES[s];
  for (let j = 0; j < PER_SHOP; j++) {
    const i = s * PER_SHOP + j;
    const f = i / (ITEM_COUNT - 1);
    const price  = i === 0 ? PRICE_MIN : sig(PRICE_MIN * Math.pow(PRICE_MAX / PRICE_MIN, f));
    const income = i === 0 ? INC_MIN   : sig(INC_MIN * Math.pow(INC_MAX / INC_MIN, f));
    ITEMS.push({
      id: i, shop: s,
      name: T.adjs[j % 6] + ' ' + T.nouns[Math.floor(j / 6) % 5],
      emoji: T.emojis[j % T.emojis.length],
      hue: (T.hue + j * 4) % 360,
      price, income,
      sprite: null, spriteURL: null,
    });
  }
}

// ---------------- sprites ----------------
function drawItemSprite(item) {
  if (item.sprite) return item.sprite;
  const S = 96, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, `hsl(${item.hue},72%,74%)`);
  grad.addColorStop(1, `hsl(${item.hue},62%,55%)`);
  roundRect(g, 4, 4, S - 8, S - 8, S * 0.22);
  g.fillStyle = grad; g.fill();
  g.lineWidth = 4; g.strokeStyle = `hsl(${item.hue},60%,38%)`; g.stroke();
  // shine
  roundRect(g, 12, 10, S - 24, S * 0.3, S * 0.14);
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fill();
  // emoji (opaque fillStyle required — fillStyle alpha washes out color emoji)
  g.fillStyle = '#000';
  g.font = `${S * 0.56}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(item.emoji, S / 2, S / 2 + S * 0.05);
  item.sprite = c;
  return c;
}
function itemSpriteURL(item) {
  if (!item.spriteURL) item.spriteURL = drawItemSprite(item).toDataURL();
  return item.spriteURL;
}

// yellow "bucks" bill
let BILL = null;
function drawBill() {
  if (BILL) return BILL;
  const W = 72, H = 46, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  roundRect(g, 2, 2, W - 4, H - 4, 6);
  g.fillStyle = '#ffd93d'; g.fill();
  g.lineWidth = 3; g.strokeStyle = '#c99b12'; g.stroke();
  roundRect(g, 7, 7, W - 14, H - 14, 4);
  g.setLineDash([4, 3]); g.lineWidth = 1.5; g.strokeStyle = '#c99b12aa'; g.stroke();
  g.setLineDash([]);
  g.beginPath(); g.arc(W / 2, H / 2, 12, 0, Math.PI * 2);
  g.fillStyle = '#ffe873'; g.fill();
  g.lineWidth = 2; g.strokeStyle = '#c99b12'; g.stroke();
  g.fillStyle = '#8a6508'; g.font = '800 15px "Trebuchet MS",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('B', W / 2, H / 2 + 1);
  BILL = c;
  return c;
}
const BILL_URL = (() => { return drawBill().toDataURL(); })();

// ---------------- world geometry ----------------
const SHOP_W = 300, STALL_Y = 110, STALL_H = 165;
const YARD_Y = 330, YARD_H = 300, YARD_COLS = 6, YARD_ROWS = 6, SLOTS_PER_YARD = YARD_COLS * YARD_ROWS;
const WORLD_X0 = 360;
const WORLD_W = WORLD_X0 + SHOPS * SHOP_W + 80;
const WORLD_H = 880;
const SLOT = 36, SLOT_GAP = 6, YARD_PAD = 12;

const shopStall = s => ({ x: WORLD_X0 + s * SHOP_W + 26, y: STALL_Y, w: SHOP_W - 52, h: STALL_H });
const yardRect  = s => ({ x: WORLD_X0 + s * SHOP_W + 14, y: YARD_Y, w: SHOP_W - 28, h: YARD_H });
function slotRect(s, i) {
  const r = yardRect(s), col = i % YARD_COLS, row = Math.floor(i / YARD_COLS);
  return { x: r.x + YARD_PAD + col * (SLOT + SLOT_GAP), y: r.y + YARD_PAD + row * (SLOT + SLOT_GAP), w: SLOT, h: SLOT };
}
const SELL_STALL = { x: 66, y: STALL_Y, w: 224, h: STALL_H };
const SELL_ZONE  = { x: 40, y: YARD_Y, w: 280, h: YARD_H };
const inRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

// ---------------- state ----------------
const SAVE_KEY = 'buckTycoonSave1';
const state = {
  money: 100,
  inv: {},                          // itemId -> count (unplaced)
  yards: [],                        // per shop: array[SLOTS] of {id, stored} | 0
  carry: null,                      // {id}
  ips: 0,
  muted: false,
};
for (let s = 0; s < SHOPS; s++) state.yards.push(new Array(SLOTS_PER_YARD).fill(0));

const player = { x: 200, y: 700, r: 16, speed: 300, moving: false, dir: 1, bob: 0 };
const mouse = { x: 0, y: 0, wx: 0, wy: 0 };
let camX = 0, camY = 0;
let panelShop = -1;                 // which shop panel is open
let popups = [];                    // {x,y,txt,col,life}
let toasts = [];
let lastCollectSnd = 0;

function recomputeIPS() {
  let sum = 0;
  for (let s = 0; s < SHOPS; s++)
    for (const slot of state.yards[s])
      if (slot) sum += ITEMS[slot.id].income;
  state.ips = sum;
}

// ---------------- audio ----------------
let AC = null;
function beep(f, d = 0.08, type = 'square', g = 0.05, slide = 0) {
  if (state.muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), gn = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, AC.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), AC.currentTime + d);
    gn.gain.setValueAtTime(g, AC.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(gn).connect(AC.destination);
    o.start(); o.stop(AC.currentTime + d + 0.02);
  } catch (e) { /* audio unavailable */ }
}
const sndCollect = () => beep(760 + Math.random() * 300, 0.07, 'sine', 0.045, 500);
const sndBuy = () => { beep(620, 0.09, 'square', 0.05); setTimeout(() => beep(930, 0.12, 'square', 0.05), 70); };
const sndPlace = () => beep(330, 0.09, 'triangle', 0.07, 120);
const sndSell = () => { beep(500, 0.1, 'sine', 0.06); setTimeout(() => beep(750, 0.14, 'sine', 0.06), 80); };
const sndErr = () => beep(150, 0.16, 'sawtooth', 0.05, -60);

// ---------------- static world layer ----------------
const SS = 1.5; // supersample
let staticC = null;
function buildStatic() {
  staticC = document.createElement('canvas');
  staticC.width = WORLD_W * SS; staticC.height = WORLD_H * SS;
  const g = staticC.getContext('2d');
  g.scale(SS, SS);
  const rng = mulberry32(1337);

  // grass
  g.fillStyle = '#79c74f'; g.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let i = 0; i < 2600; i++) {
    const x = rng() * WORLD_W, y = rng() * WORLD_H;
    g.fillStyle = rng() < 0.5 ? 'rgba(0,60,0,0.05)' : 'rgba(255,255,255,0.05)';
    g.beginPath(); g.arc(x, y, 2 + rng() * 8, 0, Math.PI * 2); g.fill();
  }
  // flowers
  for (let i = 0; i < 260; i++) {
    const x = rng() * WORLD_W, y = 640 + rng() * 220;
    g.fillStyle = ['#ff8fb3', '#fff', '#ffd93d', '#c3a6ff'][Math.floor(rng() * 4)];
    g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
  }

  // walking path
  g.fillStyle = '#d9c49a'; g.fillRect(0, 648, WORLD_W, 62);
  g.fillStyle = '#c9b184'; g.fillRect(0, 648, WORLD_W, 5); g.fillRect(0, 705, WORLD_W, 5);
  for (let x = 10; x < WORLD_W; x += 46) {
    g.fillStyle = 'rgba(120,95,55,0.25)';
    g.beginPath(); g.arc(x + rng() * 20, 656 + rng() * 46, 3 + rng() * 3, 0, Math.PI * 2); g.fill();
  }

  // trees along top and bottom
  const tree = (x, y, s) => {
    g.fillStyle = 'rgba(0,0,0,0.15)';
    g.beginPath(); g.ellipse(x, y + 26 * s, 22 * s, 7 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a4a22'; g.fillRect(x - 4 * s, y, 8 * s, 26 * s);
    for (const [dx, dy, r] of [[0, -14, 22], [-14, -2, 15], [14, -2, 15]]) {
      g.fillStyle = '#3f8f3a';
      g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#55ad4d';
      g.beginPath(); g.arc(x + dx * s - 4 * s, y + dy * s - 5 * s, r * 0.55 * s, 0, Math.PI * 2); g.fill();
    }
  };
  for (let x = 30; x < WORLD_W; x += 130 + rng() * 120) tree(x, 52 + rng() * 20, 0.8 + rng() * 0.5);
  for (let x = 70; x < WORLD_W; x += 170 + rng() * 160) tree(x, 800 + rng() * 40, 0.9 + rng() * 0.6);

  // ---- sell area ----
  g.fillStyle = '#b03030';
  roundRect(g, SELL_ZONE.x, SELL_ZONE.y, SELL_ZONE.w, SELL_ZONE.h, 14); g.fill();
  g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeStyle = '#ffd93d';
  roundRect(g, SELL_ZONE.x + 8, SELL_ZONE.y + 8, SELL_ZONE.w - 16, SELL_ZONE.h - 16, 10); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '800 34px "Trebuchet MS",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SELL', SELL_ZONE.x + SELL_ZONE.w / 2, SELL_ZONE.y + 60);
  g.font = '700 18px "Trebuchet MS",sans-serif';
  g.fillText('50% back', SELL_ZONE.x + SELL_ZONE.w / 2, SELL_ZONE.y + 92);
  g.drawImage(drawBill(), SELL_ZONE.x + SELL_ZONE.w / 2 - 36, SELL_ZONE.y + 116);
  drawStall(g, SELL_STALL, 0, 'SELL-BACK', '💵', true);

  // ---- shops & yards ----
  for (let s = 0; s < SHOPS; s++) {
    const T = THEMES[s];
    // yard soil
    const y = yardRect(s);
    g.fillStyle = '#b5895a';
    roundRect(g, y.x, y.y, y.w, y.h, 10); g.fill();
    g.strokeStyle = 'rgba(90,55,20,0.35)'; g.lineWidth = 2;
    for (let r = 1; r < 6; r++) {
      g.beginPath(); g.moveTo(y.x + 8, y.y + r * (y.h / 6)); g.lineTo(y.x + y.w - 8, y.y + r * (y.h / 6)); g.stroke();
    }
    // fence
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 4;
    g.strokeRect(y.x - 4, y.y - 4, y.w + 8, y.h + 8);
    g.fillStyle = '#6e451e';
    for (let fx = y.x - 4; fx <= y.x + y.w + 4; fx += 34) { g.fillRect(fx - 3, y.y - 10, 6, 12); g.fillRect(fx - 3, y.y + y.h - 2, 6, 12); }
    // shop number plate on fence
    g.fillStyle = '#5c3a15';
    roundRect(g, y.x + y.w / 2 - 16, y.y - 12, 32, 18, 5); g.fill();
    g.fillStyle = '#ffe873'; g.font = '800 12px "Trebuchet MS",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(s + 1), y.x + y.w / 2, y.y - 3);

    drawStall(g, shopStall(s), T.hue, (s + 1) + '. ' + T.shop, T.emojis[0], false);
  }
}
function drawStall(g, st, hue, label, emoji, isSell) {
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.ellipse(st.x + st.w / 2, st.y + st.h + 8, st.w / 2, 12, 0, 0, Math.PI * 2); g.fill();
  // back wall
  g.fillStyle = isSell ? '#7d2323' : '#8a6238';
  roundRect(g, st.x, st.y + 30, st.w, st.h - 30, 8); g.fill();
  // window
  g.fillStyle = isSell ? '#a83232' : '#f3e6c8';
  roundRect(g, st.x + 14, st.y + 44, st.w - 28, st.h - 88, 6); g.fill();
  g.font = '46px "Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(emoji, st.x + st.w / 2, st.y + 44 + (st.h - 88) / 2 + 2);
  // counter
  g.fillStyle = isSell ? '#5c1a1a' : '#6e451e';
  roundRect(g, st.x - 6, st.y + st.h - 40, st.w + 12, 34, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(st.x - 6, st.y + st.h - 40, st.w + 12, 6);
  // awning
  const stripeW = st.w / 8;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#fff6e0' : (isSell ? '#d23c3c' : `hsl(${hue},72%,58%)`);
    g.fillRect(st.x - 8 + i * (st.w + 16) / 8, st.y, (st.w + 16) / 8, 30);
  }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(st.x - 8, st.y + 26, st.w + 16, 6);
  // sign
  g.fillStyle = '#3c2a10';
  roundRect(g, st.x + 6, st.y - 36, st.w - 12, 28, 8); g.fill();
  g.strokeStyle = '#ffe87355'; g.lineWidth = 2;
  roundRect(g, st.x + 6, st.y - 36, st.w - 12, 28, 8); g.stroke();
  g.fillStyle = '#ffe873'; g.font = '800 13px "Trebuchet MS",sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, st.x + st.w / 2, st.y - 22, st.w - 24);
}

// ---------------- save / load ----------------
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, money: Math.round(state.money), inv: state.inv,
      yards: state.yards.map(y => y.map(s => s ? { i: s.id, s: Math.round(s.stored) } : 0)),
    }));
  } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return false;
    state.money = typeof d.money === 'number' && d.money >= 0 ? d.money : 100;
    state.inv = {};
    for (const k in (d.inv || {})) {
      const id = +k, c = d.inv[k] | 0;
      if (id >= 0 && id < ITEM_COUNT && c > 0) state.inv[id] = Math.min(c, 9999);
    }
    if (Array.isArray(d.yards)) {
      for (let s = 0; s < SHOPS; s++) {
        const y = d.yards[s];
        if (!Array.isArray(y)) continue;
        for (let i = 0; i < Math.min(y.length, SLOTS_PER_YARD); i++) {
          const c = y[i];
          if (c && c.i >= 0 && c.i < ITEM_COUNT && ITEMS[c.i].shop === s) {
            state.yards[s][i] = { id: c.i, stored: Math.max(0, +c.s || 0) };
          }
        }
      }
    }
    return true;
  } catch (e) { return false; }
}

// ---------------- UI: HUD, toast, inventory ----------------
function updateHUD() {
  $('money').textContent = fmt(state.money);
  $('ips').textContent = fmt(state.ips);
}
let toastTimer = 0;
function toast(msg, color) {
  const t = $('toast');
  t.textContent = msg;
  t.style.color = color || '#ffe873';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
function popup(x, y, txt, col) {
  popups.push({ x, y, txt, col: col || '#ffe873', life: 1 });
  if (popups.length > 40) popups.shift();
}
function rebuildInv() {
  const bar = $('invBar');
  bar.innerHTML = '';
  const ids = Object.keys(state.inv).filter(k => state.inv[k] > 0);
  if (!ids.length) {
    bar.innerHTML = '<span class="inv-empty">empty — buy from a shop!</span>';
    return;
  }
  for (const k of ids) {
    const item = ITEMS[+k];
    const d = document.createElement('div');
    d.className = 'inv-slot' + (state.carry && state.carry.id === item.id ? ' carrying' : '');
    d.title = item.name + ' — ' + THEMES[item.shop].shop + ' (' + fmt(item.price) + ' bucks, +' + fmt(item.income) + '/s)';
    d.innerHTML = '<img src="' + itemSpriteURL(item) + '" alt=""><span class="inv-count">' + state.inv[k] + '</span>';
    d.addEventListener('click', () => toggleCarry(item.id));
    bar.appendChild(d);
  }
}

// ---------------- shop panel ----------------
let cardRefs = [];
function openPanel(s) {
  panelShop = s;
  const T = THEMES[s];
  $('shopTitle').textContent = (s + 1) + '. ' + T.shop;
  $('shopSub').textContent = 'Yard: ' + state.yards[s].filter(Boolean).length + '/' + SLOTS_PER_YARD +
    ' placed · items here must be placed in this shop\'s yard';
  const grid = $('itemGrid');
  grid.innerHTML = '';
  cardRefs = [];
  for (let j = 0; j < PER_SHOP; j++) {
    const item = ITEMS[s * PER_SHOP + j];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      '<img class="sprite" src="' + itemSpriteURL(item) + '" alt="">' +
      '<div class="nm">' + item.name + '</div>' +
      '<div class="row"><img src="' + BILL_URL + '" alt="">' + fmt(item.price) + '</div>' +
      '<div class="inc">+' + fmt(item.income) + ' bucks/s</div>' +
      '<div class="own"></div>' +
      '<button>BUY</button>';
    const btn = card.querySelector('button');
    btn.addEventListener('click', () => buy(item));
    grid.appendChild(card);
    cardRefs.push({ item, btn, own: card.querySelector('.own') });
  }
  refreshPanel();
  $('shopPanel').classList.remove('hidden');
}
function refreshPanel() {
  for (const r of cardRefs) {
    r.btn.disabled = state.money < r.item.price;
    const n = (state.inv[r.item.id] || 0) + countPlaced(r.item.id);
    r.own.textContent = n ? 'owned ' + n : '';
  }
}
function closePanel() { panelShop = -1; $('shopPanel').classList.add('hidden'); }
function countPlaced(id) {
  const s = ITEMS[id].shop;
  return state.yards[s].reduce((n, slot) => n + (slot && slot.id === id ? 1 : 0), 0);
}

// ---------------- actions ----------------
function buy(item) {
  if (state.money < item.price) { toast('Not enough bucks!', '#ff8f8f'); sndErr(); return; }
  state.money -= item.price;
  state.inv[item.id] = (state.inv[item.id] || 0) + 1;
  sndBuy();
  popup(player.x, player.y - 34, '-' + fmt(item.price), '#ffd93d');
  toast('Bought ' + item.name + '! Click it in your backpack to place it.');
  updateHUD(); rebuildInv();
  if (panelShop >= 0) refreshPanel();
  save();
}
function toggleCarry(id) {
  if (state.carry && state.carry.id === id) { stashCarry(); return; }
  if (state.carry) stashCarry();
  if (!state.inv[id]) return;
  state.inv[id]--;
  state.carry = { id };
  $('carryName').textContent = ITEMS[id].name;
  $('carryHint').classList.remove('hidden');
  rebuildInv();
}
function stashCarry() {
  if (!state.carry) return;
  state.inv[state.carry.id] = (state.inv[state.carry.id] || 0) + 1;
  state.carry = null;
  $('carryHint').classList.add('hidden');
  rebuildInv();
}
function carryTarget(wx, wy) {
  // returns {kind:'slot',shop,slot} | {kind:'sell'} | null
  if (inRect(wx, wy, SELL_ZONE)) return { kind: 'sell' };
  for (let s = 0; s < SHOPS; s++) {
    const y = yardRect(s);
    if (!inRect(wx, wy, y)) continue;
    for (let i = 0; i < SLOTS_PER_YARD; i++) {
      if (inRect(wx, wy, slotRect(s, i))) return { kind: 'slot', shop: s, slot: i };
    }
    return { kind: 'yard', shop: s };
  }
  return null;
}
function tryPlaceAt(wx, wy) {
  const item = ITEMS[state.carry.id];
  const t = carryTarget(wx, wy);
  if (t && t.kind === 'sell') { sellCarried(); return; }
  if (t && t.kind === 'slot') {
    if (t.shop !== item.shop) {
      toast('That belongs in the ' + THEMES[item.shop].shop + ' yard (shop ' + (item.shop + 1) + ')', '#ff8f8f');
      sndErr(); return;
    }
    if (state.yards[t.shop][t.slot]) {
      toast('That spot is taken!', '#ff8f8f'); sndErr(); return;
    }
    state.yards[t.shop][t.slot] = { id: item.id, stored: 0 };
    state.carry = null;
    $('carryHint').classList.add('hidden');
    recomputeIPS(); updateHUD(); rebuildInv();
    const r = slotRect(t.shop, t.slot);
    popup(r.x + SLOT / 2, r.y - 6, '+' + fmt(item.income) + '/s', '#8dff6a');
    sndPlace();
    if (panelShop >= 0) openPanel(panelShop); // refresh yard count
    save();
    return;
  }
  if (t && t.kind === 'yard' && t.shop !== item.shop) {
    toast('Wrong yard! Take it to shop ' + (item.shop + 1) + ' (' + THEMES[item.shop].shop + ')', '#ff8f8f');
    sndErr(); return;
  }
  toast('Click a glowing slot in the ' + THEMES[item.shop].shop + ' yard', '#ffd9a0');
}
function sellCarried() {
  const item = ITEMS[state.carry.id];
  const back = Math.floor(item.price / 2);
  state.money += back;
  state.carry = null;
  $('carryHint').classList.add('hidden');
  popup(SELL_ZONE.x + SELL_ZONE.w / 2, SELL_ZONE.y + 40, '+' + fmt(back) + ' bucks', '#8dff6a');
  toast('Sold ' + item.name + ' for ' + fmt(back) + ' bucks');
  sndSell();
  updateHUD(); rebuildInv();
  if (panelShop >= 0) refreshPanel();
  save();
}
function pickupPlaced(s, i) {
  const slot = state.yards[s][i];
  if (!slot) return;
  if (state.carry) { toast('Stash what you\'re carrying first (Esc)', '#ff8f8f'); sndErr(); return; }
  const r = slotRect(s, i);
  if (slot.stored >= 1) {
    state.money += slot.stored;
    popup(r.x + SLOT / 2, r.y - 4, '+' + fmt(slot.stored), '#ffe873');
    sndCollect();
  }
  state.yards[s][i] = 0;
  state.carry = { id: slot.id };
  $('carryName').textContent = ITEMS[slot.id].name;
  $('carryHint').classList.remove('hidden');
  recomputeIPS(); updateHUD(); rebuildInv();
  save();
}

// ---------------- input ----------------
const keys = {};
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'escape') {
    if (panelShop >= 0) { closePanel(); return; }
    if (!$('helpOverlay').classList.contains('hidden')) { $('helpOverlay').classList.add('hidden'); return; }
    if (state.carry) { stashCarry(); return; }
    return;
  }
  if (k === 'e' && panelShop < 0 && $('helpOverlay').classList.contains('hidden')) {
    const s = nearestShop();
    if (s >= 0) { openPanel(s); beep(520, 0.07, 'triangle', 0.05); }
    return;
  }
  if (k === 'm') { toggleMute(); return; }
  if (k === 'h' || k === '?') { $('helpOverlay').classList.toggle('hidden'); return; }
  keys[k] = true;
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const canvas = $('game');
const ctx = canvas.getContext('2d');
let cw = 0, ch = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  cw = window.innerWidth; ch = window.innerHeight;
  canvas.width = cw * DPR; canvas.height = ch * DPR;
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);

canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (state.carry) stashCarry(); });
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  if (panelShop >= 0 || !$('helpOverlay').classList.contains('hidden')) return;
  const wx = e.clientX + camX, wy = e.clientY + camY;
  if (state.carry) { tryPlaceAt(wx, wy); return; }
  // pick up a placed item?
  for (let s = 0; s < SHOPS; s++) {
    const y = yardRect(s);
    if (!inRect(wx, wy, y)) continue;
    for (let i = 0; i < SLOTS_PER_YARD; i++) {
      if (state.yards[s][i] && inRect(wx, wy, slotRect(s, i))) { pickupPlaced(s, i); return; }
    }
  }
  // open a shop?
  for (let s = 0; s < SHOPS; s++) {
    if (inRect(wx, wy, shopStall(s))) { openPanel(s); beep(520, 0.07, 'triangle', 0.05); return; }
  }
});
function nearestShop() {
  let best = -1, bd = 180;
  for (let s = 0; s < SHOPS; s++) {
    const st = shopStall(s);
    const dx = player.x - (st.x + st.w / 2), dy = player.y - (st.y + st.h);
    const d = Math.hypot(dx, dy);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function toggleMute() {
  state.muted = !state.muted;
  $('muteBtn').textContent = state.muted ? '🔇' : '🔊';
}
$('muteBtn').addEventListener('click', toggleMute);
$('helpBtn').addEventListener('click', () => $('helpOverlay').classList.toggle('hidden'));
$('closeHelp').addEventListener('click', () => $('helpOverlay').classList.add('hidden'));
$('closePanel').addEventListener('click', closePanel);

// ---------------- update ----------------
function update(dt, now) {
  // movement
  if (panelShop < 0 && $('helpOverlay').classList.contains('hidden')) {
    let dx = 0, dy = 0;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      player.x = clamp(player.x + dx / l * player.speed * dt, 20, WORLD_W - 20);
      player.y = clamp(player.y + dy / l * player.speed * dt, 60, WORLD_H - 20);
      player.moving = true;
      player.dir = dx ? Math.sign(dx) : player.dir;
      player.bob += dt * 10;
    } else player.moving = false;
  } else player.moving = false;

  // accrue + collect
  let collectedAny = false;
  for (let s = 0; s < SHOPS; s++) {
    const y = yardRect(s);
    if (player.x < y.x - 80 || player.x > y.x + y.w + 80) {
      // still accrue, skip collect check
      for (let i = 0; i < SLOTS_PER_YARD; i++) {
        const slot = state.yards[s][i];
        if (slot) slot.stored = Math.min(slot.stored + ITEMS[slot.id].income * dt, ITEMS[slot.id].income * 600);
      }
      continue;
    }
    for (let i = 0; i < SLOTS_PER_YARD; i++) {
      const slot = state.yards[s][i];
      if (!slot) continue;
      const item = ITEMS[slot.id];
      slot.stored = Math.min(slot.stored + item.income * dt, item.income * 600);
      if (slot.stored >= 1) {
        const r = slotRect(s, i);
        if (Math.hypot(player.x - (r.x + SLOT / 2), player.y - (r.y + SLOT / 2)) < 52) {
          state.money += slot.stored;
          popup(r.x + SLOT / 2, r.y - 4, '+' + fmt(slot.stored), '#ffe873');
          slot.stored = 0;
          collectedAny = true;
        }
      }
    }
  }
  if (collectedAny) {
    if (now - lastCollectSnd > 90) { sndCollect(); lastCollectSnd = now; }
    updateHUD();
    if (panelShop >= 0) refreshPanel();
  }

  // popups
  for (const p of popups) { p.y -= 34 * dt; p.life -= dt * 0.9; }
  popups = popups.filter(p => p.life > 0);

  // camera
  camX = WORLD_W <= cw ? (WORLD_W - cw) / 2 : clamp(player.x - cw / 2, 0, WORLD_W - cw);
  camY = WORLD_H <= ch ? (WORLD_H - ch) / 2 : clamp(player.y - ch / 2, 0, WORLD_H - ch);

  mouse.wx = mouse.x + camX; mouse.wy = mouse.y + camY;

  // cursor
  if (state.carry) canvas.style.cursor = 'crosshair';
  else {
    let over = false;
    for (let s = 0; s < SHOPS && !over; s++) {
      if (inRect(mouse.wx, mouse.wy, shopStall(s))) over = true;
    }
    canvas.style.cursor = over ? 'pointer' : 'default';
  }
}

// ---------------- render ----------------
function render(now) {
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(staticC, camX * SS, camY * SS, cw * SS, ch * SS, 0, 0, cw, ch);
  const t = now / 1000;

  // visible shop range
  const s0 = clamp(Math.floor((camX - WORLD_X0) / SHOP_W) - 1, 0, SHOPS - 1);
  const s1 = clamp(Math.ceil((camX + cw - WORLD_X0) / SHOP_W) + 1, 0, SHOPS - 1);

  // empty slot ghosts when carrying
  if (state.carry) {
    const item = ITEMS[state.carry.id];
    const y = yardRect(item.shop);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 6);
    ctx.fillStyle = '#8dff6a';
    for (let i = 0; i < SLOTS_PER_YARD; i++) {
      if (state.yards[item.shop][i]) continue;
      const r = slotRect(item.shop, i);
      roundRect(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();
    }
    ctx.restore();
    // arrow over correct yard if off-screen
    const yc = y.x + y.w / 2;
    if (yc < camX || yc > camX + cw) {
      const ax = clamp(yc, camX + 40, camX + cw - 40) - camX;
      ctx.fillStyle = '#8dff6a';
      ctx.font = '800 22px "Trebuchet MS",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(yc < camX ? '⬅ ' + THEMES[item.shop].shop : THEMES[item.shop].shop + ' ➡', ax, 120);
    }
    // sell zone pulse
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5);
    ctx.fillStyle = '#ffdd55';
    roundRect(ctx, SELL_ZONE.x, SELL_ZONE.y, SELL_ZONE.w, SELL_ZONE.h, 14); ctx.fill();
    ctx.restore();
  }

  // placed items
  for (let s = s0; s <= s1; s++) {
    for (let i = 0; i < SLOTS_PER_YARD; i++) {
      const slot = state.yards[s][i];
      if (!slot) continue;
      const item = ITEMS[slot.id];
      const r = slotRect(s, i);
      const cx = r.x + SLOT / 2, cy = r.y + SLOT / 2;
      const bobY = Math.sin(t * 2 + (s * 31 + i) * 1.7) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(cx - camX, r.y + r.h - 3 - camY, SLOT * 0.38, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(drawItemSprite(item), cx - SLOT / 2 - 2 - camX, cy - SLOT / 2 - 2 + bobY - camY, SLOT + 4, SLOT + 4);
      if (slot.stored >= 1) {
        const bw = 22, bh = 14;
        const by = r.y - 16 + Math.sin(t * 4 + i) * 3;
        ctx.drawImage(drawBill(), cx - bw / 2 - camX, by - camY, bw, bh);
      }
    }
  }

  // sell value label while carrying over sell zone
  if (state.carry && inRect(mouse.wx, mouse.wy, SELL_ZONE)) {
    const item = ITEMS[state.carry.id];
    ctx.fillStyle = '#fff'; ctx.font = '800 18px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sell for ' + fmt(Math.floor(item.price / 2)) + ' bucks', SELL_ZONE.x + SELL_ZONE.w / 2 - camX, SELL_ZONE.y - 14 - camY);
  }

  // player
  const px = player.x - camX, py = player.y - camY;
  const pb = player.moving ? Math.abs(Math.sin(player.bob)) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(px, py + 14, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = '#3b82f6';
  roundRect(ctx, px - 11, py - 8 - pb, 22, 22, 7); ctx.fill();
  ctx.fillStyle = '#2f6bd0';
  roundRect(ctx, px - 11, py + 6 - pb, 22, 8, 4); ctx.fill();
  // head
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath(); ctx.arc(px, py - 18 - pb, 11, 0, Math.PI * 2); ctx.fill();
  // cap (yellow, buck-colored)
  ctx.fillStyle = '#ffd93d';
  ctx.beginPath(); ctx.arc(px, py - 21 - pb, 11, Math.PI, 0); ctx.fill();
  ctx.fillRect(px - 11, py - 22 - pb, 22, 3);
  ctx.fillRect(px + (player.dir > 0 ? 6 : -16), py - 22 - pb, 10, 3);
  // eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(px - 4 + player.dir * 2, py - 17 - pb, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(px + 4 + player.dir * 2, py - 17 - pb, 1.6, 0, Math.PI * 2); ctx.fill();

  // interact prompt
  if (panelShop < 0 && !state.carry) {
    const s = nearestShop();
    if (s >= 0) {
      ctx.fillStyle = 'rgba(20,30,15,0.85)';
      const label = 'E — Browse ' + THEMES[s].shop;
      ctx.font = '700 14px "Trebuchet MS",sans-serif';
      const w = ctx.measureText(label).width + 22;
      roundRect(ctx, px - w / 2, py - 62, w, 26, 13); ctx.fill();
      ctx.fillStyle = '#ffe873'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, px, py - 49);
    }
  }

  // carried ghost
  if (state.carry) {
    const item = ITEMS[state.carry.id];
    const gx = mouse.x, gy = mouse.y;
    const t2 = carryTarget(mouse.wx, mouse.wy);
    let ok = false;
    if (t2 && t2.kind === 'sell') ok = true;
    if (t2 && t2.kind === 'slot' && t2.shop === item.shop && !state.yards[t2.shop][t2.slot]) ok = true;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = ok ? '#8dff6a' : '#ff7070';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(gx, gy, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.drawImage(drawItemSprite(item), gx - 20, gy - 20, 40, 40);
    ctx.restore();
  }

  // popups
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of popups) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.font = '800 15px "Trebuchet MS",sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
    ctx.strokeText(p.txt, p.x - camX, p.y - camY);
    ctx.fillStyle = p.col;
    ctx.fillText(p.txt, p.x - camX, p.y - camY);
    ctx.restore();
  }
}

// ---------------- main loop ----------------
let lastT = 0;
function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;
  update(dt, now);
  render(now);
  requestAnimationFrame(frame);
}

// ---------------- boot ----------------
function boot() {
  resize();
  buildStatic();
  $('hudBill').src = BILL_URL;
  const had = load();
  recomputeIPS();
  updateHUD();
  rebuildInv();
  setInterval(save, 5000);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  if (!had) {
    $('helpOverlay').classList.remove('hidden');
    setTimeout(() => toast('Welcome! You start with 100 bucks.'), 400);
  } else {
    toast('Welcome back! Save loaded.');
  }
  requestAnimationFrame(frame);
}
boot();

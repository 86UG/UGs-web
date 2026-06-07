'use strict';

// ===== お米データ =====
const RICE_TYPES = {
  white_regular: {
    name:           '白米（普通）',
    rawPerGo:       150,   // g／合（炊く前）
    cookedPerGo:    330,   // g／合（炊いた後）
    waterPerGo:     200,   // mL／合
    kcalPer100gRaw: 343,   // kcal／100g（炊く前）
  },
  white_musen: {
    name:           '白米（無洗米）',
    rawPerGo:       150,
    cookedPerGo:    330,
    waterPerGo:     230,
    kcalPer100gRaw: 343,
  },
  brown: {
    name:           '玄米',
    rawPerGo:       150,
    cookedPerGo:    300,
    waterPerGo:     270,
    kcalPer100gRaw: 340,
  },
};

const CHAWAN_G = 150; // 茶碗1杯のg（炊いた後）

// ===== DOM =====
const inpAmount  = document.getElementById('s-amount');
const selUnit    = document.getElementById('s-unit');
const resultBody = document.getElementById('result-body');

let currentType = 'white_regular';

// ===== 初期化 =====
function init() {
  document.getElementById('rice-type-btns').addEventListener('click', e => {
    const btn = e.target.closest('.rice-type-btn');
    if (!btn) return;
    document.querySelectorAll('.rice-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    calculate();
  });

  inpAmount.addEventListener('input', calculate);
  selUnit.addEventListener('change', calculate);
}

// ===== 合に変換 =====
function toGo(amount, unit, rice) {
  switch (unit) {
    case 'go':       return amount;
    case 'g_raw':    return amount / rice.rawPerGo;
    case 'g_cooked': return amount / rice.cookedPerGo;
    case 'chawan':   return (amount * CHAWAN_G) / rice.cookedPerGo;
  }
}

// ===== 計算 =====
function calculate() {
  const amount = parseFloat(inpAmount.value);
  const unit   = selUnit.value;
  const rice   = RICE_TYPES[currentType];

  if (isNaN(amount) || amount <= 0) {
    showEmpty();
    return;
  }

  const go      = toGo(amount, unit, rice);
  const gRaw    = go * rice.rawPerGo;
  const gCooked = go * rice.cookedPerGo;
  const chawan  = gCooked / CHAWAN_G;
  const water   = go * rice.waterPerGo;
  const kcal    = gRaw * rice.kcalPer100gRaw / 100;

  renderResults({ go, gRaw, gCooked, chawan, water, kcal, unit, rice });
}

// ===== 数値フォーマット =====
function fmt(n, digits = 1) {
  if (n >= 1000) return Math.round(n).toLocaleString();
  if (n >= 100)  return Math.round(n).toString();
  return parseFloat(n.toFixed(digits)).toString();
}

// ===== 表示 =====
function renderResults({ go, gRaw, gCooked, chawan, water, kcal, unit, rice }) {
  const rows = [
    { key: 'go',       label: '合',          val: fmt(go, 2),       unit: '合',  isInput: unit === 'go' },
    { key: 'g_raw',    label: 'g（炊く前）',  val: fmt(gRaw, 0),     unit: 'g',   isInput: unit === 'g_raw' },
    { key: 'g_cooked', label: 'g（炊いた後）', val: fmt(gCooked, 0), unit: 'g',   isInput: unit === 'g_cooked' },
    { key: 'chawan',   label: '茶碗',         val: fmt(chawan, 1),   unit: '杯',  isInput: unit === 'chawan' },
  ];

  const rowsHtml = rows.map(r => `
    <div class="conv-row${r.isInput ? ' is-input' : ''}">
      <span class="conv-unit-lbl">${r.label}</span>
      <span class="conv-val">${r.val} <span class="conv-val-unit">${r.unit}</span></span>
    </div>`).join('');

  resultBody.innerHTML = `
    <div class="conv-summary">
      <span class="conv-item">${rice.name}</span>
    </div>
    <div class="conv-table">${rowsHtml}</div>
    <div class="conv-extra">
      <div class="conv-extra-row">
        <span class="conv-extra-label">💧 水の量</span>
        <span class="conv-extra-val">${fmt(water, 0)} mL</span>
      </div>
      <div class="conv-extra-row">
        <span class="conv-extra-label">🔥 カロリー</span>
        <span class="conv-extra-val">${fmt(kcal, 0)} kcal</span>
      </div>
    </div>
    <p class="conv-note">※ 茶碗1杯＝150g（炊いた後）として計算しています。</p>
    <p class="conv-note">※ カロリーは炊く前の重さをもとに算出しています。</p>
    <p class="conv-note">※ 目安値です。製品や炊き方により異なる場合があります。</p>
  `;
}

function showEmpty() {
  resultBody.innerHTML = '<p class="empty-msg">量を入力すると結果が表示されます</p>';
}

// ===== 起動 =====
init();

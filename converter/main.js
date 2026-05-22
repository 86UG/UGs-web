'use strict';

// ===== 調味料データ（密度: g/大1） =====
// 参考: 一般的な調理サイトの「計量スプーン換算表」
const SEASONINGS = [
  { name: 'いりごま', density: 9.0 },
  { name: 'ウスターソース', density: 18.0 },
  { name: 'オイスターソース', density: 18.0 },
  { name: 'オリーブオイル', density: 12.0 },
  { name: '片栗粉',        density: 9.0 },
  { name: 'からし', density: 15.0 },
  { name: '顆粒だし', density: 9.0 },
  { name: 'カレー粉', density: 6.0 },
  { name: '牛乳',          density: 15.0 },
  { name: 'ケチャップ',    density: 18.0 },
  { name: 'コーヒー', density: 6.0 },
  { name: 'ココアパウダー', density: 6.0 },
  { name: 'こしょう', density: 6.0 },
  { name: 'コチュジャン', density: 21.0 },
  { name: '粉ゼラチン', density: 9.0 },
  { name: '粉チーズ', density: 6.0 },
  { name: 'ごま油',        density: 12.0 },
  { name: '小麦粉', density: 9.0 },
  { name: '米粉', density: 9.0 },
  { name: '酒',        density: 15.0 },
  { name: '砂糖（グラニュー糖）', density: 12.0 },
  { name: '砂糖（上白糖）', density: 9.0 },
  { name: 'サラダ油',      density: 12.0 },
  { name: '塩（あら塩）', density: 15.0 },
  { name: '塩（食塩）',    density: 18.0 },
  { name: 'ジャム', density: 21.0 },
  { name: '重曹', density: 12.0 },
  { name: '醤油',          density: 18.0 },
  { name: 'ショートニング', density: 12.0 },
  { name: '酢',            density: 15.0 },
  { name: '脱脂粉乳', density: 6.0 },
  { name: '粒マスタード', density: 15.0 },
  { name: '甜麺醤', density: 21.0 },
  { name: '豆板醤', density: 21.0 },
  { name: '生クリーム', density: 15.0 },
  { name: 'ナンプラー', density: 18.0 },
  { name: '薄力粉',        density: 9.0 },
  { name: 'バター',        density: 12.0 },
  { name: 'はちみつ', density: 21.0 },
  { name: 'パン粉', density: 3.0 },
  { name: 'ベーキングパウダー', density: 12.0 },
  { name: 'ポン酢', density: 18.0 },
  { name: 'マヨネーズ',    density: 14.0 },
  { name: '水',          density: 15.0 },
  { name: '味噌',          density: 18.0 },
  { name: 'みりん',        density: 18.0 },
  { name: 'メープルシロップ', density: 21.0 },
  { name: 'めんつゆ', density: 18.0 },
  { name: '焼き肉のたれ', density: 18.0 },
  { name: 'ヨーグルト', density: 15.0 },
  { name: '料理酒',        density: 15.0 },
  { name: 'ワイン', density: 15.0 },
  { name: 'わさび', density: 15.0 }
];

// 体積単位 → mL 換算（日本の計量基準）
const UNIT_ML = {
  tbsp: 15,  // 大さじ
  tsp:  5,   // 小さじ
  cup:  200, // カップ（日本）
  mL:   1,
};

const UNIT_LABEL = {
  tbsp: '大さじ',
  tsp:  '小さじ',
  cup:  'カップ',
  mL:   'mL',
  g:    'g',
};

const UNIT_ORDER = ['tbsp', 'tsp', 'cup', 'mL', 'g'];

// ===== DOM =====
const selSeasoning   = document.getElementById('s-seasoning');
const inpAmount      = document.getElementById('s-amount');
const selUnit        = document.getElementById('s-unit');
const inpFromServing = document.getElementById('s-from-serving');
const inpToServing   = document.getElementById('s-to-serving');
const resultBody     = document.getElementById('result-body');

// ===== 初期化 =====
function init() {
  SEASONINGS.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = s.name;
    selSeasoning.appendChild(opt);
  });

  [selSeasoning, inpAmount, selUnit, inpFromServing, inpToServing].forEach(el => {
    el.addEventListener('input', calculate);
  });
}

// ===== 計算 =====
function calculate() {
  const seasoning = SEASONINGS[parseInt(selSeasoning.value)];
  const amount    = parseFloat(inpAmount.value);
  const unit      = selUnit.value;
  const fromServ  = parseFloat(inpFromServing.value);
  const toServ    = parseFloat(inpToServing.value);

  if (isNaN(amount) || amount <= 0) {
    showEmpty();
    return;
  }

  // mL に変換
  let mL = (unit === 'g')
    ? amount / seasoning.density * 15
    : amount * UNIT_ML[unit];

  // 人前スケール
  const validScale = !isNaN(fromServ) && fromServ > 0 && !isNaN(toServ) && toServ > 0;
  const scale = validScale ? toServ / fromServ : 1;
  mL *= scale;

  // 全単位へ変換
  const results = {
    tbsp: mL / 15,
    tsp:  mL / 5,
    cup:  mL / 200,
    mL:   mL,
    g:    mL * seasoning.density / 15,
  };

  renderResults(seasoning, amount, unit, scale, validScale, results);
}

// ===== 表示 =====
function fmt(n) {
  if (n >= 1000) return Math.round(n).toLocaleString();
  if (n >= 100)  return Math.round(n).toString();
  if (n >= 10)   return parseFloat(n.toFixed(1)).toString();
  if (n >= 1)    return parseFloat(n.toFixed(2)).toString();
  return parseFloat(n.toFixed(3)).toString();
}

function renderResults(seasoning, amount, inputUnit, scale, showScale, results) {
  const scaleRounded = parseFloat(scale.toFixed(2));
  const fromVal = parseFloat(inpFromServing.value);
  const toVal   = parseFloat(inpToServing.value);

  const scaleHtml = showScale
    ? `<span class="conv-scale">${fromVal}人前 → ${toVal}人前（×${scaleRounded}）</span>`
    : '';

  let rows = '';
  UNIT_ORDER.forEach(key => {
    const isInput = key === inputUnit;
    rows += `
      <div class="conv-row${isInput ? ' is-input' : ''}">
        <span class="conv-unit-lbl">${UNIT_LABEL[key]}</span>
        <span class="conv-val">${fmt(results[key])}</span>
      </div>`;
  });

  resultBody.innerHTML = `
    <div class="conv-summary">
      <span class="conv-item">${seasoning.name}</span>
      <span class="conv-input-val">${fmt(amount)} ${UNIT_LABEL[inputUnit]}</span>
      ${scaleHtml}
    </div>
    <div class="conv-table">${rows}</div>
    <p class="conv-note">※ 密度は一般的な目安値です。製品により異なる場合があります。</p>
  `;
}

function showEmpty() {
  resultBody.innerHTML = '<p class="empty-msg">調味料と量を入力すると結果が表示されます</p>';
}

// ===== 起動 =====
init();

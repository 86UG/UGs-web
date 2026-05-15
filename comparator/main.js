// ==============================
// 状態管理
// ==============================
const ItemStore = {
  KEY: "price_comparison_items",
  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; }
  },
  saveAll(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
  getById(id) { return this.getAll().find(i => i.id === id); },
  upsert(item) {
    const data = this.getAll();
    const idx = data.findIndex(i => i.id === item.id);
    idx !== -1 ? (data[idx] = item) : data.push(item);
    this.saveAll(data);
  },
  deleteById(id) { this.saveAll(this.getAll().filter(i => i.id !== id)); }
};

// ==============================
// アイコンSVG
// ==============================
const TRASH_ICON_SVG = `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path fill="currentColor" d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 7h2v9h-2v-9zm4 0h2v9h-2v-9zM6 8h12l-1 13H7L6 8z"/></svg>`;
const EDIT_ICON_SVG  = `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.83z"/></svg>`;
const SAVE_ICON_SVG  = `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14V7l-2-4zM5 5h11.17L17 6.83V19H5V5zm7 0v4H6V5h6z"/><circle cx="12" cy="14" r="2" fill="currentColor"/></svg>`;
const MEMO_ICON_SVG  = `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h12V4H6zm2 3h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>`;

// ==============================
// 初期化
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  renderCompare();

  setupAutocomplete(document.getElementById("i-store"),    document.getElementById("sug-store"),    getStoreSuggestions);
  setupAutocomplete(document.getElementById("i-food"),     document.getElementById("sug-food"),     getFoodSuggestions);
  setupAutocomplete(document.getElementById("i-category"), document.getElementById("sug-category"), getCategorySuggestions);

  ["i-store", "i-food", "i-qty", "i-price", "i-category", "i-memo"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") registerItem();
    });
  });

  ["i-qty", "i-price"].forEach(id => {
    document.getElementById(id).addEventListener("blur", function () { formatInput(this); });
    document.getElementById(id).addEventListener("input", calcUnitPrice);
  });

  document.getElementById("i-unit").addEventListener("change", calcUnitPrice);

  document.addEventListener("click", e => {
    document.querySelectorAll(".suggestions").forEach(list => {
      if (!list.closest(".ac-wrapper").contains(e.target)) list.classList.add("hidden");
    });
  });
});

// ==============================
// ユーティリティ
// ==============================
function generateId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeNumber(value) {
  return String(value)
    .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248))
    .replace(/,/g, "");
}

function validatePositiveNumber(inputEl) {
  const raw = normalizeNumber(inputEl.value);
  const value = Number(raw);
  const isValid = raw !== "" && value > 0;
  inputEl.classList.toggle("error", !isValid);
  return isValid ? value : null;
}

function formatInput(el) {
  const value = normalizeNumber(el.value);
  if (/^[0-9]+(\.[0-9]+)?$/.test(value)) el.value = Number(value).toLocaleString();
}

function showMsg(text, type) {
  const el = document.getElementById("reg-msg");
  el.textContent = text;
  el.className = "reg-msg " + (type === "success" ? "success" : "error-msg");
}

function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// カテゴリ正規化（空白→"未分類"）
function normCat(c) { return (c && c.trim()) ? c.trim() : "未分類"; }

// カテゴリ一覧（"未分類"を末尾に）
function sortedCats(catSet) {
  const cats = [...catSet].filter(c => c !== "未分類").sort();
  if (catSet.has("未分類")) cats.push("未分類");
  return cats;
}

// ==============================
// リアルタイム単価計算
// ==============================
function calcUnitPrice() {
  const qty   = parseFloat(normalizeNumber(document.getElementById("i-qty").value));
  const price = parseFloat(normalizeNumber(document.getElementById("i-price").value));
  const unit  = document.getElementById("i-unit").value;
  const el    = document.getElementById("upd");

  if (!isNaN(qty) && qty > 0 && !isNaN(price) && price > 0) {
    const up = (price / qty).toFixed(2);
    el.className = "unit-price-display has-value";
    el.innerHTML = `<span class="upd-label">単価</span><span class="upd-value">¥${up}<span class="upd-unit"> / ${unit}</span></span>`;
  } else {
    el.className = "unit-price-display";
    el.innerHTML = '<span class="upd-hint">内容量と価格を入力すると単価が表示されます</span>';
  }
}

// ==============================
// オートコンプリート
// ==============================
function getStoreSuggestions(v) {
  if (!v) return [];
  const kv = toKatakana(v);
  return [...new Set(ItemStore.getAll().map(i => i.store))].filter(s => toKatakana(s).includes(kv));
}

function getFoodSuggestions(v) {
  if (!v) return [];
  const kv = toKatakana(v);
  return [...new Set(ItemStore.getAll().map(i => i.food))].filter(f => toKatakana(f).includes(kv));
}

function getCategorySuggestions(v) {
  if (!v) return [];
  const kv = toKatakana(v);
  return [...new Set(ItemStore.getAll().map(i => i.category).filter(Boolean))].filter(c => toKatakana(c).includes(kv));
}

function setupAutocomplete(inputEl, suggestEl, getSuggestions) {
  let selectedIndex = -1;
  let current = [];

  function apply(val) { inputEl.value = val; suggestEl.classList.add("hidden"); selectedIndex = -1; }

  function refresh() {
    suggestEl.innerHTML = "";
    current.forEach((item, i) => {
      const li = document.createElement("li");
      li.textContent = item;
      if (i === selectedIndex) li.classList.add("selected");
      li.addEventListener("mousedown", e => { e.preventDefault(); apply(item); });
      suggestEl.appendChild(li);
    });
    suggestEl.classList.toggle("hidden", current.length === 0);
  }

  inputEl.addEventListener("input", () => { current = getSuggestions(inputEl.value.trim()); selectedIndex = -1; refresh(); });
  inputEl.addEventListener("keydown", e => {
    if (suggestEl.classList.contains("hidden")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); selectedIndex = (selectedIndex + 1) % current.length; refresh(); }
    else if (e.key === "ArrowUp")  { e.preventDefault(); selectedIndex = (selectedIndex - 1 + current.length) % current.length; refresh(); }
    else if (e.key === "Enter" && selectedIndex >= 0) { e.preventDefault(); apply(current[selectedIndex]); }
    else if (e.key === "Escape") suggestEl.classList.add("hidden");
  });
}

// ==============================
// 登録処理
// ==============================
function registerItem() {
  const storeEl    = document.getElementById("i-store");
  const foodEl     = document.getElementById("i-food");
  const qtyEl      = document.getElementById("i-qty");
  const priceEl    = document.getElementById("i-price");
  const unit       = document.getElementById("i-unit").value;
  const categoryEl = document.getElementById("i-category");
  const memoEl     = document.getElementById("i-memo");

  const store = storeEl.value.trim();
  const food  = foodEl.value.trim();

  let hasError = false;
  if (!store) { storeEl.classList.add("error"); hasError = true; } else storeEl.classList.remove("error");
  if (!food)  { foodEl.classList.add("error");  hasError = true; } else foodEl.classList.remove("error");

  const qty   = validatePositiveNumber(qtyEl);
  const price = validatePositiveNumber(priceEl);

  if (hasError || qty === null || price === null) {
    showMsg("すべての項目を入力してください", "error"); return;
  }

  const unitPrice = price / qty;
  const category  = categoryEl.value.trim();
  const memo      = memoEl.value.trim();
  const id        = generateId();

  ItemStore.upsert({ id, store, food, qty, unit, price, unitPrice, category, memo });

  showMsg(`登録しました — 単価：¥${unitPrice.toFixed(2)}/${unit}`, "success");

  // 店舗・カテゴリは維持、食材以降をクリア
  foodEl.value  = "";
  qtyEl.value   = "";
  priceEl.value = "";
  memoEl.value  = "";
  document.getElementById("sug-food").classList.add("hidden");
  calcUnitPrice();
  foodEl.focus();
  renderCompare();
}

// ==============================
// ヒートマップ色計算（連続グラデーション）
// ==============================
function lerpColor(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function getHeatColor(ratio) {
  const green = { r: 47,  g: 170, b: 120 };
  const mid   = { r: 170, g: 170, b: 160 };
  const red   = { r: 220, g: 60,  b: 60  };
  const col   = ratio <= 0.5 ? lerpColor(green, mid, ratio * 2) : lerpColor(mid, red, (ratio - 0.5) * 2);
  const opacity = 0.06 + Math.abs(ratio - 0.5) * 0.38;
  const bgColor = `rgb(${col.r},${col.g},${col.b})`;
  let textColor = null;
  if (ratio <= 0.25) textColor = "#0F6E56";
  if (ratio >= 0.75) textColor = "#A32D2D";
  return { bgColor, bgOpacity: opacity, barColor: bgColor, textColor };
}

// ==============================
// 編集フォームHTML生成
// ==============================
function renderEditFormHtml(item, prefix) {
  const u = item.unit || "個";
  return `
    <div class="edit-form" data-itemid="${item.id}" data-prefix="${prefix}">
      <div class="edit-form-grid">
        <div class="field-group" style="grid-column:1/-1;">
          <label>食材名</label>
          <div class="ac-wrapper">
            <input class="ef-food" type="text" value="${escapeAttr(item.food)}" autocomplete="off">
            <ul class="suggestions hidden ef-food-sug"></ul>
          </div>
        </div>
        <div class="field-group">
          <label>内容量</label>
          <div class="total-wrapper ef-qty-wrapper">
            <input class="ef-qty total" type="text" inputmode="decimal" value="${Number(item.qty).toLocaleString()}">
            <select class="ef-unit unit ef-unit-select">
              <option value="個" ${u==="個"?"selected":""}>個</option>
              <option value="g"  ${u==="g" ?"selected":""}>g</option>
              <option value="mL" ${u==="mL"?"selected":""}>mL</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <label>価格</label>
          <input class="ef-price" type="text" inputmode="decimal" value="${Number(item.price).toLocaleString()}">
        </div>
        <div class="field-group" style="grid-column:1/-1;">
          <label>カテゴリ</label>
          <div class="ac-wrapper">
            <input class="ef-category" type="text" value="${escapeAttr(item.category || '')}" autocomplete="off">
            <ul class="suggestions hidden ef-category-sug"></ul>
          </div>
        </div>
        <div class="field-group" style="grid-column:1/-1;">
          <label>メモ</label>
          <input class="ef-memo" type="text" value="${escapeAttr(item.memo || '')}">
        </div>
      </div>
      <div class="edit-form-actions">
        <button class="btn-secondary btn-sm" onclick="cancelEdit('${item.id}','${prefix}')">キャンセル</button>
        <button class="btn-primary btn-sm" onclick="saveEdit('${item.id}','${prefix}')">${SAVE_ICON_SVG}&nbsp;保存</button>
      </div>
    </div>`;
}

// ==============================
// スライド操作
// ==============================
function toggleSlide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("open");
}

function toggleMemoSlide(id, event, hasMemo) {
  if (!hasMemo) return;
  toggleSlide(id);
}

function openEdit(itemId, prefix) {
  document.querySelectorAll('.slide-panel[id^="edit-"]').forEach(el => el.classList.remove("open"));
  const el = document.getElementById(prefix + itemId);
  if (!el) return;
  el.classList.add("open");

  // 編集フォーム内のオートコンプリートをセットアップ
  const form = el.querySelector(".edit-form");
  if (form && !form.dataset.acReady) {
    form.dataset.acReady = "1";
    const foodInput = form.querySelector(".ef-food");
    const foodSug   = form.querySelector(".ef-food-sug");
    const catInput  = form.querySelector(".ef-category");
    const catSug    = form.querySelector(".ef-category-sug");
    if (foodInput && foodSug) setupAutocomplete(foodInput, foodSug, getFoodSuggestions);
    if (catInput  && catSug)  setupAutocomplete(catInput,  catSug,  getCategorySuggestions);
  }
}

function cancelEdit(itemId, prefix) {
  const el = document.getElementById(prefix + itemId);
  if (el) el.classList.remove("open");
}

function saveEdit(itemId, prefix) {
  const form = document.getElementById(prefix + itemId);
  if (!form) return;

  const foodEl  = form.querySelector(".ef-food");
  const qtyEl   = form.querySelector(".ef-qty");
  const priceEl = form.querySelector(".ef-price");
  const food    = foodEl.value.trim();

  if (!food) { foodEl.classList.add("error"); return; }
  foodEl.classList.remove("error");

  const qty   = validatePositiveNumber(qtyEl);
  const price = validatePositiveNumber(priceEl);
  if (qty === null || price === null) return;

  const unit      = form.querySelector(".ef-unit").value;
  const category  = form.querySelector(".ef-category").value.trim();
  const memo      = form.querySelector(".ef-memo").value.trim();
  const unitPrice = price / qty;
  const original  = ItemStore.getById(itemId);
  const store     = original ? original.store : "";

  ItemStore.upsert({ id: itemId, store, food, qty, unit, price, unitPrice, category, memo });
  renderCompare();
}

function deleteItem(itemId) {
  if (!confirm("このデータを削除しますか？")) return;
  ItemStore.deleteById(itemId);
  renderCompare();
}

// ==============================
// 比較パネル描画
// ==============================
function renderCompare() {
  renderFoodView();
  renderStoreView();
}

// --- 食材ごとビュー ---
function renderFoodView() {
  const el    = document.getElementById("view-food");
  const items = ItemStore.getAll();

  if (items.length === 0) {
    el.innerHTML = '<p class="empty-msg">食材を登録すると比較が表示されます</p>';
    return;
  }

  const catSet = new Set(items.map(i => normCat(i.category)));
  const cats   = sortedCats(catSet);

  let html = `
    <div class="all-toggle-bar">
      <button class="btn-secondary btn-sm" onclick="toggleAllCards('view-food', true)">すべて開く</button>
      <button class="btn-secondary btn-sm" onclick="toggleAllCards('view-food', false)">すべて閉じる</button>
    </div>`;

  cats.forEach((cat, ci) => {
    const catItems = items.filter(i => normCat(i.category) === cat);
    const foods    = [...new Set(catItems.map(i => i.food))];
    const catBodyId = `fv-cat-body-${ci}`;

    html += `
      <div class="cat-section">
        <div class="cat-section-header card-toggle-header" onclick="toggleCard('${catBodyId}', this)">
          <span>${escapeHtml(cat)}</span>
          <span class="card-toggle-icon">▲</span>
        </div>
        <div class="cat-section-body card-body" id="${catBodyId}">`;

    foods.forEach((food, fi) => {
      const rows   = catItems.filter(i => i.food === food);
      const unit   = rows[0].unit;
      const prices = rows.map(r => r.unitPrice);
      const minP   = Math.min(...prices);
      const maxP   = Math.max(...prices);
      const foodBodyId = `fv-food-body-${ci}-${fi}`;

      html += `
        <div class="food-card">
          <div class="food-card-header card-toggle-header" onclick="toggleCard('${foodBodyId}', this)">
            <div><span class="food-name">${escapeHtml(food)}</span><span class="food-unit-label">¥/${unit}あたり</span></div>
            <span class="card-toggle-icon">▲</span>
          </div>
          <div class="card-body" id="${foodBodyId}">`;

      [...rows].sort((a, b) => a.unitPrice - b.unitPrice).forEach(r => {
        const ratio    = maxP === minP ? 0.5 : (r.unitPrice - minP) / (maxP - minP);
        const c        = getHeatColor(ratio);
        const barW     = Math.round(35 + ratio * 55);
        const priceStr = `¥${r.unitPrice.toFixed(2)}/${r.unit}`;
        const tStyle   = c.textColor ? `color:${c.textColor};` : "";
        const hasMemo  = !!(r.memo && r.memo.trim());

        let badgeInner = "";
        if (rows.length > 1) {
          if (r.unitPrice === minP)      badgeInner = `<span class="badge badge-cheap">最安</span>`;
          else if (r.unitPrice === maxP) badgeInner = `<span class="badge badge-high">最高</span>`;
        }

        html += `
          <div class="store-row${hasMemo?' has-memo':''}" onclick="toggleMemoSlide('fv-memo-${r.id}',event,${hasMemo})">
            <div class="heat-bg" style="background:${c.bgColor};opacity:${c.bgOpacity};"></div>
            <div class="store-name-cell">${escapeHtml(r.store)}</div>
            <div class="bar-wrap"><div class="bar" style="width:${barW}%;background:${c.barColor};"></div></div>
            <div class="unit-price-cell" style="${tStyle}">${priceStr}</div>
            <div class="badge-slot">${badgeInner}</div>
            <div class="memo-indicator">${hasMemo ? MEMO_ICON_SVG : ''}</div>
            <div class="row-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" onclick="openEdit('${r.id}','edit-fv-')" aria-label="編集" title="編集">${EDIT_ICON_SVG}</button>
              <button class="btn-icon delete-btn" onclick="deleteItem('${r.id}')" aria-label="削除" title="削除">${TRASH_ICON_SVG}</button>
            </div>
          </div>
          <div class="slide-panel" id="fv-memo-${r.id}">
            <div class="memo-content">${hasMemo ? escapeHtml(r.memo) : ''}</div>
          </div>
          <div class="slide-panel" id="edit-fv-${r.id}">
            ${renderEditFormHtml(r, 'edit-fv-')}
          </div>`;
      });

      html += `</div></div>`;
    });

    html += `</div></div>`;
  });

  el.innerHTML = html;
}

// --- お店ごとビュー ---
function renderStoreView() {
  const el    = document.getElementById("view-store");
  const items = ItemStore.getAll();

  if (items.length === 0) {
    el.innerHTML = '<p class="empty-msg">食材を登録すると比較が表示されます</p>';
    return;
  }

  const stores = [...new Set(items.map(i => i.store))];
  let html = `
    <div class="all-toggle-bar">
      <button class="btn-secondary btn-sm" onclick="toggleAllCards('view-store', true)">すべて開く</button>
      <button class="btn-secondary btn-sm" onclick="toggleAllCards('view-store', false)">すべて閉じる</button>
    </div>`;

  stores.forEach((store, si) => {
    const storeItems = items.filter(i => i.store === store);
    const catSet     = new Set(storeItems.map(i => normCat(i.category)));
    const cats       = sortedCats(catSet);
    const storeBodyId = `sv-store-body-${si}`;

    html += `
      <div class="store-card">
        <div class="store-card-title card-toggle-header" onclick="toggleCard('${storeBodyId}', this)">
          <span>${escapeHtml(store)}</span>
          <span class="card-toggle-icon">▲</span>
        </div>
        <div class="card-body" id="${storeBodyId}">`;

    cats.forEach((cat, ci) => {
      const catItems  = storeItems.filter(i => normCat(i.category) === cat);
      const catBodyId = `sv-cat-body-${si}-${ci}`;

      html += `
        <div class="store-cat-header card-toggle-header" onclick="toggleCard('${catBodyId}', this)">
          <span>${escapeHtml(cat)}</span>
          <span class="card-toggle-icon">▲</span>
        </div>
        <div class="card-body" id="${catBodyId}">`;

      catItems.forEach(r => {
        const sameFood = items.filter(i => i.food === r.food);
        const prices   = sameFood.map(i => i.unitPrice);
        const minP     = Math.min(...prices);
        const maxP     = Math.max(...prices);
        const ratio    = maxP === minP ? 0.5 : (r.unitPrice - minP) / (maxP - minP);
        const c        = getHeatColor(ratio);
        const tStyle   = c.textColor ? `color:${c.textColor};` : "";
        const hasMemo  = !!(r.memo && r.memo.trim());

        let badgeInner = "";
        if (sameFood.length > 1) {
          if (r.unitPrice === minP)      badgeInner = `<span class="badge badge-cheap">安い</span>`;
          else if (r.unitPrice === maxP) badgeInner = `<span class="badge badge-high">高め</span>`;
        }

        html += `
          <div class="item-row${hasMemo?' has-memo':''}" onclick="toggleMemoSlide('sv-memo-${r.id}',event,${hasMemo})">
            <div class="heat-bg" style="background:${c.bgColor};opacity:${c.bgOpacity};"></div>
            <div class="item-row-name">${escapeHtml(r.food)}</div>
            <div class="item-row-price" style="${tStyle}">¥${r.unitPrice.toFixed(2)}/${r.unit}</div>
            <div class="badge-slot">${badgeInner}</div>
            <div class="memo-indicator">${hasMemo ? MEMO_ICON_SVG : ''}</div>
            <div class="row-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" onclick="openEdit('${r.id}','edit-sv-')" aria-label="編集" title="編集">${EDIT_ICON_SVG}</button>
              <button class="btn-icon delete-btn" onclick="deleteItem('${r.id}')" aria-label="削除" title="削除">${TRASH_ICON_SVG}</button>
            </div>
          </div>
          <div class="slide-panel" id="sv-memo-${r.id}">
            <div class="memo-content">${hasMemo ? escapeHtml(r.memo) : ''}</div>
          </div>
          <div class="slide-panel" id="edit-sv-${r.id}">
            ${renderEditFormHtml(r, 'edit-sv-')}
          </div>`;
      });

      html += `</div>`;
    });

    html += `</div></div>`;
  });

  el.innerHTML = html;
}

// ==============================
// タブ切り替え
// ==============================
function switchTab(i) {
  document.querySelectorAll(".tab").forEach((t, j) => t.classList.toggle("active", i === j));
  document.getElementById("view-food").style.display  = i === 0 ? "" : "none";
  document.getElementById("view-store").style.display = i === 1 ? "" : "none";
}

// ==============================
// カード折りたたみ
// ==============================
function toggleCard(bodyId, headerEl) {
  const body = document.getElementById(bodyId);
  if (!body) return;
  const icon = headerEl.querySelector(".card-toggle-icon");
  const isHidden = body.classList.toggle("hidden");
  if (icon) icon.textContent = isHidden ? "▼" : "▲";
}

function toggleAllCards(viewId, open) {
  const viewEl = document.getElementById(viewId);
  if (!viewEl) return;
  viewEl.querySelectorAll(".card-body").forEach(b => b.classList.toggle("hidden", !open));
  viewEl.querySelectorAll(".card-toggle-icon").forEach(icon => {
    icon.textContent = open ? "▲" : "▼";
  });
}

function togglePanel(bodyId, headerEl) {
  const body = document.getElementById(bodyId);
  const icon = headerEl.querySelector(".toggle-icon");
  const isHidden = body.classList.toggle("hidden");
  icon.textContent = isHidden ? "▼" : "▲";
}

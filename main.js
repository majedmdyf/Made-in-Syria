
// عناصر الواجهة
const container    = document.getElementById('products');
const searchInput  = document.getElementById('search');
const filterSelect = document.getElementById('filter');
const themeToggle  = document.getElementById('themeToggle');

// إعدادات عامة
const DEFAULT_IMG = 'assets/images/default.jpg';

let PRODUCTS = [];

// تحميل manifest: يدعم شكلين
// 1) { "sections": [ { "base": "products/syrian/", "files": [...] }, ... ] }
// 2) { "files": [ ... ] }  ← يعود افتراضياً إلى products/syrian/
async function loadManifest() {
  const res = await fetch('products.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('فشل تحميل products.json');
  const j = await res.json();
  if (Array.isArray(j.sections)) return j.sections;
  if (Array.isArray(j.files)) return [{ base: 'products/syrian/', files: j.files }];
  return [];
}

// تحميل منتج واحد من ملف HTML فيه JSON داخل <script id="product" type="application/json">
async function loadProduct(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`فشل تحميل ${url}`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const node = doc.querySelector('script#product[type="application/json"]') || doc.querySelector('#product');
  if (!node) throw new Error(`لا يوجد سكربت #product في ${url}`);
  let data;
  try {
    data = JSON.parse(node.textContent.trim());
  } catch (e) {
    throw new Error(`JSON غير صالح في ${url}`);
  }

  // تطبيع الحقول وبدائلها
  const wa = data.WhatsApp || data.whatsapp || data.whatsApp || '';
  return {
    name: data.name || 'منتج',
    sku: data.sku || '',
    category: data.category || 'غير مصنف',
    origin: data.origin || '',
    price: data.price ?? '',
    currency: data.currency || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    image: data.image || DEFAULT_IMG,
    whatsapp: wa,
    url
  };
}

// إنشاء بطاقة المنتج
function cardHTML(p) {
  const priceStr = p.price !== '' ? `${p.price} ${p.currency || ''}`.trim() : 'السعر عند الطلب';
  const waText = [
    'طلب شراء:',
    
    `المنتج: ${p.name}`,
    p.sku ? `الكود: ${p.sku}` : ' ',
    p.origin ? `المنشأ: ${p.origin}` : ' ',
    p.price !== ' ' ? `السعر: ${priceStr}` : ' ',
    p.url ? `رابط: ${location.origin}${location.pathname.replace(/[^/]+$/, '')}${p.url}` : ' '
  ].filter(Boolean).join('\n');

  return `
    <article class="card">
      <img src="${p.image}" alt="${escapeHtml(p.name)}"
           loading="lazy"
           onerror="this.onerror=null;this.src='${DEFAULT_IMG}'" />
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="meta">
          ${p.sku ? `<span>الكود: ${escapeHtml(p.sku)}</span>` : ''}
          ${p.origin ? `<span>المنشأ: ${escapeHtml(p.origin)}</span>` : ''}
          <span>السعر: ${escapeHtml(priceStr)}</span>
        </div>
        <div class="tags">
          ${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="actions">
          <input type="number" class="qty" min="1" value="1" aria-label="الكمية">
          <a class="order-btn" target="_blank"
             href="https://wa.me/${encodeURIComponent(p.whatsapp)}?text=${encodeURIComponent(waText)}"
          >طلب عبر واتساب</a>
        </div>
      </div>
    </article>
  `;
}

// تعبئة قائمة الفئات
function populateFilter() {
  const set = new Set(PRODUCTS.map(p => p.category));
  const opts = ['all', ...[...set].sort((a,b)=>a.localeCompare(b,'ar'))];
  filterSelect.innerHTML = opts.map(v =>
    `<option value="${escapeHtml(v)}">${v === 'all' ? 'كل الفئات' : escapeHtml(v)}</option>`
  ).join('');
}

// الرسم مع البحث والتصفية
function render() {
  const q = normalize(searchInput.value);
  const f = filterSelect.value;
  const list = PRODUCTS.filter(p => {
    const catOK = f === 'all' || p.category === f;
    const hay = normalize(`${p.name} ${p.sku} ${p.category} ${p.origin}`);
    const qOK = !q || hay.includes(q);
    return catOK && qOK;
  });

  container.innerHTML = list.length
    ? list.map(cardHTML).join('')
    : `<div class="empty">لا توجد منتجات مطابقة.</div>`;

  // ربط أزرار واتساب لحساب الكمية
  container.querySelectorAll('.card').forEach(card => {
    const qty = card.querySelector('.qty');
    const link = card.querySelector('.order-btn');
    const base = new URL(link.href);
    const originalMsg = decodeURIComponent(base.searchParams.get('text') || '');
    link.addEventListener('click', (e) => {
      const n = Math.max(1, parseInt(qty.value || '1', 10));
      const msg = originalMsg + (n ? `\nالكمية: ${n}` : ' ');
      base.searchParams.set('text', encodeURIComponent(msg));
      link.href = base.toString();
    });
  });
}

// أدوات
function normalize(s) {
  return (s || '').toString().trim().toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// تبديل الثيم
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  themeToggle.textContent = next === 'dark' ? 'ليلي' : 'نهاري';
  localStorage.setItem('theme', next);
});

// بحث وتصفية
searchInput.addEventListener('input', render);
filterSelect.addEventListener('change', render);

// تهيئة
(async function init() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  themeToggle.textContent = saved === 'dark' ? 'ليلي' : 'نهاري';

  // تحميل المنتجات من كل الأقسام المعرّفة في manifest
  const sections = await loadManifest();
  const all = [];
  for (const sec of sections) {
    for (const file of sec.files) {
      const url = sec.base.replace(/\/?$/, '/') + file; // ضمان وجود '/'
      try {
        const p = await loadProduct(url);
        all.push(p);
      } catch (e) {
        console.error('خطأ تحميل منتج:', url, e);
      }
    }
  }
  PRODUCTS = all;
  populateFilter();
  render();
})();

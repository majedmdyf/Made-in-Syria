const container     = document.getElementById('products');
const searchInput   = document.getElementById('search');
const filterSelect  = document.getElementById('filter');
const themeToggle   = document.getElementById('themeToggle');
const defaultImage  = 'assets/images/default.jpg';
let products = [];

// جلب قائمة ملفات المنتجات
async function loadManifest() {
  const resp = await fetch('products.json');
  return (await resp.json()).files;
}

// جلب بيانات منتج من ملف HTML
async function loadProduct(file, path = 'syrian') {
  const res  = await fetch(`products/${path}/${file}`);
  const text = await res.text();
  const tmp  = document.createElement('div');
  tmp.innerHTML = text;
  return JSON.parse(tmp.querySelector('#product').textContent);
}

// ملء قائمة التصفية بالفئات
function populateFilter() {
  const cats = new Set(products.map(p => p.category));
  cats.add('all');
  filterSelect.innerHTML = [...cats]
    .map(c => `<option value="${c}">${c === 'all' ? 'كل الفئات' : c}</option>`)
    .join('');
}

// عرض البطاقات مع بحث وتصفية
function render() {
  const q = searchInput.value.trim().toLowerCase();
  const f = filterSelect.value;
  container.innerHTML = products
    .filter(p => (f === 'all' || p.category === f) &&
                 (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
    .map(p => `
      <div class="card">
        <img 
          src="${p.image}" 
          alt="${p.name}" 
          loading="lazy"
          onerror="this.onerror=null;this.src='${defaultImage}';"
        />
        <div class="card-body">
          <h3>${p.name}</h3>
          <div class="meta">
            <span>الكود: ${p.sku}</span>
            <span>منشأ: ${p.origin}</span>
            <span>السعر: ${p.price} ${p.currency}</span>
          </div>
          <div class="tags">
            ${p.tags.map(t => `<div class="tag">${t}</div>`).join('')}
          </div>
          <a class="order-btn"
            href="https://wa.me/${p.WhatsApp}?text=أرغب%20بطلب%20${encodeURIComponent(p.name)}"
            target="_blank">اطلب عبر واتساب</a>
        </div>
      </div>
    `).join('') || '<p>لا توجد منتجات مطابقة.</p>';
}

// تبديل الوضع الداكن/النهاري
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  themeToggle.textContent = isDark ? 'نهاري' : 'ليلي';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

// أحداث البحث والتصفية
searchInput.addEventListener('input', render);
filterSelect.addEventListener('change', render);

// تهيئة الصفحة
(async () => {
  // استعادة الثيم
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? 'ليلي' : 'نهاري';

  // تحميل وعرض المنتجات
  const filesSy = await loadManifest();
  const syProducts = await Promise.all(filesSy.map(f => loadProduct(f, 'syrian')));

  // لو تحب تضيف منتجات عالمية:
  // const filesGl = await loadManifest('global');
  // const glProducts = await Promise.all(filesGl.map(f => loadProduct(f, 'global')));

  products = [...syProducts]; // [...syProducts, ...glProducts]
  populateFilter();
  render();
})();

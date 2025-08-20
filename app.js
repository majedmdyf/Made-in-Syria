// تحميل قائمة الملفات من ملف JSON خارجي
async function fetchProductFiles() {
  const response = await fetch('products.json');
  const data = await response.json();
  return data.files;
}

// تحميل ملف HTML واستخراج بيانات المنتج من داخله
async function loadProduct(file) {
  const response = await fetch(file);
  const htmlText = await response.text();

  const temp = document.createElement('div');
  temp.innerHTML = htmlText;

  const jsonText = temp.querySelector('#product').textContent;
  const product = JSON.parse(jsonText);

  return product;
}

// إنشاء بطاقة المنتج
function createProductCard(p) {
  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div class="thumb" style="background-image: url('${p.image}');"></div>
    <div class="info">
      <h3>${p.name}</h3>
      <p>${p.origin}</p>
      <div class="price">${p.price} ${p.currency || 'ل.س'}</div>
      <a class="order" href="https://wa.me/${p.WhatsApp}?text=أرغب%20بطلب%20${encodeURIComponent(p.name)}" target="_blank">اطلب الآن</a>
    </div>
  `;

  return card;
}

// تحميل وعرض جميع المنتجات
async function displayProducts() {
  const container = document.querySelector('#products');
  const files = await fetchProductFiles();

  for (const file of files) {
    try {
      const product = await loadProduct(file);
      const card = createProductCard(product);
      container.appendChild(card);
    } catch (error) {
      console.error(`خطأ في تحميل المنتج من ${file}:`, error);
    }
  }
}

// بدء التنفيذ
displayProducts();

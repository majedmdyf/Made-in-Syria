// إعداد رقم واتساب المستلم (غيّره لرقمك، بدون +)
  const WHATSAPP_NUMBER = "963936870900"; // مثال: 963944123456

  // مصادر البيانات (manifest)
  const SOURCES = {
    syrian: { base: "products/syrian/", manifests: ["manifest.php","manifest.json"] },
    global: { base: "products/global/", manifests: ["manifest.php","manifest.json"] }
  };

  // الحالة
  const state = { section: localStorage.getItem("section") || "syrian", category: "الكل", query: "" };
  const body = document.body;
  const themeToggle = document.getElementById("themeToggle");
  const tabs = document.querySelectorAll(".tab");
  const catsEl = document.getElementById("categories");
  const grid = document.getElementById("grid");
  const searchInput = document.getElementById("search");

  // Theme
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(localStorage.getItem("theme") || (prefersDark ? "dark" : "light"));
  themeToggle.addEventListener("click", () => {
    const next = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next); localStorage.setItem("theme", next);
  });
  function setTheme(mode){ body.setAttribute("data-theme", mode); themeToggle.textContent = mode === "dark" ? "ليلي" : "نهاري"; }

  // تبويبات
  tabs.forEach(btn=>{
    btn.setAttribute("aria-selected", String(btn.dataset.section === state.section));
    btn.addEventListener("click", async ()=>{
      if (state.section === btn.dataset.section) return;
      state.section = btn.dataset.section; state.category = "الكل"; localStorage.setItem("section", state.section);
      tabs.forEach(t => t.setAttribute("aria-selected", String(t === btn)));
      document.getElementById("panel").setAttribute("aria-labelledby", btn.id);
      await reload(); // غيّر المصدر والمنتجات
    });
  });

  // تحميل القائمة + المنتجات
  async function reload(){
    const manifest = await loadManifest(state.section);
    const files = manifest.files || [];
    const items = [];
    for (const file of files){
      try{
        const meta = await loadProductMeta(SOURCES[state.section].base + file);
        if (meta && meta.name) items.push({ ...meta, __file: file });
      }catch(e){ console.warn("تعذّر تحميل منتج:", file, e); }
    }
    window.__PRODUCTS = items;
    renderCategories();
    renderProducts();
  }

  // جلب manifest (يحاول PHP ثم JSON)
  async function loadManifest(section){
    const { base, manifests } = SOURCES[section];
    for (const m of manifests){
      try{
        const res = await fetch(base + m, { cache: "no-store" });
        if (res.ok) return await res.json();
      }catch(_){}
    }
    return { files: [] };
  }

  // قراءة ميتاداتا المنتج من داخل ملف HTML (<script id="product" type="application/json">)
  async function loadProductMeta(url){
    const html = await (await fetch(url, { cache: "no-store" })).text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const node = doc.querySelector('script#product[type="application/json"]');
    if (!node) return null;
    const data = JSON.parse(node.textContent.trim());
    // قيَم افتراضية لطيفة
    data.colors = data.colors || ["#b22222","#1f7a4c"];
    data.whatsapp = data.whatsapp || WHATSAPP_NUMBER;
    data.url = url;
    return data;
  }

  // تصنيفات ديناميكية
  function renderCategories(){
    catsEl.innerHTML = "";
    const items = window.__PRODUCTS || [];
    const set = new Set(["الكل"]);
    for (const p of items) if (p.category) set.add(p.category);
    for (const name of set){
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (name === state.category ? " active" : ""); b.textContent = name;
      b.addEventListener("click", ()=>{ state.category = name; catsEl.querySelectorAll(".chip").forEach(x=>x.classList.remove("active")); b.classList.add("active"); renderProducts(); });
      catsEl.appendChild(b);
    }
  }

  // البحث
  const debounced = debounce(v => { state.query = v.trim(); renderProducts(); }, 180);
  searchInput.addEventListener("input", e => debounced(e.target.value));

  // رسم المنتجات
  function renderProducts(){
    const items = (window.__PRODUCTS || []).filter(p=>{
      const catOK = state.category === "الكل" || p.category === state.category;
      const q = normalize(state.query);
      const hay = `${p.name} ${p.sku||""} ${p.category||""} ${p.origin||""} ${p.price||""}`;
      const txtOK = !q || normalize(hay).includes(q);
      return catOK && txtOK;
    });

    if (items.length === 0){
      grid.innerHTML = `<div class="empty">لا توجد نتائج مطابقة للبحث/التصنيف.</div>`;
      return;
    }

    grid.innerHTML = items.map(cardHTML).join("");
    // ربط أزرار واتساب
    grid.querySelectorAll("[data-whatsapp]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const sku = btn.dataset.sku, name = btn.dataset.name, price = parseFloat(btn.dataset.price||"0"), cur = btn.dataset.currency||"", url = btn.dataset.url, num = btn.dataset.whatsapp;
        const qtyInput = btn.closest(".card").querySelector(".qty");
        const qty = Math.max(1, parseInt(qtyInput.value || "1", 10));
        const total = (price>0) ? (price*qty) : 0;
        const lines = [
          "طلب شراء عبر تطبيق Made in Syria:",
          `المنتج: ${name}`,
          sku ? `الكود: ${sku}` : "",
          `الكمية: ${qty}`,
          price>0 ? `السعر: ${price} ${cur}` : "",
          price>0 ? `الإجمالي: ${total} ${cur}` : "",
          url ? `رابط المنتج: ${url}` : ""
        ].filter(Boolean).join("\n");
        const link = `https://wa.me/963936870900/${encodeURIComponent(num)}?text=${encodeURIComponent(lines)}`;
        window.open(link, "_blank");
      });
    });
  }

  // شكل البطاقة
  function cardHTML(p){
    const [c1,c2] = p.colors || ["#b22222","#1f7a4c"];
    const badge = state.section === "syrian" ? "صناعة سورية" : "اختيار عالمي";
    const priceStr = (p.price>0 && p.currency) ? `${p.price} ${p.currency}` : (p.price>0 ? `${p.price}` : "السعر عند الطلب");
    return `
      <article class="card">
       <div class="thumb" style="background-image:url('${product.image}')" target="_blank" rel="noopener">
          <span class="badge">${badge}</span>
        </a>
        <div class="body">
          <div class="title">${escapeHtml(p.name)}</div>
          <div class="meta">
            ${p.category ? `<span>الفئة: ${escapeHtml(p.category)}</span>` : ""}
            ${p.origin ? `<span>المنشأ: ${escapeHtml(p.origin)}</span>` : ""}
            ${p.sku ? `<span>الكود: ${escapeHtml(p.sku)}</span>` : ""}
          </div>
          <div class="price">${escapeHtml(priceStr)}</div>
          <div class="tags">
            ${(p.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
          <div class="cta">
            <input type="number" class="qty" min="1" value="1" aria-label="الكمية">
            <button class="btn"
              data-whatsapp
              data-name="${escapeHtml(p.name)}"
              data-sku="${escapeHtml(p.sku||"")}"
              data-price="${p.price||0}"
              data-currency="${escapeHtml(p.currency||"")}"
              data-url="${escapeHtml(p.url||"")}"
              data-whatsapp="${escapeHtml(p.whatsapp||WHATSAPP_NUMBER)}"
            >طلب عبر واتساب</button>
          </div>
        </div>
      </article>
    `;
  }

  // أدوات
  function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
  function normalize(s){ return (s||"").toString().trim().toLowerCase().replace(/[ًٌٍَُِّْـ]/g,"").replace(/[٠-٩]/g, d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)); }
  function escapeHtml(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  // تشغيل أولي
  (async function init(){
    // اضبط التبويب النشط
    tabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.section === state.section)));
    document.getElementById("panel").setAttribute("aria-labelledby", `tab-${state.section}`);
    await reload();
  })();
// ============================================================
// VRTIGO - SCRIPT COMPLETO COM SUPABASE (OTP - SEM SENHA)
// ============================================================

// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
const SUPABASE_URL = "https://zdrplxumrqxlqpmorxbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkcnBseHVtcnF4bHFwbW9yeGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTM0ODIsImV4cCI6MjA5MTIyOTQ4Mn0.cNyw0YHWKhiMunyJKIr9mbp61E31eXCn2XWBO_V9w4o";

let supabaseClient = null;
let currentUser = null;
let supabaseInitialized = false;

// ============================================================
// VARIÁVEIS GLOBAIS DA LOJA
// ============================================================
const WHATSAPP_NUMBER = "918897319841";
let viewMoreButton = null;
let showingAllProducts = false;
let resizeTimeout = null;
let produtosVRTIGO = [];
let savedProducts = [];

// Variáveis para sistema de retry
let supabaseProdutosCarregado = false;
let tentativasFalhas = 0;
let timeoutRecuperacao = null;

// ============================================================
// DADOS DOS PRODUTOS (FALLBACK LOCAL)
// ============================================================
const produtosVRTIGO_LOCAL = [
  { id: 1, name: "Camiseta Preta Básica", price: "129", img: "imagens/preta.jpg", placeholder: "", desc: "Camiseta preta oversized básica, 100% algodão premium.", shortDesc: "Essencial no guarda-roupa", category: "basica" },
  { id: 2, name: "Camiseta Preta Logo VRTIGO", price: "139", img: "imagens/NHATSAVE.png", placeholder: "", desc: "Camiseta preta oversized com logo bordado VRTIGO.", shortDesc: "Logo bordado premium", category: "logo" },
  { id: 3, name: "Camiseta Branca Premium", price: "125", img: "imagens/branca.png", placeholder: "", desc: "Camiseta branca oversized premium.", shortDesc: "Fresh & clean style", category: "basica" },
  { id: 4, name: "Camiseta Branca Minimal", price: "135", img: "imagens/foto.png", placeholder: "", desc: "Camiseta branca oversized com detalhe minimalista.", shortDesc: "Minimalista e elegante", category: "minimal" },
  { id: 5, name: "Camiseta Azul Vibrante", price: "135", img: "imagens/azul.png", placeholder: "", desc: "Camiseta azul oversized vibrante.", shortDesc: "Cor que impressiona", category: "colorida" },
  { id: 6, name: "Camiseta Cinza Urbana", price: "130", img: "imagens/cinzenta.png", placeholder: "", desc: "Camiseta cinza oversized urbana.", shortDesc: "Urbana e moderna", category: "urbana" },
  { id: 7, name: "Camiseta Verde Militar", price: "140", img: "imagens/cor-da-terra.png", placeholder: "", desc: "Camiseta verde militar oversized.", shortDesc: "Estilo militar chic", category: "militar" },
  { id: 8, name: "Camiseta Vermelha Ousada", price: "145", img: "imagens/VIRTIGo.png", placeholder: "", desc: "Camiseta vermelha oversized ousada.", shortDesc: "Ousadia e personalidade", category: "colorida" },
  { id: 9, name: "Camiseta Amarela Solar", price: "140", img: "imagens/amarela.jpg", placeholder: "", desc: "Camiseta amarela oversized solar.", shortDesc: "Energia e estilo", category: "colorida" },
  { id: 10, name: "Camiseta Color Block", price: "150", img: "imagens/color-block.jpg", placeholder: "", desc: "Camiseta oversized color block.", shortDesc: "Design exclusivo", category: "exclusiva" }
];

function getPlaceholderImage(productName, category) {
  const colorMap = { 'basica': '333333', 'logo': '6A0DAD', 'minimal': 'FFFFFF', 'colorida': '2196F3', 'urbana': '9E9E9E', 'militar': '4CAF50', 'exclusiva': 'FF9800' };
  const color = colorMap[category] || '673AB7';
  const textColor = category === 'basica' || category === 'militar' ? 'FFFFFF' : '000000';
  const shortName = productName.replace('Camiseta ', '').substring(0, 15);
  return `https://via.placeholder.com/400x500/${color}/${textColor}?text=${encodeURIComponent(shortName)}`;
}

produtosVRTIGO_LOCAL.forEach(p => { p.placeholder = getPlaceholderImage(p.name, p.category); });

// ============================================================
// UTILITÁRIOS
// ============================================================
function safeGetElement(id) {
  const element = document.getElementById(id);
  if (!element) console.warn(`⚠️ Elemento #${id} não encontrado`);
  return element;
}

function debounce(func, wait) {
  return function(...args) {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => func(...args), wait);
  };
}

function showMessage(message, type, element) {
  if (!element) return;
  element.style.display = 'block';
  element.textContent = message;
  element.style.cssText = `margin:10px 0;padding:12px;border-radius:8px;font-size:13px;text-align:center;font-weight:500;display:block;${
    type === 'success' ? 'background-color:#d4edda;color:#155724;border:1px solid #c3e6cb;' :
    type === 'error' ? 'background-color:#f8d7da;color:#721c24;border:1px solid #f5c6cb;' :
    'background-color:#cce5ff;color:#004085;border:1px solid #b8daff;'
  }`;
  setTimeout(() => { if(element) element.style.display = 'none'; }, 5000);
}

function updateUserIconVisual(isLoggedIn) {
  const userIcon = document.getElementById('userIconBtn');
  if (userIcon) {
    if (isLoggedIn) {
      userIcon.style.background = 'var(--gradient)';
      userIcon.style.borderColor = 'var(--primary)';
      const icon = userIcon.querySelector('i');
      if (icon) icon.style.color = 'white';
      userIcon.setAttribute('aria-expanded', 'true');
    } else {
      userIcon.style.background = 'rgba(255, 255, 255, 0.1)';
      userIcon.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      const icon = userIcon.querySelector('i');
      if (icon) icon.style.color = 'var(--text)';
      userIcon.setAttribute('aria-expanded', 'false');
    }
  }
}

async function restoreSession() {
  if (supabaseClient && supabaseInitialized) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      currentUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.nome || session.user.email.split('@')[0]
      };
      localStorage.setItem('vrtigoCurrentUser', JSON.stringify(currentUser));
      updateUserIconVisual(true);
      updateDropdownUserInfo();
      await loadUserFavorites();
      updateAllSaveButtons();
      console.log("✅ Sessão restaurada:", currentUser.email);
      return true;
    } else {
      localStorage.removeItem('vrtigoCurrentUser');
      updateUserIconVisual(false);
      console.log("⚠️ Nenhuma sessão ativa");
      return false;
    }
  }
  return false;
}

async function migrateLocalFavoritesToAPI(userId) {
  const localSaves = localStorage.getItem('vrtigoSaves');
  if (localSaves) {
    const localFavorites = JSON.parse(localSaves);
    if (localFavorites.length > 0) {
      console.log(`🔄 Migrando ${localFavorites.length} favoritos locais...`);
      for (const product of localFavorites) {
        await addFavorito(userId, product.id);
      }
      localStorage.removeItem('vrtigoSaves');
      console.log("✅ Favoritos migrados com sucesso!");
    }
  }
}

// ============================================================
// FUNÇÕES DO SUPABASE (PRODUTOS E FAVORITOS)
// ============================================================

async function tentarCarregarDoSupabase() {
  try {
    if (!window.supabase?.createClient) {
      console.warn("⚠️ SDK Supabase não disponível ainda");
      return null;
    }

    if (!supabaseClient) {
      setupSupabase();
    }
    
    if (!supabaseClient) {
      console.warn("⚠️ Cliente Supabase não inicializado");
      return null;
    }

    const { data, error } = await supabaseClient
      .from('produtos')
      .select('*')
      .order('id');

    if (error) throw error;

    if (data && data.length > 0) {
      console.log("📦 Estrutura do produto do Supabase:", Object.keys(data[0]));
      
      return data.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        img: p.img,
        desc: p.descricao || p.desc || "Descrição não disponível",
        shortDesc: p.shortdesc || p.shortDesc || p.short_desc || "Produto VRTIGO",
        category: p.category,
        placeholder: getPlaceholderImage(p.name, p.category)
      }));
    }
    return null;
  } catch (error) {
    console.error("❌ Erro Supabase:", error.message);
    return null;
  }
}

function agendarNovaTentativa() {
  if (timeoutRecuperacao) {
    clearTimeout(timeoutRecuperacao);
  }
  
  const temposEspera = [30000, 60000, 120000, 300000];
  const indice = Math.min(tentativasFalhas - 1, temposEspera.length - 1);
  const tempoEspera = temposEspera[indice] || 300000;
  
  console.log(`🔄 Nova tentativa de conectar ao Supabase em ${tempoEspera / 1000} segundos...`);
  
  timeoutRecuperacao = setTimeout(async () => {
    console.log("🔄 Tentando reconectar ao Supabase...");
    const produtosSupabase = await tentarCarregarDoSupabase();
    
    if (produtosSupabase && produtosSupabase.length > 0) {
      produtosVRTIGO = produtosSupabase;
      supabaseProdutosCarregado = true;
      tentativasFalhas = 0;
      
      await loadStoreProducts();
      initSaveButtons();
      updateAllSaveButtons();
      
      console.log("✅ Reconectado ao Supabase! Produtos atualizados.");
    } else {
      tentativasFalhas++;
      agendarNovaTentativa();
    }
  }, tempoEspera);
}

async function carregarProdutos() {
  console.log("📦 Iniciando carregamento de produtos...");
  
  const produtosSupabase = await tentarCarregarDoSupabase();
  
  if (produtosSupabase && produtosSupabase.length > 0) {
    produtosVRTIGO = produtosSupabase;
    supabaseProdutosCarregado = true;
    tentativasFalhas = 0;
    console.log("✅ Produtos carregados do Supabase:", produtosVRTIGO.length);
  } else {
    tentativasFalhas++;
    console.log(`⚠️ Falha ao carregar do Supabase (tentativa ${tentativasFalhas}). Usando fallback local.`);
    
    produtosVRTIGO = [...produtosVRTIGO_LOCAL];
    produtosVRTIGO.forEach(p => {
      p.placeholder = getPlaceholderImage(p.name, p.category);
    });
    
    agendarNovaTentativa();
  }
  
  await loadStoreProducts();
  initSaveButtons();
  updateAllSaveButtons();
}

async function fetchFavoritos(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('favoritos')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return [];
  }
}

async function addFavorito(userId, productId) {
  try {
    const { data, error } = await supabaseClient
      .from('favoritos')
      .insert({ user_id: userId, product_id: productId, created_at: new Date().toISOString() })
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    return null;
  }
}

async function removeFavorito(favoritoId) {
  try {
    const { error } = await supabaseClient
      .from('favoritos')
      .delete()
      .eq('id', favoritoId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    return false;
  }
}

async function getFavoritoId(userId, productId) {
  try {
    const { data, error } = await supabaseClient
      .from('favoritos')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();
    
    if (error) return null;
    return data?.id || null;
  } catch (error) {
    return null;
  }
}

// ============================================================
// SISTEMA DE FAVORITOS
// ============================================================
async function loadUserFavorites() {
  const savedUser = localStorage.getItem('vrtigoCurrentUser');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    const favoritos = await fetchFavoritos(user.id);
    savedProducts = [];
    for (const fav of favoritos) {
      const product = produtosVRTIGO.find(p => p.id === fav.product_id);
      if (product) savedProducts.push({ ...product });
    }
    updateSavesCount();
    updateAllSaveButtons();
    loadSavedProducts();
  } else {
    const localSaves = localStorage.getItem('vrtigoSaves');
    savedProducts = localSaves ? JSON.parse(localSaves) : [];
  }
}

function saveToLocalStorage() {
  localStorage.setItem("vrtigoSaves", JSON.stringify(savedProducts));
}

async function toggleSaveProduct(productId) {
  const productIndex = savedProducts.findIndex(p => p.id === productId);
  const savedUser = localStorage.getItem('vrtigoCurrentUser');
  
  if (savedUser) {
    const user = JSON.parse(savedUser);
    if (productIndex !== -1) {
      const favId = await getFavoritoId(user.id, productId);
      if (favId) {
        await removeFavorito(favId);
      }
      savedProducts.splice(productIndex, 1);
      return false;
    } else {
      const product = produtosVRTIGO.find(p => p.id === productId);
      if (product) {
        await addFavorito(user.id, productId);
        savedProducts.push({ ...product });
        return true;
      }
    }
  } else {
    if (productIndex !== -1) {
      savedProducts.splice(productIndex, 1);
      return false;
    } else {
      const product = produtosVRTIGO.find(p => p.id === productId);
      if (product) {
        savedProducts.push({ ...product });
        return true;
      }
    }
  }
  return null;
}

function updateAllSaveButtons() {
  document.querySelectorAll('.products-grid .save-btn, #saves-grid .save-btn').forEach(btn => {
    const productId = parseInt(btn.dataset.id);
    if (!isNaN(productId)) {
      const isSaved = savedProducts.some(p => p.id === productId);
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isSaved ? "fas fa-heart" : "far fa-heart";
        btn.classList.toggle("active", isSaved);
      }
    }
  });
  const modalSaveBtn = document.querySelector('.modal-save-btn');
  if (modalSaveBtn && modalSaveBtn.dataset.id) {
    const isSaved = savedProducts.some(p => p.id === parseInt(modalSaveBtn.dataset.id));
    const icon = modalSaveBtn.querySelector('i');
    if (icon) {
      icon.className = isSaved ? "fas fa-heart" : "far fa-heart";
      modalSaveBtn.classList.toggle("active", isSaved);
    }
  }
}

function updateSavesCount() {
  const savesCount = document.querySelector('.saves-count');
  if (savesCount) savesCount.textContent = `${savedProducts.length} ${savedProducts.length === 1 ? 'item' : 'itens'}`;
}

function getInitialProductCount() { return window.innerWidth >= 1024 ? 8 : 6; }
function getRemainingProductsCount() { return Math.max(0, produtosVRTIGO.length - getInitialProductCount()); }

function createViewMoreButton() {
  if (viewMoreButton) return viewMoreButton;
  const button = document.createElement('button');
  button.className = 'view-more-btn';
  button.innerHTML = `<span>Ver mais produtos</span><i class="fas fa-chevron-down"></i><span class="count">+${getRemainingProductsCount()}</span>`;
  button.addEventListener('click', () => { showingAllProducts = true; loadStoreProducts(); if(viewMoreButton) viewMoreButton.style.display = 'none'; });
  viewMoreButton = button;
  return button;
}

function generateProductCard(product) {
  const isSaved = savedProducts.some(p => p.id === product.id);
  const heartClass = isSaved ? "fas" : "far";
  const btnClass = isSaved ? "active" : "";
  const placeholderSrc = product.placeholder || getPlaceholderImage(product.name, product.category);
  return `<div class="product-card" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-img="${product.img}" data-desc="${product.desc}" data-category="${product.category}">
    <div class="product-image">
      <img src="${product.img}" alt="${product.name}" width="400" height="500" loading="lazy" onerror="this.onerror=null; this.src='${placeholderSrc}'">
      <button class="save-btn ${btnClass}" data-id="${product.id}" type="button" aria-label="Salvar nos favoritos"><i class="${heartClass} fa-heart"></i></button>
    </div>
    <div class="product-info">
      <h3>${product.name}</h3>
      <p class="product-desc">${product.shortDesc}</p>
      <div class="product-footer"><span class="price">R$ ${product.price}</span><button class="buy-btn" type="button" aria-label="Comprar produto">Comprar</button></div>
    </div>
  </div>`;
}

function loadProductsToGrid(productsArray, gridElement) {
  if (!gridElement) return;
  let productsToShow = (showingAllProducts || gridElement.id === 'saves-grid') ? productsArray : productsArray.slice(0, getInitialProductCount());
  gridElement.innerHTML = productsToShow.map(generateProductCard).join('');
  initSaveButtons(gridElement);
  initBuyButtons(gridElement);
}

async function loadStoreProducts() {
  const productsGrid = document.querySelector('.products-grid');
  if (!productsGrid) return;
  loadProductsToGrid(produtosVRTIGO, productsGrid);
  if (!showingAllProducts && getRemainingProductsCount() > 0 && !productsGrid.nextElementSibling?.classList?.contains('view-more-btn')) {
    productsGrid.parentNode.insertBefore(createViewMoreButton(), productsGrid.nextSibling);
  } else if (viewMoreButton) viewMoreButton.style.display = 'none';
  await loadUserFavorites();
}

function scrollToSection(sectionId) {
  const section = document.querySelector(sectionId);
  if (section) window.scrollTo({ top: section.offsetTop - 80, behavior: 'smooth' });
}

function initNavigation() {
  document.querySelectorAll('.nav-item, .bottom-nav a').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); scrollToSection(link.getAttribute('href')); });
  });
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.content-section');
    const scrollPos = window.scrollY + 100;
    let current = '';
    sections.forEach(section => { if(scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) current = section.id; });
    document.querySelectorAll('.nav-item').forEach(item => { item.classList.toggle('active', item.getAttribute('href') === `#${current}`); });
  });
  window.addEventListener('resize', debounce(() => { if(!showingAllProducts) loadStoreProducts(); }, 250));
}

async function handleSaveButtonClick(e, productId) {
  e.preventDefault();
  e.stopPropagation();
  const wasSaved = await toggleSaveProduct(productId);
  if (wasSaved !== null) {
    saveToLocalStorage();
    updateSavesCount();
    updateAllSaveButtons();
    if (!wasSaved && document.getElementById('saves-grid')) {
      const cardToRemove = document.getElementById('saves-grid').querySelector(`.product-card[data-id="${productId}"]`);
      if (cardToRemove) {
        cardToRemove.style.opacity = '0';
        setTimeout(() => { cardToRemove.remove(); if(document.getElementById('saves-grid').querySelectorAll('.product-card').length === 0) loadSavedProducts(); }, 300);
      }
    }
    if (wasSaved && safeGetElement('saves') && isElementInViewport(safeGetElement('saves'))) loadSavedProducts();
  }
}

function initSaveButtons(scope = document) {
  scope.querySelectorAll(".save-btn").forEach(btn => {
    const id = parseInt(btn.dataset.id);
    if (isNaN(id)) return;
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", (e) => handleSaveButtonClick(e, id));
  });
  updateAllSaveButtons();
}

function isElementInViewport(el) { if(!el) return false; const r = el.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight) && r.right <= (window.innerWidth || document.documentElement.clientWidth); }

function loadSavedProducts() {
  const savesGrid = safeGetElement("saves-grid");
  const noSaves = safeGetElement("no-saves");
  if (!savesGrid || !noSaves) return;
  if (savedProducts.length === 0) { savesGrid.style.display = "none"; noSaves.style.display = "block"; return; }
  savesGrid.style.display = "grid"; noSaves.style.display = "none";
  loadProductsToGrid(savedProducts, savesGrid);
  updateAllSaveButtons();
}

function openProductModal(product) {
  const modal = safeGetElement("productModal");
  if (!modal) return;
  const modalBody = modal.querySelector(".modal-body");
  if (!modalBody) return;
  const modalSaveBtn = modal.querySelector(".modal-save-btn");
  if (modalSaveBtn) {
    modalSaveBtn.dataset.id = product.id;
    const newSaveBtn = modalSaveBtn.cloneNode(true);
    modalSaveBtn.parentNode.replaceChild(newSaveBtn, modalSaveBtn);
    newSaveBtn.addEventListener("click", (e) => handleSaveButtonClick(e, product.id));
  }
  modalBody.innerHTML = `<div class="modal-product-image"><img src="${product.img}" alt="${product.name}" width="400" height="500" onerror="this.onerror=null; this.src='${product.placeholder}'"></div><div class="modal-info"><h2>${product.name}</h2><p class="modal-desc">${product.desc}</p><div class="modal-price-row"><span class="modal-price">R$ ${product.price}</span></div><button class="modal-buy-btn" type="button" aria-label="Comprar produto">Comprar</button></div>`;
  modalBody.querySelector('.modal-buy-btn')?.addEventListener('click', () => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Gostaria de comprar: ${product.name} (R$ ${product.price})`)}`, '_blank'));
  updateAllSaveButtons();
  modal.classList.add("open");
  document.body.style.overflow = 'hidden';
}

function initProductModal() {
  const modal = safeGetElement("productModal");
  if (!modal) return;
  const closeBtn = modal.querySelector(".modal-close");
  if (!closeBtn) return;
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (card && !e.target.closest('.save-btn') && !e.target.closest('.buy-btn')) {
      const product = produtosVRTIGO.find(p => p.id === parseInt(card.dataset.id));
      if (product) openProductModal(product);
    }
  });
  closeBtn.addEventListener("click", () => { modal.classList.remove("open"); document.body.style.overflow = 'auto'; });
  modal.addEventListener("click", (e) => { if(e.target === modal) { modal.classList.remove("open"); document.body.style.overflow = 'auto'; } });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape" && modal.classList.contains("open")) { modal.classList.remove("open"); document.body.style.overflow = 'auto'; } });
}

function initBuyButtons(scope = document) {
  scope.querySelectorAll(".buy-btn").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      const card = this.closest(".product-card");
      if (!card) return;
      const product = produtosVRTIGO.find(p => p.id === parseInt(card.dataset.id));
      if (product) {
        addToCart(product, 1);
        showCartNotification(`${product.name} adicionado ao carrinho!`);
      }
    });
  });
}

// ============================================================
// SISTEMA DE CARRINHO
// ============================================================

function addToCart(product, quantity = 1) {
  let cartItems = [];
  const savedCart = localStorage.getItem('vrtigoCart');
  
  if (savedCart) {
    cartItems = JSON.parse(savedCart);
  }
  
  const existingItem = cartItems.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cartItems.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      img: product.img,
      quantity: quantity
    });
  }
  
  localStorage.setItem('vrtigoCart', JSON.stringify(cartItems));
  updateCartBadge();
}

function updateCartBadge() {
  const savedCart = localStorage.getItem('vrtigoCart');
  let totalItems = 0;
  
  if (savedCart) {
    const cartItems = JSON.parse(savedCart);
    totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }
  
  const cartBtn = document.querySelector('.navbar .cart-btn');
  if (cartBtn) {
    const oldBadge = cartBtn.querySelector('.cart-badge');
    if (oldBadge) oldBadge.remove();
    
    if (totalItems > 0) {
      const badge = document.createElement('span');
      badge.className = 'cart-badge';
      badge.textContent = totalItems > 99 ? '99+' : totalItems;
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: var(--primary);
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      cartBtn.style.position = 'relative';
      cartBtn.appendChild(badge);
    }
  }
}

function showCartNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'cart-notification';
  notification.innerHTML = `
    <i class="fas fa-check-circle" style="margin-right: 10px;"></i>
    ${message}
    <button onclick="window.location.href='carrinho.html'" style="
      margin-left: 10px;
      background: var(--primary);
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
    ">Ver Carrinho</button>
  `;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--bg-secondary);
    color: var(--text);
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease;
    border-left: 4px solid var(--primary);
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 4000);
  }, 4000);
}

function initFAQModal() {
  const faqModal = safeGetElement("faqModal");
  if (!faqModal) return;
  document.querySelectorAll(".faq-btn").forEach(btn => {
    btn.addEventListener("click", () => { faqModal.classList.add("open"); document.body.style.overflow = 'hidden'; });
  });
  const close = () => { faqModal.classList.remove("open"); document.body.style.overflow = 'auto'; };
  faqModal.addEventListener("click", (e) => { if(e.target === faqModal || e.target.classList.contains('modal-close')) close(); });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape" && faqModal.classList.contains("open")) close(); });
}

function initContactForm() {
  const form = document.getElementById("contactForm");
  const contactModal = safeGetElement("contactModal");
  if (!form) return;
  form.removeAttribute('action'); form.removeAttribute('method'); form.removeAttribute('target');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Enviando...'; submitBtn.disabled = true;
    try {
      const response = await fetch('https://formspree.io/f/xovkranj', { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
      if (response.ok) { if(contactModal) contactModal.classList.add("open"); form.reset(); showFormMessage('✅ Mensagem enviada!', 'success'); }
      else showFormMessage('❌ Erro ao enviar.', 'error');
    } catch(error) { showFormMessage('❌ Erro de conexão.', 'error'); }
    finally { submitBtn.textContent = originalText; submitBtn.disabled = false; }
  });
  if(contactModal) contactModal.addEventListener("click", (e) => { if(e.target === contactModal || e.target.classList.contains('modal-close')) contactModal.classList.remove("open"); });
}

function showFormMessage(message, type) {
  document.querySelectorAll('.form-message').forEach(msg => msg.remove());
  const msgDiv = document.createElement('div');
  msgDiv.className = `form-message ${type}`;
  msgDiv.textContent = message;
  msgDiv.style.cssText = `animation:fadeIn 0.3s;margin:1rem 0;padding:12px;border-radius:8px;text-align:center;${type === 'success' ? 'color:#00eaff;background:rgba(0,234,255,0.1);border:1px solid rgba(0,234,255,0.3);' : 'color:#ff5050;background:rgba(255,80,80,0.1);border:1px solid rgba(255,80,80,0.3);'}`;
  const form = document.getElementById("contactForm");
  if(form) form.insertBefore(msgDiv, form.querySelector('.submit-btn'));
  setTimeout(() => msgDiv.remove(), 5000);
}

function initUIInteractions() {
  document.querySelectorAll('.cta-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.classList.contains('primary') && !btn.classList.contains('faq-btn')) scrollToSection('#loja');
      else if(btn.classList.contains('secondary') && !btn.classList.contains('faq-btn')) scrollToSection('#sobre');
    });
  });
  document.querySelector('#no-saves .cta-btn.primary')?.addEventListener('click', () => scrollToSection('#loja'));
  
  const cartBtn = document.querySelector('.navbar .cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      window.location.href = 'carrinho.html';
    });
  }
}

let currentFilter = 'all';

function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      filterProducts(currentFilter);
    });
  });
}

function filterProducts(filter) {
  const productsGrid = document.querySelector('.products-grid');
  if (!productsGrid) return;
  
  let filtered = [...produtosVRTIGO];
  
  switch(filter) {
    case 'popular':
      filtered = filtered.filter(p => p.category === 'logo' || p.category === 'exclusiva');
      break;
    case 'new':
      filtered = filtered.slice(-3);
      break;
    default:
      break;
  }
  
  showingAllProducts = false;
  loadProductsToGrid(filtered, productsGrid);
  
  if (viewMoreButton) viewMoreButton.style.display = 'none';
}

function initThemeToggle() {
  const btn = document.querySelector('.theme-toggle-btn');
  if(!btn) return;
  const icon = btn.querySelector('i');
  const saved = localStorage.getItem('vrtigoTheme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(saved === 'light' || (!saved && !systemDark)) { document.documentElement.setAttribute('data-theme', 'light'); icon.classList.replace('fa-moon', 'fa-sun'); }
  btn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if(isLight) { document.documentElement.removeAttribute('data-theme'); icon.classList.replace('fa-sun', 'fa-moon'); localStorage.setItem('vrtigoTheme', 'dark'); }
    else { document.documentElement.setAttribute('data-theme', 'light'); icon.classList.replace('fa-moon', 'fa-sun'); localStorage.setItem('vrtigoTheme', 'light'); }
  });
}

// ============================================================
// SISTEMA DE LOGIN OTP (SEM SENHA)
// ============================================================

function setupSupabase() {
  if (supabaseInitialized) return true;
  
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true
      }
    });
    supabaseInitialized = true;
    console.log("✅ Supabase iniciado com PKCE");
    return true;
  }
  console.error("❌ Supabase não encontrado");
  return false;
}

// ============================================================
// FUNÇÕES OTP - CADASTRO E LOGIN
// ============================================================

// Função para mostrar/esconder campos OTP
function toggleOtpFields(formType, show) {
  const container = document.getElementById(formType === 'signup' ? 'signupOtpContainer' : 'loginOtpContainer');
  const submitBtn = document.getElementById(formType === 'signup' ? 'signupSubmitBtn' : 'loginSubmitBtn');
  const emailField = document.getElementById(formType === 'signup' ? 'signupEmail' : 'loginEmail');
  
  if (container) {
    container.classList.toggle('show', show);
  }
  
  if (submitBtn) {
    submitBtn.textContent = show ? 'Verificar código' : 'Enviar código';
  }
  
  if (emailField) {
    emailField.disabled = show;
  }
}

// Função para enviar OTP (login ou cadastro)
async function sendOtp(email, formType) {
  const msgDiv = document.getElementById('login-message');
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage('❌ Insira um email válido', 'error', msgDiv);
    return false;
  }
  
  showMessage('⏳ Enviando código...', 'info', msgDiv);
  
  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
        data: {
          nome: document.getElementById('signupName')?.value.trim() || ''
        }
      }
    });
    
    if (error) throw error;
    
    showMessage('✅ Código enviado! Verifique seu email.', 'success', msgDiv);
    toggleOtpFields(formType, true);
    return true;
    
  } catch (error) {
    console.error('Erro ao enviar OTP:', error);
    showMessage('❌ ' + (error.message || 'Erro ao enviar código. Tente novamente.'), 'error', msgDiv);
    return false;
  }
}

// Função para verificar OTP (login ou cadastro)
async function verifyOtp(email, token, formType) {
  const msgDiv = document.getElementById('login-message');
  
  if (!token || token.length < 8) {
    showMessage('❌ Digite o código de 8 dígitos', 'error', msgDiv);
    return false;
  }
  
  showMessage('⏳ Verificando código...', 'info', msgDiv);
  
  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: email,
      token: token,
      type: 'email'
    });
    
    if (error) throw error;
    
    // Login bem-sucedido
    currentUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.nome || email.split('@')[0]
    };
    
    localStorage.setItem('vrtigoCurrentUser', JSON.stringify(currentUser));
    updateUserIconVisual(true);
    updateDropdownUserInfo();
    
    // Se for cadastro, salvar dados adicionais
    if (formType === 'signup') {
      await saveUserProfile(data.user.id);
    }
    
    await migrateLocalFavoritesToAPI(currentUser.id);
    
    showMessage('✅ Login realizado com sucesso!', 'success', msgDiv);
    updateUserInterface();
    await loadUserFavorites();
    updateAllSaveButtons();
    
    setTimeout(() => {
      closeLoginModal();
    }, 1500);
    
    return true;
    
  } catch (error) {
    console.error('Erro ao verificar OTP:', error);
    showMessage('❌ ' + (error.message || 'Código inválido ou expirado. Tente novamente.'), 'error', msgDiv);
    return false;
  }
}

// Função para salvar perfil do usuário (cadastro)
async function saveUserProfile(userId) {
  try {
    const name = document.getElementById('signupName')?.value.trim() || '';
    const phone = document.getElementById('signupPhone')?.value.trim() || '';
    const birth = document.getElementById('signupBirth')?.value || '';
    const gender = document.getElementById('signupGender')?.value || '';
    const location = document.getElementById('signupLocation')?.value.trim() || '';
    
    console.log('📝 Salvando perfil:', { userId, name, phone, birth, gender, location });
    
    // Verificar se já existe um perfil
    const { data: existingProfile, error: checkError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar perfil existente:', checkError);
    }
    
    let result;
    
    if (existingProfile) {
      // Atualizar perfil existente
      console.log('🔄 Atualizando perfil existente...');
      result = await supabaseClient
        .from('profiles')
        .update({
          nome: name,
          telefone: phone,
          data_nascimento: birth,
          sexo: gender,
          localizacao: location,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } else {
      // Inserir novo perfil
      console.log('📝 Inserindo novo perfil...');
      result = await supabaseClient
        .from('profiles')
        .insert({
          id: userId,
          nome: name,
          telefone: phone,
          data_nascimento: birth,
          sexo: gender,
          localizacao: location,
          is_admin: false,
          role: 'cliente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    if (result.error) {
      console.error('❌ Erro ao salvar perfil:', result.error);
    } else {
      console.log('✅ Perfil salvo com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao salvar perfil:', error);
  }
}

// ============================================================
// HANDLERS DO FORMULÁRIO OTP
// ============================================================

// Handler do formulário de cadastro
async function handleSignUp(event) {
  event.preventDefault();
  
  if (!setupSupabase()) {
    showMessage('❌ Erro de conexão. Tente novamente.', 'error', document.getElementById('login-message'));
    return;
  }
  
  const msgDiv = document.getElementById('login-message');
  const email = document.getElementById('signupEmail')?.value.trim() || '';
  const name = document.getElementById('signupName')?.value.trim() || '';
  const phone = document.getElementById('signupPhone')?.value.trim() || '';
  const birth = document.getElementById('signupBirth')?.value || '';
  const gender = document.getElementById('signupGender')?.value || '';
  const location = document.getElementById('signupLocation')?.value.trim() || '';
  const otpContainer = document.getElementById('signupOtpContainer');
  const otpInput = document.getElementById('signupOtp');
  
  // Verifica se o OTP está visível (segundo passo)
  if (otpContainer && otpContainer.classList.contains('show')) {
    const token = otpInput?.value.trim() || '';
    await verifyOtp(email, token, 'signup');
    return;
  }
  
  // Primeiro passo: validar dados do cadastro
  if (!name) {
    showMessage('❌ Insira seu nome completo', 'error', msgDiv);
    return;
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage('❌ Insira um email válido', 'error', msgDiv);
    return;
  }
  
  if (!birth) {
    showMessage('❌ Insira sua data de nascimento', 'error', msgDiv);
    return;
  }
  
  if (!gender) {
    showMessage('❌ Selecione seu sexo', 'error', msgDiv);
    return;
  }
  
  if (!location) {
    showMessage('❌ Insira sua cidade e estado', 'error', msgDiv);
    return;
  }
  
  // Enviar OTP
  await sendOtp(email, 'signup');
}

// Handler do formulário de login
async function handleSignIn(event) {
  event.preventDefault();
  
  if (!setupSupabase()) {
    showMessage('❌ Erro de conexão. Tente novamente.', 'error', document.getElementById('login-message'));
    return;
  }
  
  const msgDiv = document.getElementById('login-message');
  const email = document.getElementById('loginEmail')?.value.trim() || '';
  const otpContainer = document.getElementById('loginOtpContainer');
  const otpInput = document.getElementById('loginOtp');
  
  // Verifica se o OTP está visível (segundo passo)
  if (otpContainer && otpContainer.classList.contains('show')) {
    const token = otpInput?.value.trim() || '';
    await verifyOtp(email, token, 'login');
    return;
  }
  
  // Primeiro passo: enviar OTP
  await sendOtp(email, 'login');
}

// ============================================================
// FUNÇÕES DE MODAL E OVERLAY
// ============================================================

function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    toggleOverlayToLogin();
    const msgDiv = document.getElementById('login-message');
    if (msgDiv) msgDiv.style.display = 'none';
    // Resetar campos OTP
    resetOtpFields();
  }
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) { 
    modal.classList.remove('open'); 
    document.body.style.overflow = 'auto';
    resetOtpFields();
  }
}

function resetOtpFields() {
  ['signupOtpContainer', 'loginOtpContainer'].forEach(id => {
    const container = document.getElementById(id);
    if (container) container.classList.remove('show');
  });
  ['signupOtp', 'loginOtp'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
  ['signupEmail', 'loginEmail'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.disabled = false;
  });
  ['signupSubmitBtn', 'loginSubmitBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = btn.id.includes('signup') ? 'Enviar código' : 'Enviar código';
  });
}

function toggleOverlayToSignUp() {
  const container = document.getElementById('container');
  if (container) container.classList.add('right-panel-active');
  resetOtpFields();
}

function toggleOverlayToLogin() {
  const container = document.getElementById('container');
  if (container) container.classList.remove('right-panel-active');
  resetOtpFields();
}

// ============================================================
// DROPDOWN DO USUÁRIO
// ============================================================

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdownMenu');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
}

function closeUserDropdown() {
  const dropdown = document.getElementById('userDropdownMenu');
  if (dropdown) {
    dropdown.classList.remove('open');
  }
}

function updateDropdownUserInfo() {
  const userNameSpan = document.getElementById('dropdownUserName');
  if (userNameSpan && currentUser) {
    userNameSpan.textContent = currentUser.name.split(' ')[0];
  }
}

function handleDropdownFavoritos() {
  closeUserDropdown();
  const savesSection = document.getElementById('saves');
  if (savesSection) {
    savesSection.scrollIntoView({ behavior: 'smooth' });
  }
}

async function handleDropdownLogout() {
  closeUserDropdown();
  
  if (supabaseClient && supabaseInitialized) {
    await supabaseClient.auth.signOut();
  }
  
  localStorage.removeItem('vrtigoCurrentUser');
  localStorage.removeItem('vrtigoTempSignup');
  currentUser = null;
  savedProducts = [];
  updateSavesCount();
  updateAllSaveButtons();
  loadSavedProducts();
  updateUserInterface();
  updateUserIconVisual(false);
}

function updateUserInterface() {
  const saved = localStorage.getItem('vrtigoCurrentUser');
  currentUser = saved ? JSON.parse(saved) : null;
  if (currentUser) {
    updateUserIconVisual(true);
    updateDropdownUserInfo();
  } else {
    updateUserIconVisual(false);
  }
}

// ============================================================
// INICIALIZAÇÃO DO SISTEMA DE LOGIN
// ============================================================

function initLoginSystem() {
  console.log("🔧 Inicializando sistema de login OTP...");
  
  setupSupabase();
  
  /* Botões do overlay
  const signUpBtn = document.getElementById('signUp');
  const signInBtn = document.getElementById('signIn');
  
  if (signUpBtn) {
    const newSignUpBtn = signUpBtn.cloneNode(true);
    signUpBtn.parentNode.replaceChild(newSignUpBtn, signUpBtn);
    newSignUpBtn.addEventListener('click', toggleOverlayToSignUp);
  }
  
  if (signInBtn) {
    const newSignInBtn = signInBtn.cloneNode(true);
    signInBtn.parentNode.replaceChild(newSignInBtn, signInBtn);
    newSignInBtn.addEventListener('click', toggleOverlayToLogin);
  }*/
  
  // Formulários
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  
  if (signupForm) {
    const newSignupForm = signupForm.cloneNode(true);
    signupForm.parentNode.replaceChild(newSignupForm, signupForm);
    newSignupForm.addEventListener('submit', handleSignUp);
  }
  
  if (loginForm) {
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
    newLoginForm.addEventListener('submit', handleSignIn);
  
  
  // Fechar modal
  const loginModalElem = document.getElementById('loginModal');
  if (loginModalElem) {
    const closeBtn = loginModalElem.querySelector('.modal-close');
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', closeLoginModal);
    }
    
    loginModalElem.addEventListener('click', (e) => { 
      if(e.target === loginModalElem) closeLoginModal(); 
    });
  }
  
  // Reenvio de OTP
  document.getElementById('signupResendOtp')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    if (email) {
      await sendOtp(email, 'signup');
    } else {
      showMessage('❌ Email não encontrado. Tente novamente.', 'error', document.getElementById('login-message'));
    }
  });
  
  document.getElementById('loginResendOtp')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim() || '';
    if (email) {
      await sendOtp(email, 'login');
    } else {
      showMessage('❌ Email não encontrado. Tente novamente.', 'error', document.getElementById('login-message'));
    }
  });
  
  updateUserInterface();
  initUserDropdown();
  
  restoreSession().then(isLogged => {
    if (isLogged && currentUser) {
      console.log("✅ Sessão restaurada com sucesso");
      updateAllSaveButtons();
      loadSavedProducts();
    }
  });
  
  console.log("✅ Sistema de login OTP inicializado");
}

// ============================================================
// INICIALIZAÇÃO DO DROPDOWN
// ============================================================

function initUserDropdown() {
  const userIconBtn = document.getElementById('userIconBtn');
  const dropdown = document.getElementById('userDropdownMenu');
  
  if (!userIconBtn) return;
  
  const newUserIconBtn = userIconBtn.cloneNode(true);
  userIconBtn.parentNode.replaceChild(newUserIconBtn, userIconBtn);
  
  newUserIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      openLoginModal();
    } else {
      if (dropdown) {
        dropdown.classList.toggle('open');
        updateDropdownUserInfo();
      }
    }
  });
  
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && e.target !== newUserIconBtn) {
      dropdown.classList.remove('open');
    }
  });
  
  const favBtn = document.getElementById('dropdownFavoritos');
  const logoutBtn = document.getElementById('dropdownSair');
  
  if (favBtn) {
    const newFavBtn = favBtn.cloneNode(true);
    favBtn.parentNode.replaceChild(newFavBtn, favBtn);
    newFavBtn.addEventListener('click', handleDropdownFavoritos);
  }
  
  if (logoutBtn) {
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    newLogoutBtn.addEventListener('click', handleDropdownLogout);
  }
}

// ============================================================
// EVENTOS GLOBAIS
// ============================================================

document.addEventListener('keydown', (e) => { 
  if(e.key === 'Escape') { 
    closeLoginModal(); 
    closeUserDropdown(); 
  } 
});

// ============================================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================================

document.addEventListener("DOMContentLoaded", async function() {
  console.log("🚀 VRTIGO - Sistema OTP iniciado!");
  
  initNavigation();
  initProductModal();
  initFAQModal();
  initContactForm();
  initUIInteractions();
  initThemeToggle();
  initFilters();
  initLoginSystem();
  
  await carregarProdutos();
  
  const savesSection = safeGetElement('saves');
  if (savesSection) {
    new IntersectionObserver((entries) => { 
      entries.forEach(entry => { if(entry.isIntersecting) loadSavedProducts(); }); 
    }, { threshold: 0.1 }).observe(savesSection);
  }
  
  console.log("✅ Sistema VRTIGO OTP inicializado com sucesso!");
});

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log("✅ Script VRTIGO OTP carregado!");

// ============================================================
// VRTIGO - SCRIPT COMPLETO COM SUPABASE (VERSÃO CORRIGIDA)
// ============================================================

// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
const SUPABASE_URL = "https://zdrplxumrqxlqpmorxbd.supabase.co";
// ⚠️ SUBSTITUA PELA SUA ANON KEY CORRETA (começa com eyJ...)
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
    // Aguarda o SDK do Supabase estar disponível
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
      // Verificar os nomes reais das colunas no primeiro item
      console.log("📦 Estrutura do produto do Supabase:", Object.keys(data[0]));
      
      return data.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        img: p.img,
        desc: p.descricao || p.desc || "Descrição não disponível", // fallback
        shortDesc: p.shortdesc || p.shortDesc || p.short_desc || "Produto VRTIGO", // fallback
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
  
  // CORRIGIDO: Seleciona apenas o botão do header, não o da bottom nav
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
// SISTEMA DE LOGIN SIMPLIFICADO
// ============================================================

function setupSupabase() {
  if (supabaseInitialized) return true;
  
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseInitialized = true;
    console.log("✅ Supabase iniciado");
    return true;
  }
  console.error("❌ Supabase não encontrado");
  return false;
}

async function handleSignUp(event) {
  event.preventDefault();
  
  if (!setupSupabase()) {
    showMessage('❌ Erro de conexão. Tente novamente.', 'error', document.getElementById('login-message'));
    return;
  }
  
  const msgDiv = document.getElementById('login-message');
  const name = document.getElementById('signupName')?.value.trim() || '';
  const email = document.getElementById('signupEmail')?.value.trim() || '';
  const password = document.getElementById('signupPassword')?.value || '';
  const confirmPassword = document.getElementById('signupConfirmPassword')?.value || '';
  
  if (!name) return showMessage('❌ Insira seu nome', 'error', msgDiv);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMessage('❌ Email inválido', 'error', msgDiv);
  if (!password || password.length < 6) return showMessage('❌ Senha deve ter mínimo 6 caracteres', 'error', msgDiv);
  if (password !== confirmPassword) return showMessage('❌ Senhas não coincidem', 'error', msgDiv);
  
  showMessage('⏳ Cadastrando...', 'info', msgDiv);
  const { data, error } = await supabaseClient.auth.signUp({
    email, password,
    options: { data: { nome: name } }
  });
  
  if (error) { 
    showMessage('❌ ' + (error.message.includes("already registered") ? 'Email já cadastrado!' : error.message), 'error', msgDiv); 
  } else { 
    showMessage('✅ Cadastro realizado! Verifique seu email e faça login.', 'success', msgDiv); 
    document.getElementById('signupForm')?.reset(); 
    setTimeout(() => toggleOverlayToLogin(), 2000);
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  
  if (!setupSupabase()) {
    showMessage('❌ Erro de conexão. Tente novamente.', 'error', document.getElementById('login-message'));
    return;
  }
  
  const msgDiv = document.getElementById('login-message');
  const email = document.getElementById('loginEmail')?.value.trim() || '';
  const password = document.getElementById('loginPassword')?.value || '';
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMessage('❌ Email inválido', 'error', msgDiv);
  if (!password) return showMessage('❌ Insira sua senha', 'error', msgDiv);
  
  showMessage('⏳ Entrando...', 'info', msgDiv);
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  
  if (error) { 
    showMessage('❌ Email ou senha incorretos', 'error', msgDiv); 
  } else {
    currentUser = { 
      id: data.user.id, 
      email: data.user.email, 
      name: data.user.user_metadata?.nome || email.split('@')[0] 
    };
    localStorage.setItem('vrtigoCurrentUser', JSON.stringify(currentUser));
    
    updateUserIconVisual(true);
    updateDropdownUserInfo();
    await migrateLocalFavoritesToAPI(currentUser.id);
    
    showMessage('✅ Login realizado!', 'success', msgDiv);
    updateUserInterface();
    await loadUserFavorites();
    updateAllSaveButtons();
    setTimeout(() => closeLoginModal(), 1500);
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  
  const email = document.getElementById('reset-email')?.value.trim() || '';
  const msgDiv = document.getElementById('reset-message');
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage('❌ Insira um email válido', 'error', msgDiv);
    return;
  }
  
  showMessage('⏳ Enviando instruções...', 'info', msgDiv);
  
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html'
  });
  
  if (error) {
    console.error('Erro ao recuperar senha:', error);
    showMessage('❌ Email não encontrado. Verifique e tente novamente.', 'error', msgDiv);
  } else {
    showMessage('✅ Enviamos um link de recuperação para seu email!', 'success', msgDiv);
    
    setTimeout(() => {
      closeForgotPasswordModal();
      document.getElementById('reset-email').value = '';
    }, 3000);
  }
}

function openForgotPasswordModal() {
  closeLoginModal();
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    const emailInput = document.getElementById('reset-email');
    const msgDiv = document.getElementById('reset-message');
    if (emailInput) emailInput.value = '';
    if (msgDiv) msgDiv.style.display = 'none';
  }
}

function closeForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) { 
    modal.classList.remove('open'); 
    document.body.style.overflow = 'auto';
  }
}

function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    toggleOverlayToLogin();
    const msgDiv = document.getElementById('login-message');
    if (msgDiv) msgDiv.style.display = 'none';
  }
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) { modal.classList.remove('open'); document.body.style.overflow = 'auto'; }
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
  currentUser = null;
  savedProducts = [];
  updateSavesCount();
  updateAllSaveButtons();
  loadSavedProducts();
  updateUserInterface();
  updateUserIconVisual(false);
}

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
// FUNÇÕES DO OVERLAY SYSTEM
// ============================================================

function toggleOverlayToSignUp() {
  const container = document.getElementById('container');
  if (container) container.classList.add('right-panel-active');
}

function toggleOverlayToLogin() {
  const container = document.getElementById('container');
  if (container) container.classList.remove('right-panel-active');
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
  console.log("🔧 Inicializando sistema de login...");
  
  setupSupabase();
  
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
  }
  
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
  }
  
  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    const newForgotLink = forgotLink.cloneNode(true);
    forgotLink.parentNode.replaceChild(newForgotLink, forgotLink);
    newForgotLink.addEventListener('click', (e) => { 
      e.preventDefault(); 
      openForgotPasswordModal();
    });
  }
  
  const forgotModal = document.getElementById('forgotPasswordModal');
  if (forgotModal) {
    const closeBtn = forgotModal.querySelector('.modal-close');
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', closeForgotPasswordModal);
    }
    
    forgotModal.addEventListener('click', (e) => { 
      if(e.target === forgotModal) closeForgotPasswordModal(); 
    });
    
    const sendResetBtn = document.getElementById('send-reset-code');
    if (sendResetBtn) {
      const newSendBtn = sendResetBtn.cloneNode(true);
      sendResetBtn.parentNode.replaceChild(newSendBtn, sendResetBtn);
      newSendBtn.addEventListener('click', handleForgotPassword);
    }
  }
  
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
  
  updateUserInterface();
  initUserDropdown();
  
  restoreSession().then(isLogged => {
    if (isLogged && currentUser) {
      console.log("✅ Sessão restaurada com sucesso");
      updateAllSaveButtons();
      loadSavedProducts();
    }
  });
  
  console.log("✅ Sistema de login inicializado");
}

document.addEventListener('keydown', (e) => { 
  if(e.key === 'Escape') { 
    closeLoginModal(); 
    closeForgotPasswordModal(); 
    closeUserDropdown(); 
  } 
});
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=1.0, viewport-fit=cover">
  <title>VRTIGO | Premium Clothing</title>
  <meta name="description" content="VRTIGO - Camisetas oversized premium. Qualidade e estilo para o seu dia a dia.">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"/>
  <link rel="stylesheet" href="style.css">
  <link rel="icon" type="image/png" href="imagens/favicone.png"/>
  <style>
    /* ===== ESTILOS GERAIS ===== */
    :root {
      --primary: #C68AFF;
      --primary-dark: #A855F7;
      --gradient: linear-gradient(135deg, #C68AFF, #8B5CF6);
      --bg-primary: #0A0A0A;
      --bg-secondary: #1A1A1A;
      --bg-card: #222;
      --text: #FFFFFF;
      --text-secondary: #B0B0B0;
      --border: #333;
      --shadow: 0 8px 30px rgba(0,0,0,0.3);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Poppins', sans-serif;
      background: var(--bg-primary);
      color: var(--text);
      line-height: 1.6;
      padding-bottom: 80px;
    }

    /* ===== TOGGLE SWITCH ===== */
    .autofill-control {
      position: absolute;
      top: 15px;
      right: 60px;
      display: none;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      padding: 6px 14px;
      border-radius: 25px;
      z-index: 10;
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
      border: 1px solid var(--border);
      cursor: default;
    }

    .autofill-control .switch-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .autofill-control .icon {
      font-size: 14px;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 38px;
      height: 20px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #555;
      transition: 0.3s;
      border-radius: 34px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    .switch input:checked + .slider {
      background: var(--primary);
    }

    .switch input:checked + .slider:before {
      transform: translateX(18px);
    }

    /* ===== FORMULÁRIOS ===== */
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-group input, .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-secondary);
      color: var(--text);
      font-family: inherit;
      transition: all 0.3s ease;
    }
    
    .form-group input:focus, .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(198, 138, 255, 0.1);
    }
    
    .submit-btn {
      background: var(--gradient);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      width: 100%;
    }
    
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(198, 138, 255, 0.3);
    }
    
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    /* ===== MODAIS ===== */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(8px);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      padding: 20px;
      animation: modalFadeIn 0.3s ease;
    }

    .modal.open {
      display: flex;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-content {
      max-width: 500px;
      width: 90%;
      background: var(--bg-primary);
      border-radius: 20px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid var(--border);
    }

    .login-modal-content {
      max-width: 900px;
      width: 90%;
    }

    .modal-close {
      position: absolute;
      top: 12px;
      right: 16px;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 28px;
      cursor: pointer;
      z-index: 20;
      transition: color 0.3s ease;
      line-height: 1;
    }

    .modal-close:hover {
      color: var(--text);
    }

    .modal-body {
      padding: 2rem;
    }

    /* ===== FORM CONTAINER (LOGIN OVERLAY) ===== */
    .form-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 30px;
      background: var(--bg-primary);
      transition: all 0.6s ease;
    }

    .form-container h2 {
      margin-bottom: 20px;
      color: var(--text);
      font-weight: 600;
    }

    .form-container form {
      width: 100%;
      max-width: 320px;
    }

    #container {
      display: flex;
      flex-wrap: wrap;
      position: relative;
      min-height: 500px;
    }

    .sign-up-container, .sign-in-container {
      flex: 1;
      min-width: 280px;
    }

    /* ===== OVERLAY ===== */
    .overlay-container {
      display: none;
    }

    @media (min-width: 768px) {
      .overlay-container {
        display: flex;
        flex: 0 0 40%;
        background: var(--gradient);
        color: white;
        align-items: center;
        justify-content: center;
        border-radius: 0 20px 20px 0;
        padding: 40px;
      }

      .overlay {
        text-align: center;
      }

      .overlay h2 {
        font-size: 2rem;
        margin-bottom: 1rem;
      }

      .overlay p {
        margin-bottom: 1.5rem;
        opacity: 0.9;
      }

      .sign-up-container, .sign-in-container {
        flex: 0 0 60%;
      }

      #container {
        flex-wrap: nowrap;
      }
    }

    .ghost {
      background: transparent;
      border: 2px solid white;
      color: white;
      padding: 10px 30px;
      border-radius: 30px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
    }

    .ghost:hover {
      background: white;
      color: var(--primary);
    }

    /* ===== USER DROPDOWN ===== */
    .user-dropdown {
      position: fixed;
      top: 70px;
      right: 20px;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.3s ease;
    }

    .user-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .user-dropdown-content {
      background: var(--bg-primary);
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
      min-width: 200px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .user-info {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-secondary);
    }

    .user-info i {
      font-size: 1.5rem;
      color: var(--primary);
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border);
      margin: 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      color: var(--text);
      text-decoration: none;
      transition: background 0.3s ease;
      cursor: pointer;
    }

    .dropdown-item:hover {
      background: var(--bg-secondary);
    }

    .dropdown-item i {
      width: 20px;
      color: var(--primary);
    }

    /* ===== MENSAGENS ===== */
    #login-message, #reset-message {
      margin: 1rem;
      padding: 0.5rem;
      border-radius: 8px;
      text-align: center;
    }

    .message-success {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .message-error {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .close-modal-btn {
      cursor: pointer;
    }

    /* ===== RESPONSIVIDADE ===== */
    @media (max-width: 768px) {
      .login-modal-content {
        width: 95%;
        max-height: 95vh;
        border-radius: 16px;
      }

      .form-container {
        padding: 30px 20px;
      }

      .autofill-control {
        top: 10px;
        right: 50px;
        padding: 4px 12px;
        font-size: 11px;
      }

      .switch {
        width: 34px;
        height: 18px;
      }

      .slider:before {
        height: 12px;
        width: 12px;
        left: 3px;
        bottom: 3px;
      }

      .switch input:checked + .slider:before {
        transform: translateX(16px);
      }
    }

    @media (max-width: 480px) {
      .autofill-control {
        top: 8px;
        right: 44px;
        padding: 3px 10px;
        font-size: 10px;
        gap: 6px;
      }

      .autofill-control .icon {
        font-size: 12px;
      }

      .switch {
        width: 30px;
        height: 16px;
      }

      .slider:before {
        height: 10px;
        width: 10px;
        left: 3px;
        bottom: 3px;
      }

      .switch input:checked + .slider:before {
        transform: translateX(14px);
      }

      .modal-body {
        padding: 1rem;
      }

      .form-container {
        padding: 20px 16px;
      }

      .form-container h2 {
        font-size: 1.2rem;
      }

      .ghost {
        padding: 8px 20px;
        font-size: 12px;
      }

      .submit-btn {
        padding: 10px 20px;
        font-size: 14px;
      }
    }

    /* ===== LOADING SPINNER ===== */
    .loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===== HEADER E OUTROS ELEMENTOS ===== */
    .hero-header {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 1rem 2rem;
      position: relative;
      background: radial-gradient(ellipse at 20% 50%, rgba(198, 138, 255, 0.08), transparent 60%);
    }

    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
    }

    .nav-brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .logo {
      font-size: 2rem;
      font-weight: 700;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .nav-btn {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      color: var(--text);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1rem;
    }

    .nav-btn:hover {
      border-color: var(--primary);
      background: rgba(198, 138, 255, 0.1);
    }

    .welcome-section {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      padding: 2rem 0;
    }

    .welcome-content {
      max-width: 600px;
    }

    .welcome-title {
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 700;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.1;
      margin-bottom: 1rem;
    }

    .welcome-subtitle {
      font-size: clamp(1rem, 2vw, 1.5rem);
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .welcome-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .cta-btn {
      padding: 12px 32px;
      border: none;
      border-radius: 30px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 1rem;
    }

    .cta-btn.primary {
      background: var(--gradient);
      color: white;
    }

    .cta-btn.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(198, 138, 255, 0.3);
    }

    .cta-btn.secondary {
      background: transparent;
      color: var(--text);
      border: 2px solid var(--border);
    }

    .cta-btn.secondary:hover {
      border-color: var(--primary);
      background: rgba(198, 138, 255, 0.05);
    }

    .visual-element {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .circle-animation {
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: var(--gradient);
      opacity: 0.15;
      animation: pulse 4s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.15; }
      50% { transform: scale(1.1); opacity: 0.25; }
    }

    /* ===== MAIN CONTENT ===== */
    .main-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .content-section {
      padding: 4rem 0;
      border-bottom: 1px solid var(--border);
    }

    .content-section:last-child {
      border-bottom: none;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-header h2 {
      font-size: 2rem;
      font-weight: 600;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .section-controls {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 8px 20px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .filter-btn:hover, .filter-btn.active {
      border-color: var(--primary);
      color: var(--text);
      background: rgba(198, 138, 255, 0.1);
    }

    /* ===== PRODUCTS GRID ===== */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 2rem;
    }

    .product-card {
      background: var(--bg-secondary);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
      border: 1px solid var(--border);
      cursor: pointer;
    }

    .product-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
      box-shadow: 0 8px 30px rgba(198, 138, 255, 0.1);
    }

    .product-image {
      width: 100%;
      height: 280px;
      object-fit: cover;
      background: var(--bg-card);
    }

    .product-info {
      padding: 1rem;
    }

    .product-name {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .product-price {
      color: var(--primary);
      font-weight: 500;
    }

    .product-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .product-actions button {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
    }

    .btn-add-cart {
      background: var(--gradient);
      color: white;
    }

    .btn-add-cart:hover {
      transform: scale(1.02);
    }

    .btn-save {
      background: var(--bg-card);
      color: var(--text-secondary);
      flex: 0 0 40px;
    }

    .btn-save:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .btn-save.saved {
      color: #ef4444;
    }

    /* ===== ABOUT ===== */
    .about-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
    }

    .about-text p {
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }

    .about-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      align-content: center;
    }

    .stat {
      text-align: center;
      padding: 1.5rem;
      background: var(--bg-secondary);
      border-radius: 16px;
      border: 1px solid var(--border);
    }

    .stat-number {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* ===== CONTACT ===== */
    .contact-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      justify-content: center;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .contact-item i {
      font-size: 1.5rem;
      color: var(--primary);
      width: 40px;
      text-align: center;
    }

    .contact-item a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .contact-item a:hover {
      color: var(--primary);
    }

    /* ===== SAVES ===== */
    .saves-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .no-saves {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }

    .no-saves i {
      font-size: 4rem;
      color: var(--border);
      margin-bottom: 1rem;
    }

    .no-saves h3 {
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .saves-count {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* ===== BOTTOM NAV ===== */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: var(--bg-primary);
      border-top: 1px solid var(--border);
      padding: 8px 0 env(safe-area-inset-bottom, 8px) 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.7rem;
      padding: 4px 12px;
      transition: color 0.3s ease;
      gap: 2px;
    }

    .nav-item i {
      font-size: 1.3rem;
    }

    .nav-item.active {
      color: var(--primary);
    }

    .nav-item:hover {
      color: var(--text);
    }

    /* ===== RESPONSIVIDADE GERAL ===== */
    @media (max-width: 992px) {
      .about-content, .contact-content {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .about-stats {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 768px) {
      .hero-header {
        padding: 0.5rem 1rem;
        min-height: 80vh;
      }

      .welcome-section {
        flex-direction: column;
        text-align: center;
        padding: 1rem 0;
      }

      .welcome-actions {
        justify-content: center;
      }

      .circle-animation {
        width: 150px;
        height: 150px;
      }

      .main-content {
        padding: 0 1rem;
      }

      .content-section {
        padding: 2rem 0;
      }

      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 1rem;
      }

      .product-image {
        height: 200px;
      }

      .about-stats {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
      }

      .stat {
        padding: 1rem;
      }

      .stat-number {
        font-size: 1.5rem;
      }

      .contact-content {
        gap: 1.5rem;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }

      .product-image {
        height: 160px;
      }

      .product-info {
        padding: 0.5rem;
      }

      .product-name {
        font-size: 0.9rem;
      }

      .product-price {
        font-size: 0.85rem;
      }

      .welcome-title {
        font-size: 2rem;
      }

      .logo {
        font-size: 1.5rem;
      }

      .nav-btn {
        width: 36px;
        height: 36px;
        font-size: 0.85rem;
      }

      .section-header h2 {
        font-size: 1.5rem;
      }

      .filter-btn {
        padding: 6px 14px;
        font-size: 0.8rem;
      }

      .about-stats {
        grid-template-columns: repeat(3, 1fr);
      }

      .stat-number {
        font-size: 1.2rem;
      }
    }
  </style>
</head>
<body>

  <header class="hero-header">
    <nav class="navbar">
      <div class="nav-brand">
        <div class="logo">VRTIGO</div>
        <div class="nav-controls">
          <button class="nav-btn faq-btn" aria-label="FAQ">
            <i class="fas fa-question"></i>
          </button>
          <button class="nav-btn cart-btn" aria-label="Carrinho">
            <i class="fas fa-shopping-cart"></i>
          </button>
          <button class="nav-btn user-icon-btn" id="userIconBtn" aria-label="Usuário">
            <i class="fas fa-user"></i>
          </button>
          <button class="nav-btn theme-toggle-btn" aria-label="Alternar tema">
            <i class="fas fa-moon"></i>
          </button>
        </div>
      </div>
    </nav>

    <div class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">Welcome to VRTIGO</h1>
        <p class="welcome-subtitle">Premium Clothing Experience</p>
        <div class="welcome-actions">
          <button class="cta-btn primary" onclick="scrollToSection('#loja')">Shop Now</button>
          <button class="cta-btn secondary" onclick="scrollToSection('#sobre')">Explore</button>
        </div>
      </div>
      <div class="visual-element">
        <div class="circle-animation"></div>
      </div>
    </div>
  </header>

  <main class="main-content">
    <section id="loja" class="content-section">
      <div class="section-header">
        <h2>Loja</h2>
        <div class="section-controls">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="popular">Popular</button>
          <button class="filter-btn" data-filter="new">New</button>
        </div>
      </div>
      <div class="products-grid"></div>
    </section>

    <section id="sobre" class="content-section">
      <div class="section-header">
        <h2>Sobre</h2>
      </div>
      <div class="about-content">
        <div class="about-text">
          <p>A ideia de fazer vendas começou em 2023 com Salomao Tsanwane Junior e Aminudin Muendane. Inicialmente, queríamos revender produtos já feitos, pois Amin já vendia com alguma frequência.</p>
          <p>Um certo dia surgiu a ideia de criar nossa própria marca de camisetas, comprando camisetas de qualidade, colocando estampas bonitas e vendendo. O mercado de estampas estava crescendo, e queríamos crescer junto.</p>
          <p>Em 2025, retomamos o projeto com objetivos claros e assim nasceu a VRTIGO.</p>
        </div>
        <div class="about-stats">
          <div class="stat">
            <span class="stat-number">2023</span>
            <span class="stat-label">Início</span>
          </div>
          <div class="stat">
            <span class="stat-number">3</span>
            <span class="stat-label">Fundadores</span>
          </div>
          <div class="stat">
            <span class="stat-number">10+</span>
            <span class="stat-label">Produtos</span>
          </div>
        </div>
      </div>
    </section>

    <section id="contato" class="content-section">
      <div class="section-header">
        <h2>Contato</h2>
        <button class="cta-btn secondary faq-btn">
          <i class="fas fa-question-circle"></i>
          Ver FAQ
        </button>
      </div>
      <div class="contact-content">
        <form id="contactForm" class="contact-form">
          <div class="form-group">
            <input type="text" name="nome" placeholder="Nome" required minlength="2">
          </div>
          <div class="form-group">
            <input type="email" name="email" placeholder="Email" required>
          </div>
          <div class="form-group">
            <input type="text" name="assunto" placeholder="Assunto" required minlength="3">
          </div>
          <div class="form-group">
            <textarea name="mensagem" placeholder="Mensagem" required minlength="10" rows="5"></textarea>
          </div>
          <button type="submit" class="submit-btn">Enviar Mensagem</button>
        </form>
        <div class="contact-info">
          <div class="contact-item">
            <i class="fas fa-envelope"></i>
            <span>Salomaojun005@gmail.com</span>
          </div>
          <div class="contact-item">
            <i class="fas fa-phone"></i>
            <span>+91 7416186948</span>
          </div>
          <div class="contact-item">
            <i class="fab fa-whatsapp"></i>
            <span><a href="https://wa.me/917416186948?text=👋%20Olá!%20Meu%20nome%20é%20_____%0A%0A📝%20Apresente%20a%20sua%20preocupação%20e%20lhe%20responderemos%20em%20breve!%20😊" target="_blank" style="color: var(--text); text-decoration: none;">WhatsApp: +91 7416186948</a></span>
          </div>
        </div>
      </div>
    </section>

    <section id="saves" class="content-section">
      <div class="section-header">
        <h2>Favoritos</h2>
        <span class="saves-count">0 itens</span>
      </div>
      <div class="saves-grid" id="saves-grid"></div>
      <div id="no-saves" class="no-saves">
        <i class="far fa-heart"></i>
        <h3>Nenhum favorito ainda</h3>
        <p>Salve seus produtos favoritos clicando no coração</p>
        <button class="cta-btn primary" onclick="scrollToSection('#loja')">Explorar Loja</button>
      </div>
    </section>
  </main>

  <!-- Bottom Navigation -->
  <nav class="bottom-nav">
    <a href="#loja" class="nav-item active" data-nav="loja">
      <i class="fas fa-store"></i>
      <span>Loja</span>
    </a>
    <a href="#sobre" class="nav-item" data-nav="sobre">
      <i class="fas fa-info-circle"></i>
      <span>Sobre</span>
    </a>
    <a href="#contato" class="nav-item" data-nav="contato">
      <i class="fas fa-envelope"></i>
      <span>Contato</span>
    </a>
    <a href="#saves" class="nav-item" data-nav="saves">
      <i class="fas fa-heart"></i>
      <span>Favoritos</span>
    </a>
  </nav>

  <!-- Modal Produto -->
  <div class="modal" id="productModal">
    <div class="modal-content">
      <button class="modal-save-btn"><i class="far fa-heart"></i></button>
      <button class="modal-close">&times;</button>
      <div class="modal-body" id="productModalBody"></div>
    </div>
  </div>

  <!-- Modal FAQ -->
  <div class="modal" id="faqModal">
    <div class="modal-content">
      <button class="modal-close">&times;</button>
      <div class="modal-body">
        <div class="faq-content">
          <div class="faq-placeholder">
            <i class="fas fa-question-circle"></i>
            <h3>FAQs em construção!</h3>
            <p>Nossa equipe está preparando as perguntas mais frequentes para você.</p>
            <p>Enquanto isso, entre em contato pelo formulário na seção contatos! 👇</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação de Contato -->
  <div class="modal" id="contactModal">
    <div class="modal-content">
      <button class="modal-close">&times;</button>
      <div class="modal-body">
        <div style="text-align: center; padding: 2rem;">
          <i class="fas fa-check-circle" style="font-size: 4rem; color: #C68AFF; margin-bottom: 1rem;"></i>
          <h3 style="margin-bottom: 1rem; color: var(--text);">Mensagem Enviada!</h3>
          <p style="color: var(--text-secondary); margin-bottom: 2rem;">Entraremos em contato em breve.</p>
          <button class="cta-btn primary close-modal-btn" style="margin-top: 1rem;">OK</button>
        </div>
      </div>
    </div>
  </div>

  <!-- DROPDOWN DO USUÁRIO -->
  <div class="user-dropdown" id="userDropdownMenu">
    <div class="user-dropdown-content">
      <div class="user-info">
        <i class="fas fa-user-circle"></i>
        <span id="dropdownUserName">Visitante</span>
      </div>
      <div class="dropdown-divider"></div>
      <a href="#" id="dropdownFavoritos" class="dropdown-item">
        <i class="fas fa-heart"></i> Meus Favoritos
      </a>
      <a href="#" id="dropdownSair" class="dropdown-item">
        <i class="fas fa-sign-out-alt"></i> Sair
      </a>
    </div>
  </div>

 // ============================================
// AUTOFILL CONTROL - Supabase + localStorage fallback
// ============================================
// CODE

class AutofillControl {
  constructor() {
    this.toggle = document.getElementById('autofillToggle');
    this.control = document.getElementById('autofillControl');
    this.currentUser = null;
    this.isLoading = false;
    this.isAuthenticated = false;
    
    this.init();
  }

  // ===== INICIALIZAÇÃO =====
  async init() {
    await this.getCurrentUser();
    
    if (this.isAuthenticated && this.currentUser) {
      this.control.style.display = 'flex';
      await this.loadPreference();
      this.applyAutofill();
      this.toggle.addEventListener('change', () => this.handleToggleChange());
    }
  }

  // ===== GET CURRENT USER =====
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        console.log('✅ Usuário autenticado:', user.email);
      } else {
        this.isAuthenticated = false;
        console.log('ℹ️ Nenhum usuário autenticado');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      this.isAuthenticated = false;
    }
  }

  // ===== CARREGAR PREFERÊNCIA (Supabase → localStorage fallback) =====
  async loadPreference() {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('autofill_enabled')
        .eq('id', this.currentUser.id)
        .maybeSingle();

      if (!error && data !== null) {
        const enabled = data.autofill_enabled ?? true;
        this.toggle.checked = enabled;
        console.log('✅ Preferência carregada do Supabase:', enabled);
      } else {
        throw new Error('Dado não encontrado no Supabase');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar do Supabase. Buscando no localStorage (fallback)...');
      
      const fallbackKey = `autofill_pref_${this.currentUser.id}`;
      const fallbackData = localStorage.getItem(fallbackKey);
      
      if (fallbackData !== null) {
        const enabled = JSON.parse(fallbackData);
        this.toggle.checked = enabled;
        console.log('✅ Preferência carregada do localStorage (fallback):', enabled);
      } else {
        this.toggle.checked = true;
        console.log('ℹ️ Usando valor padrão (true)');
      }
    } finally {
      this.isLoading = false;
    }
  }

  // ===== SALVAR PREFERÊNCIA (Supabase → localStorage fallback) =====
  async savePreference(enabled) {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ autofill_enabled: enabled })
        .eq('id', this.currentUser.id);

      if (error) throw error;

      console.log('✅ Preferência salva no Supabase:', enabled);
      localStorage.removeItem(`autofill_pref_${this.currentUser.id}`);
      
    } catch (error) {
      console.warn('⚠️ Erro ao salvar no Supabase. Salvando no localStorage (fallback)...');
      
      const fallbackKey = `autofill_pref_${this.currentUser.id}`;
      localStorage.setItem(fallbackKey, JSON.stringify(enabled));
      console.log('✅ Preferência salva no localStorage (fallback):', enabled);
    } finally {
      this.isLoading = false;
    }
  }

  // ===== APLICAR AUTOFILL NOS INPUTS =====
  applyAutofill() {
    const enabled = this.toggle.checked;
    
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const signupEmail = document.getElementById('signupEmail');
    const signupPassword = document.getElementById('signupPassword');
    const signupConfirm = document.getElementById('signupConfirmPassword');
    const signupName = document.getElementById('signupName');

    const setAutocomplete = (input, value) => {
      if (input) {
        if (value) {
          input.setAttribute('autocomplete', value);
        } else {
          input.setAttribute('autocomplete', 'off');
        }
      }
    };

    if (enabled) {
      setAutocomplete(loginEmail, 'email');
      setAutocomplete(loginPassword, 'current-password');
      setAutocomplete(signupEmail, 'new-email');
      setAutocomplete(signupPassword, 'new-password');
      setAutocomplete(signupConfirm, 'new-password');
      setAutocomplete(signupName, 'off');
      console.log('🔓 Autofill ATIVADO');
    } else {
      setAutocomplete(loginEmail, 'off');
      setAutocomplete(loginPassword, 'off');
      setAutocomplete(signupEmail, 'off');
      setAutocomplete(signupPassword, 'off');
      setAutocomplete(signupConfirm, 'off');
      setAutocomplete(signupName, 'off');
      
      if (loginEmail) loginEmail.value = '';
      if (loginPassword) loginPassword.value = '';
      if (signupEmail) signupEmail.value = '';
      if (signupPassword) signupPassword.value = '';
      if (signupConfirm) signupConfirm.value = '';
      if (signupName) signupName.value = '';
      
      console.log('🔒 Autofill DESATIVADO');
    }
  }

  // ===== HANDLER DO TOGGLE =====
  handleToggleChange() {
    if (this.isLoading) return;
    
    const enabled = this.toggle.checked;
    this.applyAutofill();
    this.savePreference(enabled);
  }

  // ===== SYNC PREFERENCE =====
  async syncPreference() {
    if (!this.currentUser) return;
    
    console.log('🔄 Sincronizando preferência...');
    localStorage.removeItem(`autofill_pref_${this.currentUser.id}`);
    await this.loadPreference();
    this.applyAutofill();
  }
}

// ============================================
// INICIALIZAR CONTROLE DE AUTOFILL
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  window.autofillControl = new AutofillControl();
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function isAutofillEnabled() {
  if (window.autofillControl) {
    return window.autofillControl.toggle.checked;
  }
  return true;
}

function syncAutofillPreference() {
  if (window.autofillControl) {
    window.autofillControl.syncPreference();
  }
}

function showAutofillControl(show) {
  const control = document.getElementById('autofillControl');
  if (control) {
    control.style.display = show ? 'flex' : 'none';
  }
}

window.isAutofillEnabled = isAutofillEnabled;
window.syncAutofillPreference = syncAutofillPreference;
window.showAutofillControl = showAutofillControl;

// ============================================================
// INICIALIZAÇÃO PRINCIPAL
// ============================================================
document.addEventListener("DOMContentLoaded", async function() {
  console.log("🚀 VRTIGO - Sistema completo iniciado!");
  
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
  
  console.log("✅ Sistema VRTIGO inicializado com sucesso!");
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

console.log("✅ Script VRTIGO completo carregado!");

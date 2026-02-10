/**
 * COD Interceptor - Premium Gold Edition (Single Scroll Version)
 * Renk: #B4853D
 * Font: Montserrat
 * Fix: Tek parça scroll (Full body scroll)
 */

(function () {
  "use strict";

  let isPopupOpen = false;
  let isProcessing = false;
  let selectedPaymentMethod = "online";
  let selectedCodPaymentType = null;
  let verificationCode = null;

  // Şehir Listesi
  const turkishCities = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
    "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
    "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
    "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
    "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
    "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
    "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
    "Şırnak", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
  ];

  console.log("🚀 COD Interceptor v5.1 (Single Scroll) Yüklendi");

  // Yardımcı Fonksiyonlar
  function formatMoney(value) {
    if (value === undefined || value === null || value === "") return "0.00 TL";

    let amount = 0;
    if (typeof value === 'number') {
      if (!Number.isInteger(value)) {
        amount = value;
      } else {
        amount = value / 100;
      }
    }
    else if (typeof value === 'string') {
      if (value.includes('.') || value.includes(',')) {
        amount = parseFloat(value.replace(',', '.'));
      } else {
        amount = parseInt(value, 10) / 100;
      }
    }

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  }

  function isCheckoutUrl(url) {
    if (!url) return false;
    const urlStr = url.toString().toLowerCase();
    return (
      urlStr.includes("/checkouts/") ||
      urlStr.includes("/checkout") ||
      urlStr.includes("checkout.shopify.com")
    );
  }

  // Popup Açma
  function openCODPopup(event) {
    if (isPopupOpen || isProcessing) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    isProcessing = true;
    console.log("📦 COD Popup açılıyor...");

    fetch("/cart.js")
      .then((res) => res.json())
      .then((cart) => {
        createPopup(cart);
        isProcessing = false;
      })
      .catch((err) => {
        console.error("Cart yükleme hatası:", err);
        createPopup({ items: [], total_price: 0, item_count: 0 });
        isProcessing = false;
      });
  }

  // CSS Enjeksiyonu (Güncellendi: Tek Parça Scroll)
  function injectStyles() {
    if (document.getElementById("cod-custom-styles")) return;

    const style = document.createElement("style");
    style.id = "cod-custom-styles";
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

      /* --- RESET & SCOPE --- */
      #cod-popup-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: rgba(0, 0, 0, 0.6) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        backdrop-filter: blur(5px) !important;
        opacity: 0;
        animation: codFadeIn 0.3s forwards !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }

      #cod-popup-overlay * {
        box-sizing: border-box !important;
        font-family: 'Montserrat', sans-serif !important;
        line-height: 1.5 !important;
        -webkit-font-smoothing: antialiased !important;
      }

      /* --- MODAL --- */
      .cod-modal {
        background: white !important;
        width: 95% !important;
        max-width: 1100px !important;
        height: auto !important;
        max-height: 90vh !important;
        border-radius: 16px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important; /* Header sabit kalsın, content kaysın istiyorsan hidden */
        transform: scale(0.95);
        opacity: 0;
        animation: codScaleIn 0.3s 0.1s forwards !important;
        position: relative !important;
        margin: 0 !important;
      }

      @media (max-width: 768px) {
        .cod-modal {
          width: 100% !important;
          height: 100% !important;
          max-height: 100vh !important;
          border-radius: 0 !important;
        }
      }

      /* --- HEADER --- */
      .cod-header {
        padding: 16px 24px !important;
        border-bottom: 1px solid #e5e7eb !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: white !important;
        min-height: 70px !important;
        flex-shrink: 0 !important; /* Header büzülmesin */
        z-index: 10 !important;
        position: relative !important;
      }

      .cod-title {
        font-size: 1.25rem !important;
        font-weight: 700 !important;
        color: #111827 !important;
        margin: 0 !important;
        padding: 0 !important;
        letter-spacing: normal !important;
        text-transform: none !important;
      }

      .cod-subtitle {
        font-size: 0.875rem !important;
        color: #6b7280 !important;
        margin: 4px 0 0 0 !important;
        font-weight: 400 !important;
      }

      .cod-close-btn {
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        padding: 8px !important;
        border-radius: 50% !important;
        color: #9ca3af !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;
        transition: background 0.2s !important;
        box-shadow: none !important;
      }

      .cod-close-btn:hover {
        background: #f3f4f6 !important;
        color: #4b5563 !important;
      }

      /* --- CONTENT LAYOUT (TEK PARÇA SCROLL İÇİN GÜNCELLENDİ) --- */
      .cod-content {
        flex: 1 !important;
        /* İçerik taşarsa ana container scroll olsun */
        overflow-y: auto !important; 
        display: grid !important;
        grid-template-columns: 1fr 1.2fr !important;
        background: white !important;
        /* Scrollbar'ın düzgün çalışması için */
        height: 100% !important; 
        align-items: start !important; /* İçerikleri yukarı yasla */
      }

      @media (max-width: 768px) {
        .cod-content {
          grid-template-columns: 1fr !important;
          display: block !important;
        }
      }

      /* --- LEFT PANEL (CART) --- */
      .cod-cart-panel {
        background: #f9fafb !important;
        padding: 24px !important;
        border-right: 1px solid #e5e7eb !important;
        display: flex !important;
        flex-direction: column !important;
        /* Sabit yükseklik ve iç scroll kaldırıldı */
        height: auto !important; 
        overflow: visible !important; 
      }
      
      @media (max-width: 768px) {
        .cod-cart-panel {
          border-right: none !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
      }

      .cod-section-title {
        font-size: 1.1rem !important;
        font-weight: 600 !important;
        color: #374151 !important;
        margin: 0 0 16px 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        text-transform: none !important;
        letter-spacing: normal !important;
      }

      .cod-cart-items {
        /* İç scroll kaldırıldı, uzamasına izin verildi */
        flex: none !important; 
        overflow-y: visible !important; 
        padding-right: 0 !important;
        margin-bottom: 16px !important;
        height: auto !important;
      }

      .cod-cart-item {
        background: white !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 12px !important;
        padding: 12px !important;
        margin-bottom: 12px !important;
        position: relative !important;
        display: block !important;
      }

      .cod-item-header {
        display: flex !important;
        gap: 12px !important;
        margin-bottom: 12px !important;
        align-items: flex-start !important;
      }

      .cod-item-img {
        width: 64px !important;
        height: 64px !important;
        border-radius: 8px !important;
        object-fit: cover !important;
        background: #f3f4f6 !important;
        border: none !important;
        display: block !important;
      }

      .cod-item-info {
        flex: 1 !important;
      }

      .cod-item-info h4 {
        font-size: 0.95rem !important;
        font-weight: 600 !important;
        color: #1f2937 !important;
        margin: 0 0 4px 0 !important;
        line-height: 1.3 !important;
        padding: 0 !important;
      }

      .cod-item-info p {
        font-size: 0.85rem !important;
        color: #6b7280 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .cod-item-actions {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-top: 1px solid #f3f4f6 !important;
        padding-top: 12px !important;
        width: 100% !important;
      }

      .cod-qty-control {
        display: flex !important;
        align-items: center !important;
        background: #f3f4f6 !important;
        border-radius: 8px !important;
        padding: 4px !important;
        gap: 0 !important;
        width: auto !important;
      }

      .cod-qty-btn {
        width: 28px !important;
        height: 28px !important;
        min-width: 28px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: none !important;
        background: white !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-weight: 600 !important;
        color: #374151 !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
        padding: 0 !important;
        margin: 0 !important;
        font-size: 16px !important;
      }

      .cod-qty-btn:hover {
        background: #B4853D !important;
        color: white !important;
      }

      .cod-qty-val {
        width: 32px !important;
        text-align: center !important;
        font-weight: 600 !important;
        font-size: 0.9rem !important;
        color: #111827 !important;
        display: inline-block !important;
      }

      .cod-item-price {
        font-weight: 700 !important;
        color: #111827 !important;
        font-size: 1rem !important;
      }

      .cod-discount-badge {
        position: absolute !important;
        top: -8px !important;
        right: -8px !important;
        background: #ef4444 !important;
        color: white !important;
        font-size: 0.75rem !important;
        font-weight: 700 !important;
        padding: 4px 8px !important;
        border-radius: 20px !important;
        box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3) !important;
        z-index: 10 !important;
        line-height: 1 !important;
      }

      .cod-cart-total {
        margin-top: auto !important;
        padding-top: 20px !important;
        border-top: 2px dashed #e5e7eb !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        width: 100% !important;
      }

      .cod-total-label {
        font-size: 1.1rem !important;
        font-weight: 600 !important;
        color: #374151 !important;
      }

      .cod-total-val {
        font-size: 1.5rem !important;
        font-weight: 800 !important;
        color: #B4853D !important;
      }

      /* --- RIGHT PANEL (FORM) --- */
      .cod-form-panel {
        padding: 24px !important;
        background: white !important;
        /* Sabit yükseklik ve iç scroll kaldırıldı */
        height: auto !important; 
        overflow: visible !important;
      }

      /* --- PAYMENT OPTIONS --- */
      .cod-payment-options {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        margin-bottom: 24px !important;
      }

      .cod-radio-label {
        display: flex !important;
        align-items: center !important;
        padding: 16px !important;
        border: 2px solid #e5e7eb !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        background: white !important;
        margin: 0 !important;
        width: 100% !important;
      }

      .cod-radio-label:hover {
        border-color: #B4853D !important;
        background: #fffcf5 !important;
      }

      .cod-radio-label.selected {
        border-color: #B4853D !important;
        background: #fff8eb !important;
        box-shadow: 0 0 0 1px #B4853D !important;
      }

      .cod-radio-input {
        appearance: none !important;
        -webkit-appearance: none !important;
        width: 20px !important;
        height: 20px !important;
        border: 2px solid #d1d5db !important;
        border-radius: 50% !important;
        margin: 0 16px 0 0 !important;
        position: relative !important;
        flex-shrink: 0 !important;
        background: white !important;
        outline: none !important;
        cursor: pointer !important;
      }

      .cod-radio-input:checked {
        border-color: #B4853D !important;
        background: #B4853D !important;
      }

      .cod-radio-input:checked::after {
        content: '' !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 8px !important;
        height: 8px !important;
        background: white !important;
        border-radius: 50% !important;
        display: block !important;
      }

      .cod-radio-content {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .cod-radio-title {
        font-weight: 700 !important;
        color: #111827 !important;
        font-size: 1rem !important;
        margin-bottom: 2px !important;
      }

      .cod-radio-desc {
        font-size: 0.85rem !important;
        color: #6b7280 !important;
        font-weight: 400 !important;
      }

      .cod-badge {
        background: #B4853D !important;
        color: white !important;
        font-size: 0.75rem !important;
        font-weight: 600 !important;
        padding: 4px 10px !important;
        border-radius: 20px !important;
        white-space: nowrap !important;
      }

      /* --- FORM FIELDS --- */
      .cod-form-container {
        display: none;
        animation: codSlideDown 0.3s ease-out !important;
        width: 100% !important;
      }

      .cod-form-group {
        margin-bottom: 16px !important;
        width: 100% !important;
      }

      .cod-label {
        display: block !important;
        font-size: 0.9rem !important;
        font-weight: 600 !important;
        color: #374151 !important;
        margin-bottom: 8px !important;
        text-align: left !important;
        text-transform: none !important;
      }

      .cod-required {
        color: #ef4444 !important;
        margin-left: 2px !important;
      }

      .cod-input-wrapper {
        position: relative !important;
        width: 100% !important;
      }

      .cod-icon {
        position: absolute !important;
        left: 14px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        color: #9ca3af !important;
        pointer-events: none !important;
        font-size: 1.2rem !important;
        z-index: 2 !important;
      }

      .cod-input, .cod-select, .cod-textarea {
        width: 100% !important;
        padding: 12px 16px 12px 42px !important;
        border: 1px solid #d1d5db !important;
        border-radius: 10px !important;
        font-size: 1rem !important;
        color: #1f2937 !important;
        transition: all 0.2s !important;
        background-color: white !important;
        box-shadow: none !important;
        margin: 0 !important;
        height: auto !important;
        min-height: 48px !important;
        -webkit-appearance: none !important;
      }

      .cod-textarea {
        padding-left: 16px !important;
        resize: vertical !important;
        min-height: 100px !important;
      }

      .cod-input:focus, .cod-select:focus, .cod-textarea:focus {
        outline: none !important;
        border-color: #B4853D !important;
        box-shadow: 0 0 0 3px rgba(180, 133, 61, 0.2) !important;
        background-color: white !important;
      }

      .cod-input::placeholder, .cod-textarea::placeholder {
        color: #9ca3af !important;
        opacity: 1 !important;
      }

      /* Phone Verification Button */
      .cod-verify-btn {
        position: absolute !important;
        right: 8px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        background: #B4853D !important;
        color: white !important;
        border: none !important;
        padding: 6px 12px !important;
        border-radius: 6px !important;
        font-size: 0.85rem !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: background 0.2s !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 3 !important;
        white-space: nowrap !important;
      }

      .cod-verify-btn:disabled {
        background: #e5e7eb !important;
        color: #9ca3af !important;
        cursor: not-allowed !important;
      }

      .cod-verify-btn:hover:not(:disabled) {
        background: #9a7234 !important;
      }

      /* COD Type Selector Grid */
      .cod-type-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        width: 100% !important;
      }

      .cod-type-option {
        border: 2px solid #e5e7eb !important;
        border-radius: 12px !important;
        padding: 16px !important;
        cursor: pointer !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        transition: all 0.2s !important;
        background: white !important;
        height: auto !important;
        min-height: 100px !important;
      }

      .cod-type-option:hover {
        border-color: #B4853D !important;
        background: #fffcf5 !important;
      }

      .cod-type-option.selected {
        border-color: #B4853D !important;
        background: #fff8eb !important;
      }

      .cod-type-icon {
        width: 48px !important;
        height: 48px !important;
        background: #f3f4f6 !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #4b5563 !important;
        transition: all 0.2s !important;
        font-size: 24px !important;
      }

      .cod-type-option.selected .cod-type-icon {
        background: #B4853D !important;
        color: white !important;
      }

      .cod-type-label {
        font-weight: 600 !important;
        color: #374151 !important;
        font-size: 0.95rem !important;
      }

      /* --- SUBMIT BUTTON --- */
      .cod-submit-btn {
        width: 100% !important;
        background: #B4853D !important;
        color: white !important;
        border: none !important;
        padding: 16px !important;
        border-radius: 12px !important;
        font-size: 1.1rem !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
        margin-top: 24px !important;
        box-shadow: 0 4px 6px rgba(180, 133, 61, 0.25) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }

      .cod-submit-btn:hover {
        background: #9a7234 !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 6px 12px rgba(180, 133, 61, 0.3) !important;
      }

      .cod-submit-btn:disabled {
        background: #9ca3af !important;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
      }

      /* --- TOAST --- */
      #cod-toast-container {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        z-index: 2147483648 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        pointer-events: none !important;
      }

      .cod-toast {
        background: #1f2937 !important;
        color: white !important;
        padding: 12px 20px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        animation: codSlideLeft 0.3s forwards !important;
        min-width: 300px !important;
        pointer-events: auto !important;
        font-size: 0.95rem !important;
      }

      .cod-toast.success { border-left: 4px solid #10b981 !important; }
      .cod-toast.error { border-left: 4px solid #ef4444 !important; }
      .cod-toast.info { border-left: 4px solid #3b82f6 !important; }

      /* --- ANIMATIONS --- */
      @keyframes codFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes codScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes codSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes codSlideLeft { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes codSpin { to { transform: rotate(360deg); } }

      .cod-spinner {
        width: 20px !important;
        height: 20px !important;
        border: 2px solid rgba(255,255,255,0.3) !important;
        border-top-color: white !important;
        border-radius: 50% !important;
        animation: codSpin 0.8s linear infinite !important;
        display: inline-block !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Toast Gösterim
  function showToast(message, type = "info") {
    let container = document.getElementById("cod-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "cod-toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `cod-toast ${type}`;

    let icon = '';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✕';
    else icon = 'ℹ';

    toast.innerHTML = `
      <span style="font-weight:bold; font-size:1.2rem; margin-right:8px;">${icon}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Popup Oluşturma (HTML Structure aynı, classlar stabilize edildi)
  function createPopup(cartData) {
    if (document.getElementById("cod-popup-overlay")) return;

    injectStyles();
    isPopupOpen = true;
    window.codCartData = cartData;

    const overlay = document.createElement("div");
    overlay.id = "cod-popup-overlay";

    // HTML Yapısı
    overlay.innerHTML = `
      <div class="cod-modal">
        <div class="cod-header">
          <div>
            <h2 class="cod-title">Güvenli Ödeme</h2>
            <p class="cod-subtitle">Siparişinizi hızlıca tamamlayın</p>
          </div>
          <button class="cod-close-btn" onclick="window.closeCODPopup()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="cod-content">
          <div class="cod-cart-panel">
            <h3 class="cod-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              Sepet Özeti
            </h3>
            
            <div id="cod-cart-items-container" class="cod-cart-items">
              </div>

            <div class="cod-cart-total">
              <span class="cod-total-label">Toplam Tutar</span>
              <span class="cod-total-val" id="cod-total-amount">0.00 TL</span>
            </div>
          </div>

          <div class="cod-form-panel">
            <h3 class="cod-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              Ödeme Yöntemi
            </h3>

            <div class="cod-payment-options">
              <label class="cod-radio-label selected" onclick="window.selectPaymentMethod('online', this)">
                <input type="radio" name="payment_method" value="online" checked class="cod-radio-input">
                <div class="cod-radio-content">
                  <span class="cod-radio-title">Online Ödeme</span>
                  <span class="cod-radio-desc">Kredi Kartı / Banka Kartı ile güvenli ödeme</span>
                </div>
                <span class="cod-badge">Önerilen</span>
              </label>

              <label class="cod-radio-label" onclick="window.selectPaymentMethod('cod', this)">
                <input type="radio" name="payment_method" value="cod" class="cod-radio-input">
                <div class="cod-radio-content">
                  <span class="cod-radio-title">Kapıda Ödeme</span>
                  <span class="cod-radio-desc">Ürünü teslim alırken nakit veya kartla ödeyin</span>
                </div>
              </label>
            </div>

            <div id="cod-form-container" class="cod-form-container">
              <div class="cod-form-group">
                <label class="cod-label">Telefon Numarası <span class="cod-required">*</span></label>
                <div class="cod-input-wrapper">
                  <span class="cod-icon">📞</span>
                  <input type="tel" id="cod-phone" placeholder="(5XX) XXX XX XX" class="cod-input" style="padding-right: 110px !important;">
                  <button id="cod-verify-btn" onclick="window.sendVerificationCode()" disabled class="cod-verify-btn">Kod Gönder</button>
                </div>
                <div id="cod-verify-success" style="display:none; color:#10b981; font-size:0.85rem; margin-top:4px; font-weight:600;">✓ Numara Doğrulandı</div>
              </div>

              <div id="cod-code-area" class="cod-form-group" style="display:none;">
                <label class="cod-label">SMS Doğrulama Kodu</label>
                <div class="cod-input-wrapper" style="display:flex; gap:8px;">
                  <input type="text" id="cod-sms-code" placeholder="4 haneli kod" maxlength="4" class="cod-input" style="text-align:center !important; padding-left:16px !important; padding-right:16px !important;">
                  <button onclick="window.verifyCode()" class="cod-verify-btn" style="position:static !important; transform:none !important; height:auto !important; width: 100px !important;">Onayla</button>
                </div>
              </div>

              <div class="cod-form-group">
                <label class="cod-label">Ad Soyad <span class="cod-required">*</span></label>
                <div class="cod-input-wrapper">
                  <span class="cod-icon">👤</span>
                  <input type="text" id="cod-name" placeholder="Adınız Soyadınız" class="cod-input">
                </div>
              </div>

              <div class="cod-form-group">
                <label class="cod-label">Şehir <span class="cod-required">*</span></label>
                <div class="cod-input-wrapper">
                  <span class="cod-icon">📍</span>
                  <select id="cod-city" class="cod-select">
                    <option value="">Seçiniz</option>
                    ${turkishCities.map(city => `<option value="${city}">${city}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="cod-form-group">
                <label class="cod-label">Adres <span class="cod-required">*</span></label>
                <textarea id="cod-address" placeholder="Mahalle, Sokak, Kapı No, İlçe..." class="cod-textarea"></textarea>
              </div>

              <div class="cod-form-group">
                <label class="cod-label">Ödeme Tercihi <span class="cod-required">*</span></label>
                <div class="cod-type-grid">
                  <div class="cod-type-option" onclick="window.selectCodType('cash', this)">
                    <div class="cod-type-icon">💵</div>
                    <span class="cod-type-label">Nakit</span>
                  </div>
                  <div class="cod-type-option" onclick="window.selectCodType('card', this)">
                    <div class="cod-type-icon">💳</div>
                    <span class="cod-type-label">Kredi Kartı</span>
                  </div>
                </div>
              </div>
            </div>

            <button id="cod-submit-btn" onclick="window.handleSubmit()" class="cod-submit-btn">
              Online Ödeme Yap
            </button>
            <div style="text-align:center; font-size:0.8rem; color:#9ca3af; margin-top:12px; font-weight: 500;">
              🔒 256-bit SSL ile güvenli ödeme
            </div>

          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    loadCartItems(cartData);
    setupPhoneMask();

    // Sepet boşsa kapat
    if (cartData.item_count === 0 && (!cartData.items || cartData.items.length === 0)) {
      //alert("Sepetiniz boş!");
      //window.closeCODPopup();
    }
  }

  // Fonksiyonlar Global Scope'a Ekleniyor
  window.closeCODPopup = function () {
    const overlay = document.getElementById("cod-popup-overlay");
    if (overlay) {
      overlay.style.opacity = 0;
      setTimeout(() => overlay.remove(), 300);
    }
    isPopupOpen = false;
  };

  window.selectPaymentMethod = function (method, el) {
    selectedPaymentMethod = method;

    // Görsel seçim güncelleme
    document.querySelectorAll('.cod-radio-label').forEach(l => l.classList.remove('selected'));
    el.classList.add('selected');
    el.querySelector('input').checked = true;

    // Form görünürlüğü
    const form = document.getElementById('cod-form-container');
    const btn = document.getElementById('cod-submit-btn');

    if (method === 'online') {
      form.style.display = 'none';
      btn.innerText = 'Online Ödeme Yap';
    } else {
      form.style.display = 'block';
      const total = document.getElementById('cod-total-amount').innerText;
      btn.innerText = `Siparişi Tamamla - ${total}`;
    }
  };

  window.selectCodType = function (type, el) {
    selectedCodPaymentType = type;
    document.querySelectorAll('.cod-type-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  };

  window.handleSubmit = function () {
    if (selectedPaymentMethod === 'online') {
      window.location.href = '/checkout';
      return;
    }

    // Kapıda Ödeme Validasyon
    if (!validateForm()) return;

    const btn = document.getElementById('cod-submit-btn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerHTML = '<div class="cod-spinner"></div> İşleniyor...';

    // Sipariş Verilerini Hazırla (Backend'in beklediği format)
    const orderData = {
      shop: window.Shopify?.shop || window.location.hostname,
      customerName: document.getElementById('cod-name').value,
      customerPhone: window.codVerifiedPhone,
      customerAddress: document.getElementById('cod-address').value,
      customerCity: document.getElementById('cod-city').value,
      codPaymentType: selectedCodPaymentType,
      cartItems: window.codCartData.items.map(item => ({
        id: item.id,
        variant_id: item.variant_id || item.id,
        quantity: item.quantity,
        price: item.presentment_price ? Math.round(item.presentment_price * 100) : item.price // backend cents bekliyor olabilir
      })),
      totalAmount: window.codCartData.total_price,
      cartToken: window.codCartData.token,
      landingPage: window.location.href,
      referringSite: document.referrer,
      userAgent: navigator.userAgent
    };

    fetch("/apps/cod/api/orders/create-cod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Sepeti Temizle
          fetch('/cart/clear.js', { method: 'POST' });
          showToast('Sipariş başarıyla alındı! Yönlendiriliyorsunuz...', 'success');
          setTimeout(() => {
            window.location.href = data.thankYouUrl || '/';
          }, 1500);
        } else {
          throw new Error(data.error || 'Sipariş oluşturulamadı');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        btn.disabled = false;
        btn.innerText = originalText;
      });
  };

  function validateForm() {
    if (!window.codVerifiedPhone) {
      showToast('Lütfen telefon numaranızı doğrulayın.', 'error');
      return false;
    }
    if (!document.getElementById('cod-name').value.trim()) {
      showToast('Lütfen ad soyad girin.', 'error');
      return false;
    }
    if (!document.getElementById('cod-city').value) {
      showToast('Lütfen şehir seçin.', 'error');
      return false;
    }
    if (!document.getElementById('cod-address').value.trim()) {
      showToast('Lütfen adres girin.', 'error');
      return false;
    }
    if (!selectedCodPaymentType) {
      showToast('Lütfen ödeme tipini (Nakit/Kart) seçin.', 'error');
      return false;
    }
    return true;
  }

  // Sepet İşlemleri
  function loadCartItems(cart) {
    const container = document.getElementById('cod-cart-items-container');
    const totalEl = document.getElementById('cod-total-amount');

    if (!container || !totalEl) return;

    if (!cart || !cart.items || cart.items.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:20px; color:#6b7280;">Sepetiniz boş</div>';
      totalEl.innerText = '0.00 TL';
      return;
    }

    // Kullanılacak fiyat alanlarını belirle
    container.innerHTML = cart.items.map(item => {
      const itemLinePrice = (item.presentment_price * item.quantity) || 0;
      const itemOriginalLinePrice = 1789.99;
      const hasDiscount = itemOriginalLinePrice > itemLinePrice;

      return `
        <div class="cod-cart-item">
            ${hasDiscount ?
          `<div class="cod-discount-badge">-%${Math.round(((itemOriginalLinePrice - itemLinePrice) / itemOriginalLinePrice) * 100)}</div>`
          : ''}
            <div class="cod-item-header">
                <img src="${item.image}" class="cod-item-img">
                <div class="cod-item-info">
                    <h4>${item.title}</h4>
                    <p>${item.variant_title || ''}</p>
                </div>
            </div>
            <div class="cod-item-actions">
                <div class="cod-qty-control">
                    <button class="cod-qty-btn" onclick="window.updateCartQuantity('${item.key}', ${item.quantity - 1})">-</button>
                    <span class="cod-qty-val">${item.quantity}</span>
                    <button class="cod-qty-btn" onclick="window.updateCartQuantity('${item.key}', ${item.quantity + 1})">+</button>
                </div>
                <div class="cod-item-price">${formatMoney(itemLinePrice)}</div>
            </div>
        </div>
    `;
    }).join('');

    const cartTotal = cart.items.reduce((sum, item) => sum + (item.presentment_price * item.quantity), 0);
    totalEl.innerText = formatMoney(cartTotal);

    // Eğer COD seçiliyse butondaki fiyatı güncelle
    const btn = document.getElementById('cod-submit-btn');
    if (selectedPaymentMethod === 'cod') {
      btn.innerText = `Siparişi Tamamla - ${formatMoney(cartTotal)}`;
    }
  }

  window.updateCartQuantity = function (id, qty) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, quantity: qty })
    })
      .then(res => res.json())
      .then(cart => {
        window.codCartData = cart;
        loadCartItems(cart);
      });
  };

  // Telefon Maskeleme ve Doğrulama
  function setupPhoneMask() {
    const input = document.getElementById('cod-phone');
    const btn = document.getElementById('cod-verify-btn');

    if (!input || !btn) return;

    input.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
      if (x) {
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? ' ' + x[3] : '') + (x[4] ? ' ' + x[4] : '');
      }

      const raw = e.target.value.replace(/\D/g, '');
      btn.disabled = raw.length !== 10;
    });
  }

  window.sendVerificationCode = function () {
    const phoneEl = document.getElementById('cod-phone');
    if (!phoneEl) return;

    const phone = phoneEl.value.replace(/\D/g, '');
    const btn = document.getElementById('cod-verify-btn');

    btn.disabled = true;
    btn.innerText = '...';

    const fullPhone = "+90" + phone;

    fetch("/apps/cod/api/whatsapp/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: fullPhone }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const codeArea = document.getElementById('cod-code-area');
          if (codeArea) codeArea.style.display = 'block';

          showToast('Kod gönderildi!', 'success');
          btn.innerText = 'Tekrar Gönder';
          setTimeout(() => { btn.disabled = false; }, 30000);
        } else {
          showToast('Kod gönderilemedi.', 'error');
          btn.disabled = false;
          btn.innerText = 'Kod Gönder';
        }
      })
      .catch(() => {
        showToast('Servis hatası.', 'error');
        btn.disabled = false;
        btn.innerText = 'Kod Gönder';
      });
  };

  window.verifyCode = function () {
    const codeEl = document.getElementById('cod-sms-code');
    const phoneEl = document.getElementById('cod-phone');

    if (!codeEl || !phoneEl) return;

    const code = codeEl.value;
    const phone = "+90" + phoneEl.value.replace(/\D/g, '');

    fetch("/apps/cod/api/whatsapp/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: phone, code: code }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.verified) {
          window.codVerifiedPhone = phone;
          const successEl = document.getElementById('cod-verify-success');
          const areaEl = document.getElementById('cod-code-area');
          const btnEl = document.getElementById('cod-verify-btn');

          if (successEl) successEl.style.display = 'block';
          if (areaEl) areaEl.style.display = 'none';
          if (phoneEl) phoneEl.disabled = true;
          if (btnEl) btnEl.style.display = 'none';

          showToast('Doğrulama başarılı!', 'success');
        } else {
          showToast('Hatalı kod.', 'error');
        }
      });
  };

  // Başlatıcı
  function init() {
    // Checkout linklerini yakala
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="/checkout"], form[action*="/checkout"] button, button[name="checkout"], input[name="checkout"]');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        openCODPopup(e);
      }
    }, true);

    // URL değişimi izle (History API)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isCheckoutUrl(location.href)) {
          openCODPopup();
          history.pushState(null, '', '/cart'); // URL'i geri al
        }
      }
    }).observe(document, { subtree: true, childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
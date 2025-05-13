// public/script.js

const PROVIDER_NAME_FRONTEND = 'OKE'; // Sesuaikan jika perlu dari settings.js backend jika berbeda 
const PROVIDER_PREFIX_SEPARATOR_FRONTEND = '_'; // Sesuaikan jika perlu 

// Views Utama
const mainView = document.getElementById('main-view');
const productListView = document.getElementById('product-list-view');
const bebasNominalView = document.getElementById('bebas-nominal-view');
const detailInputView = document.getElementById('detail-input-view');
const riwayatView = document.getElementById('riwayat-view');
const profileView = document.getElementById('profile-view');
const depositView = document.getElementById('deposit-view');
const bantuanView = document.getElementById('bantuan-view');
const forgotPasswordView = document.getElementById('forgot-password-view');
const resetPasswordView = document.getElementById('reset-password-view');

// Navigasi Bawah
const bottomNav = document.getElementById('bottom-nav');
const navHome = document.getElementById('nav-home');
const navRiwayat = document.getElementById('nav-riwayat');
const navBantuan = document.getElementById('nav-bantuan');
const navProfile = document.getElementById('nav-profile');

// Elemen di Main View
const greetingContentDiv = document.getElementById('greeting-content');
const userInfoDisplayDiv = document.getElementById('user-info-display');
const displayUsernameSpan = document.getElementById('display-username');
const displayUserBalanceSpan = document.getElementById('display-user-balance');
const depositButton = document.getElementById('deposit-button'); // Tombol deposit di header main view 
const logoutButton = document.getElementById('logout-button'); // Tombol logout di header main view 
const showLoginPageButton = document.getElementById('show-login-page-button');

// Elemen di Product List View
const productListCategoryTitle = document.getElementById('product-list-category-title');
const productListDiv = document.getElementById('product-list');
const productListBackButton = document.getElementById('product-list-back-button');
const transactionStatusListDiv = document.getElementById('transaction-status-list');
const transactionMessageListSpan = document.getElementById('transaction-message-list');
const checkStatusButtonList = document.getElementById('check-status-button-list');

// Elemen di Bebas Nominal View
const bebasNominalListDiv = document.getElementById('bebas-nominal-list');
const bebasNominalBackButton = document.getElementById('bebas-nominal-back-button');
const transactionStatusBnSelect = document.getElementById('transaction-status-bn-select');
// Anda mungkin perlu ini 

// Elemen di Detail Input View
const detailInputBackButton = document.getElementById('detail-input-back-button');
const detailInputViewTitle = document.getElementById('detail-input-view-title');
const detailProductIconWrapper = document.getElementById('detail-product-icon-wrapper');
const detailProductIcon = document.getElementById('detail-product-icon');
const detailProductName = document.getElementById('detail-product-name');
const detailProductTag1 = document.getElementById('detail-product-tag1');
const detailProductTag2 = document.getElementById('detail-product-tag2');
const detailInputForm = document.getElementById('detail-input-form');
const detailInputProductCode = document.getElementById('detail-input-product-code');
const detailInputProductPrice = document.getElementById('detail-input-product-price');
const detailInputIsBebasNominal = document.getElementById('detail-input-is-bebas-nominal');
const detailInputOriginView = document.getElementById('detail-input-origin-view');
const detailInputParentKey = document.getElementById('detail-input-parent-key');
const detailInputParentTitle = document.getElementById('detail-input-parent-title');
const inputFieldsContainer = document.getElementById('input-fields-container');
const detailSubmitButton = document.getElementById('detail-submit-button');
const transactionStatusDetailDiv = document.getElementById('transaction-status-detail');
const transactionMessageDetailSpan = document.getElementById('transaction-message-detail');
const checkStatusButtonDetail = document.getElementById('check-status-button-detail');

// Elemen di Riwayat View
const riwayatListDiv = document.getElementById('riwayat-list');
const riwayatBackButton = document.getElementById('riwayat-back-button');

// Elemen di Profile View
const profileUsernameSpan = document.getElementById('profile-username');
const profileEmailSpan = document.getElementById('profile-email');
const profileSaldoSpan = document.getElementById('profile-saldo');
const profileDepositButton = document.getElementById('profile-deposit-button'); // Tombol deposit di profile 
const changePasswordForm = document.getElementById('change-password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const changePasswordStatusDiv = document.getElementById('change-password-status');
const profileLogoutButton = document.getElementById('profile-logout-button'); // Tombol logout di profile 
const profileBackButton = document.getElementById('profile-back-button');

// Elemen di Deposit View
const depositDesiredAmountInput = document.getElementById('deposit-desired-amount');
const calculateTransferButton = document.getElementById('calculate-transfer-button');
const transferInstructionArea = document.getElementById('transfer-instruction-area');
const transferInstructionText = document.getElementById('transfer-instruction-text');
const transferOrderId = document.getElementById('transfer-order-id');
const depositCalcStatusDiv = document.getElementById('deposit-calc-status');
const staticQrisImage = document.getElementById('static-qris-image'); // Pastikan path gambar ini benar di HTML 
const backToHomeFromDepositAltButton = document.getElementById('back-to-home-from-deposit-alt');
const depositBackButton = document.getElementById('deposit-back-button');

// Elemen di Bantuan View
const bantuanBackButton = document.getElementById('bantuan-back-button');

// Elemen di Forgot Password View (dalam index)
const forgotPasswordForm = document.getElementById('forgot-password-form');
const forgotEmailInput = document.getElementById('forgot-email');
const forgotPasswordStatusDiv = document.getElementById('forgot-password-status');
const forgotPasswordSubmitButton = document.getElementById('forgot-password-submit-button');
const forgotPasswordBackButton = document.getElementById('forgot-password-back-button');

// Elemen di Reset Password View (dalam index)
const resetPasswordForm = document.getElementById('reset-password-form');
const resetTokenInput = document.getElementById('reset-token');
const resetNewPasswordInput = document.getElementById('reset-new-password');
const resetConfirmPasswordInput = document.getElementById('reset-confirm-password');
const resetPasswordStatusDiv = document.getElementById('reset-password-status');
const resetPasswordSubmitButton = document.getElementById('reset-password-submit-button');
const resetPasswordBackToLoginButton = document.getElementById('reset-password-back-to-login-button');

// --- Global State ---
let lastTransactionRefId = null;
let currentViewInfo = { id: 'main-view', data: null }; // Simpan data untuk view saat ini 
let currentUserToken = localStorage.getItem('panz_store_token');
let currentUser = null;
try {
    const storedUser = localStorage.getItem('panz_store_user');
    if (storedUser) currentUser = JSON.parse(storedUser);
} catch (e) {
    console.error("Error parsing stored user:", e);
    localStorage.removeItem('panz_store_user'); // Hapus data user yang korup 
}

// --- Helper: fetch dengan Otentikasi ---
async function fetchWithAuth(url, options = {}) {
    const headers = {
        ...options.headers, // Sebarkan headers dari options dulu 
        'Authorization': `Bearer ${currentUserToken}` // Baru tambahkan/timpa Authorization 
    };
    // Set Content-Type jika tidak ada di options dan ada body (untuk POST/PUT) 
    if (options.body && (!options.headers || !options.headers['Content-Type'])) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) { // Token tidak valid atau kadaluarsa 
        console.warn("Sesi berakhir atau token tidak valid (401). Melakukan logout...");
        handleLogout(); // Lakukan logout, yang akan mengarahkan ke halaman login jika perlu 
        throw new Error('Sesi berakhir. Silakan login kembali.'); // Lemparkan error agar promise ditolak 
    }
    return response; // Kembalikan response untuk diproses lebih lanjut 
}

// --- Navigation and View Management ---
function setActiveNav(activeNavItemId) {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
    if (activeNavItemId) {
        const itemToActivate = document.getElementById(activeNavItemId);
        if (itemToActivate) itemToActivate.classList.add('active');
    } else {
        // Auto-detect berdasarkan view aktif jika activeNavItemId null 
        const activeViewElement = document.querySelector('.view.active');
        let navId = 'nav-home'; // Default 
        if (activeViewElement) {
            const viewId = activeViewElement.id;
            if (viewId === 'riwayat-view') navId = 'nav-riwayat';
            else if (viewId === 'bantuan-view') navId = 'nav-bantuan';
            else if (viewId === 'profile-view') navId = 'nav-profile';
            // Untuk view tanpa item nav aktif (seperti form, deposit, dll.) 
            else if (['forgot-password-view', 'reset-password-view', 'deposit-view'].includes(viewId)) navId = null;
            // View yang termasuk dalam kategori 'home' di nav 
            else if (['main-view', 'product-list-view', 'detail-input-view', 'bebas-nominal-view'].includes(viewId)) navId = 'nav-home';
        }
        if (navId) { // Hanya jika navId valid (bukan null) 
            const itemToActivate = document.getElementById(navId);
            if (itemToActivate) itemToActivate.classList.add('active');
        }
    }
}

function showView(viewElement, updateHistory = true, navItemIdToActivate = null, data = null) {
    if (!viewElement) {
        console.error("showView: viewElement is null. Defaulting to mainView if available.");
        viewElement = mainView; // Coba default ke mainView 
        if (!viewElement) { // Jika mainView juga tidak ada (kesalahan fatal di HTML) 
            console.error("showView: CRITICAL - mainView element not found!");
            // Mungkin tampilkan pesan error di body atau alert
            document.body.innerHTML = "<p>Error Kritis: Komponen utama aplikasi tidak ditemukan. Silakan hubungi admin.</p>";
            return;
        }
    }

    currentViewInfo = { id: viewElement.id, data: data }; // Update current view info 

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    viewElement.classList.add('active');
    window.scrollTo(0, 0); // Scroll ke atas setiap ganti view 

    const newViewId = viewElement.id;
    // Untuk reset password, kita sertakan token dalam hash jika ada, agar bisa di-bookmark/share 
    const hashQueryParam = (newViewId === 'reset-password-view' && data?.token) ?
        `?token=${data.token}` : '';
    const newHash = '#' + newViewId + hashQueryParam;
    const currentFullHash = window.location.hash; // Ini akan termasuk query params jika ada 

    if (updateHistory) {
        const state = { viewId: newViewId, data: data };
        // Hanya push state jika hash atau data benar-benar berubah 
        if (currentFullHash !== newHash || (history.state && (history.state.viewId !== newViewId || JSON.stringify(history.state.data) !== JSON.stringify(data)))) {
            if (newViewId === 'main-view' && (currentFullHash || (history.state && history.state.viewId))) {
                // Jika kembali ke main-view, hapus hash dari URL
                history.pushState(state, document.title, window.location.pathname + window.location.search);
            } else {
                history.pushState(state, document.title, newHash);
            }
        }
    }

    // Tentukan item nav yang akan diaktifkan
    let finalNavItemId = navItemIdToActivate;
    if (!finalNavItemId) { // Auto-detect based on viewId 
        if (['main-view', 'product-list-view', 'detail-input-view', 'bebas-nominal-view'].includes(newViewId)) finalNavItemId = 'nav-home';
        else if (newViewId === 'riwayat-view') finalNavItemId = 'nav-riwayat';
        else if (newViewId === 'bantuan-view') finalNavItemId = 'nav-bantuan';
        else if (newViewId === 'profile-view') finalNavItemId = 'nav-profile';
        // Untuk view tanpa item nav aktif (seperti form, deposit, dll.)
        else if (['deposit-view', 'forgot-password-view', 'reset-password-view'].includes(newViewId)) finalNavItemId = null;
    }
    setActiveNav(finalNavItemId); // Update tampilan nav 

    // Atur visibilitas bottomNav
    if (bottomNav) {
        const noNavViews = ['deposit-view', 'forgot-password-view', 'reset-password-view'];
        bottomNav.style.display = noNavViews.includes(newViewId) ? 'none' : 'flex';
    }
    updateUIForAuthState(); // Panggil ini untuk memastikan UI selalu konsisten dengan state login 
}

window.addEventListener('popstate', async (event) => {
    let targetViewId = 'main-view';
    let eventData = null;

    if (event.state && event.state.viewId) {
        targetViewId = event.state.viewId;
        eventData = event.state.data;
    } else {
        // Jika tidak ada state, coba parse dari hash URL (termasuk query param untuk token) 
        const hash = window.location.hash;
        if (hash && hash !== '#') {
            let cleanHash = hash.substring(1);
            const queryIndex = cleanHash.indexOf('?');
            if (queryIndex !== -1) {
                const hashParams = new URLSearchParams(cleanHash.substring(queryIndex + 1));
                if (hashParams.has('token')) {
                    eventData = { ...(eventData || {}), token: hashParams.get('token') };
                }
                cleanHash = cleanHash.substring(0, queryIndex); // Ambil nama view sebelum '?' 
            }
            targetViewId = cleanHash;
        }
    }
    currentViewInfo = { id: targetViewId, data: eventData }; // Update currentViewInfo 

    // Cek otentikasi sebelum menampilkan view (kecuali untuk view publik atau halaman login/register fisik)
    const publicViews = ['forgot-password-view', 'reset-password-view']; // View SPA yang publik 
    const currentPath = window.location.pathname.split('/').pop(); // Mendapatkan nama file HTML saat ini 
    const isAuthPage = currentPath === 'login' || currentPath === 'register'; 
    if (!publicViews.includes(targetViewId) && !isAuthPage && !currentUserToken) {
        // Jika bukan view publik, bukan halaman login/register fisik, dan tidak ada token,
        // Arahkan ke login. fetchUserProfile juga akan melakukan ini, tapi ini sebagai backup. 
        window.location.href = '/login';
        return; // Hentikan proses lebih lanjut karena akan redirect 
    }

    const targetView = document.getElementById(targetViewId);
    if (targetView) {
        console.log(`Popstate: Navigating to ${targetViewId} with data:`, eventData); // Panggil fungsi show spesifik jika ada, atau showView generik 
        // Pastikan fungsi-fungsi ini sudah didefinisikan!
        if (targetViewId === 'forgot-password-view') await showForgotPasswordView(false, eventData);
        else if (targetViewId === 'reset-password-view') await showResetPasswordView(eventData?.token, false, eventData);
        else if (targetViewId === 'deposit-view') await showDepositView(false, eventData);
        else if (targetViewId === 'profile-view') await showUserProfileView(false, eventData);
        else if (targetViewId === 'riwayat-view') await showRiwayatView(false, eventData);
        else if (targetViewId === 'bantuan-view') await showBantuanView(false, eventData);
        else if (targetViewId === 'bebas-nominal-view' && eventData) await showBebasNominalServiceSelection(eventData.serviceType, eventData.name, false); // Gunakan showBebasNominalServiceSelection 
        else if (targetViewId === 'product-list-view' && eventData) await showProductListView(eventData.key, eventData.name, eventData.parentInfo, false);
        else if (targetViewId === 'detail-input-view' && eventData) await showDetailInputView(eventData.productCode, eventData.productName, eventData.isBebasNominal, eventData.price, eventData.originView, eventData.categoryKeyForHint, eventData.provider, eventData.previousViewInfo, false);
        else showView(targetView, false, null, eventData); // Fallback 
    } else {
        console.warn(`Popstate: View '${targetViewId}' not found. Defaulting to mainView.`);
        showView(mainView, false, 'nav-home'); // Default ke mainView jika target tidak ada 
    }
});
// --- User Authentication and Profile ---
async function fetchUserProfile(redirectToLoginIfNeeded = true) {
    if (!currentUserToken) {
        currentUser = null;
        localStorage.removeItem('panz_store_user'); // Pastikan user di local storage juga bersih 
        // updateUIForAuthState akan dipanggil di akhir atau oleh showView
        if (redirectToLoginIfNeeded) {
            const currentHash = window.location.hash.substring(1);
            const publicSpaViews = ['forgot-password-view', 'reset-password-view']; // View SPA yang publik 
            const isPublicSpaView = publicSpaViews.some(viewName => currentHash.startsWith(viewName)); 
            const currentPath = window.location.pathname.split('/').pop(); // nama file html
            const isAuthPhysicalPage = currentPath === 'login' ||
                currentPath === 'register';

            if (!isPublicSpaView && !isAuthPhysicalPage) { // Jika bukan SPA publik dan bukan halaman login/register fisik 
                window.location.href = '/login';
                return false; // Hentikan eksekusi karena redirect 
            }
        }
        // Jika tidak redirect, update UI tetap diperlukan
        updateUIForAuthState();
        return false; // Tidak ada token, fetch tidak dilakukan 
    }

    try {
        const response = await fetchWithAuth('/api/user/profile'); // Menggunakan fetchWithAuth 
        // Periksa apakah responsnya OK sebelum mencoba .json()
        if (!response.ok) {
            // Jika errornya bukan 401 (sudah ditangani fetchWithAuth), mungkin masalah server lain
            const errorData = await response.text(); // Baca sebagai teks dulu 
            console.error(`Gagal memuat profil (status: ${response.status}):`, errorData);
            // Jangan logout jika hanya gagal fetch, biarkan token tetap ada untuk dicoba lagi
            // kecuali jika errornya spesifik token tidak valid (sudah ditangani di fetchWithAuth)
            throw new Error(`Gagal memuat profil (status: ${response.status})`);
        }
        const result = await response.json();
        if (result.success && result.user) {
            currentUser = result.user;
            localStorage.setItem('panz_store_user', JSON.stringify(currentUser));
        } else {
            // Pesan error dari server jika ada 
            console.error("Gagal memuat profil (data tidak sukses):", result.message);
            // Jika data tidak sukses tapi bukan karena token (misal user not found),
            // mungkin perlu logout juga, tergantung logika bisnis.
            // Untuk sekarang, biarkan.
        }
    } catch (error) {
        console.error("fetchUserProfile error (catch):", error.message);
        // Jika errornya "Sesi berakhir...", user sudah di-logout oleh fetchWithAuth
        // Untuk error lain, mungkin masalah jaringan, jangan langsung logout.
        if (error.message !== 'Sesi berakhir. Silakan login kembali.') {
            console.warn("Fetch profile gagal, mungkin masalah jaringan atau server.");
        }
        // currentUser dan currentUserToken akan diurus oleh handleLogout jika dipanggil
        updateUIForAuthState(); // Pastikan UI diupdate 
        return false; // Fetch gagal 
    } finally {
        updateUIForAuthState(); // Selalu update UI setelah setiap percobaan fetch 
    }
    return true; // Fetch berhasil atau setidaknya sudah mencoba dan data user terupdate (atau null) 
}

function updateUIForAuthState() {
    // const currentActiveViewId = document.querySelector('.view.active')?.id; // Tidak selalu dibutuhkan di sini 
    if (currentUserToken && currentUser) {
        if (greetingContentDiv) greetingContentDiv.style.display = 'none';
        if (userInfoDisplayDiv) userInfoDisplayDiv.style.display = 'block';
        if (displayUsernameSpan) displayUsernameSpan.textContent = currentUser.username;
        if (displayUserBalanceSpan) displayUserBalanceSpan.textContent = `Rp ${currentUser.balance != null ? currentUser.balance.toLocaleString('id-ID') : '0'}`;
        if (logoutButton) logoutButton.style.display = 'inline-block';
        if (depositButton) depositButton.style.display = 'inline-block';
        if (showLoginPageButton) showLoginPageButton.style.display = 'none';
        // Aktifkan tombol navigasi yang butuh login
        if (navProfile) navProfile.style.pointerEvents = 'auto';
        if (navRiwayat) navRiwayat.style.pointerEvents = 'auto';

    } else { // Tidak ada token atau user 
        if (greetingContentDiv) greetingContentDiv.style.display = 'block';
        if (userInfoDisplayDiv) userInfoDisplayDiv.style.display = 'none';
        if (showLoginPageButton) showLoginPageButton.style.display = 'block';
        // Sembunyikan tombol yang butuh login jika tidak ada user
        if (logoutButton) logoutButton.style.display = 'none';
        if (depositButton) depositButton.style.display = 'none';

        // Nonaktifkan (atau ubah perilaku) tombol navigasi yang butuh login
        if (navProfile) navProfile.style.pointerEvents = 'none';
        // Atau arahkan ke login
        if (navRiwayat) navRiwayat.style.pointerEvents = 'none';// Atau arahkan ke login
    }
}

function handleLogout() {
    localStorage.removeItem('panz_store_token');
    localStorage.removeItem('panz_store_user');
    currentUserToken = null;
    currentUser = null;
    showView(mainView, true, 'nav-home');
}

async function showProductListView(key, pageTitle, parentInfo = null, updateHistory = true) {
    if (!key) {
        console.error("showProductListView: key is missing.");
        showView(mainView, true, 'nav-home'); return;
    }
    // Tidak perlu fetchUserProfile di sini jika view ini bisa diakses publik sebagian
    // atau jika proteksi dilakukan di level API. 
    // Jika wajib login, fetchUserProfile() akan dipanggil di awal navigasi atau di initialLoad.
    const viewData = { key, name: pageTitle, parentInfo, frontendCategory: parentInfo?.key || key };
    showView(productListView, updateHistory, 'nav-home', viewData);
    if (productListCategoryTitle) productListCategoryTitle.textContent = pageTitle;
    if (productListDiv) productListDiv.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Memuat...</p></div>';
    if (transactionStatusListDiv) transactionStatusListDiv.style.display = 'none';
    if (checkStatusButtonList) checkStatusButtonList.style.display = 'none';
    if (productListBackButton) {
        productListBackButton.style.display = (parentInfo || currentViewInfo.data?.parentInfo) ? 'inline-block' : 'none';
        productListBackButton.onclick = () => {
            const currentParent = currentViewInfo.data?.parentInfo;
            if (currentParent) {
                showProductListView(currentParent.key, currentParent.name, currentParent.parentInfo || null);
            } else {
                showView(mainView, true, 'nav-home');
            }
        };
    }
    try {
        const response = await fetch(`/api/products/${key}`); // Panggil API backend Anda 
        if (!response.ok) { // Periksa jika status HTTP tidak OK (misal 404, 500) 
            const errorText = await response.text(); // Coba dapatkan teks error 
            throw new Error(`Gagal memuat produk: ${response.status} - ${errorText || response.statusText}`);
        }
        const result = await response.json();
        if (!result) throw new Error("Respons API produk kosong.");
        if (result.type === 'subcategories') {
            if (productListCategoryTitle) productListCategoryTitle.textContent = "Pilih " + pageTitle;
            displaySubCategoryList(result.data, pageTitle, key);
        } else if (result.type === 'products') {
            displayProductList(result.data);
        } else {
            // Jika ada pesan error dari server, gunakan itu 
            throw new Error(result.message || 'Format respons produk tidak dikenal.');
        }
    } catch (error) {
        console.error(`Error fetching products for '${key}':`, error);
        if (productListDiv) productListDiv.innerHTML = `<p class="error-msg">Gagal memuat data: ${error.message}</p>`;
    }
}

function displaySubCategoryList(subcategories, parentCategoryPageTitle, parentKey) {
    if (!productListDiv) return;
    productListDiv.innerHTML = '';
    if (!Array.isArray(subcategories) || subcategories.length === 0) {
        productListDiv.innerHTML = `<p class="no-product-msg">Tidak ada sub-kategori ditemukan untuk ${parentCategoryPageTitle}.</p>`;
        return;
    }
    const subCategoryGrid = document.createElement('div');
    subCategoryGrid.className = 'category-grid';
    subcategories.forEach(sub => {
        const item = document.createElement('div');
        item.className = 'category-item subcategory-item card'; // Pastikan class ini ada di style.css 
        const subCategoryName = sub.name || 'N/A';
        const subCategoryKey = sub.key || '';
        const iconNamePart = subCategoryName.split(/[-\s\(]/)[0].toLowerCase().replace(/[^a-z0-9]/gi, '');
        // Ambil icon dari public/icons/, sesuaikan dengan nama kategori/subkategori Anda
        const iconSrc = `/public/icons/${iconNamePart ||
            subCategoryKey.toLowerCase()}.png`;
        const fallbackLetter = subCategoryName.substring(0, 1).toUpperCase();

        item.innerHTML = `
            <div class="icon-wrapper">
                <img src="${iconSrc}" alt="${subCategoryName}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#A9A9A9'; this.parentElement.innerHTML += '<span class=\\'icon-fallback-letter\\'>${fallbackLetter}</span>';">
            </div>
            <span>${subCategoryName}</span>`;
        item.onclick = () => {
            const newParentInfo = {
                key: parentKey,
                name: parentCategoryPageTitle,
                parentInfo: currentViewInfo.data?.parentInfo ||
                    null
            };
            showProductListView(subCategoryKey, subCategoryName, newParentInfo);
        };
        subCategoryGrid.appendChild(item);
    });
    productListDiv.appendChild(subCategoryGrid);
}

function displayProductList(products) {
    if (!productListDiv) return;
    productListDiv.innerHTML = '';
    if (!Array.isArray(products) || products.length === 0) {
        productListDiv.innerHTML = '<p class="no-product-msg">Tidak ada produk ditemukan untuk kategori ini.</p>';
        return;
    }
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-list-item card'; // Pastikan class ini ada di style.css 
        const productName = product.product_name || 'N/A';
        const priceNum = parseFloat(String(product.price).replace(/[^0-9.]/g, ''));
        const productPrice = !isNaN(priceNum) && priceNum > 0 ? `Rp ${priceNum.toLocaleString('id-ID')}` : (product.type === 'bebas-nominal' ? 'Nominal Bebas' : 'Lihat Detail');
        const productCode =
            product.product_code || '';
        const providerTag = product.provider ? `<span class="provider-tag">[${product.provider}]</span>` : '';

        item.innerHTML = `
            <div class="product-item-info">
                <span class="product-item-name">${productName} ${providerTag}</span>
            </div>
            <span class="product-item-price">${productPrice}</span>`;
        item.onclick = () => showDetailInputView(

            productCode,
            productName,
            product.is_bebas_nominal ||
            product.type === 'bebas-nominal', // Flag dari API atau cek tipe 
            product.price ||
            0, // Harga dari API 
            'product-list', // originView 
            currentViewInfo.data?.key ||
            product.category_key_hint, // categoryKeyForHint 
            product.provider ||
            PROVIDER_NAME_FRONTEND,
            currentViewInfo // previousViewInfo
        );
        productListDiv.appendChild(item);
    });
}

async function showDetailInputView(productCode, productName, isBebasNominal, price, originView, categoryKeyForHint, provider, previousViewInfo, updateHistory = true) {
    if (!currentUserToken && !await fetchUserProfile(true)) { // Wajib login untuk transaksi
         // fetchUserProfile akan redirect jika tidak login
        return;
    }

    const data = { productCode, productName, isBebasNominal, price, originView, categoryKeyForHint, provider, previousViewInfo };
    showView(detailInputView, updateHistory, 'nav-home', data);

    if(detailProductName) detailProductName.textContent = productName;
    if(detailInputProductCode) detailInputProductCode.value = productCode;
    if(detailInputProductPrice) detailInputProductPrice.value = price; // Ini harga asli produk
    if(detailInputIsBebasNominal) detailInputIsBebasNominal.value = String(isBebasNominal); // 'true' atau 'false'
    if(detailInputOriginView) detailInputOriginView.value = originView;
    if(detailInputParentKey) detailInputParentKey.value = previousViewInfo?.data?.key || '';
    if(detailInputParentTitle) detailInputParentTitle.value = previousViewInfo?.data?.name || '';


    if(inputFieldsContainer) inputFieldsContainer.innerHTML = ''; // Bersihkan field sebelumnya

    const targetLabel = document.createElement('label');
    targetLabel.setAttribute('for', 'detail-input-target');
    targetLabel.textContent = 'Nomor Tujuan/ID Pelanggan:';

    const targetInput = document.createElement('input');
    targetInput.type = 'text'; // Bisa 'tel' atau 'number' tergantung kebutuhan
    targetInput.id = 'detail-input-target';
    targetInput.name = 'targetNumber'; // Nama untuk form submission
    targetInput.required = true;
    targetInput.placeholder = "Masukkan nomor tujuan";

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';
    inputGroup.appendChild(targetLabel);
    inputGroup.appendChild(targetInput);
    if(inputFieldsContainer) inputFieldsContainer.appendChild(inputGroup);

    // Jika bebas nominal, tambahkan input untuk amount
    if (isBebasNominal) {
        const amountLabel = document.createElement('label');
        amountLabel.setAttribute('for', 'detail-input-amount-bn'); // ID unik
        amountLabel.textContent = 'Jumlah (Rp):';
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.id = 'detail-input-amount-bn';
        amountInput.name = 'amount_bn'; // Nama unik
        amountInput.required = true;
        amountInput.placeholder = "Masukkan jumlah (misal 50000)";
        amountInput.min = "1000"; // Contoh minimal
        const amountGroup = document.createElement('div');
        amountGroup.className = 'input-group';
        amountGroup.appendChild(amountLabel);
        amountGroup.appendChild(amountInput);
        if(inputFieldsContainer) inputFieldsContainer.appendChild(amountGroup);
    }

    if (detailProductIcon) {
        // Logika untuk ikon, sesuaikan dengan nama file ikon Anda
        const iconKey = categoryKeyForHint ? categoryKeyForHint.toLowerCase().replace(/\s+/g, '_') : (productName ? productName.toLowerCase().split(' ')[0] : 'default');
        detailProductIcon.src = `/public/icons/${iconKey}.png`;
        detailProductIcon.alt = productName;
        detailProductIcon.onerror = function() { this.src = '/public/icons/default.png'; }; // Fallback icon
    }
    if(detailProductTag1) detailProductTag1.textContent = provider || PROVIDER_NAME_FRONTEND;
    if(detailProductTag2) detailProductTag2.textContent = isBebasNominal ? "Bebas Nominal" : `Rp ${parseFloat(price).toLocaleString('id-ID')}`;

    if(detailInputBackButton) {
        detailInputBackButton.onclick = () => {
            // Logika kembali ke view sebelumnya
            if (previousViewInfo && previousViewInfo.id === 'product-list-view' && previousViewInfo.data) {
                 showProductListView(previousViewInfo.data.key, previousViewInfo.data.name, previousViewInfo.data.parentInfo);
            } else if (previousViewInfo && previousViewInfo.id === 'bebas-nominal-view' && previousViewInfo.data) {
                showBebasNominalServiceSelection(previousViewInfo.data.serviceType, previousViewInfo.data.name);
            }
             else { // Fallback jika tidak ada info view sebelumnya atau tidak cocok
                showView(mainView, true, 'nav-home');
            }
        };
    }
    if(transactionStatusDetailDiv) transactionStatusDetailDiv.style.display = 'none';
    if(checkStatusButtonDetail) checkStatusButtonDetail.style.display = 'none';
}

async function showDepositView(updateHistory = true, data = null) {
    if (!currentUserToken && !await fetchUserProfile(true)) { return; }
    showView(depositView, updateHistory, null, data); // Deposit tidak punya item nav aktif khusus

    if(depositDesiredAmountInput) depositDesiredAmountInput.value = '';
    if(transferInstructionArea) transferInstructionArea.style.display = 'none';
    if(depositCalcStatusDiv) depositCalcStatusDiv.innerHTML = '';
    if (staticQrisImage) { // Pastikan path ke gambar QRIS statis Anda benar
        // staticQrisImage.src = "/public/images/qris_statis_anda.png"; // Contoh path
        // staticQrisImage.alt = "Scan QRIS untuk Deposit";
    }

    if(depositBackButton) depositBackButton.onclick = () => showView(mainView, true, 'nav-home');
    if(backToHomeFromDepositAltButton) backToHomeFromDepositAltButton.onclick = () => showView(mainView, true, 'nav-home');
}

async function showRiwayatView(updateHistory = true, data = null) {
    if (!currentUserToken && !await fetchUserProfile(true)) { return; }
    showView(riwayatView, updateHistory, 'nav-riwayat', data);

    if(riwayatListDiv) riwayatListDiv.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Memuat riwayat...</p></div>';
    if(riwayatBackButton) riwayatBackButton.onclick = () => showView(mainView, true, 'nav-home');

    try {
        const response = await fetchWithAuth('/api/transactions/history');
        if (!response.ok) throw new Error(`Gagal mengambil riwayat: ${response.statusText}`);
        const result = await response.json();
        if (result.success && result.data) {
            displayRiwayatList(result.data);
        } else {
            throw new Error(result.message || 'Gagal mengambil data riwayat.');
        }
    } catch (error) {
        console.error("Error fetching transaction history:", error);
        if(riwayatListDiv) riwayatListDiv.innerHTML = `<p class="error-msg">Gagal memuat riwayat: ${error.message}</p>`;
    }
}

function displayRiwayatList(transactions) {
    if(!riwayatListDiv) return;
    riwayatListDiv.innerHTML = '';
    if (!transactions || transactions.length === 0) {
        riwayatListDiv.innerHTML = '<p class="no-product-msg">Belum ada riwayat transaksi.</p>';
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'riwayat-list-container'; // Pastikan class ini ada di style.css
    transactions.forEach(tx => {
        const li = document.createElement('li');
        li.className = 'riwayat-item card'; // Pastikan class ini ada di style.css
        const statusClass = tx.status ? tx.status.toLowerCase().replace(/[\s_]+/g, '-') : 'unknown';
        li.innerHTML = `
            <div class="riwayat-item-header">
                <span class="riwayat-product-name">${tx.product_name || 'N/A'}</span>
                <span class="riwayat-status ${statusClass}">${tx.status || 'N/A'}</span>
            </div>
            <div class="riwayat-item-body">
                <p>Tujuan: ${tx.destination || '-'}</p>
                <p>Jumlah: Rp ${tx.amount != null ? tx.amount.toLocaleString('id-ID') : '-'}</p>
                <p>Tanggal: ${tx.timestamp ? new Date(tx.timestamp).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short'}) : '-'}</p>
                ${tx.sn ? `<p>SN/Token: <span class="riwayat-sn">${tx.sn}</span></p>` : ''}
                <p>Ref ID: ${tx.ref_id_internal || '-'}</p>
                 ${tx.message ? `<p class="riwayat-message">Pesan: ${tx.message}</p>`:''}
            </div>
            <div class="riwayat-item-footer">
                 </div>
        `;
        ul.appendChild(li);
    });
    riwayatListDiv.appendChild(ul);
}

async function showBantuanView(updateHistory = true, data = null) {
    // View bantuan biasanya statis
    showView(bantuanView, updateHistory, 'nav-bantuan', data);
    if(bantuanBackButton) bantuanBackButton.onclick = () => showView(mainView, true, 'nav-home');
}

async function showUserProfileView(updateHistory = true, data = null) {
    if (!currentUserToken && !await fetchUserProfile(true)) { return; }
    // fetchUserProfile sudah dipanggil dan seharusnya sudah mengupdate currentUser
    showView(profileView, updateHistory, 'nav-profile', data);

    if (currentUser) { // Pastikan currentUser ada setelah fetch
        if(profileUsernameSpan) profileUsernameSpan.textContent = currentUser.username;
        if(profileEmailSpan) profileEmailSpan.textContent = currentUser.email;
        if(profileSaldoSpan) profileSaldoSpan.textContent = `Rp ${currentUser.balance != null ? currentUser.balance.toLocaleString('id-ID') : '0'}`;
    } else {
        // Jika currentUser masih null (misal fetch gagal tapi tidak redirect)
        // Tampilkan pesan error atau state kosong
        if(profileUsernameSpan) profileUsernameSpan.textContent = '-';
        if(profileEmailSpan) profileEmailSpan.textContent = '-';
        if(profileSaldoSpan) profileSaldoSpan.textContent = 'Rp -';
        console.warn("Data pengguna tidak tersedia untuk ditampilkan di profil.");
    }
    if(changePasswordForm) changePasswordForm.reset();
    if(changePasswordStatusDiv) changePasswordStatusDiv.style.display = 'none';
    if(profileBackButton) profileBackButton.onclick = () => showView(mainView, true, 'nav-home');
}

async function showForgotPasswordView(updateHistory = true, data = null) {
    // Ini adalah view SPA, tidak bergantung pada login user
    showView(forgotPasswordView, updateHistory, null, data); // Tidak ada item nav aktif
    if(forgotPasswordForm) forgotPasswordForm.reset();
    if(forgotPasswordStatusDiv) { forgotPasswordStatusDiv.style.display = 'none'; forgotPasswordStatusDiv.textContent = ''; }
    if(forgotPasswordBackButton) {
        forgotPasswordBackButton.onclick = () => {
            // Kembali ke halaman login fisik jika pengguna belum login dan tidak di SPA utama
            // Jika ini bagian dari SPA utama dan ada cara kembali ke form login di SPA, gunakan itu.
            // Untuk sekarang, asumsikan ini dipanggil dari suatu tempat yang bisa kembali ke login
             window.location.href = '/login';
        };
    }
}

async function showResetPasswordView(tokenFromUrlOrState = null, updateHistory = true, data = null) {
    // Ini juga view SPA publik
    let tokenToUse = tokenFromUrlOrState;
    if (!tokenToUse && data?.token) tokenToUse = data.token; // Dari history state jika ada
    // Jika masih tidak ada token, coba dari URL hash/query secara eksplisit saat view ini dipanggil
    if (!tokenToUse) {
        const hash = window.location.hash; // Cek #reset-password-view?token=XYZ
        if (hash.includes('?token=')) {
            try {
                tokenToUse = new URLSearchParams(hash.substring(hash.indexOf('?'))).get('token');
            } catch (e) { console.error("Error parsing token from hash for reset password:", e); }
        }
    }

    const viewData = { ...(data || {}), token: tokenToUse };
    showView(resetPasswordView, updateHistory, null, viewData); // Tidak ada item nav aktif

    if(resetPasswordForm) resetPasswordForm.reset();
    if(resetPasswordStatusDiv) { resetPasswordStatusDiv.style.display = 'none'; resetPasswordStatusDiv.textContent = '';}

    if(resetTokenInput) {
        if (tokenToUse) {
            resetTokenInput.value = tokenToUse;
            if(resetPasswordBackToLoginButton) resetPasswordBackToLoginButton.style.display = 'none'; // Sembunyikan jika token ada
        } else {
            console.warn("Token reset tidak ditemukan untuk form reset password.");
            if(resetPasswordStatusDiv) {
                resetPasswordStatusDiv.textContent = "Link reset tidak valid atau token tidak ditemukan. Silakan minta link baru.";
                resetPasswordStatusDiv.className = 'transaction-status-container error';
                resetPasswordStatusDiv.style.display = 'block';
            }
            if(resetPasswordBackToLoginButton) resetPasswordBackToLoginButton.style.display = 'inline-block'; // Tampilkan tombol kembali ke login jika tidak ada token
        }
    }
}

// Fungsi untuk Bebas Nominal
async function showBebasNominalServiceSelection(serviceType, pageTitle, updateHistory = true) {
    if (!currentUserToken && !await fetchUserProfile(true)) { return; }

    const viewData = { serviceType, name: pageTitle }; // Simpan serviceType untuk fetch
    showView(bebasNominalView, updateHistory, 'nav-home', viewData);

    // Jika Anda punya elemen judul khusus di bebasNominalView, update di sini
    // if(bebasNominalViewTitle) bebasNominalViewTitle.textContent = pageTitle;
    if(bebasNominalListDiv) bebasNominalListDiv.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Memuat opsi...</p></div>';
    if(bebasNominalBackButton) bebasNominalBackButton.onclick = () => showView(mainView, true, 'nav-home');

    try {
        const response = await fetchWithAuth(`/api/bebas_nominal_options/${serviceType}`);
        if (!response.ok) throw new Error(`Gagal mengambil opsi bebas nominal: ${response.statusText}`);
        const result = await response.json();
        if (result.success && result.data) {
            displayBebasNominalOptions(result.data, pageTitle);
        } else {
            throw new Error(result.message || "Gagal mengambil data opsi bebas nominal.");
        }
    } catch (error) {
        console.error(`Error fetching bebas nominal options for ${serviceType}:`, error);
        if(bebasNominalListDiv) bebasNominalListDiv.innerHTML = `<p class="error-msg">Gagal memuat opsi: ${error.message}</p>`;
    }
}

function displayBebasNominalOptions(options, pageTitle) {
    if(!bebasNominalListDiv) return;
    // Jika bebasNominalView punya elemen judul, update di sini
    // if(bebasNominalViewTitle) bebasNominalViewTitle.textContent = "Pilih Layanan - " + pageTitle;

    bebasNominalListDiv.innerHTML = '';
    if (!options || options.length === 0) {
        bebasNominalListDiv.innerHTML = '<p class="no-product-msg">Tidak ada opsi bebas nominal ditemukan untuk layanan ini.</p>';
        return;
    }
    const optionGrid = document.createElement('div');
    optionGrid.className = 'category-grid'; // Atau class lain yang sesuai dengan styling Anda

    options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'category-item subcategory-item card'; // Sesuaikan class
        const optionName = option.name || 'N/A';
        const iconHint = option.icon_hint || option.key_for_input_hint || 'default';
        const iconSrc = `/public/icons/${iconHint}.png`;
        const fallbackLetter = optionName.substring(0,1).toUpperCase();

        item.innerHTML = `
            <div class="icon-wrapper">
                <img src="${iconSrc}" alt="${optionName}" onerror="this.style.display='none'; this.parentElement.style.backgroundColor='#A9A9A9'; this.parentElement.innerHTML += '<span class=\\'icon-fallback-letter\\'>${fallbackLetter}</span>';">
            </div>
            <span>${optionName}</span>
        `;
        item.onclick = () => {
            showDetailInputView(
                // product_code untuk bebas nominal mungkin adalah product_code_provider dari API
                // atau Anda bisa membuat format khusus jika diperlukan
                `${option.provider || PROVIDER_NAME_FRONTEND}${PROVIDER_PREFIX_SEPARATOR_FRONTEND}${option.product_code_provider}`,
                optionName,
                true, // isBebasNominal sudah pasti true
                0,    // price awal 0 untuk bebas nominal, user akan input jumlah
                'bebas-nominal', // originView
                option.key_for_input_hint, // categoryKeyForHint untuk ikon atau logika lain
                option.provider || PROVIDER_NAME_FRONTEND,
                currentViewInfo // Kirim info view saat ini untuk tombol back
            );
        };
        optionGrid.appendChild(item);
    });
    bebasNominalListDiv.appendChild(optionGrid);
}


// --- Event Handlers (handleDetailSubmit, handleCalculateTransfer, handleChangePassword, handleForgotPassword, handleResetPassword) ---
// --- Salin versi terakhir yang sudah diperbaiki (terutama handleForgotPassword dan handleResetPassword dengan penanganan JSON) ---

async function handleDetailSubmit(event) {
    event.preventDefault();
    if (!currentUserToken && !await fetchUserProfile(true)) { return; }

    const productCode = detailInputProductCode.value;
    const productName = detailProductName.textContent;
    let amount = parseFloat(detailInputProductPrice.value); // Harga produk tetap
    const isBebasNominal = detailInputIsBebasNominal.value === 'true';
    const targetNumberEl = detailInputForm.elements['targetNumber'];
    const customAmountEl = detailInputForm.elements['amount_bn']; // Gunakan nama yang unik: amount_bn

    const targetNumber = targetNumberEl ? targetNumberEl.value : null;

    if (!targetNumber) {
        updateTransactionStatus(transactionStatusDetailDiv, transactionMessageDetailSpan, "Nomor tujuan diperlukan.", false, checkStatusButtonDetail);
        return;
    }

    if (isBebasNominal && customAmountEl) {
        amount = parseFloat(customAmountEl.value);
        if (isNaN(amount) || amount <= 0) {
            updateTransactionStatus(transactionStatusDetailDiv, transactionMessageDetailSpan, "Jumlah bebas nominal tidak valid.", false, checkStatusButtonDetail);
            return;
        }
    } else if (isNaN(amount) || amount < 0) { // Harga produk tetap tidak boleh negatif
         updateTransactionStatus(transactionStatusDetailDiv, transactionMessageDetailSpan, "Harga produk tidak valid.", false, checkStatusButtonDetail);
        return;
    }


    if (!productCode) {
         updateTransactionStatus(transactionStatusDetailDiv, transactionMessageDetailSpan, "Kode produk tidak ditemukan.", false, checkStatusButtonDetail);
        return;
    }

    updateTransactionStatus(transactionStatusDetailDiv, transactionMessageDetailSpan, "Memproses transaksi...", null, checkStatusButtonDetail, true);
    if(detailSubmitButton) { detailSubmitButton.disabled = true; detailSubmitButton.innerHTML = '<div class="spinner-button"></div> Memproses'; }

    try {
        const response = await fetchWithAuth('/api/transactions', {
            method: 'POST',
            body: JSON.stringify({
                productId: productCode,
                targetNumber: targetNumber,
                amount: amount, // Ini adalah harga final, baik dari produk atau input bebas nominal
                productName: productName
            })
        });
        // Periksa respons sebelum parse JSON
        if (!response.ok) {
            // Coba baca error dari server jika ada
            let serverErrorMsg = `Transaksi gagal (Status: ${response.status})`;
            try {
                const errData = await response.json();
                serverErrorMsg = errData.message || serverErrorMsg;
            } catch(e){ /* biarkan pesan default jika parse gagal */ }
            throw new Error(serverErrorMsg);
        }

        const result = await response.json();
        lastTransactionRefId = result.data?.ref_id_internal || null;
        updateTransactionStatus(transactionStatusDetailDiv, transactionMessageDetailSpan, result.message, result.success, checkStatusButtonDetail, false, lastTransactionRefId);

        if (result.success && result.data) {
            if (typeof result.data.new_balance !== 'undefined') {
                currentUser.balance = result.data.new_balance;
                localStorage.setItem('panz_store_user', JSON.stringify(currentUser));
                updateUIForAuthState();
            }
            // Jangan reset form di sini agar user bisa lihat detail jika perlu
            // detailInputForm.reset();
        }

    } catch (error) {
        console.error("Transaction error:", error);
        updateTransactionStatus(transactionStatusDetailDiv, transactionMessageDetailSpan, error.message || "Gagal memproses transaksi.", false, checkStatusButtonDetail);
    } finally {
        if(detailSubmitButton) { detailSubmitButton.disabled = false; detailSubmitButton.innerHTML = 'Lanjutkan'; }
    }
}

async function handleCalculateTransfer() {
    if (!currentUserToken && !await fetchUserProfile(true)) { return; }
    const desiredAmountValue = depositDesiredAmountInput.value;
    if (!desiredAmountValue) {
        updateDepositStatus("Jumlah deposit harus diisi.", false);
        return;
    }
    const desiredAmount = parseFloat(desiredAmountValue);

    if (isNaN(desiredAmount) || desiredAmount < 10000) { // Sesuaikan dengan min deposit Anda
        updateDepositStatus("Jumlah minimal deposit adalah Rp 10.000.", false);
        return;
    }

    updateDepositStatus("Menghitung jumlah transfer unik...", null); // Info
    if(calculateTransferButton) calculateTransferButton.disabled = true;

    try {
        const response = await fetchWithAuth('/api/deposit/calculate_transfer', {
            method: 'POST',
            body: JSON.stringify({ desiredAmount })
        });
        if (!response.ok) {
            let serverErrorMsg = `Gagal kalkulasi (Status: ${response.status})`;
            try { const errData = await response.json(); serverErrorMsg = errData.message || serverErrorMsg;}
            catch(e){ /* abaikan */ }
            throw new Error(serverErrorMsg);
        }
        const result = await response.json();

        if (result.success && result.uniqueTransferAmount) {
            updateDepositStatus(result.message, true); // Pesan sukses dari server
            if(transferInstructionArea) transferInstructionArea.style.display = 'block';
            if(transferInstructionText) transferInstructionText.innerHTML = `Silakan transfer <strong>PERSIS</strong> sebesar <strong style="color:var(--accent-blue); font-size:1.2em;">Rp ${result.uniqueTransferAmount.toLocaleString('id-ID')}</strong>.`;
            if(transferOrderId) transferOrderId.textContent = `Order ID Deposit Anda: ${result.orderId || 'N/A'}`;
        } else {
            updateDepositStatus(result.message || "Gagal mendapatkan jumlah transfer unik.", false);
            if(transferInstructionArea) transferInstructionArea.style.display = 'none';
        }
    } catch (error) {
        console.error("Error calculating transfer:", error);
        updateDepositStatus(error.message || "Gagal memproses permintaan kalkulasi.", false);
        if(transferInstructionArea) transferInstructionArea.style.display = 'none';
    } finally {
        if(calculateTransferButton) calculateTransferButton.disabled = false;
    }
}

async function handleChangePassword(event) {
    event.preventDefault();
    if (!currentUserToken && !await fetchUserProfile(true)) { return; }

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        updateChangePasswordStatus("Semua field password harus diisi.", false);
        return;
    }
    if (newPassword.length < 6) {
        updateChangePasswordStatus("Password baru minimal 6 karakter.", false);
        return;
    }
    if (newPassword !== confirmNewPassword) {
        updateChangePasswordStatus("Konfirmasi password baru tidak cocok.", false);
        return;
    }

    const submitButton = changePasswordForm.querySelector('button[type="submit"]');
    if(submitButton) { submitButton.disabled = true; submitButton.innerHTML = '<div class="spinner-button"></div> Mengubah...';}
    updateChangePasswordStatus("Sedang mengubah password...", null); // Info

    try {
        const response = await fetchWithAuth('/api/user/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        if (!response.ok) {
            let serverErrorMsg = `Gagal ubah password (Status: ${response.status})`;
            try{ const errData = await response.json(); serverErrorMsg = errData.message || serverErrorMsg; }
            catch(e){/*abaikan*/}
            throw new Error(serverErrorMsg);
        }
        const result = await response.json();
        updateChangePasswordStatus(result.message, result.success);
        if (result.success) {
            if(changePasswordForm) changePasswordForm.reset();
        }
    } catch (error) {
        console.error("Error changing password:", error);
        updateChangePasswordStatus(error.message || "Gagal mengubah password.", false);
    } finally {
        if(submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Ubah Password';}
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const emailValue = forgotEmailInput ? forgotEmailInput.value : null;
    if (!emailValue) {
        updateForgotPasswordStatus("Alamat email harus diisi.", false);
        return;
    }
    if(forgotPasswordSubmitButton) { forgotPasswordSubmitButton.disabled = true; forgotPasswordSubmitButton.innerHTML = '<div class="spinner-button"></div> Mengirim...';}
    updateForgotPasswordStatus("Memproses permintaan reset password...", null);

    try {
        const response = await fetch('/api/auth/request-password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailValue })
        });

        // Logika penanganan respons yang lebih baik
        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const result = await response.json();
                updateForgotPasswordStatus(result.message, result.success); // Pesan dari server
                if (result.success) {
                    if(forgotPasswordForm) forgotPasswordForm.reset();
                }
            } else {
                const textResponse = await response.text();
                console.error("Server mengirim respons non-JSON (request-password-reset):", textResponse.substring(0,500));
                updateForgotPasswordStatus("Gagal memproses. Server memberikan respons tidak terduga.", false);
            }
        } else { // HTTP error
            let errorMessage = `Permintaan gagal (Status: ${response.status})`;
            try {
                const errorResult = await response.json();
                errorMessage = errorResult.message || errorMessage;
            } catch (e) {
                const textError = await response.text();
                if (textError && textError.toLowerCase().includes("<!doctype html")) {
                     console.error("Server mengembalikan HTML error (request-password-reset):", textError.substring(0,500));
                     errorMessage = `Permintaan gagal. Server mengembalikan HTML (Status: ${response.status}).`;
                } else if (textError) { errorMessage = textError; }
            }
            updateForgotPasswordStatus(errorMessage, false);
        }
    } catch (error) { // Error jaringan
        console.error("Forgot password error (catch):", error);
        updateForgotPasswordStatus(error.message || "Terjadi kesalahan jaringan. Silakan coba lagi.", false);
    } finally {
        if(forgotPasswordSubmitButton) { forgotPasswordSubmitButton.disabled = false; forgotPasswordSubmitButton.innerHTML = 'Kirim Link Reset';}
    }
}

async function handleResetPassword(event) {
    event.preventDefault();
    const token = resetTokenInput ? resetTokenInput.value : null;
    const newPassword = resetNewPasswordInput ? resetNewPasswordInput.value : null;
    const confirmPassword = resetConfirmPasswordInput ? resetConfirmPasswordInput.value : null;

    if (!token) { updateResetPasswordStatus("Token reset tidak ada atau tidak valid.", false); return; }
    if (!newPassword || newPassword.length < 6) { updateResetPasswordStatus("Password baru minimal 6 karakter.", false); return; }
    if (newPassword !== confirmPassword) { updateResetPasswordStatus("Konfirmasi password baru tidak cocok.", false); return; }

    if(resetPasswordSubmitButton) { resetPasswordSubmitButton.disabled = true; resetPasswordSubmitButton.innerHTML = '<div class="spinner-button"></div> Mereset...';}
    updateResetPasswordStatus("Sedang memproses reset password...", null);

    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });

        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const result = await response.json();
                updateResetPasswordStatus(result.message, result.success); // Pesan dari server
                if (result.success) {
                    if(resetPasswordForm) resetPasswordForm.reset();
                    if(resetPasswordBackToLoginButton) resetPasswordBackToLoginButton.style.display = 'inline-block';
                }
            } else {
                const textResponse = await response.text();
                console.error("Server mengirim respons non-JSON (reset-password):", textResponse.substring(0,500));
                updateResetPasswordStatus("Gagal mereset password. Server memberikan respons tidak terduga.", false);
            }
        } else { // HTTP error
            let errorMessage = `Gagal mereset password (Status: ${response.status})`;
             try {
                const errorResult = await response.json();
                errorMessage = errorResult.message || errorMessage;
            } catch (e) {
                const textError = await response.text();
                 if (textError && textError.toLowerCase().includes("<!doctype html")) {
                     console.error("Server mengembalikan HTML error (reset-password):", textError.substring(0,500));
                     errorMessage = `Gagal mereset password. Server mengembalikan HTML (Status: ${response.status}).`;
                } else if (textError) { errorMessage = textError; }
            }
            updateResetPasswordStatus(errorMessage, false);
        }
    } catch (error) { // Error Jaringan
        console.error("Reset password error (catch):", error);
        updateResetPasswordStatus(error.message || "Terjadi kesalahan jaringan saat mereset password.", false);
    } finally {
         if(resetPasswordSubmitButton) {resetPasswordSubmitButton.disabled = false; resetPasswordSubmitButton.innerHTML = 'Simpan Password Baru';}
    }
}


// --- Utility Functions for UI Update (Status messages) ---
// (updateTransactionStatus, updateDepositStatus, updateChangePasswordStatus,
// updateForgotPasswordStatus, updateResetPasswordStatus, checkTransactionStatus)
// --- PASTIKAN SEMUA FUNGSI INI ADA DAN LENGKAP DARI KODE SEBELUMNYA ---

function updateTransactionStatus(statusDiv, messageSpan, message, success, buttonElement, isLoading = false, refId = null) {
    if (!statusDiv || !messageSpan) { console.warn("Elemen status atau pesan tidak ditemukan untuk updateTransactionStatus"); return; }

    messageSpan.textContent = message;
    statusDiv.className = 'transaction-status-container'; // Reset class
    if (isLoading) {
        statusDiv.classList.add('info'); // Atau kelas khusus 'loading'
    } else if (success === true) {
        statusDiv.classList.add('success');
    } else if (success === false) {
        statusDiv.classList.add('error');
    } else { // success === null (netral/info)
        statusDiv.classList.add('info');
    }
    statusDiv.style.display = 'block';

    if (buttonElement) {
        // Tampilkan tombol cek status jika ada refId DAN statusnya bukan final error
        const isFinalError = success === false; // Anggap semua false adalah final error untuk UI ini
        if (refId && !isFinalError) {
            buttonElement.style.display = 'inline-block';
            buttonElement.onclick = () => checkTransactionStatus(refId, statusDiv, messageSpan, buttonElement);
        } else {
            buttonElement.style.display = 'none';
        }
    }
}

function updateDepositStatus(message, success) {
    if(!depositCalcStatusDiv) return;
    depositCalcStatusDiv.textContent = message;
    depositCalcStatusDiv.className = 'transaction-status-container'; // Reset
    if (success === true) depositCalcStatusDiv.classList.add('success');
    else if (success === false) depositCalcStatusDiv.classList.add('error');
    else depositCalcStatusDiv.classList.add('info'); // Untuk pesan loading/netral
    depositCalcStatusDiv.style.display = 'block';
}

function updateChangePasswordStatus(message, success) {
    if(!changePasswordStatusDiv) return;
    changePasswordStatusDiv.textContent = message;
    changePasswordStatusDiv.className = 'transaction-status-container'; // Reset
    if (success === true) changePasswordStatusDiv.classList.add('success');
    else if (success === false) changePasswordStatusDiv.classList.add('error');
    else changePasswordStatusDiv.classList.add('info');
    changePasswordStatusDiv.style.display = 'block';
}

function updateForgotPasswordStatus(message, success) {
    if(!forgotPasswordStatusDiv) return;
    forgotPasswordStatusDiv.textContent = message;
    forgotPasswordStatusDiv.className = 'transaction-status-container'; // Reset
    if (success === true) forgotPasswordStatusDiv.classList.add('success'); // Atau 'info' jika pesannya "cek email"
    else if (success === false) forgotPasswordStatusDiv.classList.add('error');
    else forgotPasswordStatusDiv.classList.add('info'); // Untuk pesan loading/netral
    forgotPasswordStatusDiv.style.display = 'block';
}

function updateResetPasswordStatus(message, success) {
     if(!resetPasswordStatusDiv) return;
    resetPasswordStatusDiv.textContent = message;
    resetPasswordStatusDiv.className = 'transaction-status-container'; // Reset
    if (success === true) resetPasswordStatusDiv.classList.add('success');
    else if (success === false) resetPasswordStatusDiv.classList.add('error');
    else resetPasswordStatusDiv.classList.add('info');
    resetPasswordStatusDiv.style.display = 'block';
}

async function checkTransactionStatus(refId, statusDiv, messageSpan, buttonElement) {
    if (!refId) return;
    // Simpan teks tombol asli
    const originalButtonText = buttonElement ? buttonElement.textContent : '';
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<div class="spinner-button-small"></div>'; // Spinner kecil
    } else { // Jika buttonElement null (misalnya dari auto-check), update statusDiv saja
         updateTransactionStatus(statusDiv, messageSpan, "Mengecek status...", null, buttonElement, true, refId);
    }

    try {
        const response = await fetchWithAuth(`/api/transactions/status/${refId}`);
        if (!response.ok) {
             let serverErrorMsg = `Gagal cek status (Status: ${response.status})`;
            try{ const errData = await response.json(); serverErrorMsg = errData.message || serverErrorMsg; }
            catch(e){/*abaikan*/}
            throw new Error(serverErrorMsg);
        }
        const result = await response.json();

        if (result.success && result.data) {
            let statusMessage = `Status: ${result.data.status || 'N/A'}. ${(result.data.message || '')}`;
            if(result.data.sn) statusMessage += ` SN/Token: ${result.data.sn}`;

            const isSuccess = result.data.status?.toUpperCase() === 'SUKSES';
            const isPending = ['PENDING', 'PENDING_GATEWAY'].includes(result.data.status?.toUpperCase());
            const isFinal = !isPending; // Anggap semua yang bukan pending adalah final untuk tombol cek status

            updateTransactionStatus(statusDiv, messageSpan, statusMessage, isSuccess, buttonElement, false, isFinal ? null : refId);

            if (isSuccess) { // Jika sukses, fetch ulang profil untuk update saldo
                await fetchUserProfile(false); // false agar tidak redirect jika gagal fetch (misal jaringan)
            }
        } else {
            throw new Error(result.message || "Gagal mendapatkan status transaksi dari server.");
        }
    } catch (error) {
        console.error("Error checking transaction status:", error);
        updateTransactionStatus(statusDiv, messageSpan, error.message || "Gagal mengecek status transaksi.", false, buttonElement, false, refId); // Tetap tampilkan tombol jika error agar bisa dicoba lagi
    } finally {
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = originalButtonText || "Cek Status";
        }
    }
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Loaded. Initializing Panz Store App...");

    // Event Listeners Utama
    if (navHome) navHome.addEventListener('click', (e) => { e.preventDefault(); showView(mainView, true, 'nav-home'); });
    if (navRiwayat) navRiwayat.addEventListener('click', async (e) => { e.preventDefault(); if(currentUserToken) await showRiwayatView(); else window.location.href = '/login'; });
    if (navBantuan) navBantuan.addEventListener('click', (e) => { e.preventDefault(); showBantuanView(); });
    if (navProfile) navProfile.addEventListener('click', async (e) => { e.preventDefault(); if(currentUserToken) await showUserProfileView(); else window.location.href = '/login';});

    if (showLoginPageButton) {
        showLoginPageButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/login';
        });
    }
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    if (profileLogoutButton) profileLogoutButton.addEventListener('click', handleLogout);

    if (depositButton) depositButton.addEventListener('click', async () => { if(currentUserToken) await showDepositView(true); else window.location.href = '/login';});
    if (profileDepositButton) profileDepositButton.addEventListener('click', async () => {if(currentUserToken) await showDepositView(true); else window.location.href = '/login';});

    if (calculateTransferButton) calculateTransferButton.addEventListener('click', handleCalculateTransfer);
    if (detailInputForm) detailInputForm.addEventListener('submit', handleDetailSubmit);
    if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);

    // Event listener untuk form di SPA (index)
    if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    if (resetPasswordForm) resetPasswordForm.addEventListener('submit', handleResetPassword);
    if (resetPasswordBackToLoginButton) resetPasswordBackToLoginButton.onclick = () => window.location.href = '/login';


    // --- Initial Load Logic ---
    const initialLoad = async () => {
        // Coba fetch profil. Redirect jika perlu untuk halaman non-publik atau jika token tidak valid.
        // argumen 'true' berarti akan redirect ke login jika perlu.
        await fetchUserProfile(true);

        let targetViewId = 'main-view'; // Default ke main-view
        let targetViewData = null;
        const hash = window.location.hash;
        let tokenFromUrlForReset = null;

        if (hash && hash !== '#') {
            let cleanHash = hash.substring(1); // Hapus '#'
            const queryIndex = cleanHash.indexOf('?');
            if (queryIndex !== -1) {
                const hashParams = new URLSearchParams(cleanHash.substring(queryIndex + 1));
                if (hashParams.has('token')) tokenFromUrlForReset = hashParams.get('token');
                cleanHash = cleanHash.substring(0, queryIndex); // Nama view sebelum '?'
            }
            targetViewId = cleanHash;
            if (tokenFromUrlForReset) targetViewData = { token: tokenFromUrlForReset };
        } else if (history.state && history.state.viewId) { // Jika ada history state (dari popstate)
            targetViewId = history.state.viewId;
            targetViewData = history.state.data;
        }

        currentViewInfo = { id: targetViewId, data: targetViewData }; // Set global
        const targetViewElement = document.getElementById(targetViewId);

        // Halaman SPA publik yang bisa diakses tanpa login
        const publicSpaViews = ['forgot-password-view', 'reset-password-view'];
        const currentPath = window.location.pathname.split('/').pop();
        const isAuthPhysicalPage = currentPath === 'login' || currentPath === 'register';

        if (targetViewElement) {
            if (publicSpaViews.includes(targetViewId)) {
                if (targetViewId === 'forgot-password-view') { await showForgotPasswordView(false, targetViewData); return; }
                if (targetViewId === 'reset-password-view') { await showResetPasswordView(targetViewData?.token, false, targetViewData); return; }
            }

            // Jika view yang dituju memerlukan login (bukan publik SPA & bukan halaman auth fisik)
            // dan user tidak login (currentUserToken null), fetchUserProfile seharusnya sudah redirect.
            // Jika karena suatu hal lolos dari redirect fetchUserProfile (misal akses hash langsung tanpa token valid),
            // maka default ke mainView (yang juga akan dicek tokennya).
            if (!currentUserToken && !isAuthPhysicalPage && !publicSpaViews.includes(targetViewId)) {
                console.warn(`Attempt to load protected view '${targetViewId}' without session. Defaulting to mainView (which might redirect to login).`);
                showView(mainView, false, 'nav-home'); // Tampilkan mainView, yang akan dicek lagi
                return;
            }

            // Lanjutkan menampilkan view yang dituju
            if (targetViewId === 'deposit-view') await showDepositView(false, targetViewData);
            else if (targetViewId === 'profile-view') await showUserProfileView(false, targetViewData);
            else if (targetViewId === 'riwayat-view') await showRiwayatView(false, targetViewData);
            else if (targetViewId === 'bantuan-view') await showBantuanView(false, targetViewData);
            else if (targetViewId === 'bebas-nominal-view' && targetViewData) await showBebasNominalServiceSelection(targetViewData.serviceType, targetViewData.name, false);
            else if (targetViewId === 'product-list-view' && targetViewData) await showProductListView(targetViewData.key, targetViewData.name, targetViewData.parentInfo, false);
            else if (targetViewId === 'detail-input-view' && targetViewData) await showDetailInputView(targetViewData.productCode, targetViewData.productName, targetViewData.isBebasNominal, targetViewData.price, targetViewData.originView, targetViewData.categoryKeyForHint, targetViewData.provider, targetViewData.previousViewInfo, false);
            else if (targetViewId === 'main-view' ) { // Jika target adalah main-view atau view tidak ada di atas
                 showView(mainView, false, 'nav-home'); // Selalu default ke mainView jika tidak ada handler spesifik
            } else { // Fallback untuk view lain yang mungkin ada ID-nya tapi tidak ada handler khusus
                 showView(targetViewElement, false, null, targetViewData);
            }

        } else { // View dari hash tidak ditemukan di DOM
            console.warn(`Initial target view ID '${targetViewId}' from hash/state not found in DOM. Defaulting to mainView.`);
            showView(mainView, false, 'nav-home');
            // Hapus hash yang salah dari URL jika view tidak ditemukan
            if (window.location.hash && window.location.hash !== '#main-view' && window.location.hash !== '#') {
                history.replaceState({ viewId: 'main-view' }, document.title, window.location.pathname + window.location.search);
            }
        }
    };

    await initialLoad(); // Jalankan initial load
    console.log("Panz Store App Initialized.");
});

// --- categoryFilterMapFrontend (Sama seperti respons sebelumnya) ---
// Ini hanya untuk referensi nama, logika filter utama ada di backend
const categoryFilterMapFrontend = {
    'pulsa_reg_tsel': { name: 'Pulsa Reguler Telkomsel' }, 'pulsa_reg_isat': { name: 'Pulsa Reguler Indosat' }, 'pulsa_reg_xl': { name: 'Pulsa Reguler XL' }, 'pulsa_reg_axis': { name: 'Pulsa Reguler Axis' }, 'pulsa_reg_tri': { name: 'Pulsa Reguler Tri' }, 'pulsa_reg_smart': { name: 'Pulsa Reguler Smartfren' },
    'pulsa_tf_tsel': { name: 'Pulsa Transfer Telkomsel' }, 'pulsa_tf_isat': { name: 'Pulsa Transfer Indosat' }, 'pulsa_tf_xl': { name: 'Pulsa Transfer XL' }, 'pulsa_tf_axis': { name: 'Pulsa Transfer Axis' }, 'pulsa_tf_tri': { name: 'Pulsa Transfer Tri' },
    'kuotatsel': { name: 'Kuota Telkomsel' }, 'kuotabyu': { name: 'Kuota By.U' }, 'kuotaisat': { name: 'Kuota Indosat' }, 'kuotatri': { name: 'Kuota Tri' }, 'kuotaxl': { name: 'Kuota XL' }, 'kuotaaxis': { name: 'Kuota Axis' }, 'kuotasmart': { name: 'Kuota Smartfren' },
    'pln': { name: 'Token PLN' }, 'token': { name: 'Token PLN' }, // 'token' adalah key dari index
    'gopay': { name: 'Saldo GoPay' }, 'dana': { name: 'Saldo DANA' }, 'ovo': { name: 'Saldo OVO' }, 'shopeepay': { name: 'Saldo ShopeePay' }, 'linkaja': { name: 'Saldo LinkAja' }, 'grab': { name: 'Saldo Grab' },
    'ewallet': { name: 'E-Wallet Umum'}, 'uang_elektronik': { name: 'Uang Elektronik'}, // 'ewallet' adalah key dari index
    'game_ml': { name: 'Mobile Legends' }, 'game_ff': { name: 'Free Fire' }, 'game_pubg': { name: 'PUBG Mobile' }, 'game_valorant': { name: 'Valorant' }, 'game_genshin': { name: 'Genshin Impact' }, 'game_lainnya': { name: 'Game Lainnya' }, 'game': { name: 'Top Up Game'}, // 'game' adalah key dari index
    'voucher_umum': { name: 'Voucher Umum' }, 'tagihan_listrik': { name: 'Tagihan Listrik' },
    'transfer_bank': { name: 'Transfer Bank' }, 'transfer_uang': { name: 'Transfer Uang'},
    'transfer_bca': {name: 'Transfer BCA'}, 'transfer_mandiri': {name: 'Transfer Mandiri'}, 'transfer_bri': {name: 'Transfer BRI'},
    'bebas-nominal': { name: 'Bebas Nominal (Umum)'},
    'other': { name: 'Lainnya'}, // 'other' adalah key dari index
    'default': { name: 'Layanan'}
};


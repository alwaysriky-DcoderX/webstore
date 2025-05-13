// public/admin.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements for Authentication Gates
    const adminKeyGate = document.getElementById('admin-key-gate');
    const adminAccessKeyInput = document.getElementById('admin-access-key-input');
    const submitAdminKeyButton = document.getElementById('submit-admin-key-button');
    const adminKeyErrorMessage = document.getElementById('admin-key-error-message');

    const adminLoginGate = document.getElementById('admin-login-gate');
    const adminUsernameInput = document.getElementById('admin-username-input');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const submitAdminLoginButton = document.getElementById('submit-admin-login-button');
    const adminLoginErrorMessage = document.getElementById('admin-login-error-message');

    // DOM Elements for Admin Dashboard
    const adminContainer = document.querySelector('.admin-container');
    const dashboardMessageArea = document.getElementById('admin-dashboard-message-area');
    const adminUsernameDisplay = document.getElementById('admin-username-display');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const navLinks = document.querySelectorAll('.admin-nav-link');
    const sections = document.querySelectorAll('.admin-section');

    // DOM Elements for Edit User Modal
    const editUserModal = document.getElementById('editUserModal');
    const closeEditUserModalButton = document.getElementById('closeEditUserModalButton');
    const cancelEditUserButton = document.getElementById('cancelEditUserButton');
    const editUserForm = document.getElementById('editUserForm');
    const editUserIdInput = document.getElementById('editUserId');
    const editUsernameInput = document.getElementById('editUsername');
    const editEmailInput = document.getElementById('editEmail');
    const editBalanceInput = document.getElementById('editBalance');
    const editIsAdminSelect = document.getElementById('editIsAdmin');
    const editPasswordInput = document.getElementById('editPassword');
    const editUserModalErrorMessage = document.getElementById('editUserModalErrorMessage');

    let currentAdminToken = null; // To store the JWT for the admin session

    // --- UTILITY FUNCTIONS ---
    function showMainDashboardMessage(message, isError = false) {
        if (dashboardMessageArea) {
            dashboardMessageArea.innerHTML = `<p class="${isError ? 'error-msg-dashboard' : 'loading-msg'}">${message}</p>`;
            // Pesan global bisa berarti dashboard utama disembunyikan sementara
            if (adminContainer) adminContainer.style.display = 'none';
        }
    }

    function clearMainDashboardMessage() {
        if (dashboardMessageArea) dashboardMessageArea.innerHTML = '';
        // Jangan otomatis tampilkan adminContainer di sini, biarkan fungsi lain yang kontrol
    }

    function showAdminKeyGate() {
        if (adminKeyGate) adminKeyGate.style.display = 'flex';
        if (adminLoginGate) adminLoginGate.style.display = 'none';
        if (adminContainer) adminContainer.style.display = 'none';
        if (adminAccessKeyInput) adminAccessKeyInput.value = '';
        if (adminKeyErrorMessage) adminKeyErrorMessage.textContent = '';
        if (adminAccessKeyInput) adminAccessKeyInput.focus();
        clearMainDashboardMessage();
    }

    function showAdminLoginGate() {
        if (adminKeyGate) adminKeyGate.style.display = 'none';
        if (adminLoginGate) adminLoginGate.style.display = 'flex';
        if (adminContainer) adminContainer.style.display = 'none';
        if (adminUsernameInput) adminUsernameInput.value = '';
        if (adminPasswordInput) adminPasswordInput.value = '';
        if (adminLoginErrorMessage) adminLoginErrorMessage.textContent = '';
        if (adminUsernameInput) adminUsernameInput.focus();
        clearMainDashboardMessage();
    }

    function showAdminScreen() { // Pengganti showAdminDashboard() untuk lebih jelas
        if (adminKeyGate) adminKeyGate.style.display = 'none';
        if (adminLoginGate) adminLoginGate.style.display = 'none';
        clearMainDashboardMessage(); // Hapus pesan global
        if (adminContainer) adminContainer.style.display = 'block'; // Tampilkan dashboard
    }


    // --- AUTHENTICATION LOGIC ---
    async function handleAdminKeySubmit() {
        const key = adminAccessKeyInput.value.trim();
        if (!key) {
            adminKeyErrorMessage.textContent = 'Admin Key tidak boleh kosong.';
            return;
        }
        adminKeyErrorMessage.textContent = '';
        submitAdminKeyButton.disabled = true;
        submitAdminKeyButton.textContent = 'Memverifikasi...';

        try {
            const response = await fetch('/api/admin/validate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminKey: key })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Admin Key tidak valid.');
            }
            sessionStorage.setItem('panz_admin_key_validated', 'true');
            showAdminLoginGate();
        } catch (error) {
            adminKeyErrorMessage.textContent = error.message;
        } finally {
            submitAdminKeyButton.disabled = false;
            submitAdminKeyButton.textContent = 'Submit Key';
        }
    }

    async function handleAdminLoginSubmit() {
        const username = adminUsernameInput.value.trim();
        const password = adminPasswordInput.value.trim();

        if (!username || !password) {
            adminLoginErrorMessage.textContent = 'Username dan Password Admin diperlukan.';
            return;
        }
        adminLoginErrorMessage.textContent = '';
        submitAdminLoginButton.disabled = true;
        submitAdminLoginButton.textContent = 'Login...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Login Admin gagal. Periksa Username/Password.');
            }
            if (!result.user || !result.user.isAdmin) {
                throw new Error('Login berhasil, tetapi akun ini bukan Admin.');
            }

            localStorage.setItem('panz_store_admin_jwt', result.token);
            currentAdminToken = result.token;
            await initializeAdminDashboard(result.user);
        } catch (error) {
            adminLoginErrorMessage.textContent = error.message;
        } finally {
            submitAdminLoginButton.disabled = false;
            submitAdminLoginButton.textContent = 'Login Admin';
        }
    }

    async function verifyTokenAndInitialize() {
        currentAdminToken = localStorage.getItem('panz_store_admin_jwt');
        if (!currentAdminToken) {
            showAdminLoginGate(); // Jika key sudah tervalidasi sesi ini, langsung ke login admin
            return;
        }

        showMainDashboardMessage("Memverifikasi sesi admin...", false);
        try {
            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${currentAdminToken}` }
            });
            const result = await response.json();

            if (!response.ok || !result.success || !result.user || !result.user.isAdmin) {
                throw new Error('Sesi admin tidak valid atau hak akses dicabut.');
            }
            await initializeAdminDashboard(result.user);
        } catch (error) {
            localStorage.removeItem('panz_store_admin_jwt');
            currentAdminToken = null;
            // Jangan hapus validasi key sesi agar user tidak perlu input key lagi, hanya login
            showMainDashboardMessage(error.message + " Silakan login kembali.", true);
            setTimeout(() => {
                clearMainDashboardMessage();
                showAdminLoginGate();
            }, 2500);
        }
    }

    // --- DASHBOARD INITIALIZATION AND MAIN LOGIC ---
    async function initializeAdminDashboard(adminUserData) {
        showAdminScreen(); // Ini akan menampilkan adminContainer dan membersihkan pesan
        if(adminUsernameDisplay) adminUsernameDisplay.textContent = `Admin: ${adminUserData.username}`;

        if(adminLogoutButton) {
            adminLogoutButton.addEventListener('click', () => {
                localStorage.removeItem('panz_store_admin_jwt');
                sessionStorage.removeItem('panz_admin_key_validated');
                currentAdminToken = null;
                showAdminKeyGate();
            });
        }

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                showSection(sectionId);
                if (history.pushState) {
                    history.pushState(null, null, `#${sectionId.replace('-section', '')}`);
                }
            });
        });

        const currentHash = window.location.hash.substring(1);
        let initialSectionId = 'stats-section';
        if (currentHash) {
            const sectionFromHash = document.getElementById(`${currentHash}-section`);
            if (sectionFromHash) initialSectionId = `${currentHash}-section`;
        }
        showSection(initialSectionId);
    }

    // --- SECTION HANDLING AND DATA LOADING ---
    function showSection(sectionId) {
        sections.forEach(section => section.classList.remove('active'));
        const activeSection = document.getElementById(sectionId);
        if (activeSection) activeSection.classList.add('active');

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
        loadSectionData(sectionId);
    }

    async function loadSectionData(sectionId) {
        if (!currentAdminToken) {
            console.error("Tidak ada token admin untuk memuat data.");
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                const tableBody = targetSection.querySelector('tbody');
                const colspan = tableBody ? (tableBody.parentNode.querySelector('thead tr th')?.length || 1) : 1;
                if(tableBody) tableBody.innerHTML = `<tr><td colspan="${colspan}" class="error-msg" style="text-align:center;">Sesi tidak valid. Silakan logout dan login kembali.</td></tr>`;
            }
            return;
        }

        const headers = { 'Authorization': `Bearer ${currentAdminToken}` };
        const targetSection = document.getElementById(sectionId);
        if (!targetSection) return;

        const tableBody = targetSection.querySelector('tbody');
        const statsGrid = targetSection.querySelector('.stats-grid');
        const colspanVal = tableBody ? (tableBody.parentNode.querySelector('thead tr th')?.length || 1) : 1;


        if (tableBody) tableBody.innerHTML = `<tr><td colspan="${colspanVal}"><div class="loading-container"><div class="spinner"></div>Memuat...</div></td></tr>`;
        
        try {
            let apiUrl = '';
            if (sectionId === 'users-section') apiUrl = '/api/admin/users';
            else if (sectionId === 'transactions-section') apiUrl = '/api/admin/transactions';
            else if (sectionId === 'deposits-section') apiUrl = '/api/admin/deposits';
            else if (sectionId === 'stats-section') apiUrl = '/api/admin/stats';
            else return;

            const response = await fetch(apiUrl, { headers });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || `Gagal memuat data (${response.status})`);
            }

            if (sectionId === 'users-section') renderUsersTable(result.data);
            else if (sectionId === 'transactions-section') renderTransactionsTable(result.data);
            else if (sectionId === 'deposits-section') renderDepositsTable(result.data);
            else if (sectionId === 'stats-section') renderStats(result.data);

        } catch (error) {
            console.error(`Error loading data for ${sectionId}:`, error);
            const errorMessage = `Gagal memuat data: ${error.message}`;
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="${colspanVal}" class="error-msg" style="text-align:center;">${errorMessage}</td></tr>`;
            else if (statsGrid) {
                const errorDisplay = targetSection.querySelector('.stats-error-display') || document.createElement('p');
                errorDisplay.className = 'error-msg-dashboard stats-error-display';
                errorDisplay.textContent = errorMessage;
                errorDisplay.style.textAlign = 'center';
                if (!targetSection.querySelector('.stats-error-display')) {
                     statsGrid.insertAdjacentElement('afterend', errorDisplay);
                }
            }
        }
    }

    // --- DATA RENDERING FUNCTIONS ---
    function renderStats(stats) {
        document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
        document.getElementById('stat-total-tx-success').textContent = stats.totalSuccessfulTransactions || 0;
        document.getElementById('stat-total-deposit-success').textContent = stats.totalSuccessfulDeposits || 0;
        document.getElementById('stat-total-revenue').textContent = `Rp ${(stats.totalTransactionRevenue || 0).toLocaleString('id-ID')}`;
        const statsSection = document.getElementById('stats-section');
        if (statsSection) {
            const errorDisplay = statsSection.querySelector('.stats-error-display');
            if (errorDisplay) errorDisplay.remove();
        }
    }

    function renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data pengguna.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = tbody.insertRow();
            // Pastikan user.id atau user._id digunakan konsisten
            const userId = user.id || user._id; 
            row.innerHTML = `
                <td>${userId || 'N/A'}</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>Rp ${(user.balance || 0).toLocaleString('id-ID')}</td>
                <td>${user.isAdmin ? '<span style="color:var(--success);">Ya</span>' : 'Tidak'}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric'}) : '-'}</td>
                <td class="action-buttons">
                    <button class="button-base button-small warning edit-user-btn" data-userid="${userId}">Edit</button>
                    <button class="button-base button-small danger delete-user-btn" data-userid="${userId}" data-username="${user.username || 'Pengguna Ini'}">Hapus</button>
                </td>
            `;
        });
        addEventListenersToUserActionButtons();
    }

    function renderTransactionsTable(transactions) {
        const tbody = document.getElementById('transactions-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!transactions || transactions.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Tidak ada data transaksi.</td></tr>'; 
            return; 
        }
        transactions.forEach(tx => {
            const row = tbody.insertRow();
            const statusClass = `status-${(tx.status || 'unknown').toLowerCase().replace(/[\s_]+/g, '-')}`;
            row.innerHTML = `
                <td>${tx.timestamp ? new Date(tx.timestamp).toLocaleString('id-ID', {dateStyle:'short', timeStyle:'short'}) : '-'}</td>
                <td>${tx.userId?.username || tx.userId?._id || tx.userId || 'N/A'}</td>
                <td>${tx.product_name || tx.product_id_frontend || 'N/A'}</td>
                <td>${tx.destination || '-'}</td>
                <td>Rp ${(tx.amount || 0).toLocaleString('id-ID')}</td>
                <td class="${statusClass}">${tx.status || 'N/A'}</td>
                <td>${tx.sn || '-'}</td>
                <td>${tx.ref_id_internal || '-'}</td>
            `;
        });
    }

    function renderDepositsTable(deposits) {
        const tbody = document.getElementById('deposits-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!deposits || deposits.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data deposit.</td></tr>'; 
            return; 
        }
        deposits.forEach(depo => {
            const row = tbody.insertRow();
            const statusClass = `status-${(depo.status || 'unknown').toLowerCase().replace(/[\s_]+/g, '-')}`;
            row.innerHTML = `
                <td>${depo.createdAt ? new Date(depo.createdAt).toLocaleString('id-ID', {dateStyle:'short', timeStyle:'short'}) : '-'}</td>
                <td>${depo.userId?.username || depo.userId?._id || depo.userId || 'N/A'}</td>
                <td>Rp ${(depo.desiredAmount || 0).toLocaleString('id-ID')}</td>
                <td>Rp ${(depo.uniqueTransferAmount || 0).toLocaleString('id-ID')}</td>
                <td class="${statusClass}">${depo.status || 'N/A'}</td>
                <td>${depo.processedAt ? new Date(depo.processedAt).toLocaleString('id-ID', {dateStyle:'short', timeStyle:'short'}) : '-'}</td>
                <td>${depo.orderId || '-'}</td>
            `;
        });
    }


    // --- USER ACTION FUNCTIONS ---
    function addEventListenersToUserActionButtons() {
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', handleEditUserClick);
        });
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', handleDeleteUserClick);
        });
    }

    async function handleEditUserClick(event) {
        const userId = event.target.dataset.userid;
        if (!userId) return;
        
        editUserModalErrorMessage.textContent = '';
        showMainDashboardMessage("Memuat data pengguna untuk diedit...", false);

        try {
            // Mengambil semua pengguna lagi dan mencari user yang akan diedit
            // Ini kurang efisien, idealnya ada endpoint GET /api/admin/users/:userId
            const response = await fetch(`/api/admin/users`, {
                 headers: { 'Authorization': `Bearer ${currentAdminToken}` }
            });
            const result = await response.json();
            if (!result.success || !result.data) {
                throw new Error("Gagal memuat daftar pengguna untuk edit.");
            }
            const userToEdit = result.data.find(u => (u.id || u._id) === userId);

            if (!userToEdit) {
                throw new Error("Tidak dapat menemukan data pengguna untuk diedit.");
            }
            
            clearMainDashboardMessage(); // Hapus pesan loading
            showAdminScreen(); // Pastikan dashboard utama terlihat sebelum modal muncul

            editUserIdInput.value = userToEdit.id || userToEdit._id;
            editUsernameInput.value = userToEdit.username;
            editEmailInput.value = userToEdit.email;
            editBalanceInput.value = userToEdit.balance;
            editIsAdminSelect.value = userToEdit.isAdmin.toString();
            editPasswordInput.value = '';
            if (editUserModal) editUserModal.style.display = 'flex';

        } catch (error) {
            clearMainDashboardMessage();
            showAdminScreen(); // Pastikan dashboard utama terlihat jika terjadi error
            alert("Error memuat data pengguna: " + error.message);
        }
    }

    async function handleDeleteUserClick(event) {
        const userId = event.target.dataset.userid;
        const username = event.target.dataset.username;
        if (!userId) return;

        if (confirm(`Anda yakin ingin menghapus pengguna "${username}" (ID: ${userId})? Tindakan ini tidak dapat diurungkan.`)) {
            const deleteButton = event.target;
            deleteButton.disabled = true;
            deleteButton.textContent = 'Menghapus...';

            try {
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${currentAdminToken}` }
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Gagal menghapus pengguna.");
                }
                
                clearMainDashboardMessage(); // Hapus pesan global apa pun
                showAdminScreen(); // Pastikan kontainer admin utama terlihat
                alert(result.message);
                loadSectionData('users-section');
            } catch (error) {
                clearMainDashboardMessage();
                showAdminScreen();
                alert("Error menghapus pengguna: " + error.message);
            } finally {
                deleteButton.disabled = false;
                deleteButton.textContent = 'Hapus';
            }
        }
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            editUserModalErrorMessage.textContent = '';
            const userId = editUserIdInput.value;
            const updatedData = {
                username: editUsernameInput.value.trim(),
                email: editEmailInput.value.trim(),
                balance: parseFloat(editBalanceInput.value),
                isAdmin: editIsAdminSelect.value === 'true'
            };
            if (editPasswordInput.value) {
                updatedData.password = editPasswordInput.value;
            }

            if (!updatedData.username || !updatedData.email) {
                editUserModalErrorMessage.textContent = "Username dan Email tidak boleh kosong."; return;
            }
            if (isNaN(updatedData.balance) || updatedData.balance < 0) {
                editUserModalErrorMessage.textContent = "Saldo tidak valid."; return;
            }

            const saveButton = document.getElementById('saveEditUserButton');
            saveButton.disabled = true;
            saveButton.textContent = 'Menyimpan...';

            try {
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentAdminToken}`
                    },
                    body: JSON.stringify(updatedData)
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Gagal menyimpan perubahan.");
                }
                if (editUserModal) editUserModal.style.display = 'none';
                
                clearMainDashboardMessage();
                showAdminScreen(); // Pastikan kontainer admin utama terlihat
                alert(result.message);
                loadSectionData('users-section');
            } catch (error) {
                editUserModalErrorMessage.textContent = error.message;
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Simpan Perubahan';
            }
        });
    }

    if (closeEditUserModalButton) {
        closeEditUserModalButton.addEventListener('click', () => { if (editUserModal) editUserModal.style.display = 'none'; });
    }
    if (cancelEditUserButton) {
        cancelEditUserButton.addEventListener('click', () => { if (editUserModal) editUserModal.style.display = 'none'; });
    }
    window.addEventListener('click', (event) => {
        if (event.target === editUserModal) { if (editUserModal) editUserModal.style.display = 'none'; }
    });


    // --- EVENT LISTENERS FOR AUTH GATES ---
    if (submitAdminKeyButton) submitAdminKeyButton.addEventListener('click', handleAdminKeySubmit);
    if (adminAccessKeyInput) adminAccessKeyInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleAdminKeySubmit(); });
    if (submitAdminLoginButton) submitAdminLoginButton.addEventListener('click', handleAdminLoginSubmit);
    if (adminUsernameInput) adminUsernameInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleAdminLoginSubmit(); });
    if (adminPasswordInput) adminPasswordInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleAdminLoginSubmit(); });

    // --- INITIAL STATE DETERMINATION ---
    function determineInitialScreen() {
        const keyValidated = sessionStorage.getItem('panz_admin_key_validated') === 'true';
        currentAdminToken = localStorage.getItem('panz_store_admin_jwt');

        if (keyValidated) {
            if (currentAdminToken) {
                verifyTokenAndInitialize();
            } else {
                showAdminLoginGate();
            }
        } else {
            showAdminKeyGate();
        }
    }

    determineInitialScreen(); // Start the auth flow
});

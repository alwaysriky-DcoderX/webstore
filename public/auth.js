document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginStatusDiv = document.getElementById('login-status');
    const registerStatusDiv = document.getElementById('register-status');
    const forgotPasswordLinkInLogin = document.querySelector('#login-section .auth-switch a[href="#forgot-password"]'); // Selector untuk link lupa password di login

    // Fungsi untuk merender Turnstile jika elemennya ada
    function renderTurnstileWidget(selector) {
        const widgetElement = document.querySelector(selector);
        if (widgetElement && typeof turnstile !== 'undefined') {
            turnstile.render(selector, {
                sitekey: '0x4AAAAAABbk0VFxGUPcn8AQ', // Ganti dengan sitekey Anda yang sebenarnya
                // callback: function(token) { // Callback bisa ditangani di sini atau di submit form
                //     console.log("Turnstile token: " + token);
                // }
            });
        }
    }

    // Render Turnstile untuk login dan register jika ada
    renderTurnstileWidget('#login-section #turnstile-widget');
    renderTurnstileWidget('#register-section #turnstile-widget');


    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            const username = usernameInput.value;
            const password = passwordInput.value;

            // Ambil token Turnstile
            let turnstileResponse = '';
            const turnstileWidget = loginForm.querySelector('.cf-turnstile textarea[name="cf-turnstile-response"]');
            if (turnstileWidget) {
                turnstileResponse = turnstileWidget.value;
            } else {
                // Fallback jika Turnstile tidak dirender atau gagal diambil (seharusnya tidak terjadi jika render eksplisit)
                console.warn('Turnstile response not found for login.');
                 // Anda bisa menghentikan proses atau melanjutkan tanpa Turnstile jika diizinkan untuk dev
            }

            const submitButton = loginForm.querySelector('button[type="submit"]');

            if (loginStatusDiv) loginStatusDiv.style.display = 'none';
            if (submitButton) { submitButton.disabled = true; submitButton.innerHTML = '<div class="spinner-button"></div> Memproses...';}


            try {
                const response = await fetch('/api/auth/login', { // Pastikan endpoint ini benar
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, 'cf-turnstile-response': turnstileResponse })
                });
                const result = await response.json();

                if (loginStatusDiv) {
                    loginStatusDiv.textContent = result.message;
                    loginStatusDiv.className = `transaction-status-container ${result.success ? 'success' : 'error'}`;
                    loginStatusDiv.style.display = 'block';
                }

                if (result.success && result.token) {
                    localStorage.setItem('panz_store_token', result.token);
                    localStorage.setItem('panz_store_user', JSON.stringify(result.user));
                    setTimeout(() => {
                        window.location.href = '/'; // Redirect ke halaman utama (index)
                    }, 1000);
                } else {
                    if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Login';}
                    // Reset Turnstile jika login gagal dan widget ada
                    if (typeof turnstile !== 'undefined' && loginForm.querySelector('.cf-turnstile')) {
                        turnstile.reset(loginForm.querySelector('.cf-turnstile'));
                    }
                }
            } catch (error) {
                console.error("Login error:", error);
                if (loginStatusDiv) {
                    loginStatusDiv.textContent = "Terjadi kesalahan jaringan. Coba lagi.";
                    loginStatusDiv.className = 'transaction-status-container error';
                    loginStatusDiv.style.display = 'block';
                }
                if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Login';}
                // Reset Turnstile jika error dan widget ada
                if (typeof turnstile !== 'undefined' && loginForm.querySelector('.cf-turnstile')) {
                    turnstile.reset(loginForm.querySelector('.cf-turnstile'));
                }
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('register-username');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const username = usernameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;

            let turnstileResponse = '';
            const turnstileWidget = registerForm.querySelector('.cf-turnstile textarea[name="cf-turnstile-response"]');
            if (turnstileWidget) {
                turnstileResponse = turnstileWidget.value;
            } else {
                console.warn('Turnstile response not found for registration.');
            }

            const submitButton = registerForm.querySelector('button[type="submit"]');

            if (registerStatusDiv) registerStatusDiv.style.display = 'none';
            if (submitButton) { submitButton.disabled = true; submitButton.innerHTML = '<div class="spinner-button"></div> Memproses...';}

            try {
                const response = await fetch('/api/auth/register', { // Pastikan endpoint ini benar
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, password, 'cf-turnstile-response': turnstileResponse })
                    });
                const result = await response.json();

                if (registerStatusDiv) {
                    registerStatusDiv.textContent = result.message;
                    registerStatusDiv.className = `transaction-status-container ${result.success ? 'success' : 'error'}`;
                    registerStatusDiv.style.display = 'block';
                }

                if (result.success) {
                    registerForm.reset();
                    // Reset Turnstile
                    if (typeof turnstile !== 'undefined' && registerForm.querySelector('.cf-turnstile')) {
                        turnstile.reset(registerForm.querySelector('.cf-turnstile'));
                    }
                    setTimeout(() => {
                        window.location.href = '/login'; // Redirect ke halaman login setelah sukses registrasi
                    }, 2000);
                } else {
                    if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Daftar';}
                    // Reset Turnstile jika registrasi gagal dan widget ada
                    if (typeof turnstile !== 'undefined' && registerForm.querySelector('.cf-turnstile')) {
                        turnstile.reset(registerForm.querySelector('.cf-turnstile'));
                    }
                }
            } catch (error) {
                console.error("Register error:", error);
                if (registerStatusDiv) {
                    registerStatusDiv.textContent = "Terjadi kesalahan jaringan. Coba lagi.";
                    registerStatusDiv.className = 'transaction-status-container error';
                    registerStatusDiv.style.display = 'block';
                }
                if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = 'Daftar';}
                // Reset Turnstile jika error dan widget ada
                if (typeof turnstile !== 'undefined' && registerForm.querySelector('.cf-turnstile')) {
                    turnstile.reset(registerForm.querySelector('.cf-turnstile'));
                }
            }
        });
    }

    // Link "Lupa Password?" di login mengarah ke index#forgot-password-view
    if (forgotPasswordLinkInLogin) {
        forgotPasswordLinkInLogin.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/#forgot-password-view'; // Arahkan ke SPA dengan hash
        });
    }
});

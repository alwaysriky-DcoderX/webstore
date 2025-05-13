// settings.js

// Gunakan process.env untuk mengambil nilai dari environment variables di produksi.
// Nilai default di sini diambil dari file settings.txt yang Anda unggah.
// SANGAT DISARANKAN untuk mengganti nilai default yang sensitif dengan variabel environment di hosting Anda.

const settings = {
    // Konfigurasi untuk OkeConnect H2H
    OKE_CONNECT_H2H_CONFIG: {
        MEMBER_ID: process.env.OKE_MEMBER_ID || ' ',
        PIN: process.env.OKE_PIN || ' ',
        PASSWORD: process.env.OKE_PASSWORD || ' ',
        API_KEY_FOR_MUTATION_SIGNATURE: process.env.OKE_API_KEY_FOR_MUTATION_SIGNATURE || ' ',
        API_TRANSACTION_URL: process.env.OKE_API_TRANSACTION_URL || 'https://h2h.okeconnect.com/trx',
        API_BALANCE_URL: process.env.OKE_API_BALANCE_URL || 'https://h2h.okeconnect.com/trx/balance',
        API_MUTATION_QRIS_URL: process.env.OKE_API_MUTATION_QRIS_URL || 'https://gateway.okeconnect.com/api/mutasi/qris',
        MASTER_API_URL: process.env.OKE_MASTER_API_URL || 'https://okeconnect.com/harga/json?id=905ccd028329b0a'
    },

    // Konfigurasi Server Aplikasi Anda
    PORT: process.env.PORT || 4000,
    APP_NAME: process.env.APP_NAME || 'Alwaysriky Shop',
    APP_BASE_URL: process.env.APP_BASE_URL || 'https://panzngen.my.id', // Pastikan ini adalah URL publik yang benar

    // Konfigurasi Provider Internal
    PROVIDER_NAME: process.env.PROVIDER_NAME || 'OKE',
    PROVIDER_PREFIX_SEPARATOR: '_',

    // Konfigurasi Keuntungan dan Keamanan
    PROFIT_MARGIN_PERCENTAGE: parseFloat(process.env.PROFIT_MARGIN_PERCENTAGE) || 0.025, // 0.025 = 2.5%
    JWT_SECRET: process.env.JWT_SECRET || 'e8b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9e0b3a7f2d1c9', // WAJIB GANTI DI PRODUKSI
    ADMIN_ACCESS_KEY: process.env.ADMIN_ACCESS_KEY || '8728', // WAJIB GANTI DI PRODUKSI
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,

    // Konfigurasi Database MongoDB
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://PanzNgen:PanzNgen051@cluster0.kqugv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',

    // Konfigurasi Polling Deposit
    DEPOSIT_POLLING_INTERVAL_MS: parseInt(process.env.DEPOSIT_POLLING_INTERVAL_MS) || 60 * 1000, // 60 detik

    // Konfigurasi Cache Produk (dalam milidetik)
    PRODUCT_CACHE_DURATION_MS: parseInt(process.env.PRODUCT_CACHE_DURATION_MS) || (5 * 60 * 1000), // 5 menit

    // --- KONFIGURASI EMAIL (PENTING UNTUK LUPA PASSWORD) ---
    // Ganti dengan detail layanan email Anda.
    EMAIL_CONFIG: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Hanya relevan jika service tidak 'gmail' atau layanan terkenal lainnya
        port: parseInt(process.env.EMAIL_PORT) || 465,   // 465 untuk SSL (biasanya dengan service: 'gmail'), 587 untuk TLS
        secure: (process.env.EMAIL_SECURE === 'true') ? false : true, // true untuk port 465 (SSL), false jika port 587 (TLS/STARTTLS)
        auth: {
            user: process.env.EMAIL_USER || 'panzngen@gmail.com',       // Alamat email pengirim Anda
            pass: process.env.EMAIL_PASS || ' ' // WAJIB GANTI dengan Password Aplikasi Gmail Anda jika menggunakan Gmail
        },
        from: process.env.EMAIL_FROM || '"Panz Store" <panzngen@gmail.com>', // Nama dan alamat email pengirim
        tls_rejectUnauthorized: (process.env.EMAIL_TLS_REJECT_UNAUTHORIZED === 'true') ? false : true // Biasanya true
    }
    // Tidak ada koma setelah properti terakhir di dalam objek settings utama
};

module.exports = settings;

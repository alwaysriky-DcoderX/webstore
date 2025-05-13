// server.js
const express = require('express');
const path = require('path');
const axios = require('axios');
const https = require('https');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const settings = require('./settings');

const OKE_CONNECT_H2H_CONFIG = settings.OKE_CONNECT_H2H_CONFIG || {};
const PORT = settings.PORT || process.env.PORT || 3000;
const PROVIDER_NAME = settings.PROVIDER_NAME || 'PANZ_STORE_PROVIDER'; // Ganti jika perlu
const PROVIDER_PREFIX_SEPARATOR = settings.PROVIDER_PREFIX_SEPARATOR || '_';
const JWT_SECRET = settings.JWT_SECRET;
const PROFIT_MARGIN_PERCENTAGE = settings.PROFIT_MARGIN_PERCENTAGE || 0; // Misalnya 5 untuk 5%
const BCRYPT_SALT_ROUNDS = settings.BCRYPT_SALT_ROUNDS || 10;
const MONGODB_URI = settings.MONGODB_URI;
const ADMIN_ACCESS_KEY = settings.ADMIN_ACCESS_KEY;
const EMAIL_CONFIG = settings.EMAIL_CONFIG || {};
const APP_BASE_URL = settings.APP_BASE_URL || `http://localhost:${PORT}`;
const PRODUCT_CACHE_DURATION_MS = settings.PRODUCT_CACHE_DURATION_MS || (5 * 60 * 1000); // 5 menit
const DEPOSIT_POLLING_INTERVAL_MS = settings.DEPOSIT_POLLING_INTERVAL_MS; // Harus diset di settings.js jika mau polling

if (!MONGODB_URI) {
    console.error("FATAL ERROR: MONGODB_URI tidak ditemukan di settings.js.");
    process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET === 'GANTI_INI_DENGAN_KUNCI_RAHASIA_JWT_YANG_PANJANG_DAN_AMAN') {
    console.warn("PERINGATAN: JWT_SECRET tidak aman atau belum diatur dengan benar di settings.js!");
}
if (!ADMIN_ACCESS_KEY || ADMIN_ACCESS_KEY === 'GANTI_DENGAN_ADMIN_KEY_RAHASIA_ANDA') {
    console.warn("PERINGATAN: ADMIN_ACCESS_KEY tidak aman atau belum diatur di settings.js!");
}
if (!EMAIL_CONFIG.service || !EMAIL_CONFIG.auth || !EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass || !EMAIL_CONFIG.from) {
    console.warn("PERINGATAN: EMAIL_CONFIG (service, auth.user, auth.pass, from) belum lengkap di settings.js. Fitur lupa password tidak akan bisa mengirim email.");
}
if (!APP_BASE_URL.startsWith('http')) {
    console.warn("PERINGATAN: APP_BASE_URL di settings.js sepertinya tidak valid. Harus dimulai dengan http atau https.");
}


mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected successfully.'))
  .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
  });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, lowercase: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    balance: { type: Number, default: 0.00, required: true, min: 0 },
    isAdmin: { type: Boolean, default: false },
    passwordResetToken: String,
    passwordResetExpires: Date,
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ref_id_internal: { type: String, required: true, unique: true, index: true },
    provider: String,
    product_id_frontend: String,
    product_code_provider: String,
    product_name: String,
    destination: String,
    timestamp: { type: Date, default: Date.now, index: true },
    status: { type: String, index: true, enum: ['PENDING_GATEWAY', 'SUKSES', 'GAGAL', 'PENDING', 'UNKNOWN_GATEWAY', 'FAILED_SYSTEM', 'REFUNDED'] },
    amount: Number,
    sn: String,
    message: String,
    provider_response_raw: String,
    last_updated: { type: Date, default: Date.now },
});
transactionSchema.pre('save', function(next) { this.last_updated = new Date(); next(); });
transactionSchema.pre('findOneAndUpdate', function(next) { this.set({ last_updated: new Date() }); next(); });

const depositSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    desiredAmount: { type: Number, required: true },
    calculatedFee: Number,
    uniqueTransferAmount: { type: Number, required: true, index: true },
    status: { type: String, required: true, index: true, enum: ['WAITING_TRANSFER', 'PROCESSING', 'SUCCESS', 'FAILED', 'MATCH_FAILED_USER_NOT_FOUND', 'PROCESSING_ERROR', 'EXPIRED'] },
    processedAt: Date,
    mutationDetails: Object,
    okeTransactionId: String,
}, { timestamps: true });
depositSchema.index({ status: 1, uniqueTransferAmount: 1 });
depositSchema.index({ status: 1, createdAt: 1 }); // Untuk query deposit yang menunggu dan sudah lama

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Deposit = mongoose.model('Deposit', depositSchema);

const categoryFilterMap = {
    'pulsa_reg_tsel': { name: 'Pulsa Reguler Telkomsel', frontendCategory: 'pulsa', filterFn: (item) => item.kategori?.toUpperCase() === 'PULSA' && !item.keterangan?.toLowerCase().includes('transfer') && !item.keterangan?.toLowerCase().includes('data') && !item.keterangan?.toLowerCase().includes('paket') && (item.keterangan?.toLowerCase().includes('telkomsel') || item.keterangan?.toLowerCase().includes('tsel') || item.keterangan?.toLowerCase().includes('as ') || item.keterangan?.toLowerCase().includes('simpati'))},
    'pulsa_reg_isat': { name: 'Pulsa Reguler Indosat', frontendCategory: 'pulsa', filterFn: (item) => item.kategori?.toUpperCase() === 'PULSA' && !item.keterangan?.toLowerCase().includes('transfer') && !item.keterangan?.toLowerCase().includes('data') && !item.keterangan?.toLowerCase().includes('paket') && (item.keterangan?.toLowerCase().includes('indosat') || item.keterangan?.toLowerCase().includes('isat') || item.keterangan?.toLowerCase().includes('im3') || item.keterangan?.toLowerCase().includes('mentari'))},
    'pulsa_reg_xl': { name: 'Pulsa Reguler XL', frontendCategory: 'pulsa', filterFn: (item) => item.kategori?.toUpperCase() === 'PULSA' && !item.keterangan?.toLowerCase().includes('transfer') && !item.keterangan?.toLowerCase().includes('data') && !item.keterangan?.toLowerCase().includes('paket') && item.keterangan?.toLowerCase().includes('xl') && !item.keterangan?.toLowerCase().includes('axis')},
    'pulsa_reg_axis': { name: 'Pulsa Reguler Axis', frontendCategory: 'pulsa', filterFn: (item) => item.kategori?.toUpperCase() === 'PULSA' && !item.keterangan?.toLowerCase().includes('transfer') && !item.keterangan?.toLowerCase().includes('data') && !item.keterangan?.toLowerCase().includes('paket') && item.keterangan?.toLowerCase().includes('axis')},
    'pulsa_reg_tri': { name: 'Pulsa Reguler Tri', frontendCategory: 'pulsa', filterFn: (item) => item.kategori?.toUpperCase() === 'PULSA' && !item.keterangan?.toLowerCase().includes('transfer') && !item.keterangan?.toLowerCase().includes('data') && !item.keterangan?.toLowerCase().includes('paket') && (item.keterangan?.toLowerCase().includes('tri') || item.keterangan?.toLowerCase().includes('three'))},
    'pulsa_reg_smart': { name: 'Pulsa Reguler Smartfren', frontendCategory: 'pulsa', filterFn: (item) => item.kategori?.toUpperCase() === 'PULSA' && !item.keterangan?.toLowerCase().includes('transfer') && !item.keterangan?.toLowerCase().includes('data') && !item.keterangan?.toLowerCase().includes('paket') && (item.keterangan?.toLowerCase().includes('smartfren') || item.keterangan?.toLowerCase().includes('smart'))},
    'pulsa_tf_tsel': { name: 'Pulsa Transfer Telkomsel', frontendCategory: 'pulsa', filterFn: (item) => (item.kategori?.toUpperCase() === 'PULSA TRANSFER' || (item.kategori?.toUpperCase() === 'PULSA' && item.keterangan?.toLowerCase().includes('transfer'))) && (item.keterangan?.toLowerCase().includes('telkomsel') || item.keterangan?.toLowerCase().includes('tsel'))},
    'pulsa_tf_isat': { name: 'Pulsa Transfer Indosat', frontendCategory: 'pulsa', filterFn: (item) => (item.kategori?.toUpperCase() === 'PULSA TRANSFER' || (item.kategori?.toUpperCase() === 'PULSA' && item.keterangan?.toLowerCase().includes('transfer'))) && (item.keterangan?.toLowerCase().includes('indosat') || item.keterangan?.toLowerCase().includes('isat') || item.keterangan?.toLowerCase().includes('im3'))},
    'pulsa_tf_xl': { name: 'Pulsa Transfer XL', frontendCategory: 'pulsa', filterFn: (item) => (item.kategori?.toUpperCase() === 'PULSA TRANSFER' || (item.kategori?.toUpperCase() === 'PULSA' && item.keterangan?.toLowerCase().includes('transfer'))) && item.keterangan?.toLowerCase().includes('xl')  && !item.keterangan?.toLowerCase().includes('axis')},
    'pulsa_tf_axis': { name: 'Pulsa Transfer Axis', frontendCategory: 'pulsa', filterFn: (item) => (item.kategori?.toUpperCase() === 'PULSA TRANSFER' || (item.kategori?.toUpperCase() === 'PULSA' && item.keterangan?.toLowerCase().includes('transfer'))) && item.keterangan?.toLowerCase().includes('axis')},
    'pulsa_tf_tri': { name: 'Pulsa Transfer Tri', frontendCategory: 'pulsa', filterFn: (item) => (item.kategori?.toUpperCase() === 'PULSA TRANSFER' || (item.kategori?.toUpperCase() === 'PULSA' && item.keterangan?.toLowerCase().includes('transfer'))) && (item.keterangan?.toLowerCase().includes('tri') || item.keterangan?.toLowerCase().includes('three'))},
    'kuotatsel': { name: 'Kuota Telkomsel', frontendCategory: 'data', filterFn: (item) => (item.kategori?.toUpperCase() === 'KUOTA TELKOMSEL' || ((item.kategori?.toUpperCase().includes('KUOTA') || item.kategori?.toUpperCase().includes('DATA')) && (item.keterangan?.toLowerCase().includes('telkomsel') || item.keterangan?.toLowerCase().includes('tsel') || item.keterangan?.toLowerCase().includes('simpati') || item.keterangan?.toLowerCase().includes('as '))))},
    'kuotabyu': { name: 'Kuota By.U', frontendCategory: 'data', filterFn: (item) => (item.kategori?.toUpperCase() === 'KUOTA BYU' || ((item.kategori?.toUpperCase().includes('KUOTA') || item.kategori?.toUpperCase().includes('DATA')) && item.keterangan?.toLowerCase().includes('byu')))},
    'kuotaisat': { name: 'Kuota Indosat', frontendCategory: 'data', filterFn: (item) => (item.kategori?.toUpperCase() === 'KUOTA INDOSAT' || ((item.kategori?.toUpperCase().includes('KUOTA') || item.kategori?.toUpperCase().includes('DATA')) && (item.keterangan?.toLowerCase().includes('indosat') || item.keterangan?.toLowerCase().includes('isat') || item.keterangan?.toLowerCase().includes('im3'))))},
    'kuotatri': { name: 'Kuota Tri', frontendCategory: 'data', filterFn: (item) => (item.kategori?.toUpperCase() === 'KUOTA TRI' || ((item.kategori?.toUpperCase().includes('KUOTA') || item.kategori?.toUpperCase().includes('DATA')) && (item.keterangan?.toLowerCase().includes('tri') || item.keterangan?.toLowerCase().includes('three'))))},
    'kuotaxl': { name: 'Kuota XL', frontendCategory: 'data', filterFn: (item) => (item.kategori?.toUpperCase() === 'KUOTA XL' || ((item.kategori?.toUpperCase().includes('KUOTA') || item.kategori?.toUpperCase().includes('DATA')) && item.keterangan?.toLowerCase().includes('xl')  && !item.keterangan?.toLowerCase().includes('axis')))},
    'kuotaaxis': { name: 'Kuota Axis', frontendCategory: 'data', filterFn: (item) => (item.kategori?.toUpperCase() === 'KUOTA AXIS' || ((item.kategori?.toUpperCase().includes('KUOTA') || item.kategori?.toUpperCase().includes('DATA')) && item.keterangan?.toLowerCase().includes('axis')))},
    'kuotasmart': { name: 'Kuota Smartfren', frontendCategory: 'data', filterFn: (item) => (item.kategori?.toUpperCase() === 'KUOTA SMARTFREN' || ((item.kategori?.toUpperCase().includes('KUOTA') || item.kategori?.toUpperCase().includes('DATA')) && (item.keterangan?.toLowerCase().includes('smartfren') || item.keterangan?.toLowerCase().includes('smart'))))},
    'gopay': { name: 'Saldo GoPay', frontendCategory: 'ewallet', filterFn: (item) => (item.kategori?.toUpperCase() === 'DOMPET DIGITAL' || item.kategori?.toUpperCase() === 'SALDO GOPAY' || item.keterangan?.toLowerCase().startsWith('gopay')) && item.keterangan?.toLowerCase().includes('gopay')},
    'dana': { name: 'Saldo DANA', frontendCategory: 'ewallet', filterFn: (item) => (item.kategori?.toUpperCase() === 'DOMPET DIGITAL' || item.kategori?.toUpperCase() === 'SALDO DANA' || item.keterangan?.toLowerCase().startsWith('dana')) && item.keterangan?.toLowerCase().includes('dana')},
    'ovo': { name: 'Saldo OVO', frontendCategory: 'ewallet', filterFn: (item) => (item.kategori?.toUpperCase() === 'DOMPET DIGITAL' || item.kategori?.toUpperCase() === 'SALDO OVO' || item.keterangan?.toLowerCase().startsWith('ovo')) && item.keterangan?.toLowerCase().includes('ovo')},
    'shopeepay': { name: 'Saldo ShopeePay', frontendCategory: 'ewallet', filterFn: (item) => (item.kategori?.toUpperCase() === 'DOMPET DIGITAL' || item.kategori?.toUpperCase() === 'SALDO SHOPEEPAY' || item.keterangan?.toLowerCase().startsWith('shopeepay')) && item.keterangan?.toLowerCase().includes('shopee')},
    'linkaja': { name: 'Saldo LinkAja', frontendCategory: 'ewallet', filterFn: (item) => (item.kategori?.toUpperCase() === 'DOMPET DIGITAL' || item.kategori?.toUpperCase() === 'SALDO LINKAJA' || item.keterangan?.toLowerCase().startsWith('linkaja')) && item.keterangan?.toLowerCase().includes('linkaja')},
    'grab': { name: 'Saldo Grab', frontendCategory: 'ewallet', filterFn: (item) => (item.kategori?.toUpperCase() === 'DOMPET DIGITAL' || item.kategori?.toUpperCase() === 'SALDO GRAB') && item.keterangan?.toLowerCase().includes('grab')},
    'pln': { name: 'Token PLN', frontendCategory: 'token', filterFn: (item) => item.kategori?.toUpperCase() === 'PLN' || item.kategori?.toUpperCase() === 'TOKEN PLN' || item.keterangan?.toLowerCase().includes('token listrik')},
    'game_ml': { name: 'Mobile Legends', frontendCategory: 'game', filterFn: (item) => (item.kategori?.toUpperCase().includes('GAME') || item.kategori?.toUpperCase() === 'DIGITAL') && (item.keterangan?.toLowerCase().includes('mobile legend') || item.keterangan?.toLowerCase().includes('mlbb'))},
    'game_ff': { name: 'Free Fire', frontendCategory: 'game', filterFn: (item) => (item.kategori?.toUpperCase().includes('GAME') || item.kategori?.toUpperCase() === 'DIGITAL') && item.keterangan?.toLowerCase().includes('free fire')},
    'game_pubg': { name: 'PUBG Mobile', frontendCategory: 'game', filterFn: (item) => (item.kategori?.toUpperCase().includes('GAME') || item.kategori?.toUpperCase() === 'DIGITAL') && (item.keterangan?.toLowerCase().includes('pubg') || item.keterangan?.toLowerCase().includes('uc pubg'))},
    'game_valorant': { name: 'Valorant', frontendCategory: 'game', filterFn: (item) => (item.kategori?.toUpperCase().includes('GAME') || item.kategori?.toUpperCase() === 'DIGITAL') && item.keterangan?.toLowerCase().includes('valorant')},
    'game_genshin': { name: 'Genshin Impact', frontendCategory: 'game', filterFn: (item) => (item.kategori?.toUpperCase().includes('GAME') || item.kategori?.toUpperCase() === 'DIGITAL') && item.keterangan?.toLowerCase().includes('genshin')},
    'game_lainnya': { name: 'Voucher Game Lainnya', frontendCategory: 'game', filterFn: (item) => (item.kategori?.toUpperCase().includes('GAME') || item.kategori?.toUpperCase() === 'DIGITAL' || item.kategori?.toUpperCase().includes('VOUCHER GAME')) && !item.keterangan?.toLowerCase().includes('mobile legend') && !item.keterangan?.toLowerCase().includes('mlbb') && !item.keterangan?.toLowerCase().includes('free fire') && !item.keterangan?.toLowerCase().includes('pubg') && !item.keterangan?.toLowerCase().includes('valorant') && !item.keterangan?.toLowerCase().includes('genshin')},
    'voucher_umum': { name: 'Voucher Umum & Lainnya', frontendCategory: 'other', filterFn: (item) => item.kategori?.toUpperCase() === 'VOUCHER'},
    'tagihan_listrik': { name: 'Tagihan Listrik Pascabayar', frontendCategory: 'other', filterFn: (item) => (item.kategori?.toUpperCase() === 'TAGIHAN' || item.kategori?.toUpperCase() === 'PASCABAYAR') && item.keterangan?.toLowerCase().includes('listrik')}
};

const app = express();
app.use(express.json({ limit: '1mb' })); // Batasi ukuran payload JSON
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

let masterProductCache = null;
let cacheTimestamp = 0;

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({success: false, message: "Token tidak tersedia."});
    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
        if (err) {
            console.warn("JWT Verification Error:", err.message, "Token:", token.substring(0,10) + "...");
            return res.status(403).json({success: false, message: "Token tidak valid atau kedaluwarsa."});
        }
        req.user = userPayload;
        next();
    });
}

async function authenticateAdmin(req, res, next) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ success: false, message: 'Otentikasi diperlukan (payload token tidak lengkap).' });
  }
  try {
      const userRecord = await User.findById(req.user.userId).select('isAdmin');
      if (!userRecord) {
        return res.status(403).json({ success: false, message: 'User tidak ditemukan di database (sesi mungkin tidak valid).' });
      }
      if (userRecord.isAdmin === true) {
          next();
      } else {
          res.status(403).json({ success: false, message: 'Akses ditolak: Hanya admin yang diizinkan.' });
      }
  } catch (error) {
      console.error("Error dalam pengecekan admin:", error);
      res.status(500).json({ success: false, message: 'Kesalahan server saat verifikasi status admin.' });
  }
}

['/', '/index'].forEach(routePath => {
    app.get(routePath, (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'), (err) => {
            if (err) { console.error(`Error sending index: `, err); if (!res.headersSent) res.status(err.status || 500).send("Error serving home page."); }
        });
    });
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'), (err) => {
        if (err) { console.error(`Error sending login: `, err); if (!res.headersSent) res.status(err.status || 500).send("Error serving login page."); }
    });
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'), (err) => {
        if (err) { console.error(`Error sending register: `, err); if (!res.headersSent) res.status(err.status || 500).send("Error serving register page."); }
    });
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'), (err) => {
        if (err) { console.error(`Error sending admin: `, err); if (!res.headersSent) res.status(err.status || 500).send("Error serving admin page."); }
    });
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: "Username, email, dan password diperlukan." });
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password minimal 6 karakter." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: "Format email tidak valid."});

    try {
        const existingUser = await User.findOne({ $or: [{username: username.toLowerCase()}, {email: email.toLowerCase()}] });
        if (existingUser) return res.status(400).json({ success: false, message: "Username atau email sudah digunakan." });

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = new User({ username: username.toLowerCase(), email: email.toLowerCase(), passwordHash, balance: 0, isAdmin: false });
        const savedUser = await newUser.save();
        res.status(201).json({ success: true, message: "Registrasi berhasil! Silakan login.", userId: savedUser._id });
    } catch (error) {
        console.error("Error during registration:", error);
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({ success: false, message: "Username atau email sudah ada yang menggunakan (DB)." });
        }
        res.status(500).json({ success: false, message: "Registrasi gagal, terjadi kesalahan server." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: "Username dan password diperlukan." });
    try {
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) return res.status(401).json({ success: false, message: "Username atau password salah." });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ success: false, message: "Username atau password salah." });

        const payload = { userId: user._id, username: user.username };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            message: "Login berhasil!",
            token,
            user: { id: user._id, username: user.username, email: user.email, balance: user.balance, isAdmin: user.isAdmin }
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ success: false, message: "Login gagal, terjadi kesalahan server." });
    }
});

app.post('/api/auth/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: "Email diperlukan." });
    }
    if (!EMAIL_CONFIG.service || !EMAIL_CONFIG.auth || !EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass || !EMAIL_CONFIG.from) {
        console.error("Fitur Lupa Password tidak bisa mengirim email karena EMAIL_CONFIG tidak lengkap di settings.js.");
        return res.status(500).json({ success: false, message: "Layanan email tidak terkonfigurasi di server. Hubungi Admin." });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log(`Permintaan reset password untuk email (tidak ditemukan): ${email}`);
            return res.status(200).json({ success: true, message: "Jika alamat email Anda terdaftar di sistem kami, Anda akan menerima email berisi link untuk mereset password Anda." });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 3600000; // Token valid untuk 1 jam
        await user.save();

        const resetURL = `${APP_BASE_URL}/#reset-password-view?token=${resetToken}`;

        let transporter = nodemailer.createTransport({
            service: EMAIL_CONFIG.service,
            auth: {
                user: EMAIL_CONFIG.auth.user,
                pass: EMAIL_CONFIG.auth.pass
            },
            tls: {
                rejectUnauthorized: EMAIL_CONFIG.tls_rejectUnauthorized !== undefined ? EMAIL_CONFIG.tls_rejectUnauthorized : true
            }
        });

        const mailOptions = {
            from: EMAIL_CONFIG.from,
            to: user.email,
            subject: `Reset Password Akun ${settings.APP_NAME || 'Aplikasi Anda'}`,
            html: `<p>Halo ${user.username},</p>
                   <p>Anda (atau seseorang) telah meminta untuk mereset password akun Anda.</p>
                   <p>Silakan klik link berikut untuk membuat password baru:</p>
                   <p><a href="${resetURL}" target="_blank" style="color:#1a73e8;text-decoration:none;">${resetURL}</a></p>
                   <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
                   <p>Jika Anda tidak meminta reset password ini, Anda bisa mengabaikan email ini dengan aman.</p>
                   <br>
                   <p>Terima kasih,</p>
                   <p>Tim ${settings.APP_NAME || 'Aplikasi Anda'}</p>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email reset password telah dikirim ke ${user.email}`);
        res.status(200).json({ success: true, message: "Jika alamat email Anda terdaftar di sistem kami, Anda akan menerima email berisi link untuk mereset password Anda." });

    } catch (error) {
        console.error("Error pada /api/auth/request-password-reset:", error);
        if (error.code === 'EENVELOPE' || error.command === 'CONN' || error.responseCode === 535) {
             console.error("Nodemailer error (mungkin konfigurasi salah atau masalah koneksi SMTP):", error);
             return res.status(500).json({ success: false, message: "Gagal mengirim email reset. Silakan coba lagi nanti atau hubungi admin jika masalah berlanjut." });
        }
        return res.status(500).json({ success: false, message: "Terjadi kesalahan server saat memproses permintaan Anda." });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: "Token dan password baru diperlukan." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "Password baru minimal 6 karakter." });
    }

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Token reset password tidak valid atau telah kedaluwarsa. Silakan minta link baru." });
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: "Password berhasil direset! Silakan login dengan password baru Anda." });

    } catch (error) {
        console.error("Error pada /api/auth/reset-password:", error);
        res.status(500).json({ success: false, message: "Terjadi kesalahan server saat mereset password." });
    }
});

app.post('/api/admin/validate-key', (req, res) => {
    const { adminKey } = req.body;
    if (!adminKey) {
        return res.status(400).json({ success: false, message: 'Admin Key dibutuhkan.' });
    }
    if (!ADMIN_ACCESS_KEY) {
        console.error("ADMIN_ACCESS_KEY belum diset di settings.js. Validasi tidak bisa dilakukan.");
        return res.status(500).json({ success: false, message: 'Konfigurasi server error.' });
    }
    if (adminKey === ADMIN_ACCESS_KEY) {
        console.log(`Admin Key validation successful.`);
        return res.json({ success: true, message: 'Admin Key valid.' });
    } else {
        console.warn(`Admin Key validation failed. Attempted key: ${adminKey.substring(0,5)}...`);
        return res.status(401).json({ success: false, message: 'Admin Key tidak valid.' });
    }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-passwordHash -passwordResetToken -passwordResetExpires');
        if (!user) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
        res.json({
            success: true,
            user: { id: user._id, username: user.username, email: user.email, balance: user.balance, createdAt: user.createdAt, isAdmin: user.isAdmin }
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil profil pengguna."});
    }
});

app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: "Password lama dan password baru diperlukan." });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: "Password baru minimal 6 karakter." });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) return res.status(400).json({ success: false, message: "Password lama yang Anda masukkan salah." });

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.json({ success: true, message: "Password berhasil diubah." });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ success: false, message: "Gagal mengubah password karena kesalahan server." });
    }
});

async function getAllProductsFromMasterAPI() {
    if (masterProductCache && (Date.now() - cacheTimestamp < PRODUCT_CACHE_DURATION_MS)) {
        console.log("Menggunakan cache produk master.");
        return masterProductCache;
    }
    if (!OKE_CONNECT_H2H_CONFIG || !OKE_CONNECT_H2H_CONFIG.MASTER_API_URL) {
        console.error(`[${PROVIDER_NAME}] MASTER_API_URL tidak terkonfigurasi di OKE_CONNECT_H2H_CONFIG dalam settings.js.`);
        throw new Error("Konfigurasi API produk master tidak ditemukan.");
    }
    console.log(`[${PROVIDER_NAME}] Mengambil semua produk dari MASTER_API_URL: ${OKE_CONNECT_H2H_CONFIG.MASTER_API_URL}`);
    try {
        const response = await axios.get(OKE_CONNECT_H2H_CONFIG.MASTER_API_URL, {
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (response.status !== 200) throw new Error(`Permintaan ke API master gagal dengan status ${response.status}`);

        let allProducts = response.data;
        if (typeof allProducts === 'object' && !Array.isArray(allProducts)) {
            const dataKey = Object.keys(allProducts).find(key => Array.isArray(allProducts[key]));
            allProducts = dataKey ? allProducts[dataKey] : [];
        }
        if (!Array.isArray(allProducts)) throw new Error('Format data tidak valid diterima dari API master.');

        masterProductCache = allProducts;
        cacheTimestamp = Date.now();
        console.log(`Produk master berhasil diambil dan di-cache. Jumlah produk: ${allProducts.length}`);
        return masterProductCache;
    } catch (error) {
        console.error(`[${PROVIDER_NAME}] Fatal error saat mengambil daftar produk master:`, error.message);
        masterProductCache = null;
        throw error;
    }
}

function formatProductsForFrontend(products) {
    return products.map(p => {
        const code = p.kode || p.code || p.sku || '';
        const name = p.keterangan || p.nama_produk || p.name || 'N/A';
        const originalPrice = parseFloat(p.harga) || parseFloat(p.price) || 0; // Coba parseFloat juga untuk p.price
        let priceWithProfit = originalPrice;
        if (originalPrice > 0 && PROFIT_MARGIN_PERCENTAGE > 0) {
            const profitAmount = originalPrice * (PROFIT_MARGIN_PERCENTAGE / 100.0);
            priceWithProfit = Math.ceil((originalPrice + profitAmount) / 50) * 50; // Pembulatan ke 50 terdekat
        }
        return {
            product_code: `${PROVIDER_NAME}${PROVIDER_PREFIX_SEPARATOR}${code}`,
            product_name: name,
            price: priceWithProfit,
            original_price_for_record: originalPrice,
            provider: PROVIDER_NAME,
            original_code: code,
            original_kategori: p.kategori,
            original_keterangan: p.keterangan
        };
    }).filter(p => p.product_code !== `${PROVIDER_NAME}${PROVIDER_PREFIX_SEPARATOR}`);
}

app.get('/api/products/:key', async (req, res) => {
    const key = req.params.key?.toLowerCase();
    if (!key) return res.status(400).json({ success: false, message: "Kunci kategori atau produk diperlukan." });
    try {
        const allProducts = await getAllProductsFromMasterAPI();
        if (!allProducts || allProducts.length === 0) {
            return res.json({ success:true, type: 'products', data: [] });
        }

        const potentialSubCategories = [];
        let isFrontendCategoryKey = false;
        for (const mapKey in categoryFilterMap) {
            if (categoryFilterMap[mapKey].frontendCategory === key) {
                isFrontendCategoryKey = true;
                potentialSubCategories.push({ key: mapKey, name: categoryFilterMap[mapKey].name });
            }
        }

        if (isFrontendCategoryKey) {
            if (potentialSubCategories.length > 1) {
                return res.json({ success: true, type: 'subcategories', data: potentialSubCategories });
            } else if (potentialSubCategories.length === 1) {
                const singleMapKey = potentialSubCategories[0].key;
                const filterEntry = categoryFilterMap[singleMapKey];
                if (filterEntry && typeof filterEntry.filterFn === 'function') {
                    let filtered = allProducts.filter(filterEntry.filterFn);
                    filtered.sort((a, b) => (parseFloat(a.harga) || Infinity) - (parseFloat(b.harga) || Infinity));
                    return res.json({ success: true, type: 'products', data: formatProductsForFrontend(filtered) });
                }
            }
             // Jika tidak ada subkategori yang cocok atau hanya satu tapi filter tidak valid
            return res.json({ success: true, type: 'products', data: [] });
        } else if (categoryFilterMap[key] && typeof categoryFilterMap[key].filterFn === 'function') { // Direct key match
            let filtered = allProducts.filter(categoryFilterMap[key].filterFn);
            filtered.sort((a, b) => (parseFloat(a.harga) || Infinity) - (parseFloat(b.harga) || Infinity));
            return res.json({ success: true, type: 'products', data: formatProductsForFrontend(filtered) });
        } else {
            console.warn(`Kategori atau produk dengan kunci '${key}' tidak ditemukan di categoryFilterMap atau filterFn tidak valid.`);
            return res.status(404).json({ success: false, message: `Kategori atau produk '${key}' tidak ditemukan.` });
        }
    } catch (error) {
        console.error(`Error in /api/products/${key}:`, error.message, error.stack);
        res.status(500).json({ success: false, message: "Error saat memproses data produk." });
    }
});

app.get('/api/bebas_nominal_options/:serviceType', authenticateToken, (req, res) => {
    const serviceType = req.params.serviceType?.toLowerCase();
    let options = [];
    if (serviceType === 'uang_elektronik') {
        options = [
            { name: "DANA (Bebas Nominal)", product_code_provider: "DANABN_PROVIDER_CODE", provider: PROVIDER_NAME, original_kategori: "DOMPET DIGITAL", key_for_input_hint: "dana", icon_hint: "dana" },
            { name: "OVO (Bebas Nominal)", product_code_provider: "OVOBN_PROVIDER_CODE", provider: PROVIDER_NAME, original_kategori: "DOMPET DIGITAL", key_for_input_hint: "ovo", icon_hint: "ovo" },
            { name: "GoPay Customer (Bebas Nominal)", product_code_provider: "GOPAYBN_PROVIDER_CODE", provider: PROVIDER_NAME, original_kategori: "DOMPET DIGITAL", key_for_input_hint: "gopay", icon_hint: "gopay" },
            { name: "ShopeePay (Bebas Nominal)", product_code_provider: "SHOPEEPAYBN_PROVIDER_CODE", provider: PROVIDER_NAME, original_kategori: "DOMPET DIGITAL", key_for_input_hint: "shopeepay", icon_hint: "shopeepay" },
        ];
    } else if (serviceType === 'transfer_uang') {
        options = [
            { name: "Transfer ke Rekening BCA (Bebas Nominal)", product_code_provider: "TRF_BCA_BN_PROVIDER_CODE", provider: PROVIDER_NAME, original_kategori: "TRANSFER BANK", key_for_input_hint: "transfer_bca", icon_hint: "bca" },
            { name: "Transfer ke Rekening Mandiri (Bebas Nominal)", product_code_provider: "TRF_MANDIRI_BN_PROVIDER_CODE", provider: PROVIDER_NAME, original_kategori: "TRANSFER BANK", key_for_input_hint: "transfer_mandiri", icon_hint: "mandiri" },
            { name: "Transfer ke Rekening BRI (Bebas Nominal)", product_code_provider: "TRF_BRI_BN_PROVIDER_CODE", provider: PROVIDER_NAME, original_kategori: "TRANSFER BANK", key_for_input_hint: "transfer_bri", icon_hint: "bri" },
        ];
    }
    if (options.length > 0) {
        return res.json({ success: true, data: options });
    } else {
        return res.status(404).json({ success: false, message: `Tipe layanan bebas nominal '${serviceType}' tidak ditemukan.` });
    }
});

app.post('/api/deposit/calculate_transfer', authenticateToken, async (req, res) => {
    const { desiredAmount } = req.body;
    const userId = req.user.userId;

    if (!desiredAmount || isNaN(parseFloat(desiredAmount)) || parseFloat(desiredAmount) < 10000) {
        return res.status(400).json({ success: false, message: "Jumlah saldo yang diinginkan tidak valid (min. Rp 10.000)." });
    }
    const baseAmount = parseFloat(desiredAmount);
    const fee = Math.ceil(baseAmount * (PROFIT_MARGIN_PERCENTAGE / 100.0)); // Contoh kalkulasi fee
    const amountWithFee = baseAmount; // Untuk deposit biasanya tidak ada fee yang ditambahkan ke transfer, tapi margin dari rate provider. Fee di sini bisa jadi 0 atau biaya admin tetap.
                                     // Untuk contoh ini, asumsikan fee 0, dan profit dari selisih rate nanti.

    let uniqueTransferAmount = 0;
    let collisionCheck = 0;
    const MAX_COLLISION_CHECKS = 15;
    try {
        let isCollision = true;
        do {
            const uniqueDigits = Math.floor(Math.random() * 899) + 100; // Random 3 digits (100-999)
            uniqueTransferAmount = amountWithFee + uniqueDigits; // Jumlah yang akan ditransfer user
            const existingDeposit = await Deposit.findOne({ uniqueTransferAmount: uniqueTransferAmount, status: 'WAITING_TRANSFER' });
            isCollision = !!existingDeposit;
            if (isCollision) {
                collisionCheck++;
                console.warn(`[DEPOSIT_CALC] Kolisi jumlah unik ${uniqueTransferAmount}, coba lagi (${collisionCheck})`);
            }
        } while (isCollision && collisionCheck < MAX_COLLISION_CHECKS);

        if (isCollision) {
            console.error("[DEPOSIT_CALC] Gagal menghasilkan jumlah transfer unik setelah beberapa percobaan.");
            return res.status(500).json({ success: false, message: "Gagal menghasilkan jumlah transfer unik. Silakan coba lagi beberapa saat." });
        }

        const depositOrderId = `DEP-${userId.toString().slice(-6)}-${Date.now()}`;
        const newDeposit = new Deposit({
            orderId: depositOrderId,
            userId,
            desiredAmount: baseAmount, // Jumlah bersih yang akan masuk saldo user
            calculatedFee: fee, // Fee yang mungkin diambil (jika ada)
            uniqueTransferAmount, // Jumlah yang harus ditransfer user
            status: 'WAITING_TRANSFER'
        });
        await newDeposit.save();
        console.log(`[DEPOSIT_CALC] User ${req.user.username} (ID: ${userId}) meminta deposit Rp ${baseAmount}. Diminta transfer: Rp ${uniqueTransferAmount}. OrderID: ${depositOrderId}`);
        res.json({ success: true, message: `Silakan transfer PERSIS Rp ${uniqueTransferAmount.toLocaleString('id-ID')}`, uniqueTransferAmount: uniqueTransferAmount, desiredAmount: baseAmount, orderId: depositOrderId });
    } catch (error) {
        console.error("Error calculating transfer amount:", error);
        res.status(500).json({ success: false, message: `Gagal memproses permintaan deposit: ${error.message}` });
    }
});

async function processOkeConnectH2HTransaction(refIdInternal, actualProductCode, targetNumber) {
    console.log(`[${PROVIDER_NAME}-H2H] Processing: Ref=${refIdInternal}, Prod=${actualProductCode}, Target=${targetNumber}`);
    if (!OKE_CONNECT_H2H_CONFIG.MEMBER_ID || OKE_CONNECT_H2H_CONFIG.MEMBER_ID === 'YOUR_OKE_MEMBER_ID' ||
        !OKE_CONNECT_H2H_CONFIG.PIN || OKE_CONNECT_H2H_CONFIG.PIN === 'YOUR_OKE_PIN' ||
        !OKE_CONNECT_H2H_CONFIG.PASSWORD || OKE_CONNECT_H2H_CONFIG.PASSWORD === 'YOUR_OKE_PASSWORD' ||
        !OKE_CONNECT_H2H_CONFIG.API_TRANSACTION_URL ) {
        console.error(`!!! [${PROVIDER_NAME}-H2H] KREDENSIAL API ORDER (MEMBER_ID, PIN, PASSWORD, API_TRANSACTION_URL) BELUM DISET LENGKAP di settings.js !!!`);
        throw new Error("Kesalahan konfigurasi pada server (kredensial provider tidak lengkap).");
    }
    const transactionUrl = `${OKE_CONNECT_H2H_CONFIG.API_TRANSACTION_URL}?product=${encodeURIComponent(actualProductCode)}&dest=${encodeURIComponent(targetNumber)}&refID=${encodeURIComponent(refIdInternal)}&memberID=${encodeURIComponent(OKE_CONNECT_H2H_CONFIG.MEMBER_ID)}&pin=${encodeURIComponent(OKE_CONNECT_H2H_CONFIG.PIN)}&password=${encodeURIComponent(OKE_CONNECT_H2H_CONFIG.PASSWORD)}`;
    console.log(`[${PROVIDER_NAME}-H2H] Sending request to: ${transactionUrl}`);

    return new Promise((resolve, reject) => {
        const request = https.get(transactionUrl, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                const responseDataText = data.trim();
                console.log(`[${PROVIDER_NAME}-H2H] Response for Ref ${refIdInternal}:`, responseDataText);
                let status = 'UNKNOWN_GATEWAY', message = responseDataText, sn = null;

                if (responseDataText.toUpperCase().includes("SUKSES") || responseDataText.toUpperCase().includes("BERHASIL")) {
                    status = 'SUKSES';
                    const snMatch = responseDataText.match(/SN[:=\s]([\w\.\/-]+)/i) || responseDataText.match(/Token[:=\s]([\d\-]+)/i);
                    if (snMatch && snMatch[1]) sn = snMatch[1];
                    else {
                        const parts = responseDataText.split(/[\s,.\n]+/);
                        const potentialSN = parts.find(p => p.length >= 8 && /^[A-Z0-9\/-]+$/i.test(p) && !p.startsWith("ID") && !p.startsWith("R#") && p.toUpperCase() !== "SUKSES" && p.toUpperCase() !== "BERHASIL");
                        if (potentialSN) sn = potentialSN;
                    }
                    let meaningfulMessage = responseDataText;
                    if (responseDataText.startsWith("R#")) { const parts = responseDataText.split(/ (.*)/s); meaningfulMessage = parts[1] || responseDataText; }
                    else { const successIndex = responseDataText.toUpperCase().search(/SUKSES|BERHASIL/); if (successIndex !== -1) meaningfulMessage = responseDataText.substring(successIndex).replace(/^(SUKSES|BERHASIL)\s*:?\s*/i, '').trim(); }
                    message = meaningfulMessage || "Transaksi berhasil diproses.";
                } else if (responseDataText.toUpperCase().includes("PENDING")) {
                    status = 'PENDING'; message = "Transaksi sedang diproses oleh provider.";
                } else if (responseDataText.toUpperCase().includes("GAGAL") || responseDataText.toUpperCase().includes("SALAH") || responseDataText.toUpperCase().includes("SALDO")) {
                    status = 'GAGAL';
                    if (responseDataText.startsWith("R#")) { const parts = responseDataText.split(/ (.*)/s); message = parts[1] || responseDataText; }
                    else message = responseDataText;
                }
                if (status === 'UNKNOWN_GATEWAY' && !message) message = "Gagal memproses transaksi atau respons provider tidak dikenal.";
                resolve({ status, message, sn, raw_response: responseDataText });
            });
        });
        request.on('error', (err) => {
            console.error(`[${PROVIDER_NAME}-H2H] Error calling transaction API for Ref ${refIdInternal}: ${err.message}`);
            reject(new Error(`Gagal menghubungi server ${PROVIDER_NAME}: ${err.message}`));
        });
        request.end();
    });
}

app.post('/api/transactions', authenticateToken, async (req, res) => {
    const { productId, targetNumber, amount: amountFromFrontend, productName } = req.body;
    const userId = req.user.userId;

    if (!productId || !targetNumber) return res.status(400).json({ success: false, message: "Kode Produk dan Nomor Tujuan diperlukan." });
    const priceForTransaction = parseFloat(amountFromFrontend);
    if (isNaN(priceForTransaction) || priceForTransaction < 0) return res.status(400).json({ success: false, message: "Harga produk tidak valid." }); // Harga 0 bisa jadi untuk produk gratis, tapi umumnya > 0

    const parts = productId.split(PROVIDER_PREFIX_SEPARATOR);
    if (parts.length < 2 || parts[0].toUpperCase() !== PROVIDER_NAME.toUpperCase()) {
        return res.status(400).json({ success: false, message: "Format Kode Produk tidak valid atau provider tidak cocok." });
    }
    const actualProductCode = parts.slice(1).join(PROVIDER_PREFIX_SEPARATOR);
    const refIdInternal = `${PROVIDER_NAME.substring(0,3).toUpperCase()}-${Date.now()}-${Math.random().toString(16).substring(2, 8).toUpperCase()}`;

    let user;
    let initialUserBalance = 0;
    const session = await mongoose.startSession(); // Mulai session untuk transaksi DB
    session.startTransaction();

    try {
        user = await User.findById(userId).session(session);
        if (!user) throw new Error("Pengguna tidak ditemukan.");
        initialUserBalance = user.balance;

        if (user.balance < priceForTransaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: `Saldo tidak cukup. Saldo Anda: Rp ${user.balance.toLocaleString('id-ID')}, dibutuhkan: Rp ${priceForTransaction.toLocaleString('id-ID')}` });
        }
        user.balance -= priceForTransaction;
        await user.save({ session });
        console.log(`[TRANSACTION_PRE] Saldo user ${user.username} dikurangi ${priceForTransaction}. Saldo baru (sementara): ${user.balance}. Ref: ${refIdInternal}`);

        const newTransaction = new Transaction({
            userId, ref_id_internal: refIdInternal, provider: PROVIDER_NAME,
            product_id_frontend: productId, product_code_provider: actualProductCode,
            product_name: productName || `Produk ${actualProductCode}`,
            destination: targetNumber, status: 'PENDING_GATEWAY',
            amount: priceForTransaction, message: 'Mengirim permintaan ke gateway provider...'
        });
        await newTransaction.save({ session });
        console.log(`[TRANSACTION_SAVE] Transaksi ${refIdInternal} tersimpan dengan status PENDING_GATEWAY.`);

        // Jika semua operasi DB pra-provider berhasil, commit dulu sebelum panggil provider
        // Ini adalah pendekatan di mana pengurangan saldo terjadi sebelum konfirmasi provider.
        // Alternatifnya, panggil provider dulu, baru kurangi saldo jika provider sukses (lebih aman untuk saldo).
        // Untuk contoh ini, kita kurangi dulu. Jika provider gagal, saldo akan dikembalikan.
        await session.commitTransaction();
        console.log(`[TRANSACTION_COMMIT_PRE_PROVIDER] Saldo user ${user.username} terupdate dan transaksi ${refIdInternal} tersimpan.`);


        // Panggil API Provider (setelah saldo dikurangi dan transaksi PENDING disimpan)
        try {
            const providerResponse = await processOkeConnectH2HTransaction(refIdInternal, actualProductCode, targetNumber);
            await Transaction.updateOne(
                { ref_id_internal: refIdInternal },
                {
                    status: providerResponse.status,
                    message: providerResponse.message,
                    sn: providerResponse.sn,
                    provider_response_raw: providerResponse.raw_response,
                    last_updated: new Date()
                }
            ); // Tidak perlu session di sini karena sudah di luar transaksi awal
            console.log(`[TRANSACTION_PROVIDER_UPDATE] Status transaksi ${refIdInternal} diupdate dari ${PROVIDER_NAME}: ${providerResponse.status}`);

            if (['GAGAL', 'UNKNOWN_GATEWAY', 'FAILED_SYSTEM'].includes(providerResponse.status?.toUpperCase()) || providerResponse.status?.toUpperCase().includes('FAIL')) {
                // Kembalikan saldo jika provider gagal
                const refundSession = await mongoose.startSession();
                refundSession.startTransaction();
                try {
                    const userForRefund = await User.findById(userId).session(refundSession);
                    if (userForRefund) {
                        userForRefund.balance += priceForTransaction;
                        await userForRefund.save({ session: refundSession });
                        await refundSession.commitTransaction();
                        console.log(`[TRANSACTION_REFUND] Saldo Rp ${priceForTransaction} dikembalikan untuk user ${userId} karena transaksi ${refIdInternal} gagal. Saldo akhir: ${userForRefund.balance}.`);
                        await Transaction.updateOne({ ref_id_internal: refIdInternal }, { status: 'REFUNDED', message: `REFUND: ${providerResponse.message}`});
                    } else {
                        await refundSession.abortTransaction();
                        console.error(`[TRANSACTION_REFUND_FAIL] Gagal refund: User ${userId} tidak ditemukan untuk tx ${refIdInternal}.`);
                    }
                } catch (refundError) {
                    await refundSession.abortTransaction();
                    console.error(`[TRANSACTION_REFUND_ERROR] Error saat proses refund untuk tx ${refIdInternal}:`, refundError);
                    // Tandai transaksi sebagai butuh investigasi manual
                } finally {
                    refundSession.endSession();
                }
            }

            const finalUserAfterTx = await User.findById(userId).select('balance');
            const finalBalance = finalUserAfterTx ? finalUserAfterTx.balance : user.balance; // Fallback ke balance sebelum update provider jika user tidak ketemu

            const isConsideredSuccessByClient = ['SUKSES', 'PENDING'].includes(providerResponse.status?.toUpperCase());
            res.json({
                success: isConsideredSuccessByClient,
                message: providerResponse.message || "Transaksi Anda sedang diproses...",
                data: {
                    status: providerResponse.status,
                    message: providerResponse.message,
                    sn: providerResponse.sn,
                    ref_id_internal: refIdInternal,
                    new_balance: finalBalance
                }
            });

        } catch (providerError) { // Error saat menghubungi provider
            console.error(`[TRANSACTION_PROVIDER_ERROR] Error saat panggil provider untuk ${refIdInternal}:`, providerError.message);
            // Kembalikan saldo karena provider gagal dihubungi
            const providerErrorRefundSession = await mongoose.startSession();
            providerErrorRefundSession.startTransaction();
            try {
                const userForRefund = await User.findById(userId).session(providerErrorRefundSession);
                 if (userForRefund) {
                    userForRefund.balance += priceForTransaction; // Kembalikan saldo yang sudah dikurangi
                    await userForRefund.save({ session: providerErrorRefundSession });
                    await providerErrorRefundSession.commitTransaction();
                    console.log(`[TRANSACTION_REFUND_PROVIDER_ERROR] Saldo Rp ${priceForTransaction} dikembalikan (provider error) untuk user ${userId}, tx ${refIdInternal}. Saldo akhir: ${userForRefund.balance}.`);
                } else {
                     await providerErrorRefundSession.abortTransaction();
                     console.error(`[TRANSACTION_REFUND_FAIL_PROVIDER_ERROR] Gagal refund (provider error): User ${userId} tidak ditemukan untuk tx ${refIdInternal}.`);
                }
            } catch (refundError) {
                 await providerErrorRefundSession.abortTransaction();
                 console.error(`[TRANSACTION_REFUND_ERROR_PROVIDER_ERROR] Error saat proses refund (provider error) untuk tx ${refIdInternal}:`, refundError);
            } finally {
                providerErrorRefundSession.endSession();
            }

            await Transaction.updateOne(
                { ref_id_internal: refIdInternal },
                { status: 'FAILED_SYSTEM', message: `Gagal hubungi provider: ${providerError.message.substring(0, 250)}`, last_updated: new Date() }
            );
            const finalUserAfterProviderError = await User.findById(userId).select('balance'); // Cek saldo akhir
            res.status(500).json({ success: false, message: providerError.message || "Gagal menghubungi provider.", data: { new_balance: finalUserAfterProviderError ? finalUserAfterProviderError.balance : initialUserBalance} });
        }

    } catch (error) { // Error pada operasi DB awal (sebelum panggil provider)
        await session.abortTransaction();
        console.error(`Transaction process error for Ref ${refIdInternal}, User ${userId}:`, error);
        res.status(500).json({ success: false, message: error.message || "Gagal memproses transaksi internal." });
    } finally {
        session.endSession();
    }
});

app.get('/api/transactions/status/:refIdInternal', authenticateToken, async (req, res) => {
    const refIdInternal = req.params.refIdInternal;
    if (!refIdInternal) return res.status(400).json({ success: false, message: "Ref ID Internal diperlukan." });
    try {
        const transaction = await Transaction.findOne({ ref_id_internal: refIdInternal, userId: req.user.userId });
        if (transaction) {
            return res.json({ success: true, data: transaction });
        } else {
            return res.status(404).json({ success: false, message: "Transaksi tidak ditemukan atau bukan milik Anda." });
        }
    } catch (error) {
        console.error("Error fetching transaction status from DB for refId " + refIdInternal + ":", error);
        return res.status(500).json({ success: false, message: "Gagal mengambil status transaksi." });
    }
});

app.get('/api/transactions/history', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default 20 transaksi per halaman
        const skip = (page - 1) * limit;

        const transactions = await Transaction.find({ userId: req.user.userId })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        const totalTransactions = await Transaction.countDocuments({ userId: req.user.userId });
        const totalPages = Math.ceil(totalTransactions / limit);

        res.json({
            success: true,
            data: transactions || [],
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalTransactions: totalTransactions,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error("Error fetching transaction history from DB:", error);
        res.status(500).json({ success: false, message: "Gagal mengambil riwayat transaksi." });
    }
});

// --- Rute API Admin (LENGKAPI SEMUA DARI server.txt ANDA) ---
app.get('/api/admin/stats', authenticateToken, authenticateAdmin, async (req, res) => {
     try {
        const totalUsers = await User.countDocuments();
        const totalSuccessfulTransactions = await Transaction.countDocuments({ status: 'SUKSES' });
        const totalSuccessfulDeposits = await Deposit.countDocuments({ status: 'SUCCESS' });
        const revenueAggregation = await Transaction.aggregate([
            { $match: { status: 'SUKSES' } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]);
        const totalTransactionRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;
        res.json({
            success: true,
            data: { totalUsers, totalSuccessfulTransactions, totalSuccessfulDeposits, totalTransactionRevenue }
        });
    } catch (error) {
         console.error("Error fetching stats for admin:", error);
         res.status(500).json({ success: false, message: "Gagal mengambil data statistik." });
    }
});

app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-passwordHash -passwordResetToken -passwordResetExpires').sort({ createdAt: -1 });
        res.json({ success: true, data: users.map(u => ({...u.toObject(), id: u._id })) });
    } catch (error) {
         console.error("Error fetching users for admin:", error);
         res.status(500).json({ success: false, message: "Gagal mengambil data pengguna." });
    }
});

app.put('/api/admin/users/:userId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { userId } = req.params;
    const { username, email, balance, isAdmin, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "User ID tidak valid." });
    }
    try {
        const userToUpdate = await User.findById(userId);
        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
        }
        const updateData = {};
        if (username && username.toLowerCase() !== userToUpdate.username) {
            const existingUser = await User.findOne({ username: username.toLowerCase(), _id: { $ne: userId } });
            if (existingUser) return res.status(400).json({ success: false, message: "Username sudah digunakan oleh pengguna lain." });
            updateData.username = username.toLowerCase();
        }
        if (email && email.toLowerCase() !== userToUpdate.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
            if (existingUser) return res.status(400).json({ success: false, message: "Email sudah digunakan oleh pengguna lain." });
            updateData.email = email.toLowerCase();
        }
        if (typeof balance !== 'undefined' && balance !== null) {
            const newBalance = parseFloat(balance);
            if (isNaN(newBalance) || newBalance < 0) {
                return res.status(400).json({ success: false, message: "Format saldo tidak valid (harus angka positif)." });
            }
            updateData.balance = newBalance;
        }
        if (typeof isAdmin === 'boolean' && isAdmin !== userToUpdate.isAdmin) {
            if (userToUpdate.isAdmin && !isAdmin) {
                if (req.user.userId === userId) {
                     return res.status(400).json({ success: false, message: "Admin tidak dapat mengubah status admin dirinya sendiri menjadi non-admin." });
                }
                const adminCount = await User.countDocuments({ isAdmin: true });
                if (adminCount <= 1) {
                    return res.status(400).json({ success: false, message: "Tidak dapat mengubah status admin. Setidaknya harus ada satu admin tersisa." });
                }
            }
            updateData.isAdmin = isAdmin;
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: "Password baru minimal 6 karakter." });
            }
            const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
            updateData.passwordHash = await bcrypt.hash(password, salt);
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "Tidak ada data yang diubah." });
        }
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select('-passwordHash -passwordResetToken -passwordResetExpires');
        console.log(`[ADMIN_EDIT_USER] User ${userToUpdate.username} (ID: ${userId}) diupdate oleh admin ${req.user.username}. Data diubah: ${Object.keys(updateData).join(', ')}`);
        res.json({ success: true, message: "Data pengguna berhasil diupdate.", user: {...updatedUser.toObject(), id: updatedUser._id} });
    } catch (error) {
        console.error("Error updating user by admin:", error);
        res.status(500).json({ success: false, message: "Gagal mengupdate pengguna: " + error.message });
    }
});

app.delete('/api/admin/users/:userId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: "User ID tidak valid." });
    }
    if (req.user.userId === userId) {
        return res.status(400).json({ success: false, message: "Admin tidak dapat menghapus akunnya sendiri." });
    }
    try {
        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
        }
        if (userToDelete.isAdmin) {
            const adminCount = await User.countDocuments({ isAdmin: true });
            if (adminCount <= 1) {
                return res.status(400).json({ success: false, message: "Tidak dapat menghapus admin terakhir. Harus ada minimal satu admin." });
            }
        }
        await User.findByIdAndDelete(userId);
        console.log(`[ADMIN_DELETE_USER] User ${userToDelete.username} (ID: ${userId}) dihapus oleh admin ${req.user.username}.`);
        res.json({ success: true, message: `Pengguna ${userToDelete.username} berhasil dihapus.` });
    } catch (error) {
        console.error("Error deleting user by admin:", error);
        res.status(500).json({ success: false, message: "Gagal menghapus pengguna: " + error.message });
    }
});

app.get('/api/admin/transactions', authenticateToken, authenticateAdmin, async (req, res) => {
     try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const transactions = await Transaction.find().populate('userId', 'username email').sort({ timestamp: -1 }).skip(skip).limit(limit);
        const totalTransactions = await Transaction.countDocuments();
        res.json({ success: true, data: transactions, pagination: {currentPage: page, totalPages: Math.ceil(totalTransactions / limit), totalTransactions} });
    } catch (error) {
         console.error("Error fetching transactions for admin:", error);
         res.status(500).json({ success: false, message: "Gagal mengambil data transaksi." });
    }
});

app.get('/api/admin/deposits', authenticateToken, authenticateAdmin, async (req, res) => {
     try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const deposits = await Deposit.find().populate('userId', 'username email').sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalDeposits = await Deposit.countDocuments();
        res.json({ success: true, data: deposits, pagination: {currentPage: page, totalPages: Math.ceil(totalDeposits / limit), totalDeposits} });
    } catch (error) {
         console.error("Error fetching deposits for admin:", error);
         res.status(500).json({ success: false, message: "Gagal mengambil data deposit." });
    }
});


app.get('/healthz', (req, res) => {
    const healthStatus = {
        status: "UP",
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
    };
    if (mongoose.connection.readyState === 1) {
        res.status(200).json(healthStatus);
    } else {
        res.status(503).json(healthStatus);
    }
});

let processedMutationRefs = new Set();
let isPollingMutations = false;

async function checkQrisMutations() {
    if (isPollingMutations) {
        console.log('[MUTATION_POLL] Pemeriksaan mutasi masih berjalan, skip iterasi ini.');
        return;
    }
    isPollingMutations = true;
    console.log('[MUTATION_POLL] Memulai pemeriksaan mutasi QRIS OkeConnect...');

    const memberID = OKE_CONNECT_H2H_CONFIG.MEMBER_ID;
    const signature = OKE_CONNECT_H2H_CONFIG.API_KEY_FOR_MUTATION_SIGNATURE; // Ini seharusnya signature atau API Key khusus mutasi

    if (!memberID || !signature || memberID === 'YOUR_OKE_MEMBER_ID' || signature === 'YOUR_OKE_API_KEY_FOR_MUTATION' || !OKE_CONNECT_H2H_CONFIG.API_MUTATION_QRIS_URL){
         console.warn('[MUTATION_POLL] Kredensial API mutasi (memberID/signature/API_MUTATION_QRIS_URL) belum diset atau tidak valid di settings.js. Aborting poll.');
         isPollingMutations = false; return;
    }
    const mutationUrl = `${OKE_CONNECT_H2H_CONFIG.API_MUTATION_QRIS_URL}/${memberID}/${signature}`; // Sesuaikan format URL jika berbeda

    try {
        const response = await axios.get(mutationUrl, { timeout: 15000 });
        if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
            const mutations = response.data.data;
            if(mutations.length > 0) console.log(`[MUTATION_POLL] Ditemukan ${mutations.length} mutasi dari OkeConnect.`);

            for (const mutation of mutations) {
                // Buat ID referensi yang unik untuk setiap mutasi untuk mencegah proses ganda
                const mutationRef = mutation.issuer_reff || mutation.id || `${mutation.date}-${mutation.amount}-${mutation.brand_name}-${Math.random().toString(36).substring(7)}`;

                if (mutation.type === 'CR' && !processedMutationRefs.has(mutationRef)) { // CR biasanya Kredit/Masuk
                    const mutationAmount = parseFloat(mutation.amount);
                    if (isNaN(mutationAmount) || mutationAmount <= 0) {
                        console.warn(`[MUTATION_POLL] Mutasi kredit dengan jumlah tidak valid dilewati: Ref=${mutationRef}, Amount=${mutation.amount}`);
                        processedMutationRefs.add(mutationRef); // Tandai sudah diproses agar tidak dicek lagi
                        continue;
                    }
                    console.log(`[MUTATION_POLL] Memproses mutasi kredit baru: Ref=${mutationRef}, Amount=${mutationAmount}`);

                    // Cari deposit yang cocok dengan jumlah unik dan status WAITING_TRANSFER
                    const deposit = await Deposit.findOneAndUpdate(
                        { uniqueTransferAmount: mutationAmount, status: 'WAITING_TRANSFER' },
                        { $set: { status: 'PROCESSING', okeTransactionId: mutation.id || mutation.issuer_reff, mutationDetails: mutation } },
                        { new: true } // Kembalikan dokumen yang sudah diupdate
                    );

                    if (deposit) {
                        const session = await mongoose.startSession();
                        session.startTransaction();
                        try {
                            const userToUpdate = await User.findById(deposit.userId).session(session);
                            if (!userToUpdate) {
                                throw new Error(`User ID ${deposit.userId} tidak ditemukan untuk deposit ${deposit.orderId}.`);
                            }
                            userToUpdate.balance += deposit.desiredAmount; // Tambah saldo sesuai jumlah yang diinginkan user
                            await userToUpdate.save({ session });

                            deposit.status = 'SUCCESS';
                            deposit.processedAt = new Date();
                            await deposit.save({ session });

                            await session.commitTransaction();
                            console.log(`[MUTATION_POLL] BERHASIL: Saldo user ${userToUpdate.username} (ID: ${userToUpdate._id}) ditambah Rp ${deposit.desiredAmount.toLocaleString('id-ID')}. Deposit ${deposit.orderId} status: SUCCESS.`);
                            processedMutationRefs.add(mutationRef);
                        } catch (updateError){
                             await session.abortTransaction();
                             console.error(`[MUTATION_POLL] Error saat update saldo/deposit ${deposit.orderId}:`, updateError.message);
                             // Kembalikan status deposit ke WAITING atau set ke PROCESSING_ERROR agar bisa diinvestigasi
                             await Deposit.updateOne({ _id: deposit._id }, { status: 'PROCESSING_ERROR', message: updateError.message });
                             // Jangan tambahkan ke processedMutationRefs jika gagal agar bisa dicoba lagi, atau tambahkan jika errornya permanen
                             // processedMutationRefs.add(mutationRef);
                        } finally {
                            session.endSession();
                        }
                    } else {
                         console.log(`[MUTATION_POLL] INFO: Mutasi kredit Rp ${mutationAmount} (Ref: ${mutationRef}) tidak cocok dengan deposit yang menunggu, atau sudah diproses sebelumnya.`);
                         // Tandai sudah dicek jika tidak ada yang cocok agar tidak selalu query DB untuk jumlah yang sama
                         // Cek dulu apakah ada deposit yang statusnya selain WAITING_TRANSFER dengan jumlah itu
                         const alreadyProcessedDeposit = await Deposit.findOne({ uniqueTransferAmount: mutationAmount, status: { $ne: 'WAITING_TRANSFER' } });
                         if(alreadyProcessedDeposit || !await Deposit.findOne({ uniqueTransferAmount: mutationAmount }) ) {
                            processedMutationRefs.add(mutationRef);
                         }
                    }
                } else if (mutation.type !== 'CR' && !processedMutationRefs.has(mutationRef)){
                    // Jika bukan kredit (misal Debit), tandai saja sudah diproses
                    processedMutationRefs.add(mutationRef);
                }
            }
        } else if (response.data && response.data.status !== 'success') {
            console.warn('[MUTATION_POLL] Respons API Mutasi OkeConnect tidak sukses:', response.data);
        } else {
            console.log('[MUTATION_POLL] Tidak ada mutasi baru atau format data tidak sesuai.');
        }
    } catch (error) {
        console.error('[MUTATION_POLL] Error saat memeriksa mutasi OkeConnect:', error.response?.data || error.message);
    }
    finally {
        isPollingMutations = false;
    }
}

if (DEPOSIT_POLLING_INTERVAL_MS && DEPOSIT_POLLING_INTERVAL_MS >= 15000 && OKE_CONNECT_H2H_CONFIG && OKE_CONNECT_H2H_CONFIG.API_MUTATION_QRIS_URL && OKE_CONNECT_H2H_CONFIG.MEMBER_ID && OKE_CONNECT_H2H_CONFIG.API_KEY_FOR_MUTATION_SIGNATURE) {
    console.log(`Memulai polling mutasi QRIS OkeConnect setiap ${DEPOSIT_POLLING_INTERVAL_MS / 1000} detik...`);
    setInterval(checkQrisMutations, DEPOSIT_POLLING_INTERVAL_MS);
    setTimeout(checkQrisMutations, 5000); // Jalankan sekali setelah 5 detik server start
} else {
    console.warn("Polling mutasi deposit OkeConnect tidak dimulai. Pastikan DEPOSIT_POLLING_INTERVAL_MS (min 15000) dan konfigurasi API_MUTATION_QRIS_URL, MEMBER_ID, API_KEY_FOR_MUTATION_SIGNATURE sudah lengkap di settings.js.");
}

app.use((err, req, res, next) => {
    console.error("UNHANDLED ERROR:", err.stack || err.message || err);
    if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Terjadi kesalahan internal pada server." });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server Panz Store (atau nama aplikasi Anda dari settings.APP_NAME) berjalan di ${APP_BASE_URL}`);
    console.log("Pastikan semua konfigurasi di settings.js sudah benar.");
});

function shutdown(signal) {
    console.log(`${signal} diterima. Proses mematikan server dengan benar...`);
    isPollingMutations = true; // Hentikan polling baru
    server.close(async () => {
        console.log('Server HTTP telah ditutup.');
        await mongoose.disconnect();
        console.log('Koneksi MongoDB ditutup.');
        console.log('Server berhasil dimatikan.');
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Gagal mematikan server dengan benar dalam batas waktu, paksa keluar.');
        process.exit(1);
    }, 15000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

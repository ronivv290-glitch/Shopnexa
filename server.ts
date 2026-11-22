import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import {
  db,
  DB_PATH,
  initDatabase,
  getAllProducts,
  getProductById,
  getSiteSettings,
  saveSiteSettings,
  recalculateProductMetrics,
  recalculateProductRating,
  hydrateOrder,
} from './server/db.ts';
import {
  attachOptionalAuth,
  requireAuth,
  requireAdmin,
  hashPassword,
  verifyPassword,
  signToken,
  isValidSafeUrl,
  sanitizeString,
  type AuthenticatedRequest,
} from './server/security.ts';
import { sendTelegramAlert, isTelegramConfigured } from './server/telegram.ts';
import { isGatewayEnvConfigured, verifyGatewayTransaction } from './server/payments.ts';
import type { OrderStatus, PaymentMethod, PaymentStatus } from './src/types.ts';

initDatabase();

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));
app.use(attachOptionalAuth);

// Secure uploads directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10) || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported media format'));
    }
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

function logServerError(route: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  try {
    db.prepare(`INSERT INTO error_logs (level, route, message) VALUES ('error', ?, ?)`).run(
      route,
      message.slice(0, 1000)
    );
  } catch {
    // ignore logging failure
  }
}

function createNotification(userId: number | null, type: string, title: string, message: string): void {
  try {
    db.prepare(`INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)`).run(
      userId,
      type,
      title,
      message
    );
  } catch {
    // ignore
  }
}

// ---------- LIVE EXCHANGE RATES ----------
let cachedRates: { base: string; rates: Record<string, number>; fetchedAt: number } = {
  base: 'USD',
  rates: {
    USD: 1,
    BDT: 119.5,
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.67,
    SGD: 1.34,
    CAD: 1.39,
    AUD: 1.52,
    INR: 84.4,
  },
  fetchedAt: 0,
};

app.get('/api/exchange-rates', async (_req, res) => {
  const now = Date.now();
  if (now - cachedRates.fetchedAt > 1000 * 60 * 60 * 6) {
    try {
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      if (resp.ok) {
        const data = (await resp.json()) as { rates?: Record<string, number> };
        if (data.rates && data.rates.BDT) {
          cachedRates = {
            base: 'USD',
            rates: {
              USD: 1,
              BDT: Number(data.rates.BDT.toFixed(2)),
              EUR: Number((data.rates.EUR || 0.92).toFixed(4)),
              GBP: Number((data.rates.GBP || 0.79).toFixed(4)),
              AED: Number((data.rates.AED || 3.67).toFixed(4)),
              SGD: Number((data.rates.SGD || 1.34).toFixed(4)),
              CAD: Number((data.rates.CAD || 1.39).toFixed(4)),
              AUD: Number((data.rates.AUD || 1.52).toFixed(4)),
              INR: Number((data.rates.INR || 84.4).toFixed(2)),
            },
            fetchedAt: now,
          };
        }
      }
    } catch {
      // keep fallback cached rates
    }
  }
  res.json(cachedRates);
});

// ---------- STOREFRONT BOOTSTRAP ----------
app.get('/api/store/bootstrap', (_req, res) => {
  const settings = getSiteSettings();
  const categories = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status != 'draft') AS product_count
       FROM categories c
       ORDER BY c.sort_order ASC, c.id ASC`
    )
    .all();
  const products = getAllProducts().filter((p) => p.status !== 'draft');
  const paymentSettings = (db.prepare(`SELECT * FROM payment_settings ORDER BY id ASC`).all() as any[]).map((p) => ({
    ...p,
    is_enabled: p.is_enabled === 1,
    sandbox_mode: p.sandbox_mode === 1,
    env_configured: isGatewayEnvConfigured(p.gateway),
  }));
  const shippingZones = (db.prepare(`SELECT * FROM shipping_zones WHERE is_active = 1`).all() as any[]).map((z) => ({
    ...z,
    is_active: z.is_active === 1,
  }));
  const approvedReviews = (
    db
      .prepare(
        `SELECT r.*, p.name AS product_name
         FROM reviews r
         LEFT JOIN products p ON p.id = r.product_id
         WHERE r.status = 'approved'
         ORDER BY r.id DESC
         LIMIT 24`
      )
      .all() as any[]
  ).map((r) => ({
    ...r,
    images: JSON.parse(r.images_json || '[]'),
    is_verified_purchase: r.is_verified_purchase === 1,
  }));

  res.json({
    settings: { ...settings, telegram_configured: isTelegramConfigured() },
    categories,
    products,
    paymentSettings,
    shippingZones,
    reviews: approvedReviews,
  });
});

// ---------- FILE UPLOAD ----------
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No valid media file uploaded' });
    return;
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---------- CUSTOMER AUTHENTICATION ----------
app.post('/api/auth/register', authLimiter, (req, res) => {
  const name = sanitizeString(req.body.name, 120);
  const email = sanitizeString(req.body.email, 160).toLowerCase();
  const phone = sanitizeString(req.body.phone, 40);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || !email || !email.includes('@') || password.length < 6) {
    res.status(400).json({ error: 'Valid name, email, and password (min 6 characters) are required.' });
    return;
  }

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare(`INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, 'customer', 'active')`)
    .run(name, email, phone, passwordHash);

  const userId = Number(result.lastInsertRowid);
  createNotification(
    userId,
    'registration',
    'Welcome to SHOPNEXA',
    `Your customer account (${email}) is active. Enjoy direct checkout and order tracking.`
  );
  void sendTelegramAlert('new_customer', `New Customer Registered: ${name} (${email})`);

  const user = db
    .prepare(`SELECT id, name, email, phone, role, avatar_url, status, created_at FROM users WHERE id = ?`)
    .get(userId) as any;

  const token = signToken({ userId: user.id, email: user.email, role: 'customer' });
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const email = sanitizeString(req.body.email, 160).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'This account is currently suspended. Contact SHOPNEXA Support.' });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const { password_hash: _p, reset_token: _r, reset_expires: _e, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post('/api/auth/forgot-password', authLimiter, (req, res) => {
  const email = sanitizeString(req.body.email, 160).toLowerCase();
  const user = db.prepare(`SELECT id, name FROM users WHERE email = ?`).get(email) as
    | { id: number; name: string }
    | undefined;
  if (!user) {
    res.json({ message: 'If an account matches that email, a reset code has been generated.' });
    return;
  }
  const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expires = Math.floor(Date.now() / 1000) + 1800;
  db.prepare(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`).run(resetToken, expires, user.id);
  createNotification(
    user.id,
    'security',
    'Password Reset Requested',
    `Your password reset code is ${resetToken}. Valid for 30 minutes.`
  );
  res.json({
    message: 'Reset code generated and recorded in your account notification log.',
    resetCodePreview: resetToken,
  });
});

app.post('/api/auth/reset-password', authLimiter, (req, res) => {
  const email = sanitizeString(req.body.email, 160).toLowerCase();
  const resetCode = sanitizeString(req.body.resetCode, 32).toUpperCase();
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
  const now = Math.floor(Date.now() / 1000);
  if (!user || !user.reset_token || user.reset_token !== resetCode || user.reset_expires < now) {
    res.status(400).json({ error: 'Invalid or expired reset code.' });
    return;
  }

  db.prepare(`UPDATE users SET password_hash = ?, reset_token = '', reset_expires = 0 WHERE id = ?`).run(
    hashPassword(newPassword),
    user.id
  );
  res.json({ message: 'Password reset successfully. You may now sign in.' });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.auth!.role === 'admin' && req.auth!.userId === 0) {
    res.json({
      user: {
        id: 0,
        name: 'SHOPNEXA Administrator',
        email: req.auth!.email,
        phone: '',
        role: 'admin',
        avatar_url: '',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    });
    return;
  }
  const user = db
    .prepare(`SELECT id, name, email, phone, role, avatar_url, status, created_at FROM users WHERE id = ?`)
    .get(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const name = sanitizeString(req.body.name, 120);
  const phone = sanitizeString(req.body.phone, 40);
  const avatarUrl = sanitizeString(req.body.avatar_url, 500);
  if (avatarUrl && !isValidSafeUrl(avatarUrl)) {
    res.status(400).json({ error: 'Invalid avatar URL' });
    return;
  }
  db.prepare(`UPDATE users SET name = COALESCE(NULLIF(?, ''), name), phone = ?, avatar_url = ? WHERE id = ?`).run(
    name,
    phone,
    avatarUrl,
    req.auth!.userId
  );
  const updated = db
    .prepare(`SELECT id, name, email, phone, role, avatar_url, status, created_at FROM users WHERE id = ?`)
    .get(req.auth!.userId);
  res.json({ user: updated });
});

app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
  const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }
  const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.auth!.userId) as any;
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(newPassword), req.auth!.userId);
  res.json({ message: 'Password updated successfully.' });
});

// ---------- ADMIN AUTHENTICATION (username + password with env override) ----------
app.get('/api/admin/auth/status', (_req, res) => {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  const row = db.prepare(`SELECT admin_username, setup_completed FROM admin_config WHERE id = 1`).get() as
    | { admin_username: string; setup_completed: number }
    | undefined;
  res.json({
    envConfigured: Boolean(envPass),
    needsInitialSetup: !envPass && (!row || row.setup_completed !== 1),
    requiresUsername: true,
  });
});

app.post('/api/admin/auth/setup', authLimiter, (req, res) => {
  if (process.env.ADMIN_PASSCODE?.trim()) {
    res.status(403).json({ error: 'Admin passcode is managed via server environment secret.' });
    return;
  }
  const row = db.prepare(`SELECT setup_completed FROM admin_config WHERE id = 1`).get() as
    | { setup_completed: number }
    | undefined;
  if (row && row.setup_completed === 1) {
    res.status(409).json({ error: 'Admin password has already been claimed.' });
    return;
  }
  const username = sanitizeString(req.body.username || 'Robiul', 60);
  const passcode = typeof req.body.passcode === 'string' ? req.body.passcode : '';
  if (passcode.length < 6) {
    res.status(400).json({ error: 'Admin password must be at least 6 characters.' });
    return;
  }
  const hash = hashPassword(passcode);
  db.prepare(
    `UPDATE admin_config SET admin_username = ?, admin_password_hash = ?, setup_completed = 1, updated_at = datetime('now') WHERE id = 1`
  ).run(username, hash);
  const token = signToken({ userId: 0, email: 'admin@shopnexa.global', role: 'admin' });
  res.json({ token, role: 'admin', username });
});

app.post('/api/admin/auth/login', authLimiter, (req, res) => {
  const usernameInput = sanitizeString(req.body.username || '', 60);
  const passcode = typeof req.body.passcode === 'string' ? req.body.passcode : '';
  const envPass = process.env.ADMIN_PASSCODE?.trim();

  const row = db
    .prepare(`SELECT admin_username, admin_password_hash, setup_completed FROM admin_config WHERE id = 1`)
    .get() as { admin_username: string; admin_password_hash: string; setup_completed: number } | undefined;

  const expectedUsername = (row?.admin_username || 'Robiul').toLowerCase();
  if (usernameInput && usernameInput.toLowerCase() !== expectedUsername) {
    res.status(401).json({ error: 'Invalid administrator username or password.' });
    return;
  }

  if (envPass) {
    if (passcode !== envPass) {
      res.status(401).json({ error: 'Invalid administrator username or password.' });
      return;
    }
    const token = signToken({ userId: 0, email: 'admin@shopnexa.global', role: 'admin' });
    res.json({ token, role: 'admin', username: row?.admin_username || 'Robiul' });
    return;
  }

  if (!row || row.setup_completed !== 1) {
    res.status(400).json({ error: 'Initial administrator setup is required first.' });
    return;
  }
  if (!verifyPassword(passcode, row.admin_password_hash)) {
    res.status(401).json({ error: 'Invalid administrator username or password.' });
    return;
  }
  const token = signToken({ userId: 0, email: 'admin@shopnexa.global', role: 'admin' });
  res.json({ token, role: 'admin', username: row.admin_username });
});

app.put('/api/admin/auth/credentials', requireAdmin, (req, res) => {
  const newUsername = sanitizeString(req.body.username, 60);
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  if (!newUsername) {
    res.status(400).json({ error: 'Admin username is required.' });
    return;
  }
  if (newPassword && newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }
  if (newPassword) {
    db.prepare(
      `UPDATE admin_config SET admin_username = ?, admin_password_hash = ?, updated_at = datetime('now') WHERE id = 1`
    ).run(newUsername, hashPassword(newPassword));
  } else {
    db.prepare(`UPDATE admin_config SET admin_username = ?, updated_at = datetime('now') WHERE id = 1`).run(newUsername);
  }
  res.json({ success: true, username: newUsername });
});

// ---------- CUSTOMER ADDRESSES ----------
app.get('/api/addresses', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(`SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`)
    .all(req.auth!.userId) as any[];
  res.json(rows.map((r) => ({ ...r, is_default: r.is_default === 1 })));
});

app.post('/api/addresses', requireAuth, (req: AuthenticatedRequest, res) => {
  const b = req.body || {};
  const fullName = sanitizeString(b.full_name, 120);
  const mobile = sanitizeString(b.mobile, 40);
  const country = sanitizeString(b.country || 'Bangladesh', 80);
  if (!fullName || !mobile) {
    res.status(400).json({ error: 'Full name and mobile number are required.' });
    return;
  }
  if (b.is_default) {
    db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(req.auth!.userId);
  }
  const result = db
    .prepare(
      `INSERT INTO addresses (
        user_id, label, is_default, full_name, mobile, alt_phone, email, country,
        division, district, upazila, thana, union_name, municipality, city, village, area,
        road_number, house_number, apartment_number, floor_number, state_province, street_address,
        postal_code, landmark, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.auth!.userId,
      sanitizeString(b.label || 'Home', 40),
      b.is_default ? 1 : 0,
      fullName,
      mobile,
      sanitizeString(b.alt_phone, 40),
      sanitizeString(b.email, 160),
      country,
      sanitizeString(b.division, 80),
      sanitizeString(b.district, 80),
      sanitizeString(b.upazila, 80),
      sanitizeString(b.thana, 80),
      sanitizeString(b.union_name, 80),
      sanitizeString(b.municipality, 80),
      sanitizeString(b.city, 80),
      sanitizeString(b.village, 80),
      sanitizeString(b.area, 120),
      sanitizeString(b.road_number, 60),
      sanitizeString(b.house_number, 60),
      sanitizeString(b.apartment_number, 60),
      sanitizeString(b.floor_number, 40),
      sanitizeString(b.state_province, 80),
      sanitizeString(b.street_address, 240),
      sanitizeString(b.postal_code, 30),
      sanitizeString(b.landmark, 160),
      sanitizeString(b.instructions, 300)
    );
  const created = db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(result.lastInsertRowid) as any;
  res.status(201).json({ ...created, is_default: created.is_default === 1 });
});

app.put('/api/addresses/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`).get(id, req.auth!.userId);
  if (!existing) {
    res.status(404).json({ error: 'Address not found' });
    return;
  }
  const b = req.body || {};
  if (b.is_default) {
    db.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`).run(req.auth!.userId);
  }
  db.prepare(
    `UPDATE addresses SET
      label = ?, is_default = ?, full_name = ?, mobile = ?, alt_phone = ?, email = ?, country = ?,
      division = ?, district = ?, upazila = ?, thana = ?, union_name = ?, municipality = ?, city = ?,
      village = ?, area = ?, road_number = ?, house_number = ?, apartment_number = ?, floor_number = ?,
      state_province = ?, street_address = ?, postal_code = ?, landmark = ?, instructions = ?
    WHERE id = ? AND user_id = ?`
  ).run(
    sanitizeString(b.label || 'Home', 40),
    b.is_default ? 1 : 0,
    sanitizeString(b.full_name, 120),
    sanitizeString(b.mobile, 40),
    sanitizeString(b.alt_phone, 40),
    sanitizeString(b.email, 160),
    sanitizeString(b.country || 'Bangladesh', 80),
    sanitizeString(b.division, 80),
    sanitizeString(b.district, 80),
    sanitizeString(b.upazila, 80),
    sanitizeString(b.thana, 80),
    sanitizeString(b.union_name, 80),
    sanitizeString(b.municipality, 80),
    sanitizeString(b.city, 80),
    sanitizeString(b.village, 80),
    sanitizeString(b.area, 120),
    sanitizeString(b.road_number, 60),
    sanitizeString(b.house_number, 60),
    sanitizeString(b.apartment_number, 60),
    sanitizeString(b.floor_number, 40),
    sanitizeString(b.state_province, 80),
    sanitizeString(b.street_address, 240),
    sanitizeString(b.postal_code, 30),
    sanitizeString(b.landmark, 160),
    sanitizeString(b.instructions, 300),
    id,
    req.auth!.userId
  );
  const updated = db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(id) as any;
  res.json({ ...updated, is_default: updated.is_default === 1 });
});

app.delete('/api/addresses/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare(`DELETE FROM addresses WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.auth!.userId);
  res.json({ success: true });
});

// ---------- WISHLIST ----------
app.get('/api/wishlist', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare(`SELECT product_id FROM wishlist_items WHERE user_id = ?`).all(req.auth!.userId) as Array<{
    product_id: number;
  }>;
  res.json(rows.map((r) => r.product_id));
});

app.post('/api/wishlist/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
  const productId = Number(req.body.productId);
  const existing = db
    .prepare(`SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?`)
    .get(req.auth!.userId, productId);
  if (existing) {
    db.prepare(`DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?`).run(req.auth!.userId, productId);
    res.json({ wishlisted: false });
  } else {
    db.prepare(`INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)`).run(req.auth!.userId, productId);
    res.json({ wishlisted: true });
  }
});

// ---------- CART PERSISTENCE (DB-backed for signed-in customers) ----------
app.get('/api/cart', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare(`SELECT * FROM cart_items WHERE user_id = ?`).all(req.auth!.userId) as any[];
  res.json(rows);
});

app.post('/api/cart/sync', requireAuth, (req: AuthenticatedRequest, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM cart_items WHERE user_id = ?`).run(req.auth!.userId);
    const ins = db.prepare(
      `INSERT INTO cart_items (user_id, product_id, color_id, size_id, variation_id, quantity) VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const item of items) {
      if (item.product_id && item.quantity > 0) {
        ins.run(
          req.auth!.userId,
          Number(item.product_id),
          item.color_id ? Number(item.color_id) : null,
          item.size_id ? Number(item.size_id) : null,
          item.variation_id ? Number(item.variation_id) : null,
          Math.max(1, Number(item.quantity))
        );
      }
    }
  });
  tx();
  res.json({ success: true });
});

// ---------- AFFILIATE CLICK TRACKING ----------
app.post('/api/affiliate/track', (req: AuthenticatedRequest, res) => {
  const productId = Number(req.body.product_id);
  const product = getProductById(productId);
  if (!product || product.product_type !== 'affiliate' || !product.affiliate_url) {
    res.status(404).json({ error: 'Affiliate product or URL not found' });
    return;
  }
  if (!isValidSafeUrl(product.affiliate_url)) {
    res.status(400).json({ error: 'Invalid affiliate URL' });
    return;
  }

  db.prepare(
    `INSERT INTO affiliate_clicks (product_id, user_id, selected_color, selected_size, selected_model, destination_url, referrer)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    product.id,
    req.auth?.userId ?? null,
    sanitizeString(req.body.selected_color, 80),
    sanitizeString(req.body.selected_size, 80),
    sanitizeString(req.body.selected_model, 120),
    product.affiliate_url,
    sanitizeString(req.headers.referer || '', 240)
  );

  res.json({ redirectUrl: product.affiliate_url });
});

// ---------- COUPONS & SHIPPING CALCULATION ----------
app.post('/api/coupons/validate', (req, res) => {
  const code = sanitizeString(req.body.code, 40).toUpperCase();
  const subtotal = Number(req.body.subtotal || 0);
  const coupon = db.prepare(`SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1`).get(code) as any;
  if (!coupon) {
    res.status(404).json({ error: 'Coupon code is invalid or inactive.' });
    return;
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    res.status(400).json({ error: 'This coupon has expired.' });
    return;
  }
  if (coupon.used_count >= coupon.max_uses) {
    res.status(400).json({ error: 'Coupon usage limit reached.' });
    return;
  }
  if (subtotal < coupon.min_order_value) {
    res.status(400).json({ error: `Minimum order value of $${coupon.min_order_value} required.` });
    return;
  }
  const discount =
    coupon.discount_type === 'percentage'
      ? Number(((subtotal * coupon.discount_value) / 100).toFixed(2))
      : Math.min(subtotal, coupon.discount_value);
  res.json({
    valid: true,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    discount_amount: discount,
    campaign_name: coupon.campaign_name,
  });
});

app.post('/api/shipping/calculate', (req, res) => {
  const country = sanitizeString(req.body.country || 'Bangladesh', 80);
  const district = sanitizeString(req.body.district, 80);
  const subtotal = Number(req.body.subtotal || 0);

  const zones = db.prepare(`SELECT * FROM shipping_zones WHERE is_active = 1`).all() as any[];
  let matched =
    zones.find(
      (z) =>
        z.country.toLowerCase() === country.toLowerCase() &&
        z.district.toLowerCase() === district.toLowerCase()
    ) ||
    zones.find((z) => z.country.toLowerCase() === country.toLowerCase()) ||
    zones.find((z) => z.country.toLowerCase() === 'international') ||
    zones[0];

  if (!matched) {
    res.json({ shipping_charge: 0, estimated_days: '3–7 Business Days', zone_name: 'Standard' });
    return;
  }

  const freeThreshold = Number(matched.free_shipping_threshold || 0);
  const charge = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : Number(matched.base_fee || 0);
  res.json({
    shipping_charge: charge,
    estimated_days: matched.estimated_days,
    zone_name: matched.name,
    free_shipping_threshold: freeThreshold,
  });
});

// ---------- DIRECT ORDER CHECKOUT (OWN PRODUCTS ONLY) ----------
app.post('/api/orders', async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body || {};
    const items = Array.isArray(b.items) ? b.items : [];
    if (items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const address = b.address || {};
    const customerName = sanitizeString(address.full_name || b.customer_name, 120);
    const customerEmail = sanitizeString(address.email || b.customer_email, 160);
    const customerPhone = sanitizeString(address.mobile || b.customer_phone, 40);
    const country = sanitizeString(address.country || 'Bangladesh', 80);
    const paymentMethod = sanitizeString(b.payment_method, 40) as PaymentMethod;
    const transactionId = sanitizeString(b.transaction_id, 120);
    const couponCode = sanitizeString(b.coupon_code, 40).toUpperCase();

    if (!customerName || !customerEmail || !customerPhone) {
      res.status(400).json({ error: 'Customer name, email, and mobile number are required.' });
      return;
    }

    if (country.toLowerCase() === 'bangladesh') {
      if (!address.district || !address.postal_code) {
        res.status(400).json({ error: 'District and Postal Code are required for Bangladesh delivery.' });
        return;
      }
      if (!['bkash', 'nagad', 'cod'].includes(paymentMethod)) {
        res.status(400).json({ error: 'Select bKash, Nagad, or Cash on Delivery for Bangladesh orders.' });
        return;
      }
    } else {
      if (!address.city || !address.street_address || !address.postal_code) {
        res.status(400).json({ error: 'City, street address, and postal/ZIP code are required.' });
        return;
      }
    }

    if ((paymentMethod === 'bkash' || paymentMethod === 'nagad') && !transactionId) {
      res.status(400).json({
        error: `Please enter your ${paymentMethod === 'bkash' ? 'bKash' : 'Nagad'} Transaction ID (TrxID). Never enter your PIN or OTP.`,
      });
      return;
    }

    const paySetting = db.prepare(`SELECT * FROM payment_settings WHERE gateway = ?`).get(paymentMethod) as any;
    if (!paySetting || paySetting.is_enabled !== 1) {
      res.status(400).json({ error: 'Selected payment method is currently disabled.' });
      return;
    }

    const txResult = db.transaction(() => {
      let subtotal = 0;
      const preparedItems: Array<{
        productId: number;
        name: string;
        image: string;
        sku: string;
        colorName: string;
        sizeLabel: string;
        modelName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        colorId: number | null;
        sizeId: number | null;
        variationId: number | null;
      }> = [];

      for (const reqItem of items) {
        const prod = getProductById(Number(reqItem.product_id));
        if (!prod) {
          throw new Error(`Product #${reqItem.product_id} does not exist.`);
        }
        if (prod.product_type !== 'own') {
          throw new Error(`${prod.name} is an affiliate partner product and cannot be ordered via SHOPNEXA checkout.`);
        }
        const qty = Math.max(1, Number(reqItem.quantity || 1));

        const selectedColor = reqItem.color_id ? prod.colors.find((c) => c.id === Number(reqItem.color_id)) : undefined;
        const selectedSize = reqItem.size_id ? prod.sizes.find((s) => s.id === Number(reqItem.size_id)) : undefined;
        const selectedVar = reqItem.variation_id
          ? prod.variations.find((v) => v.id === Number(reqItem.variation_id))
          : undefined;

        const availableStock = selectedVar
          ? selectedVar.stock
          : selectedColor && selectedSize
          ? Math.min(selectedColor.stock, selectedSize.stock)
          : selectedColor
          ? selectedColor.stock
          : selectedSize
          ? selectedSize.stock
          : prod.total_stock;

        if (availableStock < qty) {
          throw new Error(`Insufficient stock for ${prod.name}. Available: ${availableStock}`);
        }

        const unitPrice =
          selectedVar?.price ??
          selectedSize?.price_override ??
          selectedColor?.price_override ??
          (prod.sale_price > 0 ? prod.sale_price : prod.selling_price);

        const lineTotal = Number((unitPrice * qty).toFixed(2));
        subtotal += lineTotal;

        preparedItems.push({
          productId: prod.id,
          name: prod.name,
          image: selectedVar?.image_url || selectedColor?.images?.[0] || prod.images[0] || '',
          sku: selectedVar?.sku || selectedColor?.sku || prod.sku,
          colorName: selectedColor?.name || selectedVar?.color_name || '',
          sizeLabel: selectedSize?.label || selectedVar?.size_label || '',
          modelName: selectedVar?.model_name || selectedVar?.variant_name || '',
          quantity: qty,
          unitPrice,
          lineTotal,
          colorId: selectedColor?.id ?? null,
          sizeId: selectedSize?.id ?? null,
          variationId: selectedVar?.id ?? null,
        });
      }

      let discountAmount = 0;
      let appliedCoupon = '';
      if (couponCode) {
        const coupon = db.prepare(`SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1`).get(couponCode) as any;
        if (
          coupon &&
          (!coupon.expires_at || new Date(coupon.expires_at).getTime() >= Date.now()) &&
          coupon.used_count < coupon.max_uses &&
          subtotal >= coupon.min_order_value
        ) {
          discountAmount =
            coupon.discount_type === 'percentage'
              ? Number(((subtotal * coupon.discount_value) / 100).toFixed(2))
              : Math.min(subtotal, coupon.discount_value);
          appliedCoupon = coupon.code;
          db.prepare(`UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`).run(coupon.id);
        }
      }

      const zones = db.prepare(`SELECT * FROM shipping_zones WHERE is_active = 1`).all() as any[];
      const zone =
        zones.find(
          (z) =>
            z.country.toLowerCase() === country.toLowerCase() &&
            z.district.toLowerCase() === String(address.district || '').toLowerCase()
        ) ||
        zones.find((z) => z.country.toLowerCase() === country.toLowerCase()) ||
        zones.find((z) => z.country.toLowerCase() === 'international');

      const shippingCharge =
        zone && (zone.free_shipping_threshold === 0 || subtotal < zone.free_shipping_threshold)
          ? Number(zone.base_fee || 0)
          : 0;
      const estimatedDelivery = zone?.estimated_days || '3–7 Business Days';
      const taxAmount = 0;
      const finalTotal = Number(Math.max(0, subtotal - discountAmount + shippingCharge + taxAmount).toFixed(2));
      const orderNumber = `SNX-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const orderRes = db
        .prepare(
          `INSERT INTO orders (
            order_number, user_id, customer_name, customer_email, customer_phone, alt_phone,
            address_json, country, payment_method, payment_status, transaction_id, gateway_reference,
            order_status, subtotal, discount_amount, coupon_code, shipping_charge, tax_amount, final_total,
            currency, estimated_delivery, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, '', 'Pending', ?, ?, ?, ?, ?, ?, 'USD', ?, ?)`
        )
        .run(
          orderNumber,
          req.auth?.userId ?? null,
          customerName,
          customerEmail,
          customerPhone,
          sanitizeString(address.alt_phone, 40),
          JSON.stringify(address),
          country,
          paymentMethod,
          transactionId,
          subtotal,
          discountAmount,
          appliedCoupon,
          shippingCharge,
          taxAmount,
          finalTotal,
          estimatedDelivery,
          sanitizeString(b.notes, 300)
        );

      const orderId = Number(orderRes.lastInsertRowid);
      const insItem = db.prepare(
        `INSERT INTO order_items (
          order_id, product_id, product_name, product_image, sku, color_name, size_label, model_name, quantity, unit_price, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const pItem of preparedItems) {
        insItem.run(
          orderId,
          pItem.productId,
          pItem.name,
          pItem.image,
          pItem.sku,
          pItem.colorName,
          pItem.sizeLabel,
          pItem.modelName,
          pItem.quantity,
          pItem.unitPrice,
          pItem.lineTotal
        );
        if (pItem.variationId) {
          db.prepare(`UPDATE product_variations SET stock = MAX(0, stock - ?) WHERE id = ?`).run(
            pItem.quantity,
            pItem.variationId
          );
        }
        if (pItem.colorId) {
          db.prepare(`UPDATE product_colors SET stock = MAX(0, stock - ?) WHERE id = ?`).run(
            pItem.quantity,
            pItem.colorId
          );
        }
        if (pItem.sizeId) {
          db.prepare(`UPDATE product_sizes SET stock = MAX(0, stock - ?) WHERE id = ?`).run(
            pItem.quantity,
            pItem.sizeId
          );
        }
        if (!pItem.variationId && !pItem.colorId && !pItem.sizeId) {
          db.prepare(`UPDATE products SET total_stock = MAX(0, total_stock - ?) WHERE id = ?`).run(
            pItem.quantity,
            pItem.productId
          );
        }
        recalculateProductMetrics(pItem.productId);

        const updatedProd = db.prepare(`SELECT name, total_stock, low_stock_threshold FROM products WHERE id = ?`).get(
          pItem.productId
        ) as { name: string; total_stock: number; low_stock_threshold: number };
        if (updatedProd.total_stock <= updatedProd.low_stock_threshold) {
          void sendTelegramAlert(
            'low_stock',
            `Low Stock Warning: ${updatedProd.name} has ${updatedProd.total_stock} units remaining.`
          );
        }
      }

      db.prepare(
        `INSERT INTO payment_records (order_id, gateway, transaction_id, amount, currency, status, notes)
         VALUES (?, ?, ?, ?, 'USD', 'pending', ?)`
      ).run(orderId, paymentMethod, transactionId, finalTotal, 'Order placed via SHOPNEXA checkout');

      if (req.auth?.userId) {
        db.prepare(`DELETE FROM cart_items WHERE user_id = ?`).run(req.auth.userId);
        createNotification(
          req.auth.userId,
          'order',
          `Order ${orderNumber} Placed`,
          `Thank you ${customerName}. Your order total is $${finalTotal.toFixed(2)} via ${paymentMethod.toUpperCase()}.`
        );
      }

      return { orderId, orderNumber, finalTotal };
    })();

    // Perform server-side payment gateway check outside SQLite transaction
    const verification = await verifyGatewayTransaction(
      paymentMethod,
      transactionId,
      txResult.finalTotal,
      paySetting.sandbox_mode === 1
    );

    if (verification.verified) {
      db.prepare(
        `UPDATE orders SET payment_status = 'verified', gateway_reference = ?, order_status = 'Confirmed' WHERE id = ?`
      ).run(verification.gatewayReference, txResult.orderId);
      db.prepare(
        `UPDATE payment_records SET status = 'verified', verified_by = 'Gateway API', verified_at = datetime('now'), notes = ? WHERE order_id = ?`
      ).run(verification.message, txResult.orderId);
      void sendTelegramAlert(
        'payment',
        `Payment Verified for ${txResult.orderNumber}: $${txResult.finalTotal.toFixed(2)} (${paymentMethod.toUpperCase()})`
      );
    }

    void sendTelegramAlert(
      'new_order',
      `New Order ${txResult.orderNumber}\nCustomer: ${customerName} (${country})\nTotal: $${txResult.finalTotal.toFixed(2)}\nPayment: ${paymentMethod.toUpperCase()}`
    );

    const createdOrder = hydrateOrder(db.prepare(`SELECT * FROM orders WHERE id = ?`).get(txResult.orderId));
    res.status(201).json({ order: createdOrder, verification });
  } catch (err: any) {
    logServerError('/api/orders', err);
    res.status(400).json({ error: err?.message || 'Unable to place order' });
  }
});

app.get('/api/orders/my', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db.prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC`).all(req.auth!.userId) as any[];
  res.json(rows.map(hydrateOrder));
});

app.get('/api/orders/track/:orderNumber', (req, res) => {
  const orderNumber = sanitizeString(req.params.orderNumber, 60).toUpperCase();
  const row = db.prepare(`SELECT * FROM orders WHERE UPPER(order_number) = ?`).get(orderNumber) as any;
  if (!row) {
    res.status(404).json({ error: 'No order found matching that Order ID.' });
    return;
  }
  const order = hydrateOrder(row);
  res.json({
    order_number: order.order_number,
    order_status: order.order_status,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    tracking_number: order.tracking_number,
    courier_name: order.courier_name,
    estimated_delivery: order.estimated_delivery,
    final_total: order.final_total,
    created_at: order.created_at,
    items: order.items,
  });
});

// ---------- NOTIFICATIONS ----------
app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 40`)
    .all(req.auth!.userId) as any[];
  res.json(rows.map((r) => ({ ...r, is_read: r.is_read === 1 })));
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.auth!.userId);
  res.json({ success: true });
});

// ---------- CUSTOMER REVIEWS & Q&A ----------
app.get('/api/reviews/:productId', (req, res) => {
  const rows = db
    .prepare(`SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY id DESC`)
    .all(Number(req.params.productId)) as any[];
  res.json(
    rows.map((r) => ({
      ...r,
      images: JSON.parse(r.images_json || '[]'),
      is_verified_purchase: r.is_verified_purchase === 1,
    }))
  );
});

app.post('/api/reviews', (req: AuthenticatedRequest, res) => {
  const b = req.body || {};
  const productId = Number(b.product_id);
  const authorName = sanitizeString(b.author_name, 80);
  const comment = sanitizeString(b.comment, 1500);
  const question = sanitizeString(b.question, 600);
  const rating = b.question ? 0 : Math.min(5, Math.max(1, Number(b.rating || 5)));

  if (!productId || !authorName || (!comment && !question)) {
    res.status(400).json({ error: 'Product, author name, and review comment or question are required.' });
    return;
  }

  let isVerifiedPurchase = 0;
  if (req.auth?.userId) {
    const purchased = db
      .prepare(
        `SELECT o.id FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE o.user_id = ? AND oi.product_id = ?`
      )
      .get(req.auth.userId, productId);
    if (purchased) isVerifiedPurchase = 1;
  }

  const images = Array.isArray(b.images) ? b.images.filter((u: string) => isValidSafeUrl(u)).slice(0, 4) : [];

  const result = db
    .prepare(
      `INSERT INTO reviews (
        product_id, user_id, author_name, rating, title, comment, images_json, question, is_verified_purchase, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`
    )
    .run(
      productId,
      req.auth?.userId ?? null,
      authorName,
      rating,
      sanitizeString(b.title, 120),
      comment,
      JSON.stringify(images),
      question,
      isVerifiedPurchase
    );

  recalculateProductRating(productId);
  const created = db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(result.lastInsertRowid) as any;
  res.status(201).json({
    ...created,
    images: JSON.parse(created.images_json || '[]'),
    is_verified_purchase: created.is_verified_purchase === 1,
  });
});

// ---------- NEWSLETTER ----------
app.post('/api/newsletter', (req, res) => {
  const email = sanitizeString(req.body.email, 160).toLowerCase();
  const language = sanitizeString(req.body.language || 'en', 10);
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  db.prepare(`INSERT OR IGNORE INTO newsletter_subscribers (email, language) VALUES (?, ?)`).run(email, language);
  res.json({ message: 'Subscribed to SHOPNEXA releases and private offers.' });
});

// ============================================================================
// PROTECTED ADMIN ROUTES
// ============================================================================
app.get('/api/admin/analytics', requireAdmin, (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days || 30)));
  const orders = db.prepare(`SELECT * FROM orders ORDER BY id DESC`).all() as any[];
  const products = getAllProducts();
  const customers = db
    .prepare(`SELECT id, name, email, phone, role, avatar_url, status, created_at FROM users WHERE role = 'customer' ORDER BY id DESC`)
    .all();
  const clicks = db.prepare(`SELECT * FROM affiliate_clicks ORDER BY id DESC`).all() as any[];

  const totalRevenue = orders
    .filter((o) => !['Cancelled', 'Refunded'].includes(o.order_status))
    .reduce((sum, o) => sum + Number(o.final_total || 0), 0);

  const ownProducts = products.filter((p) => p.product_type === 'own');
  const affiliateProducts = products.filter((p) => p.product_type === 'affiliate');
  const totalStock = ownProducts.reduce((sum, p) => sum + p.total_stock, 0);
  const lowStockProducts = ownProducts.filter((p) => p.total_stock <= p.low_stock_threshold);

  // Daily revenue buckets for chart
  const cutoff = Date.now() - days * 86400000;
  const chartMap = new Map<string, { date: string; revenue: number; orders: number; clicks: number }>();
  for (const o of orders) {
    const t = new Date(o.created_at).getTime();
    if (t >= cutoff) {
      const day = o.created_at.slice(0, 10);
      const entry = chartMap.get(day) || { date: day, revenue: 0, orders: 0, clicks: 0 };
      if (!['Cancelled', 'Refunded'].includes(o.order_status)) {
        entry.revenue += Number(o.final_total || 0);
      }
      entry.orders += 1;
      chartMap.set(day, entry);
    }
  }
  for (const c of clicks) {
    const t = new Date(c.clicked_at).getTime();
    if (t >= cutoff) {
      const day = c.clicked_at.slice(0, 10);
      const entry = chartMap.get(day) || { date: day, revenue: 0, orders: 0, clicks: 0 };
      entry.clicks += 1;
      chartMap.set(day, entry);
    }
  }

  res.json({
    metrics: {
      totalSales: orders.filter((o) => o.order_status !== 'Cancelled').length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.order_status === 'Pending').length,
      confirmedOrders: orders.filter((o) => o.order_status === 'Confirmed').length,
      deliveredOrders: orders.filter((o) => o.order_status === 'Delivered').length,
      cancelledOrders: orders.filter((o) => o.order_status === 'Cancelled').length,
      totalCustomers: customers.length,
      totalProducts: products.length,
      ownProductCount: ownProducts.length,
      affiliateProductCount: affiliateProducts.length,
      totalStock,
      lowStockCount: lowStockProducts.length,
      affiliateClicks: clicks.length,
    },
    lowStockProducts,
    recentOrders: orders.slice(0, 10).map(hydrateOrder),
    recentCustomers: customers.slice(0, 10),
    salesSeries: Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  });
});

// Admin Category CRUD
app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const name = sanitizeString(req.body.name, 80);
  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug =
    sanitizeString(req.body.slug, 80) ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const result = db
    .prepare(`INSERT INTO categories (name, slug, description, image_url, sort_order, is_featured) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(
      name,
      slug,
      sanitizeString(req.body.description, 300),
      sanitizeString(req.body.image_url, 500),
      Number(req.body.sort_order || 99),
      req.body.is_featured ? 1 : 0
    );
  res.status(201).json(db.prepare(`SELECT * FROM categories WHERE id = ?`).get(result.lastInsertRowid));
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  try {
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(Number(req.params.id));
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Cannot delete a category that currently holds products.' });
  }
});

// Admin Product CRUD (Own & Affiliate)
function upsertProductChildren(productId: number, b: any): void {
  db.prepare(`DELETE FROM product_variations WHERE product_id = ?`).run(productId);
  db.prepare(`DELETE FROM product_colors WHERE product_id = ?`).run(productId);
  db.prepare(`DELETE FROM product_sizes WHERE product_id = ?`).run(productId);

  const colors = Array.isArray(b.colors) ? b.colors : [];
  const sizes = Array.isArray(b.sizes) ? b.sizes : [];
  const variations = Array.isArray(b.variations) ? b.variations : [];

  const insColor = db.prepare(
    `INSERT INTO product_colors (product_id, name, hex_code, images_json, is_available, stock, sku, price_override) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const colorIdByName = new Map<string, number>();
  for (const c of colors) {
    const res = insColor.run(
      productId,
      sanitizeString(c.name, 60),
      sanitizeString(c.hex_code || '#09090B', 20),
      JSON.stringify(Array.isArray(c.images) ? c.images : []),
      c.is_available === false ? 0 : 1,
      Math.max(0, Number(c.stock || 0)),
      sanitizeString(c.sku, 60),
      c.price_override !== null && c.price_override !== '' && c.price_override !== undefined
        ? Number(c.price_override)
        : null
    );
    colorIdByName.set(String(c.name || ''), Number(res.lastInsertRowid));
  }

  const insSize = db.prepare(
    `INSERT INTO product_sizes (product_id, category_type, size_system, label, measurements_json, stock, price_override, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const sizeIdByLabel = new Map<string, number>();
  for (const s of sizes) {
    const res = insSize.run(
      productId,
      sanitizeString(s.category_type || 'general', 30),
      sanitizeString(s.size_system || 'Standard', 30),
      sanitizeString(s.label, 60),
      JSON.stringify(s.measurements || {}),
      Math.max(0, Number(s.stock || 0)),
      s.price_override !== null && s.price_override !== '' && s.price_override !== undefined
        ? Number(s.price_override)
        : null,
      s.is_available === false ? 0 : 1
    );
    sizeIdByLabel.set(String(s.label || ''), Number(res.lastInsertRowid));
  }

  const insVar = db.prepare(
    `INSERT INTO product_variations (
      product_id, color_id, size_id, model_number, model_name, style, design, pattern, version, material, variant_name, image_url, sku, price, stock, is_available
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const v of variations) {
    const resolvedColorId = v.color_id || (v.color_name ? colorIdByName.get(v.color_name) ?? null : null);
    const resolvedSizeId = v.size_id || (v.size_label ? sizeIdByLabel.get(v.size_label) ?? null : null);
    insVar.run(
      productId,
      resolvedColorId,
      resolvedSizeId,
      sanitizeString(v.model_number, 60),
      sanitizeString(v.model_name, 80),
      sanitizeString(v.style, 60),
      sanitizeString(v.design, 60),
      sanitizeString(v.pattern, 60),
      sanitizeString(v.version, 60),
      sanitizeString(v.material, 80),
      sanitizeString(v.variant_name, 120),
      sanitizeString(v.image_url, 500),
      sanitizeString(v.sku, 60),
      Number(v.price || 0),
      Math.max(0, Number(v.stock || 0)),
      v.is_available === false ? 0 : 1
    );
  }

  recalculateProductMetrics(productId);
}

app.get('/api/admin/products', requireAdmin, (_req, res) => {
  res.json(getAllProducts());
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const b = req.body || {};
    const name = sanitizeString(b.name, 200);
    if (!name) {
      res.status(400).json({ error: 'Product name is required.' });
      return;
    }
    const productType = b.product_type === 'affiliate' ? 'affiliate' : 'own';
    if (productType === 'affiliate' && b.affiliate_url && !isValidSafeUrl(b.affiliate_url)) {
      res.status(400).json({ error: 'Invalid affiliate URL.' });
      return;
    }

    const originalPrice = Number(b.original_price || b.selling_price || 0);
    const sellingPrice = Number(b.selling_price || originalPrice || 0);
    const salePrice = Number(b.sale_price || sellingPrice || 0);
    const discountAmount = Math.max(0, Number((originalPrice - salePrice).toFixed(2)));
    const discountPercentage = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

    const productCode = sanitizeString(b.product_code, 60) || `SNX-${Date.now().toString().slice(-6)}`;
    const sku = sanitizeString(b.sku, 60) || `SKU-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const result = db.transaction(() => {
      const ins = db
        .prepare(
          `INSERT INTO products (
            product_code, sku, name, brand, manufacturer, product_type, category_id, subcategory,
            short_description, full_description, highlights_json, country_of_origin, images_json, video_url,
            status, is_featured, is_new_arrival, is_trending, is_best_seller, is_special_offer, is_recommended, collection_tag,
            original_price, selling_price, discount_amount, discount_percentage, sale_price, currency, wholesale_price, shipping_cost, tax_rate, tax_info,
            package_contents, number_of_pieces, package_quantity, package_length, package_width, package_height, package_weight, shipping_weight, included_accessories,
            specs_json, size_chart_json, total_stock, low_stock_threshold, affiliate_url, estimated_delivery, shipping_info, return_policy
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?
          )`
        )
        .run(
          productCode,
          sku,
          name,
          sanitizeString(b.brand, 100),
          sanitizeString(b.manufacturer, 100),
          productType,
          Number(b.category_id || 1),
          sanitizeString(b.subcategory, 100),
          sanitizeString(b.short_description, 400),
          sanitizeString(b.full_description, 5000),
          JSON.stringify(Array.isArray(b.highlights) ? b.highlights : []),
          sanitizeString(b.country_of_origin, 80),
          JSON.stringify(Array.isArray(b.images) ? b.images : []),
          sanitizeString(b.video_url, 500),
          sanitizeString(b.status || 'active', 20),
          b.is_featured ? 1 : 0,
          b.is_new_arrival ? 1 : 0,
          b.is_trending ? 1 : 0,
          b.is_best_seller ? 1 : 0,
          b.is_special_offer ? 1 : 0,
          b.is_recommended ? 1 : 0,
          sanitizeString(b.collection_tag, 80),
          originalPrice,
          sellingPrice,
          discountAmount,
          discountPercentage,
          salePrice,
          sanitizeString(b.currency || 'USD', 10),
          Number(b.wholesale_price || 0),
          Number(b.shipping_cost || 0),
          Number(b.tax_rate || 0),
          sanitizeString(b.tax_info, 160),
          sanitizeString(b.package_contents, 500),
          Math.max(1, Number(b.number_of_pieces || 1)),
          Math.max(1, Number(b.package_quantity || 1)),
          sanitizeString(b.package_length, 40),
          sanitizeString(b.package_width, 40),
          sanitizeString(b.package_height, 40),
          sanitizeString(b.package_weight, 40),
          sanitizeString(b.shipping_weight, 40),
          sanitizeString(b.included_accessories, 300),
          JSON.stringify(b.specs || {}),
          JSON.stringify(Array.isArray(b.size_chart) ? b.size_chart : []),
          Math.max(0, Number(b.total_stock || 0)),
          Math.max(0, Number(b.low_stock_threshold || 5)),
          sanitizeString(b.affiliate_url, 1000),
          sanitizeString(b.estimated_delivery, 160),
          sanitizeString(b.shipping_info, 400),
          sanitizeString(b.return_policy, 400)
        );
      const pid = Number(ins.lastInsertRowid);
      upsertProductChildren(pid, b);
      return pid;
    })();

    res.status(201).json(getProductById(result));
  } catch (err: any) {
    logServerError('/api/admin/products POST', err);
    res.status(400).json({ error: err?.message || 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = getProductById(id);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const b = req.body || {};
  const originalPrice = Number(b.original_price ?? existing.original_price);
  const sellingPrice = Number(b.selling_price ?? existing.selling_price);
  const salePrice = Number(b.sale_price ?? sellingPrice);
  const discountAmount = Math.max(0, Number((originalPrice - salePrice).toFixed(2)));
  const discountPercentage = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

  db.transaction(() => {
    db.prepare(
      `UPDATE products SET
        sku = ?, name = ?, brand = ?, manufacturer = ?, product_type = ?, category_id = ?, subcategory = ?,
        short_description = ?, full_description = ?, highlights_json = ?, country_of_origin = ?, images_json = ?, video_url = ?,
        status = ?, is_featured = ?, is_new_arrival = ?, is_trending = ?, is_best_seller = ?, is_special_offer = ?, is_recommended = ?, collection_tag = ?,
        original_price = ?, selling_price = ?, discount_amount = ?, discount_percentage = ?, sale_price = ?, currency = ?, wholesale_price = ?, shipping_cost = ?, tax_rate = ?, tax_info = ?,
        package_contents = ?, number_of_pieces = ?, package_quantity = ?, package_length = ?, package_width = ?, package_height = ?, package_weight = ?, shipping_weight = ?, included_accessories = ?,
        specs_json = ?, size_chart_json = ?, total_stock = ?, low_stock_threshold = ?, affiliate_url = ?, estimated_delivery = ?, shipping_info = ?, return_policy = ?, updated_at = datetime('now')
      WHERE id = ?`
    ).run(
      sanitizeString(b.sku ?? existing.sku, 60),
      sanitizeString(b.name ?? existing.name, 200),
      sanitizeString(b.brand ?? existing.brand, 100),
      sanitizeString(b.manufacturer ?? existing.manufacturer, 100),
      b.product_type === 'affiliate' ? 'affiliate' : 'own',
      Number(b.category_id ?? existing.category_id),
      sanitizeString(b.subcategory ?? existing.subcategory, 100),
      sanitizeString(b.short_description ?? existing.short_description, 400),
      sanitizeString(b.full_description ?? existing.full_description, 5000),
      JSON.stringify(Array.isArray(b.highlights) ? b.highlights : existing.highlights),
      sanitizeString(b.country_of_origin ?? existing.country_of_origin, 80),
      JSON.stringify(Array.isArray(b.images) ? b.images : existing.images),
      sanitizeString(b.video_url ?? existing.video_url, 500),
      sanitizeString(b.status ?? existing.status, 20),
      b.is_featured ? 1 : 0,
      b.is_new_arrival ? 1 : 0,
      b.is_trending ? 1 : 0,
      b.is_best_seller ? 1 : 0,
      b.is_special_offer ? 1 : 0,
      b.is_recommended ? 1 : 0,
      sanitizeString(b.collection_tag ?? existing.collection_tag, 80),
      originalPrice,
      sellingPrice,
      discountAmount,
      discountPercentage,
      salePrice,
      sanitizeString(b.currency ?? existing.currency, 10),
      Number(b.wholesale_price ?? existing.wholesale_price),
      Number(b.shipping_cost ?? existing.shipping_cost),
      Number(b.tax_rate ?? existing.tax_rate),
      sanitizeString(b.tax_info ?? existing.tax_info, 160),
      sanitizeString(b.package_contents ?? existing.package_contents, 500),
      Math.max(1, Number(b.number_of_pieces ?? existing.number_of_pieces)),
      Math.max(1, Number(b.package_quantity ?? existing.package_quantity)),
      sanitizeString(b.package_length ?? existing.package_length, 40),
      sanitizeString(b.package_width ?? existing.package_width, 40),
      sanitizeString(b.package_height ?? existing.package_height, 40),
      sanitizeString(b.package_weight ?? existing.package_weight, 40),
      sanitizeString(b.shipping_weight ?? existing.shipping_weight, 40),
      sanitizeString(b.included_accessories ?? existing.included_accessories, 300),
      JSON.stringify(b.specs ?? existing.specs),
      JSON.stringify(Array.isArray(b.size_chart) ? b.size_chart : existing.size_chart),
      Math.max(0, Number(b.total_stock ?? existing.total_stock)),
      Math.max(0, Number(b.low_stock_threshold ?? existing.low_stock_threshold)),
      sanitizeString(b.affiliate_url ?? existing.affiliate_url, 1000),
      sanitizeString(b.estimated_delivery ?? existing.estimated_delivery, 160),
      sanitizeString(b.shipping_info ?? existing.shipping_info, 400),
      sanitizeString(b.return_policy ?? existing.return_policy, 400),
      id
    );
    upsertProductChildren(id, b);
  })();

  res.json(getProductById(id));
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    db.prepare(`DELETE FROM products WHERE id = ?`).run(Number(req.params.id));
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Product is referenced in existing orders; set status to draft instead.' });
  }
});

// Admin Order Management
app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT * FROM orders ORDER BY id DESC`).all() as any[];
  res.json(rows.map(hydrateOrder));
});

app.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  const b = req.body || {};
  const nextStatus = sanitizeString(b.order_status || existing.order_status, 40) as OrderStatus;
  const nextPayStatus = sanitizeString(b.payment_status || existing.payment_status, 30) as PaymentStatus;
  const trackingNumber = sanitizeString(b.tracking_number ?? existing.tracking_number, 100);
  const courierId = b.courier_id !== undefined ? (b.courier_id ? Number(b.courier_id) : null) : existing.courier_id;

  db.prepare(
    `UPDATE orders
     SET order_status = ?, payment_status = ?, tracking_number = ?, courier_id = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(nextStatus, nextPayStatus, trackingNumber, courierId, sanitizeString(b.notes ?? existing.notes, 400), id);

  if (nextPayStatus !== existing.payment_status) {
    db.prepare(
      `UPDATE payment_records SET status = ?, verified_by = 'Administrator', verified_at = datetime('now') WHERE order_id = ?`
    ).run(nextPayStatus, id);
  }

  if (existing.user_id && nextStatus !== existing.order_status) {
    createNotification(
      existing.user_id,
      'order_status',
      `Order ${existing.order_number} Updated`,
      `Status changed to ${nextStatus}${trackingNumber ? ` · Tracking: ${trackingNumber}` : ''}.`
    );
  }

  void sendTelegramAlert(
    'order_status',
    `Order ${existing.order_number} -> ${nextStatus} (Payment: ${nextPayStatus})${trackingNumber ? ` | Tracking: ${trackingNumber}` : ''}`
  );

  res.json(hydrateOrder(db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id)));
});

// Admin Customers
app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const users = db
    .prepare(`SELECT id, name, email, phone, role, avatar_url, status, created_at FROM users WHERE role = 'customer' ORDER BY id DESC`)
    .all() as any[];
  const enriched = users.map((u) => {
    const orders = db.prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC`).all(u.id) as any[];
    const addresses = db.prepare(`SELECT * FROM addresses WHERE user_id = ?`).all(u.id) as any[];
    return {
      ...u,
      order_count: orders.length,
      total_spent: orders.reduce((s, o) => s + Number(o.final_total || 0), 0),
      addresses,
      orders: orders.map(hydrateOrder),
    };
  });
  res.json(enriched);
});

app.put('/api/admin/customers/:id/status', requireAdmin, (req, res) => {
  const status = req.body.status === 'suspended' ? 'suspended' : 'active';
  db.prepare(`UPDATE users SET status = ? WHERE id = ? AND role = 'customer'`).run(status, Number(req.params.id));
  res.json({ success: true, status });
});

// Admin Affiliate Click Reports
app.get('/api/admin/affiliate-reports', requireAdmin, (_req, res) => {
  const clicks = db
    .prepare(
      `SELECT ac.*, p.name AS product_name, p.product_code, p.affiliate_url
       FROM affiliate_clicks ac
       LEFT JOIN products p ON p.id = ac.product_id
       ORDER BY ac.id DESC
       LIMIT 200`
    )
    .all();
  const byProduct = db
    .prepare(
      `SELECT p.id, p.name, p.product_code, p.affiliate_url, COUNT(ac.id) AS click_count
       FROM products p
       LEFT JOIN affiliate_clicks ac ON ac.product_id = p.id
       WHERE p.product_type = 'affiliate'
       GROUP BY p.id
       ORDER BY click_count DESC`
    )
    .all();
  res.json({ clicks, byProduct });
});

// Admin Coupons
app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  const rows = db.prepare(`SELECT * FROM coupons ORDER BY id DESC`).all() as any[];
  res.json(rows.map((r) => ({ ...r, is_active: r.is_active === 1 })));
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const b = req.body || {};
  const code = sanitizeString(b.code, 40).toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'Coupon code is required.' });
    return;
  }
  const result = db
    .prepare(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, expires_at, is_active, campaign_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      code,
      b.discount_type === 'fixed' ? 'fixed' : 'percentage',
      Number(b.discount_value || 10),
      Number(b.min_order_value || 0),
      Math.max(1, Number(b.max_uses || 100)),
      sanitizeString(b.expires_at, 40),
      b.is_active === false ? 0 : 1,
      sanitizeString(b.campaign_name, 100)
    );
  const created = db.prepare(`SELECT * FROM coupons WHERE id = ?`).get(result.lastInsertRowid) as any;
  res.status(201).json({ ...created, is_active: created.is_active === 1 });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  db.prepare(`DELETE FROM coupons WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true });
});

// Admin Reviews Moderation
app.get('/api/admin/reviews', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, p.name AS product_name
       FROM reviews r
       LEFT JOIN products p ON p.id = r.product_id
       ORDER BY r.id DESC`
    )
    .all() as any[];
  res.json(
    rows.map((r) => ({
      ...r,
      images: JSON.parse(r.images_json || '[]'),
      is_verified_purchase: r.is_verified_purchase === 1,
    }))
  );
});

app.put('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT product_id, status, answer FROM reviews WHERE id = ?`).get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  const status = ['pending', 'approved', 'rejected'].includes(req.body.status) ? req.body.status : existing.status;
  const answer = sanitizeString(req.body.answer ?? existing.answer, 1000);
  db.prepare(`UPDATE reviews SET status = ?, answer = ? WHERE id = ?`).run(status, answer, id);
  recalculateProductRating(existing.product_id);
  res.json({ success: true });
});

// Admin Shipping Zones & Couriers
app.get('/api/admin/shipping', requireAdmin, (_req, res) => {
  const zones = (db.prepare(`SELECT * FROM shipping_zones ORDER BY id ASC`).all() as any[]).map((z) => ({
    ...z,
    is_active: z.is_active === 1,
  }));
  const couriers = (db.prepare(`SELECT * FROM couriers ORDER BY id ASC`).all() as any[]).map((c) => ({
    ...c,
    is_active: c.is_active === 1,
  }));
  res.json({ zones, couriers });
});

app.post('/api/admin/shipping-zones', requireAdmin, (req, res) => {
  const b = req.body || {};
  const resIns = db
    .prepare(
      `INSERT INTO shipping_zones (name, country, district, area, base_fee, per_kg_fee, free_shipping_threshold, estimated_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .run(
      sanitizeString(b.name, 100),
      sanitizeString(b.country, 80),
      sanitizeString(b.district, 80),
      sanitizeString(b.area, 100),
      Number(b.base_fee || 0),
      Number(b.per_kg_fee || 0),
      Number(b.free_shipping_threshold || 0),
      sanitizeString(b.estimated_days, 80)
    );
  res.status(201).json(db.prepare(`SELECT * FROM shipping_zones WHERE id = ?`).get(resIns.lastInsertRowid));
});

app.delete('/api/admin/shipping-zones/:id', requireAdmin, (req, res) => {
  db.prepare(`DELETE FROM shipping_zones WHERE id = ?`).run(Number(req.params.id));
  res.json({ success: true });
});

app.post('/api/admin/couriers', requireAdmin, (req, res) => {
  const b = req.body || {};
  const resIns = db
    .prepare(
      `INSERT INTO couriers (name, contact_phone, tracking_url_template, supported_regions, base_rate, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`
    )
    .run(
      sanitizeString(b.name, 100),
      sanitizeString(b.contact_phone, 40),
      sanitizeString(b.tracking_url_template, 300),
      sanitizeString(b.supported_regions, 120),
      Number(b.base_rate || 0)
    );
  res.status(201).json(db.prepare(`SELECT * FROM couriers WHERE id = ?`).get(resIns.lastInsertRowid));
});

app.put('/api/admin/couriers/:id', requireAdmin, (req, res) => {
  const b = req.body || {};
  db.prepare(
    `UPDATE couriers SET name = ?, contact_phone = ?, tracking_url_template = ?, supported_regions = ?, base_rate = ?, is_active = ? WHERE id = ?`
  ).run(
    sanitizeString(b.name, 100),
    sanitizeString(b.contact_phone, 40),
    sanitizeString(b.tracking_url_template, 300),
    sanitizeString(b.supported_regions, 120),
    Number(b.base_rate || 0),
    b.is_active === false ? 0 : 1,
    Number(req.params.id)
  );
  res.json({ success: true });
});

// Admin Payment Settings & Records
app.get('/api/admin/payments', requireAdmin, (_req, res) => {
  const settings = (db.prepare(`SELECT * FROM payment_settings ORDER BY id ASC`).all() as any[]).map((p) => ({
    ...p,
    is_enabled: p.is_enabled === 1,
    sandbox_mode: p.sandbox_mode === 1,
    env_configured: isGatewayEnvConfigured(p.gateway),
  }));
  const records = db
    .prepare(
      `SELECT pr.*, o.order_number, o.customer_name
       FROM payment_records pr
       LEFT JOIN orders o ON o.id = pr.order_id
       ORDER BY pr.id DESC
       LIMIT 150`
    )
    .all();
  res.json({ settings, records });
});

app.put('/api/admin/payments/:gateway', requireAdmin, (req, res) => {
  const gateway = sanitizeString(req.params.gateway, 40);
  const b = req.body || {};
  db.prepare(
    `UPDATE payment_settings
     SET is_enabled = ?, display_name = ?, instructions = ?, merchant_number = ?, sandbox_mode = ?, updated_at = datetime('now')
     WHERE gateway = ?`
  ).run(
    b.is_enabled ? 1 : 0,
    sanitizeString(b.display_name, 100),
    sanitizeString(b.instructions, 500),
    sanitizeString(b.merchant_number, 60),
    b.sandbox_mode ? 1 : 0,
    gateway
  );
  res.json({ success: true });
});

// Admin Website Settings & Backup
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const b = req.body || {};
  const urlFields = ['facebook_url', 'youtube_url', 'telegram_channel_url', 'instagram_url', 'telegram_support_url', 'hero_image', 'logo_url'];
  for (const f of urlFields) {
    if (b[f] && !isValidSafeUrl(b[f])) {
      res.status(400).json({ error: `Invalid URL provided for ${f}` });
      return;
    }
  }
  const saved = saveSiteSettings(b);
  res.json({ ...saved, telegram_configured: isTelegramConfigured() });
});

app.post('/api/admin/telegram/test', requireAdmin, async (_req, res) => {
  if (!isTelegramConfigured()) {
    res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in server environment Secrets.' });
    return;
  }
  const sent = await sendTelegramAlert('support', 'Test notification from SHOPNEXA Admin Dashboard.');
  res.json({ sent });
});

app.get('/api/admin/backup', requireAdmin, (_req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    res.status(404).json({ error: 'Database file not found' });
    return;
  }
  res.download(DB_PATH, `shopnexa-backup-${new Date().toISOString().slice(0, 10)}.db`);
});

app.get('/api/admin/error-logs', requireAdmin, (_req, res) => {
  res.json(db.prepare(`SELECT * FROM error_logs ORDER BY id DESC LIMIT 100`).all());
});

// ---------- SERVER STARTUP (Vite dev middleware or static dist) ----------
async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SHOPNEXA server listening on port ${PORT}`);
  });
}

void startServer();

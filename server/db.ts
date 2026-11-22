import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  Category,
  Product,
  ProductColor,
  ProductSize,
  ProductVariation,
  SiteSettings,
  Order,
  OrderItem,
  CustomerAddress,
} from '../src/types.ts';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'shopnexa.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      avatar_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      reset_token TEXT DEFAULT '',
      reset_expires INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      admin_username TEXT NOT NULL DEFAULT 'Robiul',
      admin_password_hash TEXT DEFAULT '',
      admin_email_hash TEXT NOT NULL DEFAULT '',
      setup_completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      parent_id INTEGER DEFAULT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT NOT NULL UNIQUE,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT '',
      manufacturer TEXT DEFAULT '',
      product_type TEXT NOT NULL DEFAULT 'own',
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      subcategory TEXT DEFAULT '',
      short_description TEXT DEFAULT '',
      full_description TEXT DEFAULT '',
      highlights_json TEXT DEFAULT '[]',
      country_of_origin TEXT DEFAULT '',
      images_json TEXT DEFAULT '[]',
      video_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_new_arrival INTEGER NOT NULL DEFAULT 0,
      is_trending INTEGER NOT NULL DEFAULT 0,
      is_best_seller INTEGER NOT NULL DEFAULT 0,
      is_special_offer INTEGER NOT NULL DEFAULT 0,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      collection_tag TEXT DEFAULT '',

      original_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      discount_percentage REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      wholesale_price REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_info TEXT DEFAULT '',

      package_contents TEXT DEFAULT '',
      number_of_pieces INTEGER NOT NULL DEFAULT 1,
      package_quantity INTEGER NOT NULL DEFAULT 1,
      package_length TEXT DEFAULT '',
      package_width TEXT DEFAULT '',
      package_height TEXT DEFAULT '',
      package_weight TEXT DEFAULT '',
      shipping_weight TEXT DEFAULT '',
      included_accessories TEXT DEFAULT '',

      specs_json TEXT DEFAULT '{}',
      size_chart_json TEXT DEFAULT '[]',

      total_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      total_colors INTEGER NOT NULL DEFAULT 0,
      total_sizes INTEGER NOT NULL DEFAULT 0,
      total_variations INTEGER NOT NULL DEFAULT 0,

      affiliate_url TEXT DEFAULT '',
      estimated_delivery TEXT DEFAULT '',
      shipping_info TEXT DEFAULT '',
      return_policy TEXT DEFAULT '',

      rating_avg REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      hex_code TEXT NOT NULL DEFAULT '#09090B',
      images_json TEXT DEFAULT '[]',
      is_available INTEGER NOT NULL DEFAULT 1,
      stock INTEGER NOT NULL DEFAULT 0,
      sku TEXT DEFAULT '',
      price_override REAL DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS product_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      category_type TEXT NOT NULL DEFAULT 'general',
      size_system TEXT NOT NULL DEFAULT 'Standard',
      label TEXT NOT NULL,
      measurements_json TEXT DEFAULT '{}',
      stock INTEGER NOT NULL DEFAULT 0,
      price_override REAL DEFAULT NULL,
      is_available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS product_variations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      color_id INTEGER DEFAULT NULL REFERENCES product_colors(id) ON DELETE SET NULL,
      size_id INTEGER DEFAULT NULL REFERENCES product_sizes(id) ON DELETE SET NULL,
      model_number TEXT DEFAULT '',
      model_name TEXT DEFAULT '',
      style TEXT DEFAULT '',
      design TEXT DEFAULT '',
      pattern TEXT DEFAULT '',
      version TEXT DEFAULT '',
      material TEXT DEFAULT '',
      variant_name TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      sku TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT DEFAULT 'Home',
      is_default INTEGER NOT NULL DEFAULT 0,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      alt_phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      country TEXT NOT NULL DEFAULT 'Bangladesh',
      division TEXT DEFAULT '',
      district TEXT DEFAULT '',
      upazila TEXT DEFAULT '',
      thana TEXT DEFAULT '',
      union_name TEXT DEFAULT '',
      municipality TEXT DEFAULT '',
      city TEXT DEFAULT '',
      village TEXT DEFAULT '',
      area TEXT DEFAULT '',
      road_number TEXT DEFAULT '',
      house_number TEXT DEFAULT '',
      apartment_number TEXT DEFAULT '',
      floor_number TEXT DEFAULT '',
      state_province TEXT DEFAULT '',
      street_address TEXT DEFAULT '',
      postal_code TEXT DEFAULT '',
      landmark TEXT DEFAULT '',
      instructions TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT DEFAULT '',
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      color_id INTEGER DEFAULT NULL,
      size_id INTEGER DEFAULT NULL,
      variation_id INTEGER DEFAULT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS couriers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_phone TEXT DEFAULT '',
      tracking_url_template TEXT DEFAULT '',
      supported_regions TEXT DEFAULT '',
      base_rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shipping_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      district TEXT DEFAULT '',
      area TEXT DEFAULT '',
      base_fee REAL NOT NULL DEFAULT 0,
      per_kg_fee REAL NOT NULL DEFAULT 0,
      free_shipping_threshold REAL NOT NULL DEFAULT 0,
      estimated_days TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      alt_phone TEXT DEFAULT '',
      address_json TEXT NOT NULL,
      country TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      transaction_id TEXT DEFAULT '',
      gateway_reference TEXT DEFAULT '',
      order_status TEXT NOT NULL DEFAULT 'Pending',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      coupon_code TEXT DEFAULT '',
      shipping_charge REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      final_total REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      courier_id INTEGER DEFAULT NULL REFERENCES couriers(id) ON DELETE SET NULL,
      tracking_number TEXT DEFAULT '',
      estimated_delivery TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      product_name TEXT NOT NULL,
      product_image TEXT DEFAULT '',
      sku TEXT DEFAULT '',
      color_name TEXT DEFAULT '',
      size_label TEXT DEFAULT '',
      model_name TEXT DEFAULT '',
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS affiliate_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER DEFAULT NULL,
      selected_color TEXT DEFAULT '',
      selected_size TEXT DEFAULT '',
      selected_model TEXT DEFAULT '',
      destination_url TEXT NOT NULL,
      referrer TEXT DEFAULT '',
      clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL DEFAULT 0,
      min_order_value REAL NOT NULL DEFAULT 0,
      max_uses INTEGER NOT NULL DEFAULT 100,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      campaign_name TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      title TEXT DEFAULT '',
      comment TEXT NOT NULL,
      images_json TEXT DEFAULT '[]',
      question TEXT DEFAULT '',
      answer TEXT DEFAULT '',
      is_verified_purchase INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway TEXT NOT NULL UNIQUE,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      display_name TEXT NOT NULL,
      instructions TEXT DEFAULT '',
      merchant_number TEXT DEFAULT '',
      sandbox_mode INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      gateway TEXT NOT NULL,
      transaction_id TEXT DEFAULT '',
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'pending',
      verified_by TEXT DEFAULT '',
      verified_at TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      language TEXT NOT NULL DEFAULT 'en',
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL DEFAULT 'error',
      route TEXT DEFAULT '',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blocked_gmails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      ip_address TEXT DEFAULT '',
      attempted_username TEXT DEFAULT '',
      reason TEXT DEFAULT 'Unauthorized admin login verification attempt',
      blocked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const cols = db.prepare(`PRAGMA table_info(admin_config)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'admin_username')) {
    db.exec(`ALTER TABLE admin_config ADD COLUMN admin_username TEXT NOT NULL DEFAULT 'Robiul'`);
  }
  if (!cols.some((c) => c.name === 'admin_email_hash')) {
    db.exec(`ALTER TABLE admin_config ADD COLUMN admin_email_hash TEXT NOT NULL DEFAULT ''`);
  }
  if (!cols.some((c) => c.name === 'gmail_v2_migrated')) {
    db.exec(`ALTER TABLE admin_config ADD COLUMN gmail_v2_migrated INTEGER NOT NULL DEFAULT 0`);
  }

  const DEFAULT_ADMIN_HASH =
    'abdd686bd9bd81ff005ee6e648e84a40:c8706d9e1beeb99da442a608c2e42782cf933e1cad107840511367b8de50749921cdb92bfe9b958a119eef0ddae94eee907cf69d823663950ead673d4bb6fba9';
  const DEFAULT_ADMIN_EMAIL_HASH =
    '03b2511542c980b0f7d334ce8eca5c18:245dd8bd4de76d405577be774a6d61b96650ea37d3da515e7419783e7dd4a2484204272c40c83e94839b1566ecd99f8bce85661ef7720907d08ad869b45f4f81';
  db.prepare(
    `INSERT OR IGNORE INTO admin_config (id, admin_username, admin_password_hash, admin_email_hash, setup_completed, gmail_v2_migrated) VALUES (1, 'Robiul', ?, ?, 1, 1)`
  ).run(DEFAULT_ADMIN_HASH, DEFAULT_ADMIN_EMAIL_HASH);
  db.prepare(
    `UPDATE admin_config SET admin_username = 'Robiul', admin_password_hash = ?, admin_email_hash = ?, setup_completed = 1, gmail_v2_migrated = 1 WHERE id = 1 AND setup_completed = 0`
  ).run(DEFAULT_ADMIN_HASH, DEFAULT_ADMIN_EMAIL_HASH);
  db.prepare(
    `UPDATE admin_config SET admin_email_hash = ?, gmail_v2_migrated = 1 WHERE id = 1 AND (admin_email_hash IS NULL OR admin_email_hash = '' OR gmail_v2_migrated = 0)`
  ).run(DEFAULT_ADMIN_EMAIL_HASH);

  seedInitialData();
}

export function recalculateProductMetrics(productId: number): void {
  const colors = db
    .prepare(`SELECT id, is_available, stock FROM product_colors WHERE product_id = ?`)
    .all(productId) as Array<{ id: number; is_available: number; stock: number }>;
  const sizes = db
    .prepare(`SELECT id, is_available, stock FROM product_sizes WHERE product_id = ?`)
    .all(productId) as Array<{ id: number; is_available: number; stock: number }>;
  const variations = db
    .prepare(`SELECT id, is_available, stock, color_id, size_id FROM product_variations WHERE product_id = ?`)
    .all(productId) as Array<{
    id: number;
    is_available: number;
    stock: number;
    color_id: number | null;
    size_id: number | null;
  }>;

  const availableColors = colors.filter((c) => c.is_available === 1 && c.stock > 0);
  const availableSizes = sizes.filter((s) => s.is_available === 1 && s.stock > 0);

  const colorMap = new Map(colors.map((c) => [c.id, c]));
  const sizeMap = new Map(sizes.map((s) => [s.id, s]));

  let totalVariations = 0;
  let computedStock = 0;

  if (variations.length > 0) {
    const validVars = variations.filter((v) => {
      if (v.is_available !== 1 || v.stock <= 0) return false;
      if (v.color_id && (!colorMap.get(v.color_id) || colorMap.get(v.color_id)!.is_available !== 1)) return false;
      if (v.size_id && (!sizeMap.get(v.size_id) || sizeMap.get(v.size_id)!.is_available !== 1)) return false;
      return true;
    });
    totalVariations = validVars.length;
    computedStock = validVars.reduce((acc, v) => acc + Math.max(0, v.stock), 0);
  } else {
    const cCount = availableColors.length;
    const sCount = availableSizes.length;
    if (cCount > 0 && sCount > 0) {
      totalVariations = cCount * sCount;
    } else {
      totalVariations = Math.max(cCount, sCount, 1);
    }
    if (colors.length > 0 && sizes.length > 0) {
      computedStock = Math.min(
        colors.reduce((a, c) => a + Math.max(0, c.stock), 0),
        sizes.reduce((a, s) => a + Math.max(0, s.stock), 0)
      );
    } else if (colors.length > 0) {
      computedStock = colors.reduce((a, c) => a + Math.max(0, c.stock), 0);
    } else if (sizes.length > 0) {
      computedStock = sizes.reduce((a, s) => a + Math.max(0, s.stock), 0);
    }
  }

  const currentProd = db.prepare(`SELECT total_stock, status FROM products WHERE id = ?`).get(productId) as
    | { total_stock: number; status: string }
    | undefined;

  const finalStock =
    variations.length > 0 || colors.length > 0 || sizes.length > 0
      ? computedStock
      : currentProd?.total_stock ?? 0;

  const nextStatus =
    currentProd?.status === 'draft' ? 'draft' : finalStock <= 0 ? 'out_of_stock' : 'active';

  db.prepare(
    `UPDATE products
     SET total_colors = ?, total_sizes = ?, total_variations = ?, total_stock = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(availableColors.length, availableSizes.length, totalVariations, finalStock, nextStatus, productId);
}

export function recalculateProductRating(productId: number): void {
  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating
       FROM reviews
       WHERE product_id = ? AND status = 'approved' AND rating > 0`
    )
    .get(productId) as { cnt: number; avg_rating: number };
  db.prepare(`UPDATE products SET rating_avg = ?, review_count = ? WHERE id = ?`).run(
    Number(row.avg_rating.toFixed(1)),
    row.cnt,
    productId
  );
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brand_name: 'SHOPNEXA ROBI HUB',
  tagline: 'THE FUTURE OF SHOPPING 🛍️',
  logo_slogan: 'SHOP • DISCOVER • ENJOY',
  logo_url: '',
  hero_title: 'Curated Luxury, Direct & Global Discovery',
  hero_subtitle:
    'A global shopping destination uniting direct-from-vault SHOPNEXA ROBI HUB editions with verified international partner collections.',
  hero_cta_text: 'Explore Collection',
  hero_image: '/src/assets/images/hero_shopnexa_luxury_1795308770793.jpg',
  promo_banner_text: '',
  promo_banner_enabled: false,
  contact_email: 'support@shopnexa.global',
  business_address: 'Rangpur, Bangladesh · Global Fulfillment',
  facebook_url: 'https://www.facebook.com/share/1WFDAntMgp/',
  youtube_url: 'https://www.youtube.com/@shopnexamarketplase',
  telegram_channel_url: 'https://t.me/shopnexamarketplase',
  instagram_url: 'https://www.instagram.com/shopnexa978?knvt=NTd5OHhtMDN6bGc3',
  telegram_support_username: '@ShoponexaMarketplaseSuport',
  telegram_support_url: 'https://t.me/ShoponexaMarketplaseSuport',
  telegram_support_instructions:
    'Message @ShoponexaMarketplaseSuport on Telegram with your Order ID or product question for priority assistance.',
  telegram_alerts: {
    new_order: true,
    new_customer: true,
    payment: true,
    low_stock: true,
    order_status: true,
    support: true,
  },
  seo_title: 'SHOPNEXA ROBI HUB – THE FUTURE OF SHOPPING',
  seo_description:
    'Shop direct luxury goods and verified international affiliate discoveries on SHOPNEXA ROBI HUB.',
  seo_keywords: 'SHOPNEXA ROBI HUB, luxury e-commerce, Bangladesh online shopping, bKash, Nagad, global marketplace',
  about_story:
    'SHOPNEXA ROBI HUB bridges curated direct-selling craftsmanship with global marketplace discovery. Direct items ship from verified inventory with localized checkout, while affiliate partner items connect you directly to official merchant checkout.',
  shipping_policy:
    'Orders inside Dhaka arrive within 24–48 hours; nationwide Bangladesh deliveries arrive in 2–5 business days. International express delivery spans 5–12 business days depending on destination.',
  return_policy:
    'Unused direct SHOPNEXA ROBI HUB items in original packaging are eligible for return or exchange within 7 days of delivery.',
  refund_policy:
    'Verified refunds for bKash, Nagad, and card orders are processed back to the original payment method within 3–7 business days after inspection.',
  privacy_policy:
    'Customer addresses, contact numbers, and order records are encrypted in transit and never sold to third parties. Payment PINs and OTPs are never collected by SHOPNEXA ROBI HUB.',
  terms_conditions:
    'Direct SHOPNEXA ROBI HUB purchases are fulfilled under SHOPNEXA ROBI HUB warranty. Affiliate items redirect to AliExpress and are governed by AliExpress merchant terms and buyer protection.',
  affiliate_disclosure:
    'Affiliate Disclosure: Items marked Affiliate Partner redirect via tracked links to AliExpress. SHOPNEXA ROBI HUB may earn a commission at no additional cost to you. AliExpress handles payment, fulfillment, and buyer protection for affiliate purchases.',
  email_notifications_enabled: true,
  customer_download_buyers_only: true,
  android_apk_url: '',
};

export function getSiteSettings(): SiteSettings {
  const row = db.prepare(`SELECT value_json FROM site_settings WHERE key = 'main'`).get() as
    | { value_json: string }
    | undefined;
  if (!row) return DEFAULT_SITE_SETTINGS;
  try {
    return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(row.value_json) };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function saveSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  const merged = { ...getSiteSettings(), ...settings };
  db.prepare(
    `INSERT INTO site_settings (key, value_json, updated_at)
     VALUES ('main', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(JSON.stringify(merged));
  return merged;
}

function hydrateProduct(row: any): Product {
  const colorsRaw = db.prepare(`SELECT * FROM product_colors WHERE product_id = ?`).all(row.id) as any[];
  const sizesRaw = db.prepare(`SELECT * FROM product_sizes WHERE product_id = ?`).all(row.id) as any[];
  const varsRaw = db.prepare(`SELECT * FROM product_variations WHERE product_id = ?`).all(row.id) as any[];

  const colors: ProductColor[] = colorsRaw.map((c) => ({
    id: c.id,
    product_id: c.product_id,
    name: c.name,
    hex_code: c.hex_code,
    images: safeParseJson(c.images_json, []),
    is_available: c.is_available === 1,
    stock: c.stock,
    sku: c.sku,
    price_override: c.price_override,
  }));

  const sizes: ProductSize[] = sizesRaw.map((s) => ({
    id: s.id,
    product_id: s.product_id,
    category_type: s.category_type,
    size_system: s.size_system,
    label: s.label,
    measurements: safeParseJson(s.measurements_json, {}),
    stock: s.stock,
    price_override: s.price_override,
    is_available: s.is_available === 1,
  }));

  const colorNameMap = new Map(colors.map((c) => [c.id, c.name]));
  const sizeLabelMap = new Map(sizes.map((s) => [s.id, s.label]));

  const variations: ProductVariation[] = varsRaw.map((v) => ({
    id: v.id,
    product_id: v.product_id,
    color_id: v.color_id,
    size_id: v.size_id,
    color_name: v.color_id ? colorNameMap.get(v.color_id) || '' : '',
    size_label: v.size_id ? sizeLabelMap.get(v.size_id) || '' : '',
    model_number: v.model_number,
    model_name: v.model_name,
    style: v.style,
    design: v.design,
    pattern: v.pattern,
    version: v.version,
    material: v.material,
    variant_name: v.variant_name,
    image_url: v.image_url,
    sku: v.sku,
    price: v.price,
    stock: v.stock,
    is_available: v.is_available === 1,
  }));

  return {
    id: row.id,
    product_code: row.product_code,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    manufacturer: row.manufacturer,
    product_type: row.product_type,
    category_id: row.category_id,
    category_name: row.category_name || '',
    subcategory: row.subcategory,
    short_description: row.short_description,
    full_description: row.full_description,
    highlights: safeParseJson(row.highlights_json, []),
    country_of_origin: row.country_of_origin,
    images: safeParseJson(row.images_json, []),
    video_url: row.video_url,
    status: row.status,
    is_featured: row.is_featured === 1,
    is_new_arrival: row.is_new_arrival === 1,
    is_trending: row.is_trending === 1,
    is_best_seller: row.is_best_seller === 1,
    is_special_offer: row.is_special_offer === 1,
    is_recommended: row.is_recommended === 1,
    collection_tag: row.collection_tag,
    original_price: row.original_price,
    selling_price: row.selling_price,
    discount_amount: row.discount_amount,
    discount_percentage: row.discount_percentage,
    sale_price: row.sale_price,
    currency: row.currency,
    wholesale_price: row.wholesale_price,
    shipping_cost: row.shipping_cost,
    tax_rate: row.tax_rate,
    tax_info: row.tax_info,
    package_contents: row.package_contents,
    number_of_pieces: row.number_of_pieces,
    package_quantity: row.package_quantity,
    package_length: row.package_length,
    package_width: row.package_width,
    package_height: row.package_height,
    package_weight: row.package_weight,
    shipping_weight: row.shipping_weight,
    included_accessories: row.included_accessories,
    specs: safeParseJson(row.specs_json, {}),
    size_chart: safeParseJson(row.size_chart_json, []),
    total_stock: row.total_stock,
    low_stock_threshold: row.low_stock_threshold,
    total_colors: row.total_colors,
    total_sizes: row.total_sizes,
    total_variations: row.total_variations,
    affiliate_url: row.affiliate_url,
    estimated_delivery: row.estimated_delivery,
    shipping_info: row.shipping_info,
    return_policy: row.return_policy,
    rating_avg: row.rating_avg,
    review_count: row.review_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    colors,
    sizes,
    variations,
  };
}

export function getAllProducts(): Product[] {
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.id DESC`
    )
    .all() as any[];
  return rows.map(hydrateProduct);
}

export function getProductById(id: number): Product | null {
  const row = db
    .prepare(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`
    )
    .get(id) as any;
  return row ? hydrateProduct(row) : null;
}

export function hydrateOrder(row: any): Order {
  const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(row.id) as OrderItem[];
  const courier = row.courier_id
    ? (db.prepare(`SELECT name FROM couriers WHERE id = ?`).get(row.courier_id) as { name: string } | undefined)
    : undefined;
  return {
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    alt_phone: row.alt_phone,
    address: safeParseJson<CustomerAddress>(row.address_json, {} as CustomerAddress),
    country: row.country,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    transaction_id: row.transaction_id,
    gateway_reference: row.gateway_reference,
    order_status: row.order_status,
    subtotal: row.subtotal,
    discount_amount: row.discount_amount,
    coupon_code: row.coupon_code,
    shipping_charge: row.shipping_charge,
    tax_amount: row.tax_amount,
    final_total: row.final_total,
    currency: row.currency,
    courier_id: row.courier_id,
    courier_name: courier?.name || '',
    tracking_number: row.tracking_number,
    estimated_delivery: row.estimated_delivery,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    items,
  };
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function seedInitialData(): void {
  const existingSettings = db.prepare(`SELECT key, value_json FROM site_settings WHERE key = 'main'`).get() as
    | { key: string; value_json: string }
    | undefined;
  if (!existingSettings) {
    saveSiteSettings(DEFAULT_SITE_SETTINGS);
  } else {
    try {
      const parsed = JSON.parse(existingSettings.value_json);
      const patch: Partial<SiteSettings> = {};
      if (!parsed.brand_name || parsed.brand_name === 'SHOPNEXA') {
        patch.brand_name = 'SHOPNEXA ROBI HUB';
      }
      if (parsed.business_address === 'Gulshan Avenue, Dhaka 1212, Bangladesh · Global Fulfillment') {
        patch.business_address = 'Rangpur, Bangladesh · Global Fulfillment';
      }
      if (!parsed.tagline || parsed.tagline === 'THE FUTURE OF SHOPPING') {
        patch.tagline = 'THE FUTURE OF SHOPPING 🛍️';
      }
      if (!parsed.logo_slogan) {
        patch.logo_slogan = 'SHOP • DISCOVER • ENJOY';
      }
      if (
        !parsed.seo_title ||
        parsed.seo_title === 'SHOPNEXA — The Future of Shopping | Global Hybrid Marketplace' ||
        parsed.seo_title === 'SHOPNEXA – THE FUTURE OF SHOPPING'
      ) {
        patch.seo_title = 'SHOPNEXA ROBI HUB – THE FUTURE OF SHOPPING';
      }
      if (typeof parsed.hero_subtitle === 'string' && parsed.hero_subtitle.includes('SHOPNEXA editions')) {
        patch.hero_subtitle = DEFAULT_SITE_SETTINGS.hero_subtitle;
      }
      if (typeof parsed.seo_description === 'string' && parsed.seo_description.endsWith('on SHOPNEXA.')) {
        patch.seo_description = DEFAULT_SITE_SETTINGS.seo_description;
      }
      if (typeof parsed.seo_keywords === 'string' && parsed.seo_keywords.startsWith('SHOPNEXA,')) {
        patch.seo_keywords = DEFAULT_SITE_SETTINGS.seo_keywords;
      }
      if (typeof parsed.about_story === 'string' && parsed.about_story.startsWith('SHOPNEXA bridges')) {
        patch.about_story = DEFAULT_SITE_SETTINGS.about_story;
      }
      if (typeof parsed.return_policy === 'string' && parsed.return_policy.includes('direct SHOPNEXA items')) {
        patch.return_policy = DEFAULT_SITE_SETTINGS.return_policy;
      }
      if (typeof parsed.privacy_policy === 'string' && parsed.privacy_policy.endsWith('by SHOPNEXA.')) {
        patch.privacy_policy = DEFAULT_SITE_SETTINGS.privacy_policy;
      }
      if (typeof parsed.terms_conditions === 'string' && parsed.terms_conditions.includes('Direct SHOPNEXA purchases')) {
        patch.terms_conditions = DEFAULT_SITE_SETTINGS.terms_conditions;
      }
      if (typeof parsed.affiliate_disclosure === 'string' && parsed.affiliate_disclosure.includes('SHOPNEXA may earn')) {
        patch.affiliate_disclosure = DEFAULT_SITE_SETTINGS.affiliate_disclosure;
      }
      if (parsed.promo_banner_text === 'Worldwide Express Delivery · Direct bKash, Nagad & COD in Bangladesh') {
        patch.promo_banner_text = '';
        patch.promo_banner_enabled = false;
      }
      if (Object.keys(patch).length > 0) {
        saveSiteSettings(patch);
      }
    } catch {
      // ignore
    }
  }

  const catCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM categories`).get() as { cnt: number }).cnt;
  if (catCount === 0) {
    const initialCategories: Array<{ name: string; slug: string; featured: number; img: string }> = [
      { name: 'Electronics', slug: 'electronics', featured: 1, img: '/src/assets/images/prod_wireless_headphones_1795308770357.jpg' },
      { name: 'Mobile Accessories', slug: 'mobile-accessories', featured: 0, img: '/src/assets/images/prod_wireless_headphones_1795308770357.jpg' },
      { name: 'Computers', slug: 'computers', featured: 0, img: '/src/assets/images/prod_wireless_headphones_1795308770357.jpg' },
      { name: "Men's Fashion", slug: 'mens-fashion', featured: 1, img: '/src/assets/images/prod_tailored_jacket_1795308770592.jpg' },
      { name: "Women's Fashion", slug: 'womens-fashion', featured: 1, img: '/src/assets/images/prod_tailored_jacket_1795308770592.jpg' },
      { name: 'Shoes', slug: 'shoes', featured: 1, img: '/src/assets/images/prod_sneakers_noir_1795308771080.jpg' },
      { name: 'Watches', slug: 'watches', featured: 1, img: '/src/assets/images/prod_chronograph_watch_1795308771533.jpg' },
      { name: 'Bags', slug: 'bags', featured: 1, img: '/src/assets/images/prod_leather_weekender_1795308771044.jpg' },
      { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', featured: 1, img: '/src/assets/images/prod_serum_elixir_1795308770235.jpg' },
      { name: 'Home & Living', slug: 'home-living', featured: 0, img: '/src/assets/images/prod_espresso_machine_1795308772074.jpg' },
      { name: 'Kitchen Products', slug: 'kitchen-products', featured: 1, img: '/src/assets/images/prod_espresso_machine_1795308772074.jpg' },
      { name: 'Sports & Outdoors', slug: 'sports-outdoors', featured: 0, img: '/src/assets/images/prod_sneakers_noir_1795308771080.jpg' },
      { name: 'Toys', slug: 'toys', featured: 0, img: '/src/assets/images/hero_shopnexa_luxury_1795308770793.jpg' },
      { name: 'Lifestyle', slug: 'lifestyle', featured: 0, img: '/src/assets/images/prod_leather_weekender_1795308771044.jpg' },
      { name: 'Accessories', slug: 'accessories', featured: 0, img: '/src/assets/images/prod_chronograph_watch_1795308771533.jpg' },
      { name: 'Other Categories', slug: 'other-categories', featured: 0, img: '/src/assets/images/hero_shopnexa_luxury_1795308770793.jpg' },
    ];
    const insertCat = db.prepare(
      `INSERT INTO categories (name, slug, description, image_url, sort_order, is_featured) VALUES (?, ?, ?, ?, ?, ?)`
    );
    initialCategories.forEach((c, idx) => {
      insertCat.run(c.name, c.slug, `Curated ${c.name} collection on SHOPNEXA ROBI HUB.`, c.img, idx + 1, c.featured);
    });
  } else {
    db.prepare(
      `UPDATE categories SET description = REPLACE(description, 'on SHOPNEXA.', 'on SHOPNEXA ROBI HUB.') WHERE description LIKE '%on SHOPNEXA.%'`
    ).run();
  }

  const payCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM payment_settings`).get() as { cnt: number }).cnt;
  if (payCount === 0) {
    const insertPay = db.prepare(
      `INSERT INTO payment_settings (gateway, is_enabled, display_name, instructions, merchant_number, sandbox_mode) VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertPay.run(
      'bkash',
      1,
      'bKash Send Money',
      'Send Money via bKash to 01704323915 and enter your Transaction ID (TrxID) below. SHOPNEXA ROBI HUB never collects your bKash PIN or OTP.',
      '01704323915',
      1
    );
    insertPay.run(
      'nagad',
      1,
      'Nagad Send Money',
      'Send Money via Nagad to 01704323915 and enter your Transaction ID (TrxID) below. SHOPNEXA ROBI HUB never collects your Nagad PIN or OTP.',
      '01704323915',
      1
    );
    insertPay.run(
      'cod',
      1,
      'Cash on Delivery (Bangladesh)',
      'Pay in cash upon physical inspection and delivery to your verified Bangladesh address.',
      '',
      0
    );
    insertPay.run(
      'international_card',
      1,
      'International Card / Gateway',
      'Authorized international checkout processing for global destinations.',
      '',
      1
    );
  } else {
    db.prepare(
      `UPDATE payment_settings
       SET display_name = 'bKash Send Money',
           merchant_number = '01704323915',
           instructions = 'Send Money via bKash to 01704323915 and enter your Transaction ID (TrxID) below. SHOPNEXA ROBI HUB never collects your bKash PIN or OTP.'
       WHERE gateway = 'bkash' AND (merchant_number IS NULL OR merchant_number = '' OR instructions LIKE '%SHOPNEXA never%')`
    ).run();
    db.prepare(
      `UPDATE payment_settings
       SET display_name = 'Nagad Send Money',
           merchant_number = '01704323915',
           instructions = 'Send Money via Nagad to 01704323915 and enter your Transaction ID (TrxID) below. SHOPNEXA ROBI HUB never collects your Nagad PIN or OTP.'
       WHERE gateway = 'nagad' AND (merchant_number IS NULL OR merchant_number = '' OR instructions LIKE '%SHOPNEXA never%')`
    ).run();
  }

  const zoneCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM shipping_zones`).get() as { cnt: number }).cnt;
  if (zoneCount === 0) {
    const insertZone = db.prepare(
      `INSERT INTO shipping_zones (name, country, district, area, base_fee, per_kg_fee, free_shipping_threshold, estimated_days, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    insertZone.run('Rangpur Hub Express', 'Bangladesh', 'Rangpur', 'Rangpur City & Division', 1.2, 0.4, 100, '1–2 Business Days');
    insertZone.run('Dhaka Metro Express', 'Bangladesh', 'Dhaka', 'All Dhaka Metro', 1.5, 0.5, 120, '1–2 Business Days');
    insertZone.run('Bangladesh Nationwide', 'Bangladesh', 'All Districts', 'Nationwide', 2.5, 0.75, 150, '2–5 Business Days');
    insertZone.run('International Priority', 'International', 'All', 'Global', 18, 4, 250, '5–10 Business Days');
  } else {
    const hasRangpur = db.prepare(`SELECT id FROM shipping_zones WHERE district = 'Rangpur'`).get();
    if (!hasRangpur) {
      db.prepare(
        `INSERT INTO shipping_zones (name, country, district, area, base_fee, per_kg_fee, free_shipping_threshold, estimated_days, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run('Rangpur Hub Express', 'Bangladesh', 'Rangpur', 'Rangpur City & Division', 1.2, 0.4, 100, '1–2 Business Days');
    }
  }

  const courierCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM couriers`).get() as { cnt: number }).cnt;
  if (courierCount === 0) {
    const insertCourier = db.prepare(
      `INSERT INTO couriers (name, contact_phone, tracking_url_template, supported_regions, base_rate, is_active) VALUES (?, ?, ?, ?, ?, 1)`
    );
    insertCourier.run('Steadfast Courier', '', 'https://steadfast.com.bd/t/{tracking}', 'Bangladesh', 2.0);
    insertCourier.run('Pathao Courier', '', 'https://merchant.pathao.com/tracking?consignment_id={tracking}', 'Bangladesh', 1.8);
    insertCourier.run('DHL Express International', '', 'https://www.dhl.com/en/express/tracking.html?AWB={tracking}', 'Worldwide', 22.0);
  }

  const prodCount = (db.prepare(`SELECT COUNT(*) AS cnt FROM products`).get() as { cnt: number }).cnt;
  if (prodCount === 0) {
    seedCatalogProducts();
  } else {
    db.prepare(
      `UPDATE products
       SET brand = REPLACE(brand, 'SHOPNEXA ', 'SHOPNEXA ROBI HUB '),
           manufacturer = REPLACE(manufacturer, 'SHOPNEXA ', 'SHOPNEXA ROBI HUB '),
           shipping_info = REPLACE(shipping_info, 'SHOPNEXA Vault', 'SHOPNEXA ROBI HUB Vault'),
           specs_json = REPLACE(specs_json, 'SHOPNEXA Atelier', 'SHOPNEXA ROBI HUB Atelier')
       WHERE (brand LIKE 'SHOPNEXA %' AND brand NOT LIKE 'SHOPNEXA ROBI HUB %')
          OR (manufacturer LIKE 'SHOPNEXA %' AND manufacturer NOT LIKE 'SHOPNEXA ROBI HUB %')
          OR shipping_info LIKE '%from SHOPNEXA Vault%'
          OR specs_json LIKE '%"SHOPNEXA Atelier"%'`
    ).run();
  }
}

function getCatId(slug: string): number {
  const row = db.prepare(`SELECT id FROM categories WHERE slug = ?`).get(slug) as { id: number } | undefined;
  return row?.id || 1;
}

function seedCatalogProducts(): void {
  const catalog = [
    {
      product_code: 'SNX-OWN-001',
      sku: 'SNX-WCH-AUR-01',
      name: 'Aurelia Black & Gold Chronograph',
      brand: 'SHOPNEXA ROBI HUB Atelier',
      manufacturer: 'SHOPNEXA ROBI HUB Horology Works',
      product_type: 'own',
      category_id: getCatId('watches'),
      subcategory: 'Mechanical Chronographs',
      short_description: 'PVD-coated stainless steel chronograph with brushed 18k-tone metallic gold bezel and sapphire crystal.',
      full_description:
        'Engineered for precision and presence, the Aurelia Chronograph pairs a 42mm obsidian PVD case with a brushed champagne-gold tachymeter bezel, domed sapphire glass, and 10 ATM water resistance.',
      highlights: [
        '42mm Matte Obsidian PVD Case',
        'Brushed Gold Tachymeter Bezel',
        'Scratch-Resistant Sapphire Crystal',
        '10 ATM Water Resistance & Date Complication',
      ],
      country_of_origin: 'Switzerland',
      images: ['/src/assets/images/prod_chronograph_watch_1795308771533.jpg'],
      video_url: '',
      is_featured: 1,
      is_new_arrival: 1,
      is_trending: 1,
      is_best_seller: 1,
      is_special_offer: 0,
      is_recommended: 1,
      collection_tag: 'Signature Vault',
      original_price: 420,
      selling_price: 340,
      discount_amount: 80,
      discount_percentage: 19,
      sale_price: 340,
      wholesale_price: 230,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'VAT included for domestic shipments',
      package_contents: '1x Chronograph Watch, 1x Presentation Box, 1x Link Adjustment Tool, 1x Warranty Card',
      number_of_pieces: 4,
      package_quantity: 1,
      package_length: '16 cm',
      package_width: '14 cm',
      package_height: '9 cm',
      package_weight: '420 g',
      shipping_weight: '560 g',
      included_accessories: 'Microfiber polishing cloth and warranty booklet',
      specs: {
        Brand: 'SHOPNEXA ROBI HUB Atelier',
        Model: 'AUR-CHR-42',
        Movement: 'Automatic Chronograph Calibre',
        CaseMaterial: '316L PVD Stainless Steel',
        WaterResistance: '10 ATM / 100m',
        Warranty: '2 Years International',
      },
      size_chart: [{ Size: '40mm', CaseDiameter: '40mm', LugWidth: '20mm', WristFit: '155–205mm' }, { Size: '42mm', CaseDiameter: '42mm', LugWidth: '22mm', WristFit: '165–220mm' }],
      low_stock_threshold: 4,
      affiliate_url: '',
      estimated_delivery: '1–3 Days (Bangladesh) · 5–8 Days (Global)',
      shipping_info: 'Insured express courier delivery from SHOPNEXA ROBI HUB Vault.',
      return_policy: '7-day unused return with intact protective seals.',
      colors: [
        { name: 'Obsidian & Gold', hex_code: '#18181B', stock: 14, sku: 'SNX-WCH-OBG', price_override: 340 },
        { name: 'Stealth Matte Black', hex_code: '#09090B', stock: 9, sku: 'SNX-WCH-BLK', price_override: 340 },
      ],
      sizes: [
        { category_type: 'general', size_system: 'Standard', label: '40mm Case', measurements: { width: '40mm', weight: '148g' }, stock: 10, price_override: null },
        { category_type: 'general', size_system: 'Standard', label: '42mm Case', measurements: { width: '42mm', weight: '162g' }, stock: 13, price_override: null },
      ],
      variations: [
        { colorIdx: 0, sizeIdx: 1, model_number: 'AUR-42-G', model_name: '42mm Gold Bezel Edition', style: 'Sport Luxury', design: 'Tachymeter', pattern: 'Solid PVD', version: '2026 Series II', material: '316L Steel', variant_name: 'Obsidian & Gold · 42mm', sku: 'SNX-AUR-42G', price: 340, stock: 8 },
        { colorIdx: 0, sizeIdx: 0, model_number: 'AUR-40-G', model_name: '40mm Gold Bezel Edition', style: 'Classic Dress', design: 'Tachymeter', pattern: 'Solid PVD', version: '2026 Series II', material: '316L Steel', variant_name: 'Obsidian & Gold · 40mm', sku: 'SNX-AUR-40G', price: 340, stock: 6 },
        { colorIdx: 1, sizeIdx: 1, model_number: 'AUR-42-B', model_name: '42mm Stealth Edition', style: 'Monochrome', design: 'Clean Dial', pattern: 'Brushed Matte', version: '2026 Series II', material: '316L Steel', variant_name: 'Stealth Black · 42mm', sku: 'SNX-AUR-42B', price: 335, stock: 9 },
      ],
    },
    {
      product_code: 'SNX-OWN-002',
      sku: 'SNX-AUD-ANC-02',
      name: 'Aura Studio ANC Wireless Headphones',
      brand: 'Aura Acoustics',
      manufacturer: 'Aura Sound Labs',
      product_type: 'own',
      category_id: getCatId('electronics'),
      subcategory: 'Wireless Audio',
      short_description: '40mm beryllium-driver wireless noise-canceling headphones in matte black and champagne gold aluminum.',
      full_description:
        'Designed for uninterrupted studio clarity anywhere on Earth, Aura Studio ANC combines hybrid -45dB active noise cancellation, 50-hour battery life, and memory-foam lambskin ear cushions.',
      highlights: [
        'Hybrid -45dB Active Noise Cancellation',
        '50-Hour Continuous Playback + USB-C Fast Charge',
        'Bluetooth 5.4 Multipoint + Lossless USB-C Audio',
        'Anodized Champagne Gold Hinges',
      ],
      country_of_origin: 'Germany',
      images: ['/src/assets/images/prod_wireless_headphones_1795308770357.jpg'],
      video_url: '',
      is_featured: 1,
      is_new_arrival: 1,
      is_trending: 1,
      is_best_seller: 0,
      is_special_offer: 1,
      is_recommended: 1,
      collection_tag: 'Flagship Acoustics',
      original_price: 299,
      selling_price: 239,
      discount_amount: 60,
      discount_percentage: 20,
      sale_price: 239,
      wholesale_price: 165,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'Standard electronics warranty included',
      package_contents: '1x Wireless Headphones, 1x Hard Travel Case, 1x USB-C Cable, 1x 3.5mm Braided Aux Cable',
      number_of_pieces: 4,
      package_quantity: 1,
      package_length: '23 cm',
      package_width: '20 cm',
      package_height: '10 cm',
      package_weight: '310 g',
      shipping_weight: '680 g',
      included_accessories: 'Hard-shell travel case and flight adapter',
      specs: {
        Brand: 'Aura Acoustics',
        Model: 'AS-ANC-500',
        Processor: 'Dual-Core DSP ANC Chip',
        RAM: 'N/A',
        Storage: 'N/A',
        Battery: '1100mAh (50 Hours ANC On)',
        DisplaySize: '40mm Dynamic Drivers',
        Connectivity: 'Bluetooth 5.4, USB-C, 3.5mm',
        OperatingSystem: 'iOS / Android / Windows / macOS',
        Warranty: '18 Months Official Warranty',
      },
      size_chart: [{ Size: 'Universal Adjustable', HeadbandRange: '52–62 cm', Weight: '310g' }],
      low_stock_threshold: 5,
      affiliate_url: '',
      estimated_delivery: '1–3 Days (Bangladesh) · 5–9 Days (Global)',
      shipping_info: 'Dispatched with protective shockproof packaging.',
      return_policy: '7-day replacement guarantee for sealed or defective units.',
      colors: [
        { name: 'Matte Black & Champagne', hex_code: '#C9A227', stock: 18, sku: 'SNX-AUD-MBC', price_override: 239 },
        { name: 'Pearl Ivory & Gold', hex_code: '#F5F5F0', stock: 7, sku: 'SNX-AUD-PIG', price_override: 245 },
      ],
      sizes: [
        { category_type: 'general', size_system: 'Standard', label: 'Standard Fit', measurements: { width: '18cm', height: '21cm', weight: '310g' }, stock: 25, price_override: null },
      ],
      variations: [
        { colorIdx: 0, sizeIdx: 0, model_number: 'AS-500-BK', model_name: 'Studio Pro Edition', style: 'Over-Ear', design: 'Foldable Aluminum', pattern: 'Matte Satin', version: 'v2.0', material: 'Aluminum & Lambskin', variant_name: 'Matte Black & Champagne · Studio Pro', sku: 'SNX-AUD-500BK', price: 239, stock: 18 },
        { colorIdx: 1, sizeIdx: 0, model_number: 'AS-500-IV', model_name: 'Atelier Ivory Edition', style: 'Over-Ear', design: 'Foldable Aluminum', pattern: 'Matte Satin', version: 'v2.0', material: 'Aluminum & Lambskin', variant_name: 'Pearl Ivory & Gold · Atelier', sku: 'SNX-AUD-500IV', price: 245, stock: 7 },
      ],
    },
    {
      product_code: 'SNX-OWN-003',
      sku: 'SNX-BAG-LTH-03',
      name: 'Lyra Full-Grain Leather Weekender',
      brand: 'Lyra & Co.',
      manufacturer: 'Lyra Artisanal Leather',
      product_type: 'own',
      category_id: getCatId('bags'),
      subcategory: 'Travel Duffles',
      short_description: 'Structured pebbled full-grain calfskin weekender duffle with solid brushed brass zippers.',
      full_description:
        'Carry 72 hours of wardrobe effortlessly. Handcrafted from full-grain pebbled leather with reinforced saddle stitching, padded 16-inch laptop sleeve, and solid brushed gold brass hardware.',
      highlights: [
        '100% Full-Grain Pebbled Calfskin Leather',
        'Solid Brushed Brass Zippers & Padlock Hardware',
        'Cabin-Approved Overhead Dimensions',
        'Detachable Padded Shoulder Strap & Luggage Tag',
      ],
      country_of_origin: 'Italy',
      images: ['/src/assets/images/prod_leather_weekender_1795308771044.jpg'],
      video_url: '',
      is_featured: 1,
      is_new_arrival: 0,
      is_trending: 1,
      is_best_seller: 1,
      is_special_offer: 0,
      is_recommended: 1,
      collection_tag: 'Travel Atelier',
      original_price: 380,
      selling_price: 315,
      discount_amount: 65,
      discount_percentage: 17,
      sale_price: 315,
      wholesale_price: 210,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'Includes cotton dust bag',
      package_contents: '1x Leather Weekender Bag, 1x Adjustable Strap, 1x Leather Luggage Tag, 1x Cotton Dust Bag',
      number_of_pieces: 4,
      package_quantity: 1,
      package_length: '52 cm',
      package_width: '26 cm',
      package_height: '30 cm',
      package_weight: '1.65 kg',
      shipping_weight: '2.1 kg',
      included_accessories: 'Cotton storage dust bag and luggage tag',
      specs: {
        Material: 'Full-Grain Italian Calfskin',
        Hardware: 'Brushed Brass',
        Capacity: '38 Liters',
        LaptopCompartment: 'Up to 16 inches',
        Lining: 'Heavyweight Charcoal Twill',
      },
      size_chart: [{ Size: 'Medium 38L', Length: '48 cm', Width: '24 cm', Height: '28 cm' }, { Size: 'Large 45L', Length: '54 cm', Width: '26 cm', Height: '31 cm' }],
      low_stock_threshold: 3,
      affiliate_url: '',
      estimated_delivery: '2–4 Days (Bangladesh) · 5–9 Days (Global)',
      shipping_info: 'Shipped flat-protected in custom rigid box.',
      return_policy: '7-day unused return with original tags.',
      colors: [
        { name: 'Jet Black & Brass', hex_code: '#111113', stock: 12, sku: 'SNX-BAG-JBB', price_override: 315 },
      ],
      sizes: [
        { category_type: 'general', size_system: 'Standard', label: 'Medium (38L)', measurements: { length: '48cm', width: '24cm', height: '28cm', weight: '1.5kg' }, stock: 7, price_override: 315 },
        { category_type: 'general', size_system: 'Standard', label: 'Large (45L)', measurements: { length: '54cm', width: '26cm', height: '31cm', weight: '1.8kg' }, stock: 5, price_override: 345 },
      ],
      variations: [
        { colorIdx: 0, sizeIdx: 0, model_number: 'LYR-38-BK', model_name: 'Cabin 38L', style: 'Structured Weekender', design: 'Dual Side Pockets', pattern: 'Pebbled Grain', version: '2026', material: 'Calfskin Leather', variant_name: 'Jet Black · Medium 38L', sku: 'SNX-BAG-38', price: 315, stock: 7 },
        { colorIdx: 0, sizeIdx: 1, model_number: 'LYR-45-BK', model_name: 'Grand 45L', style: 'Structured Weekender', design: 'Dual Side Pockets', pattern: 'Pebbled Grain', version: '2026', material: 'Calfskin Leather', variant_name: 'Jet Black · Large 45L', sku: 'SNX-BAG-45', price: 345, stock: 5 },
      ],
    },
    {
      product_code: 'SNX-OWN-004',
      sku: 'SNX-MEN-BLZ-04',
      name: 'Noir Tailored Wool Gold-Button Blazer',
      brand: 'SHOPNEXA ROBI HUB Sartorial',
      manufacturer: 'SHOPNEXA ROBI HUB Apparel Studio',
      product_type: 'own',
      category_id: getCatId('mens-fashion'),
      subcategory: 'Tailored Outerwear',
      short_description: 'Structured virgin wool blend blazer with notch lapels and signature brushed gold buttons.',
      full_description:
        'Cut for an architectural silhouette, this tailored obsidian blazer blends breathable merino-wool suiting with a half-canvas chest structure and custom gold-plated brass buttons.',
      highlights: [
        '80% Super 120s Virgin Wool / 20% Silk-Touch Viscose',
        'Custom Brushed Gold Crest Buttons',
        'Breathable Bemberg Cupro Full Lining',
        'Internal Passport & Pen Pockets',
      ],
      country_of_origin: 'Bangladesh',
      images: ['/src/assets/images/prod_tailored_jacket_1795308770592.jpg'],
      video_url: '',
      is_featured: 1,
      is_new_arrival: 1,
      is_trending: 0,
      is_best_seller: 1,
      is_special_offer: 0,
      is_recommended: 1,
      collection_tag: 'Sartorial Line',
      original_price: 220,
      selling_price: 175,
      discount_amount: 45,
      discount_percentage: 20,
      sale_price: 175,
      wholesale_price: 115,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'Includes breathable garment cover',
      package_contents: '1x Tailored Blazer, 1x Cedar Hanger, 1x Breathable Garment Bag',
      number_of_pieces: 3,
      package_quantity: 1,
      package_length: '58 cm',
      package_width: '42 cm',
      package_height: '8 cm',
      package_weight: '850 g',
      shipping_weight: '1.1 kg',
      included_accessories: 'Spare gold button kit and garment bag',
      specs: {
        FabricType: 'Super 120s Merino Worsted Wool',
        MaterialComposition: '80% Virgin Wool, 20% Viscose',
        FabricWeight: '280 GSM',
        FitType: 'Tailored Slim Fit',
        SleeveType: 'Full Sleeve with 4-Button Functional Cuff',
        NeckType: 'Notch Lapel',
        Gender: 'Men / Unisex',
        Season: 'All-Season',
        CareInstructions: 'Dry Clean Only; Steam Lightly',
      },
      size_chart: [
        { Size: 'S', Chest: '38 in', Waist: '32 in', Length: '28.5 in' },
        { Size: 'M', Chest: '40 in', Waist: '34 in', Length: '29.5 in' },
        { Size: 'L', Chest: '42 in', Waist: '36 in', Length: '30.5 in' },
        { Size: 'XL', Chest: '44 in', Waist: '38 in', Length: '31.0 in' },
      ],
      low_stock_threshold: 5,
      affiliate_url: '',
      estimated_delivery: '1–2 Days (Dhaka) · 2–4 Days (Bangladesh)',
      shipping_info: 'Delivered on hanger in rigid suit carrier.',
      return_policy: '7-day size exchange or return with tags attached.',
      colors: [
        { name: 'Obsidian Black', hex_code: '#09090B', stock: 24, sku: 'SNX-BLZ-OB', price_override: 175 },
        { name: 'Deep Charcoal', hex_code: '#27272A', stock: 12, sku: 'SNX-BLZ-CH', price_override: 175 },
      ],
      sizes: [
        { category_type: 'clothing', size_system: 'Standard', label: 'S', measurements: { chest: '38"', waist: '32"', length: '28.5"' }, stock: 8, price_override: null },
        { category_type: 'clothing', size_system: 'Standard', label: 'M', measurements: { chest: '40"', waist: '34"', length: '29.5"' }, stock: 12, price_override: null },
        { category_type: 'clothing', size_system: 'Standard', label: 'L', measurements: { chest: '42"', waist: '36"', length: '30.5"' }, stock: 10, price_override: null },
        { category_type: 'clothing', size_system: 'Standard', label: 'XL', measurements: { chest: '44"', waist: '38"', length: '31.0"' }, stock: 6, price_override: null },
      ],
      variations: [],
    },
    {
      product_code: 'SNX-OWN-005',
      sku: 'SNX-SHU-NR-05',
      name: 'Vanguard Calfskin & Gold Low-Top Sneakers',
      brand: 'Luxe Footwear',
      manufacturer: 'Luxe Footwear Atelier',
      product_type: 'own',
      category_id: getCatId('shoes'),
      subcategory: 'Luxury Sneakers',
      short_description: 'Full-grain Nappa leather court sneakers finished with a metallic gold heel tab and stitched Margom sole.',
      full_description:
        'Hand-lasted from supple black calfskin leather and lined with breathable vegetable-tanned leather. A crisp white sidewall-stitched cupsole and gold foil heel tab complete the silhouette.',
      highlights: [
        'Full-Grain Calfskin Leather Upper',
        'Metallic Gold Leather Heel Counter',
        'Full Vegetable-Tanned Leather Lining',
        'Sidewall-Stitched Natural Rubber Cupsole',
      ],
      country_of_origin: 'Portugal',
      images: ['/src/assets/images/prod_sneakers_noir_1795308771080.jpg'],
      video_url: '',
      is_featured: 1,
      is_new_arrival: 1,
      is_trending: 1,
      is_best_seller: 0,
      is_special_offer: 1,
      is_recommended: 1,
      collection_tag: 'New Arrivals',
      original_price: 195,
      selling_price: 158,
      discount_amount: 37,
      discount_percentage: 19,
      sale_price: 158,
      wholesale_price: 105,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'Includes extra waxed cotton laces',
      package_contents: '1x Pair of Sneakers, 1x Extra Waxed Laces, 2x Dust Bags',
      number_of_pieces: 4,
      package_quantity: 1,
      package_length: '34 cm',
      package_width: '23 cm',
      package_height: '13 cm',
      package_weight: '920 g',
      shipping_weight: '1.25 kg',
      included_accessories: 'Spare waxed laces and branded dust bags',
      specs: {
        UpperMaterial: 'Full-Grain Calfskin Leather',
        SoleMaterial: 'High-Density Natural Rubber Cupsole',
        InnerMaterial: 'Vegetable-Tanned Calf Leather',
        ClosureType: 'Waxed Cotton Lace-Up',
        HeelHeight: '2.8 cm',
        ShoeWeight: '460 g (per shoe, EU 42)',
      },
      size_chart: [
        { EU: '40', US: '7', UK: '6', FootLength: '25.3 cm' },
        { EU: '41', US: '8', UK: '7', FootLength: '26.0 cm' },
        { EU: '42', US: '9', UK: '8', FootLength: '26.7 cm' },
        { EU: '43', US: '10', UK: '9', FootLength: '27.3 cm' },
        { EU: '44', US: '11', UK: '10', FootLength: '28.0 cm' },
      ],
      low_stock_threshold: 4,
      affiliate_url: '',
      estimated_delivery: '1–3 Days (Bangladesh) · 5–9 Days (Global)',
      shipping_info: 'Double-boxed presentation packaging.',
      return_policy: '7-day unworn exchange or return.',
      colors: [
        { name: 'Black & Gold Heel', hex_code: '#18181B', stock: 26, sku: 'SNX-SHU-BGH', price_override: 158 },
      ],
      sizes: [
        { category_type: 'shoes', size_system: 'EU', label: 'EU 40 / US 7', measurements: { length: '25.3cm' }, stock: 5, price_override: null },
        { category_type: 'shoes', size_system: 'EU', label: 'EU 41 / US 8', measurements: { length: '26.0cm' }, stock: 6, price_override: null },
        { category_type: 'shoes', size_system: 'EU', label: 'EU 42 / US 9', measurements: { length: '26.7cm' }, stock: 7, price_override: null },
        { category_type: 'shoes', size_system: 'EU', label: 'EU 43 / US 10', measurements: { length: '27.3cm' }, stock: 5, price_override: null },
        { category_type: 'shoes', size_system: 'EU', label: 'EU 44 / US 11', measurements: { length: '28.0cm' }, stock: 3, price_override: null },
      ],
      variations: [],
    },
    // AFFILIATE PRODUCTS (AliExpress Partner Integration)
    {
      product_code: 'SNX-AFF-101',
      sku: 'AE-VERVE-ESP-01',
      name: 'Verve Matte Black & Brass Barista Espresso Maker',
      brand: 'Verve Kitchen Lab',
      manufacturer: 'Verve Appliances',
      product_type: 'affiliate',
      category_id: getCatId('kitchen-products'),
      subcategory: 'Coffee & Espresso',
      short_description: '15-bar PID temperature-controlled espresso brewer with brass pressure gauge and commercial steam wand.',
      full_description:
        'Available through our official AliExpress partner store. Features a heavy-gauge matte black steel housing, analog brass pressure dial, 58mm commercial portafilter, and rapid thermoblock heating.',
      highlights: [
        '15-Bar Italian ULKA Pump & Analog Brass Pressure Gauge',
        '58mm Walnut-Handle Commercial Portafilter',
        'Dedicated Microfoam Steam Wand',
        'Verified AliExpress Global Shipping',
      ],
      country_of_origin: 'China',
      images: ['/src/assets/images/prod_espresso_machine_1795308772074.jpg'],
      video_url: '',
      is_featured: 1,
      is_new_arrival: 0,
      is_trending: 1,
      is_best_seller: 1,
      is_special_offer: 1,
      is_recommended: 1,
      collection_tag: 'Global Partner Pick',
      original_price: 490,
      selling_price: 369,
      discount_amount: 121,
      discount_percentage: 25,
      sale_price: 369,
      wholesale_price: 0,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'Taxes & duties calculated by AliExpress at checkout',
      package_contents: '1x Espresso Machine, 1x 58mm Portafilter, 1x Brass Tamper, 2x Filter Baskets',
      number_of_pieces: 5,
      package_quantity: 1,
      package_length: '36 cm',
      package_width: '28 cm',
      package_height: '38 cm',
      package_weight: '7.4 kg',
      shipping_weight: '8.6 kg',
      included_accessories: 'Stainless steel tamper and dual-spout portafilter',
      specs: {
        PumpPressure: '15 Bar',
        Power: '1450W / 220V–240V',
        WaterTank: '1.8L Removable Reservoir',
        PortafilterSize: '58mm Commercial',
        BodyMaterial: 'Powder-Coated Steel & Brushed Brass',
      },
      size_chart: [],
      low_stock_threshold: 3,
      affiliate_url: 'https://www.aliexpress.com/wholesale?SearchText=matte+black+brass+espresso+machine&aff_platform=shopnexa',
      estimated_delivery: '7–14 Business Days (International Partner Shipping)',
      shipping_info: 'Fulfilled and shipped directly by verified AliExpress merchant.',
      return_policy: 'Covered by AliExpress Buyer Protection & Return Policy.',
      colors: [
        { name: 'Matte Black & Brass', hex_code: '#18181B', stock: 40, sku: 'AE-ESP-MBB', price_override: 369 },
      ],
      sizes: [
        { category_type: 'general', size_system: 'Standard', label: '220V EU/BD Plug', measurements: {}, stock: 25, price_override: 369 },
        { category_type: 'general', size_system: 'Standard', label: '110V US Plug', measurements: {}, stock: 15, price_override: 369 },
      ],
      variations: [],
    },
    {
      product_code: 'SNX-AFF-102',
      sku: 'AE-AURA-SRM-02',
      name: 'Aura Botanics Matte Renewal Facial Serum (30ml)',
      brand: 'Aura Botanics',
      manufacturer: 'Aura Skincare Lab',
      product_type: 'affiliate',
      category_id: getCatId('beauty-personal-care'),
      subcategory: 'Skincare Serums',
      short_description: 'Niacinamide, peptide, and botanical squalane elixir housed in UV-shielded matte black glass.',
      full_description:
        'Formulated to visibly refine texture and lock in deep hydration without shine. Packaged in recyclable matte obsidian glass with a precision brushed-gold dropper.',
      highlights: [
        '10% Niacinamide + Multi-Peptide Complex',
        'Fragrance-Free & Dermatologist Tested',
        'UV-Protected Matte Glass Dropper Bottle',
        'Verified AliExpress Flagship Store Link',
      ],
      country_of_origin: 'France',
      images: ['/src/assets/images/prod_serum_elixir_1795308770235.jpg'],
      video_url: '',
      is_featured: 1,
      is_new_arrival: 1,
      is_trending: 1,
      is_best_seller: 0,
      is_special_offer: 0,
      is_recommended: 1,
      collection_tag: 'Partner Beauty',
      original_price: 68,
      selling_price: 48,
      discount_amount: 20,
      discount_percentage: 29,
      sale_price: 48,
      wholesale_price: 0,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'Calculated at AliExpress checkout',
      package_contents: '1x 30ml Renewal Serum Glass Bottle with Dropper',
      number_of_pieces: 1,
      package_quantity: 1,
      package_length: '12 cm',
      package_width: '5 cm',
      package_height: '5 cm',
      package_weight: '110 g',
      shipping_weight: '160 g',
      included_accessories: 'Graduated glass pipette dropper',
      specs: {
        Volume: '30 ml / 1.0 fl oz',
        KeyActives: 'Niacinamide 10%, Hyaluronic Acid, Squalane',
        SkinType: 'All Skin Types',
        ShelfLife: '24 Months Unopened',
      },
      size_chart: [],
      low_stock_threshold: 5,
      affiliate_url: 'https://www.aliexpress.com/wholesale?SearchText=luxury+niacinamide+facial+serum+30ml&aff_platform=shopnexa',
      estimated_delivery: '8–15 Business Days via AliExpress Standard Shipping',
      shipping_info: 'Fulfilled directly by AliExpress partner store.',
      return_policy: 'AliExpress Buyer Protection applies.',
      colors: [
        { name: 'Matte Black Bottle', hex_code: '#111113', stock: 60, sku: 'AE-SRM-30', price_override: 48 },
      ],
      sizes: [
        { category_type: 'general', size_system: 'Standard', label: '30 ml', measurements: {}, stock: 40, price_override: 48 },
        { category_type: 'general', size_system: 'Standard', label: '50 ml', measurements: {}, stock: 20, price_override: 72 },
      ],
      variations: [],
    },
    {
      product_code: 'SNX-AFF-103',
      sku: 'AE-NEX-ACC-03',
      name: 'Apex Titanium Desk & Mobile Charging Dock',
      brand: 'Apex Hardware',
      manufacturer: 'Apex Precision Co.',
      product_type: 'affiliate',
      category_id: getCatId('mobile-accessories'),
      subcategory: 'Wireless Chargers & Docks',
      short_description: '3-in-1 Qi2 magnetic wireless desktop dock machined from anodized black aluminum with brass accents.',
      full_description:
        'Streamline your workspace with simultaneous 15W MagSafe-compatible phone charging, smartwatch fast charging, and earbud pad in a weighted CNC-machined billet aluminum chassis.',
      highlights: [
        '15W Qi2 Certified Magnetic Fast Charging',
        'Simultaneous Phone, Watch & Earbud Zones',
        'CNC Anodized Aluminum & Weighted Base',
        'Direct AliExpress Partner Fulfillment',
      ],
      country_of_origin: 'China',
      images: ['/src/assets/images/hero_shopnexa_luxury_1795308770793.jpg'],
      video_url: '',
      is_featured: 0,
      is_new_arrival: 1,
      is_trending: 1,
      is_best_seller: 1,
      is_special_offer: 1,
      is_recommended: 1,
      collection_tag: 'Tech Partner',
      original_price: 95,
      selling_price: 64,
      discount_amount: 31,
      discount_percentage: 33,
      sale_price: 64,
      wholesale_price: 0,
      shipping_cost: 0,
      tax_rate: 0,
      tax_info: 'Calculated at AliExpress checkout',
      package_contents: '1x 3-in-1 Charging Dock, 1x 1.5m Braided USB-C Cable, 1x 30W GaN Adapter',
      number_of_pieces: 3,
      package_quantity: 1,
      package_length: '18 cm',
      package_width: '14 cm',
      package_height: '12 cm',
      package_weight: '480 g',
      shipping_weight: '620 g',
      included_accessories: '30W GaN wall adapter and braided USB-C cable',
      specs: {
        Brand: 'Apex Hardware',
        Model: 'APX-QI2-3IN1',
        Output: '15W Phone + 5W Watch + 5W Earbuds',
        Connectivity: 'USB-C PD 30W',
        Warranty: '12 Months Partner Warranty',
      },
      size_chart: [],
      low_stock_threshold: 5,
      affiliate_url: 'https://www.aliexpress.com/wholesale?SearchText=3+in+1+magnetic+wireless+charging+station+aluminum&aff_platform=shopnexa',
      estimated_delivery: '6–12 Business Days (AliExpress Choice)',
      shipping_info: 'Shipped globally by AliExpress verified merchant.',
      return_policy: 'AliExpress 15-day free return where eligible.',
      colors: [
        { name: 'Anodized Black & Gold', hex_code: '#18181B', stock: 50, sku: 'AE-DOCK-BG', price_override: 64 },
      ],
      sizes: [
        { category_type: 'general', size_system: 'Standard', label: '30W EU/BD Adapter', measurements: {}, stock: 30, price_override: 64 },
        { category_type: 'general', size_system: 'Standard', label: '30W US Adapter', measurements: {}, stock: 20, price_override: 64 },
      ],
      variations: [],
    },
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      product_code, sku, name, brand, manufacturer, product_type, category_id, subcategory,
      short_description, full_description, highlights_json, country_of_origin, images_json, video_url,
      status, is_featured, is_new_arrival, is_trending, is_best_seller, is_special_offer, is_recommended, collection_tag,
      original_price, selling_price, discount_amount, discount_percentage, sale_price, currency, wholesale_price, shipping_cost, tax_rate, tax_info,
      package_contents, number_of_pieces, package_quantity, package_length, package_width, package_height, package_weight, shipping_weight, included_accessories,
      specs_json, size_chart_json, low_stock_threshold, affiliate_url, estimated_delivery, shipping_info, return_policy
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      'active', ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertColor = db.prepare(`
    INSERT INTO product_colors (product_id, name, hex_code, images_json, is_available, stock, sku, price_override)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
  `);

  const insertSize = db.prepare(`
    INSERT INTO product_sizes (product_id, category_type, size_system, label, measurements_json, stock, price_override, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertVar = db.prepare(`
    INSERT INTO product_variations (
      product_id, color_id, size_id, model_number, model_name, style, design, pattern, version, material, variant_name, image_url, sku, price, stock, is_available
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const item of catalog) {
    const res = insertProd.run(
      item.product_code,
      item.sku,
      item.name,
      item.brand,
      item.manufacturer,
      item.product_type,
      item.category_id,
      item.subcategory,
      item.short_description,
      item.full_description,
      JSON.stringify(item.highlights),
      item.country_of_origin,
      JSON.stringify(item.images),
      item.video_url,
      item.is_featured,
      item.is_new_arrival,
      item.is_trending,
      item.is_best_seller,
      item.is_special_offer,
      item.is_recommended,
      item.collection_tag,
      item.original_price,
      item.selling_price,
      item.discount_amount,
      item.discount_percentage,
      item.sale_price,
      item.wholesale_price,
      item.shipping_cost,
      item.tax_rate,
      item.tax_info,
      item.package_contents,
      item.number_of_pieces,
      item.package_quantity,
      item.package_length,
      item.package_width,
      item.package_height,
      item.package_weight,
      item.shipping_weight,
      item.included_accessories,
      JSON.stringify(item.specs),
      JSON.stringify(item.size_chart),
      item.low_stock_threshold,
      item.affiliate_url,
      item.estimated_delivery,
      item.shipping_info,
      item.return_policy
    );

    const productId = Number(res.lastInsertRowid);
    const colorIds: number[] = [];
    for (const c of item.colors) {
      const cRes = insertColor.run(
        productId,
        c.name,
        c.hex_code,
        JSON.stringify(item.images),
        c.stock,
        c.sku,
        c.price_override
      );
      colorIds.push(Number(cRes.lastInsertRowid));
    }

    const sizeIds: number[] = [];
    for (const s of item.sizes) {
      const sRes = insertSize.run(
        productId,
        s.category_type,
        s.size_system,
        s.label,
        JSON.stringify(s.measurements),
        s.stock,
        s.price_override
      );
      sizeIds.push(Number(sRes.lastInsertRowid));
    }

    for (const v of item.variations) {
      insertVar.run(
        productId,
        colorIds[v.colorIdx] ?? null,
        sizeIds[v.sizeIdx] ?? null,
        v.model_number,
        v.model_name,
        v.style,
        v.design,
        v.pattern,
        v.version,
        v.material,
        v.variant_name,
        item.images[0] || '',
        v.sku,
        v.price,
        v.stock
      );
    }

    recalculateProductMetrics(productId);
  }
}

const RESTORABLE_TABLES = [
  'users',
  'admin_config',
  'categories',
  'products',
  'product_colors',
  'product_sizes',
  'product_variations',
  'addresses',
  'cart_items',
  'wishlist_items',
  'couriers',
  'shipping_zones',
  'orders',
  'order_items',
  'affiliate_clicks',
  'coupons',
  'reviews',
  'payment_settings',
  'payment_records',
  'notifications',
  'site_settings',
  'newsletter_subscribers',
  'error_logs',
  'blocked_gmails',
] as const;

const REQUIRED_BACKUP_TABLES = ['site_settings', 'categories', 'products', 'users'] as const;

export interface DatabaseRestoreResult {
  restoredTables: string[];
  counts: {
    products: number;
    categories: number;
    orders: number;
    users: number;
  };
}

export function restoreDatabaseFromFile(backupFilePath: string): DatabaseRestoreResult {
  const resolvedPath = path.resolve(backupFilePath);
  const safeBaseDir = path.resolve(DATA_DIR) + path.sep;
  if (!resolvedPath.startsWith(safeBaseDir)) {
    throw new Error('Invalid backup file location');
  }
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('Backup file not found');
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.size < 100) {
    throw new Error('Uploaded file is too small to be a valid SQLite database');
  }

  const headerBuf = Buffer.alloc(16);
  const fd = fs.openSync(resolvedPath, 'r');
  try {
    fs.readSync(fd, headerBuf, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (headerBuf.toString('utf8') !== 'SQLite format 3\0') {
    throw new Error('Invalid database file: please upload a valid SHOPNEXA .db backup file');
  }

  const srcTables = new Set<string>();
  const srcDb = new Database(resolvedPath, { readonly: true });
  try {
    const integrity = srcDb.pragma('integrity_check') as Array<{ integrity_check?: string }>;
    if (!integrity.length || integrity[0]?.integrity_check !== 'ok') {
      throw new Error('Backup database integrity check failed');
    }

    const tableRows = srcDb
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .all() as Array<{ name: string }>;
    for (const row of tableRows) {
      srcTables.add(row.name);
    }

    for (const required of REQUIRED_BACKUP_TABLES) {
      if (!srcTables.has(required)) {
        throw new Error(`Backup file is missing required table: ${required}`);
      }
    }
  } finally {
    srcDb.close();
  }

  const restoredTables: string[] = [];
  let attached = false;

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // ignore if checkpoint is unavailable
  }

  db.pragma('foreign_keys = OFF');
  try {
    db.prepare(`ATTACH DATABASE ? AS restore_src`).run(resolvedPath);
    attached = true;

    const runRestore = db.transaction(() => {
      for (const table of RESTORABLE_TABLES) {
        if (!srcTables.has(table)) continue;

        const mainColsRaw = db.pragma(`main.table_info("${table}")`) as Array<{ name: string }>;
        const srcColsRaw = db.pragma(`restore_src.table_info("${table}")`) as Array<{ name: string }>;
        const srcColSet = new Set(srcColsRaw.map((c) => c.name));
        const commonCols = mainColsRaw
          .map((c) => c.name)
          .filter((name) => srcColSet.has(name) && /^[a-zA-Z0-9_]+$/.test(name));

        if (commonCols.length === 0) continue;

        const quotedCols = commonCols.map((c) => `"${c}"`).join(', ');
        db.exec(`DELETE FROM main."${table}";`);
        db.exec(`INSERT INTO main."${table}" (${quotedCols}) SELECT ${quotedCols} FROM restore_src."${table}";`);
        restoredTables.push(table);
      }

      const mainHasSeq = Boolean(
        db.prepare(`SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'`).get()
      );
      const srcHasSeq = Boolean(
        db.prepare(`SELECT 1 FROM restore_src.sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'`).get()
      );
      if (mainHasSeq && srcHasSeq) {
        db.exec(`DELETE FROM main.sqlite_sequence;`);
        db.exec(`INSERT INTO main.sqlite_sequence (name, seq) SELECT name, seq FROM restore_src.sqlite_sequence;`);
      }
    });

    runRestore();
  } finally {
    if (attached) {
      try {
        db.exec(`DETACH DATABASE restore_src;`);
      } catch {
        // ignore detach cleanup error
      }
    }
    db.pragma('foreign_keys = ON');
  }

  initDatabase();

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // ignore checkpoint error
  }

  const counts = {
    products: (db.prepare(`SELECT COUNT(*) AS cnt FROM products`).get() as { cnt: number }).cnt,
    categories: (db.prepare(`SELECT COUNT(*) AS cnt FROM categories`).get() as { cnt: number }).cnt,
    orders: (db.prepare(`SELECT COUNT(*) AS cnt FROM orders`).get() as { cnt: number }).cnt,
    users: (db.prepare(`SELECT COUNT(*) AS cnt FROM users`).get() as { cnt: number }).cnt,
  };

  return { restoredTables, counts };
}


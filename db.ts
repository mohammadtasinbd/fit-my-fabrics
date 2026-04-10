import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

let db: any;
try {
  const dbPath = process.env.VERCEL === "1" ? path.join('/tmp', 'ecommerce.db') : 'ecommerce.db';
  db = new Database(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
} catch (error) {
  console.error("Failed to initialize database:", error);
  // Fallback to in-memory database if file-based fails
  db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
}

// Initialize the schema
db.exec(`
-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  address TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.1 OTPS
CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT 0
);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sku TEXT,
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  gsm TEXT,
  material_composition TEXT,
  fit_type TEXT,
  weight TEXT,
  base_price DECIMAL NOT NULL,
  cost_price DECIMAL DEFAULT 0,
  discount_price DECIMAL,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_alert INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT 1,
  is_new_arrival BOOLEAN DEFAULT 0,
  is_best_seller BOOLEAN DEFAULT 0,
  color_group_id TEXT,
  short_description TEXT,
  fabric_details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  size TEXT,
  color TEXT,
  color_code TEXT,
  sku TEXT UNIQUE,
  stock_quantity INTEGER DEFAULT 0,
  additional_price DECIMAL DEFAULT 0
);

-- 5. PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT 0,
  display_order INTEGER DEFAULT 0
);

-- 6. SHIPPING RULES
CREATE TABLE IF NOT EXISTS shipping_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_name TEXT NOT NULL,
  base_charge DECIMAL NOT NULL,
  free_delivery_threshold DECIMAL,
  estimated_days TEXT
);

-- 7. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number INTEGER UNIQUE,
  user_id TEXT REFERENCES users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  district TEXT NOT NULL,
  subtotal DECIMAL NOT NULL,
  shipping_charge DECIMAL NOT NULL,
  discount_amount DECIMAL DEFAULT 0,
  total_amount DECIMAL NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('COD', 'bKash')),
  payment_status TEXT DEFAULT 'pending',
  order_status TEXT DEFAULT 'pending',
  bkash_trx_id TEXT,
  promo_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL NOT NULL
);

-- 9. HOMEPAGE BANNERS
CREATE TABLE IF NOT EXISTS hero_banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  button_text TEXT DEFAULT 'SHOP NOW',
  background_color TEXT DEFAULT '#000000',
  is_active BOOLEAN DEFAULT 1,
  priority INTEGER DEFAULT 0
);

-- 10. SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 11. PAGES
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. BULK DISCOUNT RULES
CREATE TABLE IF NOT EXISTS bulk_discount_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  min_quantity INTEGER NOT NULL,
  discount_percentage DECIMAL NOT NULL,
  is_active BOOLEAN DEFAULT 1
);

-- 13. PROMO CODES
CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL NOT NULL,
  min_order_amount DECIMAL DEFAULT 0,
  max_discount_amount DECIMAL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

// --- MIGRATIONS ---
// 1. Add button_text and background_color to hero_banners if missing
try {
  db.prepare("SELECT button_text FROM hero_banners LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE hero_banners ADD COLUMN button_text TEXT DEFAULT 'SHOP NOW'");
    db.exec("ALTER TABLE hero_banners ADD COLUMN background_color TEXT DEFAULT '#000000'");
    console.log("Migrated hero_banners table");
  } catch (err) {
    console.error("Migration failed for hero_banners:", err);
  }
}

// 2. Add order_number to orders if missing
try {
  db.prepare("SELECT order_number FROM orders LIMIT 1").get();
} catch (e) {
  try {
    // SQLite does not support adding a UNIQUE column via ALTER TABLE directly in some versions/conditions
    db.exec("ALTER TABLE orders ADD COLUMN order_number INTEGER");
    // Create an index instead if we want uniqueness
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)");
    
    // Seed order numbers for existing orders
    const orders = db.prepare("SELECT id FROM orders ORDER BY created_at ASC").all() as { id: string }[];
    let start = 1001;
    for (const order of orders) {
      db.prepare("UPDATE orders SET order_number = ? WHERE id = ?").run(start++, order.id);
    }
    console.log("Migrated orders table with sequential numbers");
  } catch (err) {
    console.error("Migration failed for orders:", err);
  }
}

// 3. Add status and address to users if missing
try {
  db.prepare("SELECT status FROM users LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked'))");
    console.log("Migrated users table with status column");
  } catch (err) {
    console.error("Migration failed for users status:", err);
  }
}

try {
  db.prepare("SELECT address FROM users LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN address TEXT");
    console.log("Migrated users table with address column");
  } catch (err) {
    console.error("Migration failed for users address:", err);
  }
}

// 4. Add permissions and is_master to users
try {
  db.prepare("SELECT permissions FROM users LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'");
    db.exec("ALTER TABLE users ADD COLUMN is_master BOOLEAN DEFAULT 0");
    console.log("Migrated users table with permissions and is_master columns");
  } catch (err) {
    console.error("Migration failed for users permissions:", err);
  }
}

// 5. Add paid_amount and payment_remarks to orders
try {
  db.prepare("SELECT paid_amount FROM orders LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE orders ADD COLUMN paid_amount DECIMAL DEFAULT 0");
    db.exec("ALTER TABLE orders ADD COLUMN payment_remarks TEXT");
    console.log("Migrated orders table with paid_amount and payment_remarks");
  } catch (err) {
    console.error("Migration failed for orders payment details:", err);
  }
}

// 6. Add new product fields
try {
  db.prepare("SELECT sku FROM products LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE products ADD COLUMN sku TEXT");
    db.exec("ALTER TABLE products ADD COLUMN gsm TEXT");
    db.exec("ALTER TABLE products ADD COLUMN material_composition TEXT");
    db.exec("ALTER TABLE products ADD COLUMN fit_type TEXT");
    db.exec("ALTER TABLE products ADD COLUMN weight TEXT");
    db.exec("ALTER TABLE products ADD COLUMN cost_price DECIMAL DEFAULT 0");
    db.exec("ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 0");
    db.exec("ALTER TABLE products ADD COLUMN low_stock_alert INTEGER DEFAULT 10");
    db.exec("ALTER TABLE products ADD COLUMN color_group_id TEXT");
    console.log("Migrated products table with new fields");
  } catch (err) {
    console.error("Migration failed for products new fields:", err);
  }
}

// Helper to check if a column exists
const columnExists = (table: string, column: string) => {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  return info.some(col => col.name === column);
};

// Migration for products table
if (!columnExists('products', 'short_description')) {
  try {
    db.exec("ALTER TABLE products ADD COLUMN short_description TEXT");
    console.log("Added short_description to products");
  } catch (err) {
    console.error("Failed to add short_description:", err);
  }
}

if (!columnExists('products', 'fabric_details')) {
  try {
    db.exec("ALTER TABLE products ADD COLUMN fabric_details TEXT");
    console.log("Added fabric_details to products");
  } catch (err) {
    console.error("Failed to add fabric_details:", err);
  }
}

// Migration for orders table
if (!columnExists('orders', 'promo_code')) {
  try {
    db.exec("ALTER TABLE orders ADD COLUMN promo_code TEXT");
    console.log("Added promo_code to orders");
  } catch (err) {
    console.error("Failed to add promo_code:", err);
  }
}

if (!columnExists('orders', 'discount_amount')) {
  try {
    db.exec("ALTER TABLE orders ADD COLUMN discount_amount DECIMAL DEFAULT 0");
    console.log("Added discount_amount to orders");
  } catch (err) {
    console.error("Failed to add discount_amount:", err);
  }
}

if (!columnExists('orders', 'is_active')) {
  try {
    db.exec("ALTER TABLE orders ADD COLUMN is_active BOOLEAN DEFAULT 1");
    console.log("Added is_active to orders");
  } catch (err) {
    console.error("Failed to add is_active:", err);
  }
}

if (!columnExists('orders', 'order_number')) {
  try {
    db.exec("ALTER TABLE orders ADD COLUMN order_number INTEGER UNIQUE");
    console.log("Added order_number to orders");
    
    // Seed order numbers for existing orders
    const orders = db.prepare("SELECT id FROM orders ORDER BY created_at ASC").all() as any[];
    const updateOrderNumber = db.prepare("UPDATE orders SET order_number = ? WHERE id = ?");
    let currentNumber = 1001;
    for (const order of orders) {
      updateOrderNumber.run(currentNumber++, order.id);
    }
  } catch (err) {
    console.error("Failed to add order_number:", err);
  }
}

// Seed bulk discount rules if empty
try {
  const discountRuleCount = db.prepare('SELECT COUNT(*) as count FROM bulk_discount_rules').get() as { count: number };
  if (discountRuleCount.count === 0) {
    const insertRule = db.prepare('INSERT INTO bulk_discount_rules (min_quantity, discount_percentage) VALUES (?, ?)');
    // Initial rule: 5 pcs = 5%, 6 pcs = 6%, etc.
    for (let i = 5; i <= 20; i++) {
      insertRule.run(i, i);
    }
    console.log("Seeded bulk discount rules");
  }
} catch (e) {
  console.error("Failed to seed bulk discount rules:", e);
}

// 7. Ensure new site settings exist
try {
  const keys = ['site_logo_height', 'show_logo_and_name'];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
  insertSetting.run('site_logo_height', '40');
  insertSetting.run('show_logo_and_name', '0');
  console.log("Ensured new site settings exist");
} catch (err) {
  console.error("Migration failed for new site settings:", err);
}

// --- END MIGRATIONS ---

// Seed some initial data if empty
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
if (categoryCount.count === 0) {
  const insertCategory = db.prepare('INSERT INTO categories (name, slug, is_featured, image_url) VALUES (?, ?, ?, ?)');
  insertCategory.run('Polo T-Shirts', 'polo', 1, 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80');
  insertCategory.run('Round Neck', 'round-neck', 1, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80');
  insertCategory.run('Others', 'others', 1, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80');

  const insertShipping = db.prepare('INSERT INTO shipping_rules (zone_name, base_charge, free_delivery_threshold, estimated_days) VALUES (?, ?, ?, ?)');
  insertShipping.run('Inside Dhaka', 80, null, '1-2 Days');
  insertShipping.run('Outside Dhaka', 120, null, '3-5 Days');

  // Seed Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, slug, description, short_description, category_id, base_price, discount_price, is_best_seller, is_new_arrival, fabric_details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (id, product_id, size, color, color_code, sku, stock_quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, image_url, is_main, display_order)
    VALUES (?, ?, ?, ?)
  `);

  // Product 1: Polo
  const p1Id = 'p1';
  insertProduct.run(p1Id, 'Premium Pique Polo', 'premium-pique-polo', 
    'Our signature pique polo is crafted from 100% combed cotton for a soft feel and durable finish. Features a classic fit and ribbed collar.',
    'Classic pique polo in premium cotton.',
    1, 1250, 950, 0, 1, '100% Combed Cotton Pique.');
  
  insertVariant.run('v1', p1Id, 'M', 'Navy', '#000080', 'POLO-NVY-M', 0);
  insertVariant.run('v2', p1Id, 'L', 'Navy', '#000080', 'POLO-NVY-L', 0);
  insertVariant.run('v3', p1Id, 'XL', 'Navy', '#000080', 'POLO-NVY-XL', 0);
  
  insertImage.run(p1Id, 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80', 1, 0);

  // Product 2: Round Neck
  const p2Id = 'p2';
  insertProduct.run(p2Id, 'Essential Round Neck Tee', 'essential-round-neck-tee',
    'The perfect everyday t-shirt. Made from lightweight, breathable cotton jersey with a comfortable round neckline.',
    'Comfortable cotton round neck t-shirt.',
    2, 650, 450, 0, 0, '100% Cotton Jersey.');
  
  insertVariant.run('v4', p2Id, 'M', 'Black', '#000000', 'TEE-BLK-M', 0);
  insertVariant.run('v5', p2Id, 'L', 'Black', '#000000', 'TEE-BLK-L', 0);
  insertImage.run(p2Id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80', 1, 0);
}

// Seed default pages if empty
const pageCount = db.prepare('SELECT COUNT(*) as count FROM pages').get() as { count: number };
if (pageCount.count === 0) {
  const insertPage = db.prepare('INSERT INTO pages (slug, title, content) VALUES (?, ?, ?)');
  insertPage.run('terms', 'Terms and Conditions', 'Default Terms and Conditions content...');
  insertPage.run('returns', 'Return & Exchange Policy', 'Default Return Policy content...');
  insertPage.run('size-guide', 'Size Guide', 'Default Size Guide content...');
  insertPage.run('contact', 'Contact Us', 'Default Contact Us content...');
}

// Seed default site settings if empty
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get() as { count: number };
if (settingsCount.count === 0) {
  const insertSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
  insertSetting.run('site_name', 'DACCA THREADS');
  insertSetting.run('site_logo', '');
  insertSetting.run('site_logo_height', '40');
  insertSetting.run('show_logo_and_name', '0');
  insertSetting.run('footer_text', '© 2026 DACCA THREADS. ALL RIGHTS RESERVED.');
  insertSetting.run('contact_email', 'mohammad.tasin1999@gmail.com');
  insertSetting.run('contact_phone', '01568-481467');
  insertSetting.run('facebook_url', 'https://facebook.com/DaccaThreads');
  insertSetting.run('whatsapp_url', 'https://wa.me/8801568481467');
  
  // SMTP Configuration
  insertSetting.run('SMTP_HOST', 'mail.privateemail.com');
  insertSetting.run('SMTP_PORT', '465');
  insertSetting.run('SMTP_USER', 'admin@fitmyfabrics.com');
  insertSetting.run('SMTP_FROM', 'admin@fitmyfabrics.com');
  insertSetting.run('SMTP_PASS', '');
}

// Migration: Rename old smtp keys to new ones if they exist
try {
  db.exec(`
    UPDATE site_settings SET key = 'SMTP_HOST' WHERE key = 'smtp_host';
    UPDATE site_settings SET key = 'SMTP_PORT' WHERE key = 'smtp_port';
    UPDATE site_settings SET key = 'SMTP_USER' WHERE key = 'smtp_user';
    UPDATE site_settings SET key = 'SMTP_FROM' WHERE key = 'smtp_from';
    UPDATE site_settings SET key = 'SMTP_PASS' WHERE key = 'smtp_pass';
  `);
} catch (e) {
  // Ignore if keys already exist or other issues
}

// Migration: Update SMTP_HOST to mail.privateemail.com if it's still the old value
try {
  db.prepare("UPDATE site_settings SET value = 'mail.privateemail.com' WHERE key = 'SMTP_HOST' AND value = 'mail.fitmyfabrics.com'").run();
} catch (e) {
  // Ignore
}

// Promote specific user to master admin
try {
  db.prepare("UPDATE users SET role = 'admin', is_master = 1 WHERE email = 'mohammad.tasin1999@gmail.com'").run();
} catch (e) {
  // Ignore if user doesn't exist
}

try {
  // Check if admin@fitmyfabrics.com already exists before trying to rename 'Admin'
  const targetExists = db.prepare("SELECT 1 FROM users WHERE email = 'admin@fitmyfabrics.com'").get();
  if (!targetExists) {
    db.prepare("UPDATE users SET email = 'admin@fitmyfabrics.com' WHERE email = 'Admin'").run();
  }
} catch (e) {
  // Ignore
}

// Ensure default Admin user exists
const ensureAdmin = async () => {
  try {
    const adminExists = db.prepare("SELECT * FROM users WHERE email = 'admin@fitmyfabrics.com'").get();
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Password', 10);
      db.prepare("INSERT INTO users (id, name, phone, email, password, role, is_master) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(uuidv4(), 'Admin', 'admin', 'admin@fitmyfabrics.com', hashedPassword, 'admin', 1);
    }
  } catch (error) {
    console.error("Error ensuring admin user:", error);
  }
};
ensureAdmin();

const insertBanner = db.prepare('INSERT INTO hero_banners (title, subtitle, image_url, link_url, priority, button_text, background_color) VALUES (?, ?, ?, ?, ?, ?, ?)');
insertBanner.run('BULK ORDER SPECIAL', 'Get up to 20% off on bulk orders. 5+ items = 5% discount, +1% for each extra item!', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80', '/shop', 1, 'SHOP BULK', '#1a1a1a');
insertBanner.run('NEW ARRIVALS', 'Check out our latest Polo and Round Neck collections.', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1920&q=80', '/shop', 2, 'EXPLORE NOW', '#000000');

export default db;

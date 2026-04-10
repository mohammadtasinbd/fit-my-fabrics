import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import db from "./db.ts";
import { adminDb, adminAuth } from "./src/firebase-admin.ts";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Server script starting...");

const JWT_SECRET = "dacca-threads-secret-key-2024";

// Email Transporter
const createTransporter = async () => {
  try {
    const settingsSnapshot = await adminDb.collection('site_settings').get();
    const smtp: any = {};
    settingsSnapshot.forEach(doc => {
      if (doc.id.startsWith('SMTP_')) {
        smtp[doc.id] = doc.data().value;
      }
    });

    const host = (smtp.SMTP_HOST || process.env.SMTP_HOST || "").trim();
    const port = (smtp.SMTP_PORT || process.env.SMTP_PORT || "").trim();
    const user = (smtp.SMTP_USER || process.env.SMTP_USER || "").trim();
    const pass = (smtp.SMTP_PASS || process.env.SMTP_PASS || "");
    const from = (smtp.SMTP_FROM || process.env.SMTP_FROM || "").trim();

    if (host && port && user && pass) {
      console.log(`[SMTP] Initializing transporter for user "${user}" on ${host}:${port} (Secure: ${parseInt(port) === 465}, Pass Length: ${pass.length})`);
      
      const transportOptions: any = {
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        requireTLS: parseInt(port) === 587,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
          servername: host
        },
        debug: true,
        logger: true,
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 20000,
      };

      // Namecheap/PrivateEmail often works better with explicit LOGIN method
      if (host.includes('privateemail.com')) {
        transportOptions.authMethod = 'LOGIN';
      }

      const transport = nodemailer.createTransport(transportOptions);

      // Optional: verify connection on creation (don't await to avoid blocking startup)
      transport.verify((error) => {
        if (error) {
          console.error(`[SMTP] Verification failed for user "${user}" on host "${host}":`, error.message);
        } else {
          console.log(`[SMTP] Server is ready to take our messages for ${user}`);
        }
      });

      return transport;
    } else {
      if (!host || !port || !user || !pass) {
        const missing = [];
        if (!host) missing.push('SMTP_HOST');
        if (!port) missing.push('SMTP_PORT');
        if (!user) missing.push('SMTP_USER');
        if (!pass) missing.push('SMTP_PASS');
        console.warn(`[SMTP] Transporter not created. Missing settings: ${missing.join(', ')}`);
      }
    }
  } catch (error) {
    console.error("Failed to create transporter from DB settings:", error);
  }
  return null;
};

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let transporter: any = null;

// Helper to refresh transporter when settings change
const refreshTransporter = async () => {
  transporter = await createTransporter();
};

async function initServer() {
  transporter = await createTransporter();

  // Seed Firestore if empty
  try {
    const settingsSnapshot = await adminDb.collection('site_settings').limit(1).get();
    if (settingsSnapshot.empty) {
      console.log("[STARTUP] Firestore is empty. Seeding from SQLite...");
      
      // Seed categories
      const categories = db.prepare("SELECT * FROM categories").all() as any[];
      for (const cat of categories) {
        await adminDb.collection('categories').doc(cat.id.toString()).set({
          ...cat,
          is_featured: !!cat.is_featured
        });
      }

      // Seed products
      const products = db.prepare("SELECT * FROM products").all() as any[];
      for (const p of products) {
        await adminDb.collection('products').doc(p.id.toString()).set({
          ...p,
          is_active: !!p.is_active,
          is_new_arrival: !!p.is_new_arrival,
          is_best_seller: !!p.is_best_seller
        });
        
        const images = db.prepare("SELECT * FROM product_images WHERE product_id = ?").all(p.id) as any[];
        for (const img of images) {
          await adminDb.collection(`products/${p.id}/images`).doc(img.id.toString()).set({
            ...img,
            is_main: !!img.is_main
          });
        }

        const variants = db.prepare("SELECT * FROM product_variants WHERE product_id = ?").all(p.id) as any[];
        for (const v of variants) {
          await adminDb.collection(`products/${p.id}/variants`).doc(v.id.toString()).set(v);
        }
      }

      // Seed banners
      const banners = db.prepare("SELECT * FROM hero_banners").all() as any[];
      for (const b of banners) {
        await adminDb.collection('hero_banners').doc(b.id.toString()).set({
          ...b,
          is_active: !!b.is_active
        });
      }

      // Seed settings
      const settings = db.prepare("SELECT * FROM site_settings").all() as any[];
      for (const s of settings) {
        await adminDb.collection('site_settings').doc(s.key).set({ value: s.value });
      }

      // Seed pages
      const pages = db.prepare("SELECT * FROM pages").all() as any[];
      for (const pg of pages) {
        await adminDb.collection('pages').doc(pg.slug).set(pg);
      }

      console.log("[STARTUP] Firestore seeding completed.");
    } else {
      console.log("[STARTUP] Firestore already contains data.");
    }
  } catch (error) {
    console.error("[STARTUP] Firestore seeding error:", error);
  }

  // Verify DB connection and OTPS table
  try {
    const otpCount = db.prepare("SELECT COUNT(*) as count FROM otps").get() as any;
    console.log(`[STARTUP] Database connected. Current OTP count: ${otpCount.count}`);
  } catch (error) {
    console.error("[STARTUP] Database error:", error);
  }
}

initServer();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      
      // Check if user is blocked
      const dbUser = db.prepare("SELECT status FROM users WHERE id = ?").get(user.id) as any;
      if (dbUser && dbUser.status === 'blocked') {
        return res.status(403).json({ error: "Your account has been blocked. Please contact support." });
      }

      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: "Admin access required" });
    }
  };

  const isMaster = (req: any, res: any, next: any) => {
    const user = db.prepare("SELECT is_master FROM users WHERE id = ?").get(req.user.id) as any;
    if (user && user.is_master) {
      next();
    } else {
      res.status(403).json({ error: "Master Admin access required" });
    }
  };

  // API Routes
  
  app.get("/api/admin/test-email", authenticateToken, isAdmin, async (req: any, res) => {
    if (!transporter) {
      return res.status(400).json({ error: "SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS first." });
    }

    const hostSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_HOST'").get() as any;
    const currentHost = (hostSetting?.value || process.env.SMTP_HOST || "").trim();

    try {
      const fromSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_FROM'").get() as any;
      const from = fromSetting?.value || process.env.SMTP_FROM || process.env.SMTP_USER;
      
      // Ensure we have a valid recipient. Fallback to SMTP_USER if req.user.email is missing or invalid
      let to = req.user.email;
      if (!to || !to.includes('@')) {
        console.warn(`[SMTP Test] User email "${to}" is invalid or missing. Falling back to SMTP_USER.`);
        const smtpUserSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_USER'").get() as any;
        to = smtpUserSetting?.value || process.env.SMTP_USER;
      }

      if (!to || !to.includes('@')) {
        return res.status(400).json({ error: "No valid recipient email found. Please ensure your admin account has a valid email address or SMTP_USER is set to a valid email." });
      }

      console.log(`[SMTP Test] Sending test email from: ${from} to: ${to}`);
      
      const sendMailPromise = transporter.sendMail({
        from,
        to,
        subject: "SMTP Test Email - FIT MY FABRICS",
        text: "Congratulations! Your SMTP configuration is working correctly. You can now send OTPs and order confirmations to your customers.",
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP Test Timeout')), 12000)
      );

      await Promise.race([sendMailPromise, timeoutPromise]);
      
      console.log(`[SMTP Test] Success: Test email sent to ${to}`);
      res.json({ success: true, message: `Test email sent successfully to ${to}` });
    } catch (error: any) {
      console.error("SMTP Test failed:", error);
      
      let helpfulMessage = "Failed to send test email. Please check your SMTP settings.";
      if (error.message.includes('535')) {
        helpfulMessage = "Authentication failed (535). Please verify your SMTP_USER and SMTP_PASS.";
        if (currentHost.includes('privateemail.com')) {
          helpfulMessage += " For Namecheap Private Email, ensure you are using your full email address as the username and that your password is correct. If you have 2FA enabled, you MUST use an App Password.";
        } else if (currentHost.includes('gmail.com')) {
          helpfulMessage += " For Gmail, you MUST use an App Password (not your regular password) and have 2-Step Verification enabled.";
        }
      } else if (error.message.includes('ECONNREFUSED')) {
        const portSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_PORT'").get() as any;
        const currentPort = (portSetting?.value || process.env.SMTP_PORT || "").trim();
        helpfulMessage = `Connection refused on port ${currentPort}. This usually means the server is not listening on this port or a firewall is blocking it. `;
        if (currentPort === '465') {
          helpfulMessage += "CRITICAL: Try using port 587 instead. Many servers use 587 for STARTTLS instead of 465 for SSL.";
        } else if (currentPort === '587') {
          helpfulMessage += "Try using port 465 instead, or verify that your SMTP host is correct and allows connections from this server.";
        } else {
          helpfulMessage += "Please verify your SMTP_HOST and SMTP_PORT with your email provider.";
        }
      } else if (error.message.includes('ETIMEDOUT')) {
        helpfulMessage = "Connection timed out. The server took too long to respond. This often happens if the port (465/587) is blocked by a firewall or if the host is incorrect.";
      }

      res.status(500).json({ 
        error: helpfulMessage, 
        details: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
    }
  });

  // Site Settings & Pages
  app.get("/api/site-settings", async (req, res) => {
    try {
      const snapshot = await adminDb.collection('site_settings').get();
      const settingsMap: any = {};
      snapshot.forEach(doc => {
        settingsMap[doc.id] = doc.data().value;
      });
      res.json(settingsMap);
    } catch (error) {
      console.error("Failed to fetch site settings:", error);
      res.status(500).json({ error: "Failed to fetch site settings" });
    }
  });

  app.get("/api/pages/:slug", (req, res) => {
    try {
      const page = db.prepare("SELECT * FROM pages WHERE slug = ?").get(req.params.slug);
      if (!page) return res.status(404).json({ error: "Page not found" });
      res.json(page);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch page" });
    }
  });

  app.get("/api/admin/site-settings", authenticateToken, isAdmin, (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM site_settings").all();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/site-settings", authenticateToken, isAdmin, async (req, res) => {
    const settings = req.body; // Array of { key, value }
    try {
      const upsert = db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)");
      const transaction = db.transaction((items) => {
        for (const item of items) upsert.run(item.key, item.value);
      });
      transaction(settings);
      await refreshTransporter();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/admin/pages", authenticateToken, isAdmin, (req, res) => {
    try {
      const pages = db.prepare("SELECT * FROM pages").all();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  app.put("/api/admin/pages/:slug", authenticateToken, isAdmin, (req, res) => {
    const { title, content } = req.body;
    try {
      db.prepare("UPDATE pages SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?")
        .run(title, content, req.params.slug);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update page" });
    }
  });

  app.post("/api/admin/pages", authenticateToken, isAdmin, (req, res) => {
    const { title, slug, content } = req.body;
    try {
      db.prepare("INSERT INTO pages (title, slug, content) VALUES (?, ?, ?)")
        .run(title, slug, content);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to create page" });
    }
  });

  app.delete("/api/admin/pages/:id", authenticateToken, isAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM pages WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete page" });
    }
  });

  // Admin Management (Master Admin Only)
  app.post("/api/admin/admins", authenticateToken, isAdmin, isMaster, async (req, res) => {
    const { name, phone, email, password, permissions, status } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = uuidv4();
      db.prepare("INSERT INTO users (id, name, phone, email, password, role, permissions, status) VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)")
        .run(id, name, phone, email, hashedPassword, JSON.stringify(permissions || []), status || 'active');
      res.json({ success: true, id });
    } catch (error) {
      res.status(400).json({ error: "Failed to create admin user" });
    }
  });

  app.patch("/api/admin/admins/:id", authenticateToken, isAdmin, isMaster, (req, res) => {
    const { name, phone, email, permissions, status } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, phone = ?, email = ?, permissions = ?, status = ? WHERE id = ? AND role = 'admin'")
        .run(name, phone, email, JSON.stringify(permissions || []), status, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update admin user" });
    }
  });

  app.delete("/api/admin/admins/:id", authenticateToken, isAdmin, isMaster, (req, res) => {
    try {
      db.prepare("DELETE FROM users WHERE id = ? AND role = 'admin'").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete admin user" });
    }
  });

  app.patch("/api/user/change-password", authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
      if (!user) return res.status(404).json({ error: "User not found" });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Simulated Email Functions
  const sendOrderConfirmationEmail = async (order: any, user: any) => {
    const subject = `Order Confirmation - #${order.order_number}`;
    const content = `Hello ${user.name}, your order #${order.order_number} has been placed successfully. Total: ${order.total_amount}`;
    
    if (transporter) {
      try {
        const fromSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_FROM'").get() as any;
        const from = fromSetting?.value || process.env.SMTP_FROM || process.env.SMTP_USER;
        
        await transporter.sendMail({
          from,
          to: user.email,
          subject,
          text: content,
        });
        console.log(`Order confirmation email sent to ${user.email}`);
        return { success: true };
      } catch (error: any) {
        console.error("Failed to send order confirmation email:", error);
        return { success: false, error: error.message };
      }
    } else {
      console.log(`[EMAIL SIMULATION] Sending order confirmation to ${user.email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${content}`);
      return { success: true, simulated: true };
    }
  };

  const sendOTPEmail = async (email: string, otp: string) => {
    const subject = `Your One-Time Password (OTP)`;
    const content = `Your OTP is ${otp}. It will expire in 10 minutes.`;

    if (transporter) {
      try {
        console.log(`[SMTP] Attempting to send OTP to ${email}...`);
        
        const fromSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_FROM'").get() as any;
        const from = fromSetting?.value || process.env.SMTP_FROM || process.env.SMTP_USER;

        const mailOptions = {
          from,
          to: email,
          subject,
          text: content,
        };
        
        console.log(`[SMTP] Mail options:`, { ...mailOptions, text: '***' });
        
        // Add a manual timeout to the sendMail call
        const sendMailPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMTP Send Timeout (20s)')), 20000)
        );

        const info = await Promise.race([sendMailPromise, timeoutPromise]) as any;
        console.log(`[SMTP] OTP email sent successfully to ${email}. MessageId: ${info.messageId}`);
        return { success: true };
      } catch (error: any) {
        console.error("[SMTP] Failed to send OTP email:", error);
        
        let errorMessage = error.message;
        if (error.code === 'ECONNREFUSED') {
          const portSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_PORT'").get() as any;
          const currentPort = (portSetting?.value || process.env.SMTP_PORT || "").trim();
          errorMessage = `Connection refused on port ${currentPort}. Try using port ${currentPort === '465' ? '587' : '465'}.`;
        } else if (error.code === 'ETIMEDOUT') {
          errorMessage = `Connection timed out. The SMTP server is not responding. Port 465/587 might be blocked.`;
        } else if (error.message.includes('535')) {
          const hostSetting = db.prepare("SELECT value FROM site_settings WHERE key = 'SMTP_HOST'").get() as any;
          const currentHost = (hostSetting?.value || process.env.SMTP_HOST || "").trim();
          errorMessage = "Authentication failed (535). Please verify your SMTP credentials.";
          if (currentHost.includes('privateemail.com')) {
            errorMessage += " For Namecheap Private Email, ensure you use your full email address and check if 2FA is enabled (requires App Password).";
          } else if (currentHost.includes('gmail.com')) {
            errorMessage += " For Gmail, you MUST use an App Password.";
          }
        }
        
        return { success: false, error: errorMessage };
      }
    } else {
      console.log(`[EMAIL SIMULATION] Sending OTP to ${email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Content: ${content}`);
      return { success: true, simulated: true };
    }
  };

  // Auth
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    console.log(`\n--- OTP REQUEST START ---`);
    console.log(`[OTP] Request received for email: ${email}`);
    if (!email) {
      console.log(`[OTP] Error: Email is missing`);
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    try {
      console.log(`[OTP] DB: Deleting old OTPs for ${email}`);
      const deleteResult = db.prepare("DELETE FROM otps WHERE email = ?").run(email);
      console.log(`[OTP] DB: Deleted ${deleteResult.changes} old OTPs`);
      
      console.log(`[OTP] DB: Inserting new OTP for ${email}`);
      const insertResult = db.prepare("INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)").run(email, otp, expiresAt);
      console.log(`[OTP] DB: Inserted OTP with ID ${insertResult.lastInsertRowid}`);
      
      console.log(`[OTP] EMAIL: Attempting to send to ${email}`);
      const emailResult = await sendOTPEmail(email, otp);
      console.log(`[OTP] EMAIL: Result for ${email}:`, emailResult.success ? 'Success' : 'Failed');
      
      const response: any = { success: true, message: "OTP sent successfully" };
      if (!transporter) {
        console.log(`[OTP] No transporter configured, returning debug OTP for ${email}`);
        response.debugOtp = otp; // Return OTP in response for testing if SMTP is not configured
      } else if (!emailResult.success) {
        console.error(`[OTP] Failed to send email to ${email}: ${emailResult.error}`);
        const errorResponse: any = { 
          error: "Failed to send email. Please check SMTP configuration.", 
          details: emailResult.error 
        };
        // In non-production or if explicitly allowed, provide the OTP as fallback
        if (process.env.NODE_ENV !== 'production' || !process.env.SMTP_PASS) {
          errorResponse.debugOtp = otp;
        }
        return res.status(500).json(errorResponse);
      }
      
      console.log(`[OTP] Success for ${email}`);
      res.json(response);
    } catch (error) {
      console.error("[OTP] Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { name, phone, email, password, otp } = req.body;
    
    // Verify OTP
    const otpRecord = db.prepare("SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1").get(email, otp) as any;
    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Delete OTP after use
    db.prepare("DELETE FROM otps WHERE email = ?").run(email);

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    try {
      db.prepare("INSERT INTO users (id, name, phone, email, password) VALUES (?, ?, ?, ?, ?)")
        .run(id, name, phone, email, hashedPassword);
      
      const user = { id, name, phone, email, role: 'customer', status: 'active' };
      const token = jwt.sign(user, JWT_SECRET);
      res.json({ token, user });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(400).json({ error: "Phone number already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { login, password } = req.body; // login can be phone or email
    console.log(`Login attempt for: ${login}`);
    try {
      const user = db.prepare("SELECT * FROM users WHERE phone = ? OR email = ?").get(login, login) as any;
      console.log(`User query result for ${login}:`, user ? "Found" : "Not Found");

      if (!user) {
        console.log(`User not found: ${login}`);
        return res.status(401).json({ error: "Invalid/wrong username or password" });
      }

      if (user.status === 'blocked') {
        return res.status(403).json({ error: "Your account has been blocked. Please contact support." });
      }

      console.time(`bcrypt_${login}`);
      const isMatch = await bcrypt.compare(password, user.password);
      console.timeEnd(`bcrypt_${login}`);
      if (!isMatch) {
        console.log(`Password mismatch for: ${login}`);
        return res.status(401).json({ error: "Invalid/wrong username or password" });
      }

      console.log(`Login successful for: ${login}`);
      const { password: _, ...userWithoutPassword } = user;
      const token = jwt.sign(userWithoutPassword, JWT_SECRET);
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, name, phone, email, address, role, status, is_master, created_at FROM users WHERE id = ?").get(req.user.id);
    res.json(user);
  });

  // Admin Customer Management
  app.get("/api/admin/customers", authenticateToken, isAdmin, (req, res) => {
    try {
      const customers = db.prepare("SELECT id, name, phone, email, address, role, status, created_at FROM users WHERE role = 'customer'").all();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.patch("/api/admin/customers/:id", authenticateToken, isAdmin, (req, res) => {
    const { name, phone, email, address, status } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, phone = ?, email = ?, address = ?, status = ? WHERE id = ?")
        .run(name, phone, email, address, status, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.post("/api/admin/customers", authenticateToken, isAdmin, async (req, res) => {
    const { name, phone, email, password, address, status } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password || '123456', 10);
      const id = uuidv4();
      db.prepare("INSERT INTO users (id, name, phone, email, password, role, address, status) VALUES (?, ?, ?, ?, ?, 'customer', ?, ?)")
        .run(id, name, phone, email, hashedPassword, address || '', status || 'active');
      res.json({ success: true, id });
    } catch (error) {
      res.status(400).json({ error: "Failed to create customer" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const snapshot = await adminDb.collection('categories').get();
      const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(categories);
    } catch (error) {
      console.error("Categories error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { category, featured, limit: limitVal, search, minPrice, maxPrice } = req.query;
      let q: any = adminDb.collection('products').where('is_active', '==', true);

      if (category) {
        const catSnapshot = await adminDb.collection('categories').where('slug', '==', category).limit(1).get();
        if (!catSnapshot.empty) {
          q = q.where('category_id', '==', catSnapshot.docs[0].id);
        }
      }

      if (featured === 'true') {
        q = q.where('is_best_seller', '==', true);
      }

      const snapshot = await q.get();
      let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (search) {
        const s = (search as string).toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
      }

      if (minPrice) products = products.filter(p => p.base_price >= parseFloat(minPrice as string));
      if (maxPrice) products = products.filter(p => p.base_price <= parseFloat(maxPrice as string));

      if (limitVal) products = products.slice(0, parseInt(limitVal as string));

      const fullProducts = await Promise.all(products.map(async (p: any) => {
        const imagesSnapshot = await adminDb.collection(`products/${p.id}/images`).orderBy('display_order', 'asc').get();
        const variantsSnapshot = await adminDb.collection(`products/${p.id}/variants`).get();
        return {
          ...p,
          images: imagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          variants: variantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };
      }));

      res.json(fullProducts);
    } catch (error) {
      console.error("Fetch products error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const snapshot = await adminDb.collection('products').where('slug', '==', req.params.slug).limit(1).get();
      if (snapshot.empty) return res.status(404).json({ error: "Product not found" });

      const doc = snapshot.docs[0];
      const product = { id: doc.id, ...doc.data() } as any;

      const imagesSnapshot = await adminDb.collection(`products/${doc.id}/images`).orderBy('display_order', 'asc').get();
      const variantsSnapshot = await adminDb.collection(`products/${doc.id}/variants`).get();
      
      const categorySnapshot = await adminDb.collection('categories').doc(product.category_id).get();
      const categoryName = categorySnapshot.exists ? categorySnapshot.data()?.name : 'Uncategorized';

      res.json({ 
        ...product, 
        category_name: categoryName,
        images: imagesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
        variants: variantsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      });
    } catch (error) {
      console.error("Product detail error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Banners
  app.get("/api/banners", async (req, res) => {
    try {
      const snapshot = await adminDb.collection('hero_banners')
        .where('is_active', '==', true)
        .orderBy('priority', 'asc')
        .get();
      const banners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(banners);
    } catch (error) {
      console.error("Banners error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Shipping Rules
  app.get("/api/shipping-rules", async (req, res) => {
    try {
      const snapshot = await adminDb.collection('shipping_rules').get();
      const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(rules);
    } catch (error) {
      console.error("Shipping rules error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Track Order
  app.get("/api/orders/track", (req, res) => {
    try {
      const { orderNumber, phone } = req.query;
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      let orders;
      if (orderNumber && orderNumber !== '') {
        orders = db.prepare(`
          SELECT * FROM orders 
          WHERE (order_number = ? OR id = ?) AND customer_phone = ?
          ORDER BY created_at DESC
        `).all(orderNumber, orderNumber, phone) as any[];
      } else {
        orders = db.prepare(`
          SELECT * FROM orders 
          WHERE customer_phone = ?
          ORDER BY created_at DESC
        `).all(phone) as any[];
      }

      if (!orders || orders.length === 0) {
        return res.status(404).json({ error: "No orders found for this phone number" });
      }

      const ordersWithItems = orders.map(order => {
        const items = db.prepare(`
          SELECT oi.*, pv.size, pv.color, p.name as product_name, p.slug as product_slug
          FROM order_items oi
          JOIN product_variants pv ON oi.variant_id = pv.id
          JOIN products p ON pv.product_id = p.id
          WHERE oi.order_id = ?
        `).all(order.id);
        return { ...order, items };
      });

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Track order error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Orders
  app.post("/api/orders", authenticateToken, async (req: any, res) => {
    const { 
      customer_name, 
      customer_phone, 
      shipping_address, 
      district, 
      items, 
      subtotal, 
      shipping_charge, 
      discount_amount,
      total_amount, 
      payment_method,
      bkash_trx_id,
      promo_code
    } = req.body;

    const user_id = req.user.id;
    const orderId = uuidv4();
    
    try {
      // Get next order number (Firestore doesn't have auto-increment)
      const ordersSnapshot = await adminDb.collection('orders').orderBy('order_number', 'desc').limit(1).get();
      let nextOrderNumber = 1001;
      if (!ordersSnapshot.empty) {
        nextOrderNumber = (ordersSnapshot.docs[0].data().order_number || 1000) + 1;
      }

      const orderData = {
        order_number: nextOrderNumber,
        user_id,
        customer_name,
        customer_phone,
        shipping_address,
        district,
        subtotal,
        shipping_charge,
        discount_amount,
        total_amount,
        payment_method,
        bkash_trx_id,
        promo_code,
        order_status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await adminDb.collection('orders').doc(orderId).set(orderData);

      // Add items
      for (const item of items) {
        await adminDb.collection(`orders/${orderId}/items`).add({
          variant_id: item.variant_id,
          quantity: item.quantity,
          price_at_time: item.price
        });

        // Update stock in Firestore (this assumes products and variants are in Firestore)
        // For now, we'll just log or attempt update if they exist
        try {
          const productRef = adminDb.collection('products').doc(item.product_id);
          const productDoc = await productRef.get();
          if (productDoc.exists) {
            await productRef.update({ stock_quantity: FieldValue.increment(-item.quantity) });
          }
          
          const variantRef = adminDb.collection(`products/${item.product_id}/variants`).doc(item.variant_id);
          const variantDoc = await variantRef.get();
          if (variantDoc.exists) {
            await variantRef.update({ stock_quantity: FieldValue.increment(-item.quantity) });
          }
        } catch (stockErr) {
          console.warn("Stock update failed (might not be in Firestore yet):", stockErr);
        }
      }

      // Increment promo code usage
      if (promo_code) {
        try {
          await adminDb.collection('promo_codes').doc(promo_code).update({
            used_count: FieldValue.increment(1)
          });
        } catch (promoErr) {
          console.warn("Promo code update failed:", promoErr);
        }
      }

      // Send email
      if (user_id) {
        const userSnapshot = await adminDb.collection('users').doc(user_id).get();
        if (userSnapshot.exists) {
          const userData = userSnapshot.data();
          if (userData?.email) {
            sendOrderConfirmationEmail({ ...orderData, id: orderId }, userData);
          }
        }
      }

      res.json({ success: true, orderId, orderNumber: nextOrderNumber });
    } catch (error) {
      console.error("Order creation failed:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Reorder Endpoint
  app.get("/api/user/orders/:id/reorder", authenticateToken, (req: any, res) => {
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id) as any;
      if (!order) return res.status(404).json({ error: "Order not found" });

      const items = db.prepare(`
        SELECT oi.*, pv.*, p.*, p.id as product_id, pv.id as variant_id
        FROM order_items oi
        JOIN product_variants pv ON oi.variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id) as any[];

      // Format items for the cart
      const cartItems = items.map(item => ({
        product: {
          id: item.product_id,
          name: item.name,
          slug: item.slug,
          base_price: item.base_price,
          discount_price: item.discount_price,
          // Add other necessary product fields
        },
        variant: {
          id: item.variant_id,
          size: item.size,
          color: item.color,
          color_code: item.color_code,
          additional_price: item.additional_price,
          stock_quantity: item.stock_quantity
        },
        quantity: item.quantity
      }));

      res.json(cartItems);
    } catch (error) {
      console.error("Reorder error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User Dashboard
  app.get("/api/user/orders", authenticateToken, (req: any, res) => {
    try {
      const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? OR customer_phone = ? ORDER BY created_at DESC").all(req.user.id, req.user.phone) as any[];
      
      const ordersWithItems = orders.map(order => {
        const items = db.prepare(`
          SELECT oi.*, p.name as product_name
          FROM order_items oi
          JOIN product_variants pv ON oi.variant_id = pv.id
          JOIN products p ON pv.product_id = p.id
          WHERE oi.order_id = ?
        `).all(order.id);
        return { ...order, items };
      });

      res.json(ordersWithItems);
    } catch (error) {
      console.error("User orders error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/user/profile", authenticateToken, (req: any, res) => {
    const { name, email, address } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, email = ?, address = ? WHERE id = ?")
        .run(name, email, address, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  // Admin Routes
  app.get("/api/admin/stats", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      
      const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get() as any;
      const totalRevenue = db.prepare("SELECT SUM(total_amount) as sum FROM orders WHERE order_status != 'cancelled'").get() as any;
      const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
      
      // Inventory stats
      const totalStock = db.prepare("SELECT SUM(stock_quantity) as sum FROM products").get() as any;
      
      const deliveredCount = db.prepare(`
        SELECT SUM(oi.quantity) as sum 
        FROM order_items oi 
        JOIN orders o ON oi.order_id = o.id 
        WHERE o.order_status = 'delivered'
      `).get() as any;

      const inDeliveryCount = db.prepare(`
        SELECT SUM(oi.quantity) as sum 
        FROM order_items oi 
        JOIN orders o ON oi.order_id = o.id 
        WHERE o.order_status IN ('confirmed', 'shipped')
      `).get() as any;

      const recentOrders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5").all();

      res.json({
        totalOrders: totalOrders.count,
        totalRevenue: totalRevenue.sum || 0,
        totalProducts: totalProducts.count,
        totalStock: totalStock.sum || 0,
        deliveredCount: deliveredCount.sum || 0,
        inDeliveryCount: inDeliveryCount.sum || 0,
        remainingStock: totalStock.sum || 0,
        recentOrders
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Promo Codes
  app.get("/api/admin/promo-codes", authenticateToken, isAdmin, (req, res) => {
    try {
      const codes = db.prepare("SELECT * FROM promo_codes ORDER BY created_at DESC").all();
      res.json(codes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/admin/promo-codes", authenticateToken, isAdmin, (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at, is_active } = req.body;
    try {
      if (!code) return res.status(400).json({ error: "Promo code is required" });
      
      const upperCode = code.toUpperCase();
      const existing = db.prepare("SELECT id FROM promo_codes WHERE code = ?").get(upperCode);
      if (existing) {
        return res.status(400).json({ error: "This promo code already exists" });
      }

      db.prepare(`
        INSERT INTO promo_codes (code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(upperCode, discount_type, discount_value, min_order_amount || 0, max_discount_amount, usage_limit, expires_at, is_active ? 1 : 0);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to create promo code" });
    }
  });

  app.patch("/api/admin/promo-codes/:id", authenticateToken, isAdmin, (req, res) => {
    const { code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, expires_at, is_active } = req.body;
    try {
      if (!code) return res.status(400).json({ error: "Promo code is required" });
      
      const upperCode = code.toUpperCase();
      const existing = db.prepare("SELECT id FROM promo_codes WHERE code = ? AND id != ?").get(upperCode, req.params.id);
      if (existing) {
        return res.status(400).json({ error: "This promo code already exists" });
      }

      db.prepare(`
        UPDATE promo_codes SET 
          code = ?, discount_type = ?, discount_value = ?, min_order_amount = ?, 
          max_discount_amount = ?, usage_limit = ?, expires_at = ?, is_active = ?
        WHERE id = ?
      `).run(upperCode, discount_type, discount_value, min_order_amount || 0, max_discount_amount, usage_limit, expires_at, is_active ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update promo code" });
    }
  });

  app.delete("/api/admin/promo-codes/:id", authenticateToken, isAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM promo_codes WHERE id = ?").run(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete promo code" });
    }
  });

  app.post("/api/promo-codes/validate", (req, res) => {
    const { code, orderAmount } = req.body;
    try {
      const promo = db.prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1").get(code.toUpperCase()) as any;
      
      if (!promo) {
        return res.status(404).json({ error: "Invalid promo code" });
      }

      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return res.status(400).json({ error: "Promo code has expired" });
      }

      if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
        return res.status(400).json({ error: "Promo code usage limit reached" });
      }

      if (orderAmount < promo.min_order_amount) {
        return res.status(400).json({ error: `Minimum order amount for this code is ${promo.min_order_amount}` });
      }

      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = (orderAmount * promo.discount_value) / 100;
        if (promo.max_discount_amount && discount > promo.max_discount_amount) {
          discount = promo.max_discount_amount;
        }
      } else {
        discount = promo.discount_value;
      }

      res.json({ 
        success: true, 
        discount_amount: discount,
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/orders", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
      res.json(orders);
    } catch (error) {
      console.error("Admin orders error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/admin/orders/:id", authenticateToken, (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const { status, paid_amount, payment_remarks, is_active } = req.body;
      
      let query = "UPDATE orders SET order_status = ?, paid_amount = ?, payment_remarks = ?";
      let params = [status, paid_amount || 0, payment_remarks || ''];
      
      if (is_active !== undefined) {
        query += ", is_active = ?";
        params.push(is_active ? 1 : 0);
      }
      
      query += " WHERE id = ?";
      params.push(req.params.id);
      
      db.prepare(query).run(...params);
      res.json({ success: true });
    } catch (error) {
      console.error("Update order error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/orders/:id", authenticateToken, isAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM orders WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  app.get("/api/admin/users", authenticateToken, (req: any, res: any) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const admins = db.prepare("SELECT id, name, phone, email, role, status, permissions, is_master, created_at FROM users WHERE role = 'admin' ORDER BY created_at DESC").all();
      const customers = db.prepare("SELECT id, name, phone, email, address, role, status, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC").all();
      
      // Parse permissions JSON
      const adminsWithParsedPermissions = admins.map((a: any) => ({
        ...a,
        permissions: JSON.parse(a.permissions || '[]')
      }));

      res.json({ admins: adminsWithParsedPermissions, customers });
    } catch (error) {
      console.error("Admin users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/customers/:id", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      db.prepare("DELETE FROM users WHERE id = ? AND role = 'customer'").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete customer error:", error);
      res.status(400).json({ error: "Failed to delete customer" });
    }
  });

  // Admin Categories
  app.get("/api/admin/categories", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const categories = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
      res.json(categories);
    } catch (error) {
      console.error("Admin categories error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/categories", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const { name, slug, image_url, is_featured } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }

      // Check for existing slug
      const existing = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug);
      if (existing) {
        return res.status(400).json({ error: "A category with this slug already exists" });
      }

      db.prepare("INSERT INTO categories (name, slug, image_url, is_featured) VALUES (?, ?, ?, ?)")
        .run(name, slug, image_url, is_featured ? 1 : 0);
      
      const categoryId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };
      
      // Sync to Firestore
      adminDb.collection('categories').doc(categoryId.id.toString()).set({
        name, slug, image_url, is_featured: is_featured ? 1 : 0
      }).catch(err => console.error("Firestore sync error (category create):", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Create category error:", error);
      res.status(400).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const { name, slug, image_url, is_featured } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }

      // Check for existing slug (excluding current category)
      const existing = db.prepare("SELECT id FROM categories WHERE slug = ? AND id != ?").get(slug, req.params.id);
      if (existing) {
        return res.status(400).json({ error: "A category with this slug already exists" });
      }

      db.prepare("UPDATE categories SET name = ?, slug = ?, image_url = ?, is_featured = ? WHERE id = ?")
        .run(name, slug, image_url, is_featured ? 1 : 0, req.params.id);
      
      // Sync to Firestore
      adminDb.collection('categories').doc(req.params.id).set({
        name, slug, image_url, is_featured: is_featured ? 1 : 0
      }, { merge: true }).catch(err => console.error("Firestore sync error (category update):", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(400).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      
      const categoryId = Number(req.params.id);
      
      // Check if category has products
      const productsCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE category_id = ?").get(categoryId) as { count: number };
      if (productsCount && productsCount.count > 0) {
        return res.status(400).json({ error: "Cannot delete category that contains products. Move or delete the products first." });
      }

      db.prepare("DELETE FROM categories WHERE id = ?").run(categoryId);
      
      // Sync to Firestore
      adminDb.collection('categories').doc(categoryId.toString()).delete()
        .catch(err => console.error("Firestore sync error (category delete):", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(400).json({ error: "Failed to delete category" });
    }
  });

  // Admin Banners
  app.get("/api/admin/banners", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const banners = db.prepare("SELECT * FROM hero_banners ORDER BY priority ASC").all();
      res.json(banners);
    } catch (error) {
      console.error("Admin banners error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/banners", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const { title, subtitle, image_url, link_url, priority, is_active, button_text, background_color } = req.body;
      db.prepare("INSERT INTO hero_banners (title, subtitle, image_url, link_url, priority, is_active, button_text, background_color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(title, subtitle, image_url, link_url, priority, is_active ? 1 : 0, button_text, background_color);
      
      const bannerId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

      // Sync to Firestore
      adminDb.collection('hero_banners').doc(bannerId.id.toString()).set({
        title, subtitle, image_url, link_url, priority, is_active: !!is_active, button_text, background_color
      }).catch(err => console.error("Firestore sync error (banner create):", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Create banner error:", error);
      res.status(400).json({ error: "Failed to create banner" });
    }
  });

  app.patch("/api/admin/banners/:id", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const { title, subtitle, image_url, link_url, priority, is_active, button_text, background_color } = req.body;
      db.prepare("UPDATE hero_banners SET title = ?, subtitle = ?, image_url = ?, link_url = ?, priority = ?, is_active = ?, button_text = ?, background_color = ? WHERE id = ?")
        .run(title, subtitle, image_url, link_url, priority, is_active ? 1 : 0, button_text, background_color, req.params.id);
      
      // Sync to Firestore
      adminDb.collection('hero_banners').doc(req.params.id).set({
        title, subtitle, image_url, link_url, priority, is_active: !!is_active, button_text, background_color
      }, { merge: true }).catch(err => console.error("Firestore sync error (banner update):", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Update banner error:", error);
      res.status(400).json({ error: "Failed to update banner" });
    }
  });

  app.delete("/api/admin/banners/:id", authenticateToken, (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      db.prepare("DELETE FROM hero_banners WHERE id = ?").run(Number(req.params.id));
      
      // Sync to Firestore
      adminDb.collection('hero_banners').doc(req.params.id).delete()
        .catch(err => console.error("Firestore sync error (banner delete):", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Delete banner error:", error);
      res.status(400).json({ error: "Failed to delete banner" });
    }
  });

  // Bulk Discount Rules
  app.get("/api/bulk-discount-rules", (req, res) => {
    try {
      const rules = db.prepare("SELECT * FROM bulk_discount_rules WHERE is_active = 1 ORDER BY min_quantity ASC").all();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch discount rules" });
    }
  });

  app.get("/api/admin/bulk-discount-rules", authenticateToken, isAdmin, (req, res) => {
    try {
      const rules = db.prepare("SELECT * FROM bulk_discount_rules ORDER BY min_quantity ASC").all();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch discount rules" });
    }
  });

  app.post("/api/admin/bulk-discount-rules", authenticateToken, isAdmin, (req, res) => {
    const { min_quantity, discount_percentage, is_active } = req.body;
    try {
      db.prepare("INSERT INTO bulk_discount_rules (min_quantity, discount_percentage, is_active) VALUES (?, ?, ?)")
        .run(min_quantity, discount_percentage, is_active ? 1 : 0);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to create discount rule" });
    }
  });

  app.patch("/api/admin/bulk-discount-rules/:id", authenticateToken, isAdmin, (req, res) => {
    const { min_quantity, discount_percentage, is_active } = req.body;
    try {
      db.prepare("UPDATE bulk_discount_rules SET min_quantity = ?, discount_percentage = ?, is_active = ? WHERE id = ?")
        .run(min_quantity, discount_percentage, is_active ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update discount rule" });
    }
  });

  app.delete("/api/admin/bulk-discount-rules/:id", authenticateToken, isAdmin, (req, res) => {
    try {
      db.prepare("DELETE FROM bulk_discount_rules WHERE id = ?").run(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete discount rule" });
    }
  });

  // Admin Products
  app.get("/api/admin/products", authenticateToken, isAdmin, (req, res) => {
    try {
      const products = db.prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC").all() as any[];
      
      const fullProducts = products.map(p => {
        const images = db.prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order ASC").all(p.id);
        const variants = db.prepare("SELECT * FROM product_variants WHERE product_id = ?").all(p.id);
        return { ...p, images, variants };
      });
      
      res.json(fullProducts);
    } catch (error) {
      console.error("Admin fetch products error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/products", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const { 
        name, slug, sku, description, category_id, 
        gsm, material_composition, fit_type, weight,
        base_price, cost_price, discount_price, 
        stock_quantity, low_stock_alert,
        is_active, is_new_arrival, is_best_seller, 
        images, variants 
      } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }

      // Check for existing slug
      const existingSlug = db.prepare("SELECT id FROM products WHERE slug = ?").get(slug);
      if (existingSlug) {
        return res.status(400).json({ error: "A product with this slug already exists" });
      }

      // Check for existing sku if provided
      if (sku) {
        const existingSku = db.prepare("SELECT id FROM products WHERE sku = ?").get(sku);
        if (existingSku) {
          return res.status(400).json({ error: "A product with this SKU already exists" });
        }
      }

      let finalStock = stock_quantity || 0;
      if (variants && variants.length > 0) {
        finalStock = variants.reduce((sum: number, v: any) => sum + (parseInt(v.stock_quantity) || 0), 0);
      }

      const productId = uuidv4();
      const transaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO products (
            id, name, slug, sku, description, category_id, 
            gsm, material_composition, fit_type, weight,
            base_price, cost_price, discount_price, 
            stock_quantity, low_stock_alert,
            is_active, is_new_arrival, is_best_seller
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          productId, name, slug, sku, description, category_id, 
          gsm, material_composition, fit_type, weight,
          base_price, cost_price, discount_price, 
          finalStock, low_stock_alert,
          is_active ? 1 : 0, is_new_arrival ? 1 : 0, is_best_seller ? 1 : 0
        );

        if (images && images.length > 0) {
          const insertImage = db.prepare("INSERT INTO product_images (product_id, image_url, is_main, display_order) VALUES (?, ?, ?, ?)");
          images.forEach((img: any, idx: number) => {
            insertImage.run(productId, img.image_url, img.is_main ? 1 : 0, idx);
          });
        }

        if (variants && variants.length > 0) {
          const insertVariant = db.prepare("INSERT INTO product_variants (id, product_id, size, color, color_code, sku, stock_quantity, additional_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          variants.forEach((v: any) => {
            insertVariant.run(uuidv4(), productId, v.size, v.color, v.color_code, v.sku, v.stock_quantity, v.additional_price);
          });
        } else if (req.body.sizes && req.body.sizes.length > 0) {
          const insertVariant = db.prepare("INSERT INTO product_variants (id, product_id, size, color, color_code, sku, stock_quantity, additional_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          req.body.sizes.forEach((size: string) => {
            insertVariant.run(uuidv4(), productId, size, null, null, `${sku}-${size}`, stock_quantity, 0);
          });
        } else {
          const insertVariant = db.prepare("INSERT INTO product_variants (id, product_id, size, color, color_code, sku, stock_quantity, additional_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          insertVariant.run(uuidv4(), productId, 'Default', null, null, sku, stock_quantity, 0);
        }
      });

      transaction();

      // Sync to Firestore (outside transaction)
      try {
        await adminDb.collection('products').doc(productId).set({
          name, slug, sku, description, category_id, 
          gsm, material_composition, fit_type, weight,
          base_price, cost_price, discount_price, 
          stock_quantity: finalStock, low_stock_alert,
          is_active: !!is_active, 
          is_new_arrival: !!is_new_arrival, 
          is_best_seller: !!is_best_seller,
          created_at: new Date().toISOString()
        });

        if (images && images.length > 0) {
          for (const [idx, img] of images.entries()) {
            await adminDb.collection(`products/${productId}/images`).add({
              image_url: img.image_url,
              is_main: !!img.is_main,
              display_order: idx
            });
          }
        }

        if (variants && variants.length > 0) {
          for (const v of variants) {
            await adminDb.collection(`products/${productId}/variants`).add({
              size: v.size,
              color: v.color,
              color_code: v.color_code,
              sku: v.sku,
              stock_quantity: v.stock_quantity,
              additional_price: v.additional_price
            });
          }
        }
      } catch (firestoreErr) {
        console.error("Firestore sync error (product create):", firestoreErr);
      }
      res.json({ success: true, productId });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(400).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/admin/products/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      const { 
        name, slug, sku, description, category_id, 
        gsm, material_composition, fit_type, weight,
        base_price, cost_price, discount_price, 
        stock_quantity, low_stock_alert,
        is_active, is_new_arrival, is_best_seller, 
        images, variants 
      } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }

      // Check for existing slug (excluding current product)
      const existingSlug = db.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").get(slug, req.params.id);
      if (existingSlug) {
        return res.status(400).json({ error: "A product with this slug already exists" });
      }

      // Check for existing sku if provided (excluding current product)
      if (sku) {
        const existingSku = db.prepare("SELECT id FROM products WHERE sku = ? AND id != ?").get(sku, req.params.id);
        if (existingSku) {
          return res.status(400).json({ error: "A product with this SKU already exists" });
        }
      }

      let finalStock = stock_quantity || 0;
      if (variants && variants.length > 0) {
        finalStock = variants.reduce((sum: number, v: any) => sum + (parseInt(v.stock_quantity) || 0), 0);
      }

      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE products SET 
            name = ?, slug = ?, sku = ?, description = ?, category_id = ?, 
            gsm = ?, material_composition = ?, fit_type = ?, weight = ?,
            base_price = ?, cost_price = ?, discount_price = ?, 
            stock_quantity = ?, low_stock_alert = ?,
            is_active = ?, is_new_arrival = ?, is_best_seller = ?
          WHERE id = ?
        `).run(
          name, slug, sku, description, category_id, 
          gsm, material_composition, fit_type, weight,
          base_price, cost_price, discount_price, 
          finalStock, low_stock_alert,
          is_active ? 1 : 0, is_new_arrival ? 1 : 0, is_best_seller ? 1 : 0,
          req.params.id
        );

        db.prepare("DELETE FROM product_images WHERE product_id = ?").run(req.params.id);
        if (images && images.length > 0) {
          const insertImage = db.prepare("INSERT INTO product_images (product_id, image_url, is_main, display_order) VALUES (?, ?, ?, ?)");
          images.forEach((img: any, idx: number) => {
            insertImage.run(req.params.id, img.image_url, img.is_main ? 1 : 0, idx);
          });
        }

        db.prepare("DELETE FROM product_variants WHERE product_id = ?").run(req.params.id);
        if (variants && variants.length > 0) {
          const insertVariant = db.prepare("INSERT INTO product_variants (id, product_id, size, color, color_code, sku, stock_quantity, additional_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          variants.forEach((v: any) => {
            insertVariant.run(uuidv4(), req.params.id, v.size, v.color, v.color_code, v.sku, v.stock_quantity, v.additional_price);
          });
        } else if (req.body.sizes && req.body.sizes.length > 0) {
          const insertVariant = db.prepare("INSERT INTO product_variants (id, product_id, size, color, color_code, sku, stock_quantity, additional_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          req.body.sizes.forEach((size: string) => {
            insertVariant.run(uuidv4(), req.params.id, size, null, null, `${sku}-${size}`, stock_quantity, 0);
          });
        } else {
          const insertVariant = db.prepare("INSERT INTO product_variants (id, product_id, size, color, color_code, sku, stock_quantity, additional_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
          insertVariant.run(uuidv4(), req.params.id, 'Default', null, null, sku, stock_quantity, 0);
        }
      });

      transaction();

      // Sync to Firestore (outside transaction)
      try {
        await adminDb.collection('products').doc(req.params.id).set({
          name, slug, sku, description, category_id, 
          gsm, material_composition, fit_type, weight,
          base_price, cost_price, discount_price, 
          stock_quantity: finalStock, low_stock_alert,
          is_active: !!is_active, 
          is_new_arrival: !!is_new_arrival, 
          is_best_seller: !!is_best_seller,
          updated_at: new Date().toISOString()
        }, { merge: true });

        // Refresh images and variants in Firestore
        const imagesRef = adminDb.collection(`products/${req.params.id}/images`);
        const imagesSnap = await imagesRef.get();
        for (const doc of imagesSnap.docs) await doc.ref.delete();
        if (images && images.length > 0) {
          for (const [idx, img] of images.entries()) {
            await imagesRef.add({
              image_url: img.image_url,
              is_main: !!img.is_main,
              display_order: idx
            });
          }
        }

        const variantsRef = adminDb.collection(`products/${req.params.id}/variants`);
        const variantsSnap = await variantsRef.get();
        for (const doc of variantsSnap.docs) await doc.ref.delete();
        if (variants && variants.length > 0) {
          for (const v of variants) {
            await variantsRef.add({
              size: v.size,
              color: v.color,
              color_code: v.color_code,
              sku: v.sku,
              stock_quantity: v.stock_quantity,
              additional_price: v.additional_price
            });
          }
        }
      } catch (firestoreErr) {
        console.error("Firestore sync error (product update):", firestoreErr);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(400).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
      
      // Check if any variant of this product is in an order
      const orderItemsCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM order_items oi
        JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE pv.product_id = ?
      `).get(req.params.id) as { count: number };

      if (orderItemsCount && orderItemsCount.count > 0) {
        return res.status(400).json({ error: "Cannot delete product that has been ordered. Deactivate it instead." });
      }

      const transaction = db.transaction(() => {
        // Delete variants and images (cascade should handle this if defined in schema)
        // db.ts has ON DELETE CASCADE for product_variants and product_images
        db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
      });
      transaction();

      // Sync to Firestore (outside transaction)
      try {
        await adminDb.collection('products').doc(req.params.id).delete();
        // Subcollections are not automatically deleted in Firestore, but they won't show up in queries for products
      } catch (firestoreErr) {
        console.error("Firestore sync error (product delete):", firestoreErr);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(400).json({ error: "Failed to delete product" });
    }
  });

  app.post("/api/admin/sync-cloud", authenticateToken, isAdmin, async (req, res) => {
    try {
      console.log("Starting manual cloud sync...");
      
      // Sync Categories
      const categories = db.prepare("SELECT * FROM categories").all() as any[];
      const categoriesRef = adminDb.collection('categories');
      const existingCats = await categoriesRef.get();
      for (const doc of existingCats.docs) await doc.ref.delete();
      for (const cat of categories) {
        await categoriesRef.doc(cat.id.toString()).set({
          name: cat.name,
          slug: cat.slug,
          image_url: cat.image_url,
          is_featured: !!cat.is_featured
        });
      }

      // Sync Banners
      const banners = db.prepare("SELECT * FROM hero_banners").all() as any[];
      const bannersRef = adminDb.collection('hero_banners');
      const existingBanners = await bannersRef.get();
      for (const doc of existingBanners.docs) await doc.ref.delete();
      for (const b of banners) {
        await bannersRef.doc(b.id.toString()).set({
          title: b.title,
          subtitle: b.subtitle,
          image_url: b.image_url,
          link_url: b.link_url,
          priority: b.priority,
          is_active: !!b.is_active,
          button_text: b.button_text,
          background_color: b.background_color
        });
      }

      // Sync Products
      const products = db.prepare("SELECT * FROM products").all() as any[];
      const productsRef = adminDb.collection('products');
      const existingProducts = await productsRef.get();
      for (const doc of existingProducts.docs) await doc.ref.delete();
      for (const p of products) {
        await productsRef.doc(p.id).set({
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          description: p.description,
          category_id: p.category_id,
          gsm: p.gsm,
          material_composition: p.material_composition,
          fit_type: p.fit_type,
          weight: p.weight,
          base_price: p.base_price,
          cost_price: p.cost_price,
          discount_price: p.discount_price,
          stock_quantity: p.stock_quantity,
          low_stock_alert: p.low_stock_alert,
          is_active: !!p.is_active,
          is_new_arrival: !!p.is_new_arrival,
          is_best_seller: !!p.is_best_seller,
          created_at: p.created_at
        });

        // Sync Images
        const images = db.prepare("SELECT * FROM product_images WHERE product_id = ?").all(p.id) as any[];
        const imagesRef = adminDb.collection(`products/${p.id}/images`);
        for (const img of images) {
          await imagesRef.add({
            image_url: img.image_url,
            is_main: !!img.is_main,
            display_order: img.display_order
          });
        }

        // Sync Variants
        const variants = db.prepare("SELECT * FROM product_variants WHERE product_id = ?").all(p.id) as any[];
        const variantsRef = adminDb.collection(`products/${p.id}/variants`);
        for (const v of variants) {
          await variantsRef.add({
            size: v.size,
            color: v.color,
            color_code: v.color_code,
            sku: v.sku,
            stock_quantity: v.stock_quantity,
            additional_price: v.additional_price
          });
        }
      }

      res.json({ success: true, message: "Cloud sync completed successfully" });
    } catch (error) {
      console.error("Cloud sync error:", error);
      res.status(500).json({ error: "Failed to sync with cloud" });
    }
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production" || process.env.VITE_USER_NODE_ENV === "production";
  const distPath = path.resolve(__dirname, "dist");
  const indexPath = path.join(distPath, "index.html");
  const distExists = fs.existsSync(distPath) && fs.existsSync(indexPath);

  console.log(`[Server] Environment: NODE_ENV=${process.env.NODE_ENV}, VITE_USER_NODE_ENV=${process.env.VITE_USER_NODE_ENV}`);
  console.log(`[Server] Production Mode: ${isProduction}, Dist Exists: ${distExists}`);
  
  if (!isProduction && process.env.VERCEL !== "1") {
    console.log("Starting in DEVELOPMENT mode (Vite middleware enabled)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (distExists) {
    console.log("Starting in PRODUCTION mode (serving static files)");
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).json({ error: "Internal Server Error", message: "Failed to send index.html" });
        }
      });
    });
  } else {
    console.warn("Production mode requested but 'dist' directory or 'index.html' is missing. Falling back to Vite middleware if possible.");
    if (process.env.VERCEL !== "1") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.error("Production build missing and Vite middleware unavailable.");
      app.get("*", (req, res) => {
        res.status(500).json({ error: "Internal Server Error", message: "Production build missing and Vite middleware unavailable." });
      });
    }
  }

if (process.env.VERCEL !== "1") {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log("Environment:", process.env.NODE_ENV || "development");
  });
}

export default app;

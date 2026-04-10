# Admin Panel Manual - FIT MY FABRICS

Welcome to the FIT MY FABRICS Administration Portal. This manual provides detailed instructions on how to manage your e-commerce platform.

---

## 1. Dashboard Overview
The Dashboard provides a bird's-eye view of your business performance.
- **Total Revenue:** Sum of all non-cancelled orders.
- **Total Orders:** Total number of orders placed.
- **Stock in Total:** Total quantity of all product variants in your inventory.
- **Delivered:** Number of items successfully delivered.
- **In Delivery:** Items currently marked as 'Confirmed' or 'Shipped'.
- **Stock in Hand:** Remaining stock available for sale.
- **Sales Overview:** A bar chart showing daily sales performance.
- **Recent Orders:** A quick list of the latest 5 orders.

---

## 2. Order Management
Access this via the **Orders** tab.
- **Viewing Orders:** See all orders with details like Order Number, Customer Info, Bill Amount, and Status.
- **Updating Status:** Use the dropdown in the "Order Status" column to change status (Pending, Confirmed, Shipped, Delivered, Cancelled).
- **Payment Details:**
    - **Paid Amount:** Enter the amount received from the customer.
    - **Remarks:** Record the payment method or transaction details (e.g., "bKash Trx ID", "Cash on Delivery").
    - *Note: Click outside the input box to save these details automatically.*

---

## 3. Product Management
Access this via the **Products** tab.
- **Adding a Product:** Click "Add Product" to open the form.
- **Editing a Product:** Click the Edit icon next to any product.
- **Deleting a Product:** Click the Trash icon. A confirmation popup will appear.
- **Key Fields:**
    - **Base Price:** The standard selling price.
    - **Discount Price:** If set, this price will be shown as the active price with the base price crossed out.
    - **Stock Quantity:** Managed at the variant level (Size/Color).
    - **Variants:** You must add at least one variant (e.g., Size: M, Color: Black) for the product to be purchasable.

---

## 4. Category Management
Access this via the **Categories** tab.
- Categories help organize your products (e.g., Polo T-Shirts, Round Neck).
- **Featured Categories:** Featured categories appear on the homepage.
- **Slugs:** The slug is the URL-friendly name (e.g., `polo-t-shirts`).

---

## 5. User Management
Access this via the **Users** tab.
- **Admin Users:** Manage staff accounts. Only Master Admins can add/edit other admins.
- **Customer Users:** View registered customers and their details.
- **Status:** You can "Block" a user to prevent them from logging in.

---

## 6. Mail Configuration (SMTP)
**CRITICAL:** This section enables the system to send real emails (OTPs and Order Confirmations).

### Configuration Keys:
1. **SMTP_HOST:** The server address of your email provider (e.g., `smtp.gmail.com`).
2. **SMTP_PORT:** The port used for sending (e.g., `587` for TLS, `465` for SSL).
3. **SMTP_USER:** Your full email address (e.g., `your-email@gmail.com`).
4. **SMTP_FROM:** The email address that will appear as the sender (usually same as SMTP_USER).
5. **SMTP_PASS:** Your email password or an **App Password** (recommended for Gmail).

### How to Save:
1. Go to the **Mail Configuration** tab.
2. Click the **Edit** icon next to the key you want to change.
3. Enter the new value in the popup.
4. Click **SAVE CHANGES**.
5. The system will automatically refresh its connection to use the new settings.

*Note: If SMTP is not configured correctly, the system will show the OTP directly on the signup page for testing purposes (Debug Mode).*

---

## 7. Site Settings
Manage general website information:
- **Site Name:** The title of your website.
- **Site Logo:** Upload a logo or provide a URL.
- **Footer Text:** Text appearing at the bottom of every page.
- **Contact Info:** Phone and Email shown on the "Contact Us" page.
- **Social Links:** URLs for Facebook and WhatsApp.

---

## 8. Pages
Manage static content pages like **Terms & Conditions**, **Return Policy**, and **Size Guide**.
- Content supports **Markdown** for formatting (bold, lists, etc.).

---

## 9. Discounts & Promo Codes
- **Bulk Discount Rules:** Set automatic discounts based on quantity (e.g., 5+ items = 5% off).
- **Promo Codes:** Create custom codes (e.g., `WELCOME10`) for customers to use at checkout.
    - Can be percentage-based or fixed amount.
    - Can have usage limits and expiry dates.

---

## 10. Troubleshooting
- **Changes not appearing?** Try refreshing your browser.
- **Emails not sending?** Double-check your SMTP settings. If using Gmail, ensure you have enabled "2-Step Verification" and created an "App Password".
- **Access Denied?** Ensure you are logged in with an account that has "Admin" or "Master Admin" privileges.

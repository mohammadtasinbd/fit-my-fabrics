import React from 'react';
import { motion } from 'motion/react';

export function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tighter uppercase mb-4">Terms and Conditions</h1>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">Effective Date: April 2, 2026</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-gray-600 leading-relaxed">
          <section className="space-y-4">
            <p>Welcome to <strong>FIT MY FABRICS</strong>. These Terms and Conditions govern your use of our website and the purchase of our products and services. By accessing our site or placing an order, you agree to be bound by these terms.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">1. General Conditions</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>We reserve the right to refuse service to anyone for any reason at any time.</li>
              <li>You understand that your content (not including credit card information) may be transferred unencrypted over various networks.</li>
              <li>You must be at least 18 years of age or have parental consent to use this site.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">2. Products and Custom Orders</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Specifications:</strong> For custom orders (e.g., polo t-shirts), the customer is responsible for providing accurate specifications. We manufacture based on the GSM, fabric blend, and sizing charts agreed upon at the time of order.</li>
              <li><strong>Variations:</strong> Small variations in color or fabric feel may occur due to different production batches or monitor display settings.</li>
              <li><strong>Branding:</strong> Any custom branding or logos provided by the customer must be owned by the customer or used with explicit permission.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">3. Pricing and Payment</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>All prices are subject to change without notice.</li>
              <li>We reserve the right to modify or discontinue a service or product at any time.</li>
              <li>Payment must be made in full or as per the agreed-upon deposit structure before production begins for bulk orders.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">4. Shipping and Delivery</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Delivery timelines are estimates and not guarantees. We are not liable for delays caused by logistics carriers or customs clearance.</li>
              <li>Risk of loss and title for items pass to you upon our delivery to the carrier.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">5. Returns and Refunds</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Custom Goods:</strong> Due to the personalized nature of our products, custom-manufactured items are non-refundable unless there is a significant manufacturing defect.</li>
              <li><strong>Inspection:</strong> Customers must inspect goods upon delivery and report any discrepancies within 2 working days.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">6. Intellectual Property</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>All content on this website, including text, graphics, logos (specifically the <strong>FIT MY FABRICS</strong> logo), and images, is the property of the business and protected by copyright laws.</li>
              <li>You may not reproduce, duplicate, or sell any portion of the service without express written permission.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">7. Limitation of Liability</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>FIT MY FABRICS</strong> shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our products or website.</li>
              <li>Our total liability to you for any claim arising from a purchase shall not exceed the amount paid for that specific order.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">8. Governing Law</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>These terms shall be governed by and construed in accordance with the laws of <strong>Bangladesh</strong>. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in that region.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">9. Changes to Terms</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>We reserve the right to update these terms at any time. It is your responsibility to check this page periodically for changes.</li>
            </ul>
          </section>
        </div>
      </motion.div>
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';

export function ReturnPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tighter uppercase mb-4">Return & Exchange Policy</h1>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">Last Updated: April 2, 2026</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-12 text-gray-600 leading-relaxed">
          <section className="space-y-4">
            <p>At <strong>FIT MY FABRICS</strong>, we take pride in the quality of our craftsmanship. Because many of our products are custom-manufactured to your specific requirements, our policy is designed to be fair to both the creator and the customer.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">1. Custom & Bulk Orders</h3>
            <p><strong>Non-Returnable:</strong> Items that have been customized with specific fabrics, colors, logos, or branding are not eligible for return or exchange unless there is a verifiable manufacturing defect or a deviation from the confirmed mock-up/specifications.</p>
            <p><strong>Approval Process:</strong> We provide digital mock-ups or physical samples (where applicable) before mass production. Once these are approved by the client, the final product is considered final sale.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">2. Defective or Damaged Items</h3>
            <p>If you receive an item that is defective or damaged during transit, please contact us within 7 days of delivery.</p>
            <p>To be eligible for a replacement, you must provide photographic evidence of the defect and the original packaging.</p>
            <p>If the defect is confirmed as a manufacturing error (e.g., incorrect GSM, stitching issues, or wrong sizing according to the agreed chart), we will replace the items at no additional cost.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">3. Ready-to-Wear (Non-Custom) Items</h3>
            <p>For items purchased from our standard stock without customization:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Eligibility:</strong> Items must be unworn, unwashed, and in their original packaging with tags attached.</li>
              <li><strong>Window:</strong> Returns or exchanges must be initiated within 14 days of receipt.</li>
              <li><strong>Shipping Costs:</strong> The customer is responsible for return shipping costs unless the return is due to our error.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">4. How to Initiate a Return or Exchange</h3>
            <p>To start a claim, please email us at <strong>fitmyfabrics01@gmail.com</strong> with the following information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Order Number</li>
              <li>Date of Delivery</li>
              <li>A brief description of the issue</li>
              <li>Photos of the product (for defect claims)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">5. Refunds</h3>
            <p>Once your return is received and inspected, we will notify you of the approval or rejection of your refund.</p>
            <p>If approved, your refund will be processed via the original payment method or bank transfer within 7-10 business days.</p>
            <p>Please note that initial shipping fees are non-refundable.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight">6. Order Cancellations</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Standard Orders:</strong> Can be canceled within 24 hours of placement.</li>
              <li><strong>Custom Orders:</strong> Once fabric sourcing or production has begun (typically 24-48 hours after deposit), cancellations are not accepted.</li>
            </ul>
          </section>
        </div>
      </motion.div>
    </div>
  );
}

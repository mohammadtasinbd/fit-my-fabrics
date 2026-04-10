import React from 'react';
import { motion } from 'motion/react';
import { Facebook, Mail, Phone, MessageSquare } from 'lucide-react';

export function ContactUs() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter uppercase mb-4">Contact Us</h1>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">We're here to help with your custom orders and inquiries.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <a 
            href="https://facebook.com/FitMyFabrics" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Facebook size={24} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Facebook</h3>
            <p className="text-sm text-gray-500">Fit My Fabrics</p>
          </a>

          <a 
            href="https://wa.me/8801568481467" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest">WhatsApp</h3>
            <p className="text-sm text-gray-500">01568-481467</p>
          </a>

          <a 
            href="mailto:fitmyfabrics01@gmail.com"
            className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Mail size={24} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest">Email</h3>
            <p className="text-sm text-gray-500">fitmyfabrics01@gmail.com</p>
          </a>
        </div>

        <div className="bg-gray-50 p-12 rounded-2xl text-center space-y-6">
          <h3 className="text-2xl font-bold tracking-tighter uppercase">Visit Our Office</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            For bulk order discussions and fabric inspections, please schedule an appointment via WhatsApp or Email.
          </p>
          <div className="pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Location</p>
            <p className="text-sm font-medium">Dhaka, Bangladesh</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

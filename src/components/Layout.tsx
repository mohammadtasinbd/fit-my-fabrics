import React from 'react';
import { ShoppingBag, Search, User, Menu, X, Facebook, Instagram, Twitter, LogOut, MessageSquare, ArrowLeft, Truck, LayoutDashboard, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../CartContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

import { useSettings } from '../SettingsContext';

export function Navbar() {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left: Mobile Menu / Admin Portal */}
          <div className="flex items-center w-1/3">
            {user?.role === 'admin' ? (
              <Link to="/admin" className="p-2 text-gray-600 hover:text-black transition-colors" title="Admin Portal">
                <LayoutDashboard size={24} />
              </Link>
            ) : (
              <button 
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-black"
                onClick={() => setIsMenuOpen(true)}
              >
                <Menu size={24} />
              </button>
            )}
          </div>

          {/* Center: Logo */}
          <div className="flex justify-center w-1/3">
            <Link to="/" className="flex flex-col items-center group">
              {settings.site_logo && settings.site_logo.trim() !== '' && (
                <img 
                  src={settings.site_logo} 
                  alt={settings.site_name || 'FIT MY FABRICS'} 
                  style={{ height: `${(settings.site_logo_height && settings.site_logo_height.trim() !== '') ? settings.site_logo_height : 40}px` }}
                  className="w-auto aspect-square object-contain transition-transform group-hover:scale-105 mb-1"
                  referrerPolicy="no-referrer"
                />
              )}
              {(settings.show_logo_and_name === '1' || !settings.site_logo || settings.site_logo.trim() === '') && (
                <span className={`${(settings.site_logo && settings.site_logo.trim() !== '') ? 'text-xs' : 'text-3xl'} font-black tracking-tighter text-black italic transition-colors group-hover:text-gray-600 uppercase`}>
                  {settings.site_name || 'FIT MY FABRICS'}
                </span>
              )}
            </Link>
          </div>

          {/* Right: Icons */}
          <div className="flex items-center justify-end space-x-2 w-1/3">
            {location.pathname !== '/' && (
              <button 
                onClick={() => navigate(-1)}
                className="p-2 text-gray-600 hover:text-black transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline text-[11px] font-bold tracking-widest">BACK</span>
              </button>
            )}

            {user?.role === 'admin' ? (
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all"
              >
                <Menu size={18} />
                <span className="text-[10px] font-bold tracking-widest uppercase">Main Menu</span>
              </button>
            ) : (
              <>
                <Link to="/track-order" className="p-2 text-gray-600 hover:text-black transition-colors" title="Track Order">
                  <Truck size={20} />
                </Link>

                <Link to={user ? "/dashboard" : "/login"} className="p-2 text-gray-600 hover:text-black transition-colors" title="My Account">
                  <User size={20} />
                </Link>

                <Link to="/cart" className="p-2 text-gray-600 hover:text-black transition-colors relative" title="Cart">
                  <ShoppingBag size={20} />
                  {totalItems > 0 && (
                    <span className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {totalItems}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed inset-y-0 left-0 w-full max-w-xs z-[70] shadow-xl p-6 ${user?.role === 'admin' ? 'bg-black text-white' : 'bg-white text-black'}`}
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-xl font-bold tracking-tighter">MAIN MENU</span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-6">
                <Link to="/shop" onClick={() => setIsMenuOpen(false)} className={`block text-lg font-medium border-b pb-2 ${user?.role === 'admin' ? 'border-white/10' : 'border-gray-100'}`}>SHOP</Link>
                <Link to="/category/polo" onClick={() => setIsMenuOpen(false)} className={`block text-lg font-medium border-b pb-2 ${user?.role === 'admin' ? 'border-white/10' : 'border-gray-100'}`}>POLO</Link>
                <Link to="/category/round-neck" onClick={() => setIsMenuOpen(false)} className={`block text-lg font-medium border-b pb-2 ${user?.role === 'admin' ? 'border-white/10' : 'border-gray-100'}`}>ROUND NECK</Link>
                {user?.role !== 'admin' && (
                  <Link to="/track-order" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium border-b border-gray-100 pb-2">TRACK ORDER</Link>
                )}
                <Link to="/new-arrivals" onClick={() => setIsMenuOpen(false)} className={`block text-lg font-medium border-b pb-2 ${user?.role === 'admin' ? 'border-white/10' : 'border-gray-100'}`}>NEW ARRIVAL</Link>
                
                {user?.role === 'admin' ? (
                  <>
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium border-b border-white/10 pb-2 text-red-400">ADMIN PANEL</Link>
                    <button 
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }} 
                      className="block w-full text-left text-lg font-medium border-b border-white/10 pb-2 text-gray-400"
                    >
                      LOGOUT
                    </button>
                  </>
                ) : (
                  <>
                    <Link to={user ? "/dashboard" : "/login"} onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium border-b border-gray-100 pb-2 uppercase">MY ACCOUNT</Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function Footer() {
  const { settings } = useSettings();
  return (
    <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex flex-col items-start mb-4 group">
              {settings.site_logo && settings.site_logo.trim() !== '' && (
                <img 
                  src={settings.site_logo} 
                  alt={settings.site_name || 'FIT MY FABRICS'} 
                  className="h-10 w-10 aspect-square object-contain mb-2"
                  referrerPolicy="no-referrer"
                />
              )}
              {(settings.show_logo_and_name === '1' || !settings.site_logo || settings.site_logo.trim() === '') && (
                <span className={`${(settings.site_logo && settings.site_logo.trim() !== '') ? 'text-xs' : 'text-xl'} font-bold tracking-tighter text-black uppercase`}>
                  {settings.site_name || 'FIT MY FABRICS'}
                </span>
              )}
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
              Premium clothing brand from the heart of Bangladesh. We blend tradition with modern aesthetics.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Shop</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/shop" className="hover:text-black transition-colors">Shop All</Link></li>
              <li><Link to="/category/polo" className="hover:text-black transition-colors">Polo Shirts</Link></li>
              <li><Link to="/category/round-neck" className="hover:text-black transition-colors">Round Neck</Link></li>
              <li><Link to="/new-arrivals" className="hover:text-black transition-colors">New Arrivals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><Link to="/track-order" className="hover:text-black transition-colors">Track Your Order</Link></li>
              <li><Link to="/returns" className="hover:text-black transition-colors">Returns & Exchanges</Link></li>
              <li><Link to="/contact" className="hover:text-black transition-colors">Contact Us</Link></li>
              {settings.contact_phone && (
                <li className="flex items-center space-x-2">
                  <Phone size={14} />
                  <span>{settings.contact_phone}</span>
                </li>
              )}
              {settings.contact_email && (
                <li className="flex items-center space-x-2">
                  <Mail size={14} />
                  <span className="break-all">{settings.contact_email}</span>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Connect</h4>
            <div className="flex flex-wrap gap-3 mb-6">
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-gray-200 rounded-full hover:border-black transition-colors text-blue-600" title="Facebook">
                  <Facebook size={18} />
                </a>
              )}
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-gray-200 rounded-full hover:border-black transition-colors text-pink-600" title="Instagram">
                  <Instagram size={18} />
                </a>
              )}
              {settings.twitter_url && (
                <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-gray-200 rounded-full hover:border-black transition-colors text-sky-500" title="Twitter">
                  <Twitter size={18} />
                </a>
              )}
              {settings.whatsapp_url && (
                <a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-gray-200 rounded-full hover:border-black transition-colors text-green-600" title="WhatsApp">
                  <MessageSquare size={18} />
                </a>
              )}
            </div>
            {settings.contact_address && (
              <div className="text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed">
                {settings.contact_address}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-widest text-gray-400">
          <p>{settings.footer_text || `© ${new Date().getFullYear()} FIT MY FABRICS. ALL RIGHTS RESERVED.`}</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

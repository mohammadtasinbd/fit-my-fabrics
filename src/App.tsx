import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar, Footer } from './components/Layout';
import { Home } from './components/Home';
import { CategoryPage } from './components/CategoryPage';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { Checkout } from './components/Checkout';
import { AdminPanel } from './components/AdminPanel';
import { TrackOrder } from './components/TrackOrder';
import { CartProvider } from './CartContext';
import { AuthProvider, useAuth } from './AuthContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Dashboard } from './components/Dashboard';
import { Shop } from './components/Shop';
import { Terms } from './components/Terms';
import { ReturnPolicy } from './components/ReturnPolicy';
import { SizeGuide } from './components/SizeGuide';
import { ContactUs } from './components/ContactUs';

function AppContent() {
  const { loading: authLoading } = useAuth();
  const { loading: settingsLoading } = useSettings();

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs font-bold tracking-widest uppercase animate-pulse">Loading Experience</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans selection:bg-black selection:text-white">
        <Routes>
          {/* Admin Panel has its own layout */}
          <Route path="/admin/*" element={<AdminPanel />} />
          
          {/* Main Shop Layout */}
          <Route path="*" element={
            <>
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:slug" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/track-order" element={<TrackOrder />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/new-arrivals" element={<Shop />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/returns" element={<ReturnPolicy />} />
                  <Route path="/size-guide" element={<SizeGuide />} />
                  <Route path="/contact" element={<ContactUs />} />
                </Routes>
              </main>
              <Footer />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

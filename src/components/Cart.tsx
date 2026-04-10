import React, { useState, useEffect } from 'react';
import { useCart } from '../CartContext';
import { formatPrice } from '../lib/utils';
import { ShoppingBag, Trash2, ArrowLeft, CreditCard, Truck, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ShippingRule } from '../types';

export function Cart() {
  const { 
    cart, removeFromCart, updateQuantity, subtotal, discountAmount, 
    totalAmount, discountPercentage, promoCode, applyPromoCode, removePromoCode 
  } = useCart();
  const navigate = useNavigate();
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplying(true);
    setPromoError(null);
    const result = await applyPromoCode(promoInput);
    if (!result.success) {
      setPromoError(result.error || 'Invalid promo code');
    } else {
      setPromoInput('');
    }
    setIsApplying(false);
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag size={48} className="text-gray-300" />
        </div>
        <h2 className="text-3xl font-bold tracking-tighter mb-4">YOUR CART IS EMPTY</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/" className="inline-block bg-black text-white px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold tracking-tighter mb-12">SHOPPING CART</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-8">
          {discountPercentage > 0 && (
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 mb-8">
              <h4 className="font-bold text-lg mb-1">🔥 BULK DISCOUNT UNLOCKED!</h4>
              <p className="text-sm opacity-90">You've added {cart.reduce((s, i) => s + i.quantity, 0)} items. A {discountPercentage}% discount has been applied to your order.</p>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.variant.id} className="flex space-x-6 pb-8 border-b border-gray-100">
              <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.product.images.find(img => img.is_main)?.image_url || item.product.images[0]?.image_url ? (
                  <img 
                    src={item.product.images.find(img => img.is_main)?.image_url || item.product.images[0]?.image_url} 
                    alt={item.product.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ShoppingBag size={32} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{item.product.name}</h3>
                    <button 
                      onClick={() => removeFromCart(item.variant.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Size: {item.variant.size} | Color: {item.variant.color}</p>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex items-center border border-gray-200 rounded-full px-3 py-1">
                    <button onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))} className="px-2">-</button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.variant.id, item.quantity + 1)} className="px-2">+</button>
                  </div>
                  <span className="font-bold">{formatPrice(((item.product.discount_price || item.product.base_price) + item.variant.additional_price) * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
          <Link to="/shop" className="inline-flex items-center text-sm font-bold uppercase tracking-widest hover:underline pt-4">
            <ArrowLeft size={16} className="mr-2" /> Continue Shopping
          </Link>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Order Summary</h3>
            
            <div className="mb-8 space-y-4">
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="PROMO CODE"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm font-mono focus:ring-2 focus:ring-black outline-none"
                />
                <button 
                  onClick={handleApplyPromo}
                  disabled={isApplying}
                  className="px-6 py-3 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  {isApplying ? '...' : 'APPLY'}
                </button>
              </div>
              {promoError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{promoError}</p>}
              {promoCode && (
                <div className="flex justify-between items-center bg-green-50 text-green-600 px-4 py-2 rounded-lg">
                  <span className="text-xs font-bold tracking-widest uppercase">{promoCode.code} APPLIED</span>
                  <button onClick={removePromoCode} className="text-green-800 hover:underline text-[10px] font-bold uppercase">Remove</button>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between text-sm text-red-600 font-bold">
                  <span>Bulk Discount ({discountPercentage}%)</span>
                  <span>-{formatPrice((subtotal * discountPercentage) / 100)}</span>
                </div>
              )}
              {promoCode && (
                <div className="flex justify-between text-sm text-green-600 font-bold">
                  <span>Promo Discount ({promoCode.discount_type === 'percentage' ? `${promoCode.discount_value}%` : 'Fixed'})</span>
                  <span>-{formatPrice(promoCode.discount_type === 'percentage' ? (subtotal * promoCode.discount_value) / 100 : promoCode.discount_value)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-400 italic">Calculated at checkout</span>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold">{formatPrice(totalAmount)}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-black text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all"
            >
              Proceed to Checkout
            </button>
          </div>

          <div className="space-y-4 px-4">
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <Truck size={16} />
              <span>Fast nationwide delivery</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <ShieldCheck size={16} />
              <span>Secure payment options</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <CreditCard size={16} />
              <span>bKash & Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

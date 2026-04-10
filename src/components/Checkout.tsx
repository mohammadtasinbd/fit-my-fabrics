import React, { useState, useEffect } from 'react';
import { useCart } from '../CartContext';
import { formatPrice } from '../lib/utils';
import { ShippingRule } from '../types';
import { useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export function Checkout() {
  const { cart, subtotal, totalAmount: cartTotal, discountAmount, promoCode, clearCart } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [shippingRules, setShippingRules] = useState<ShippingRule[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingRule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    customer_phone: user?.phone || '',
    shipping_address: user?.address || '',
    district: '',
    payment_method: 'COD' as 'COD' | 'bKash',
    bkash_trx_id: ''
  });

  useEffect(() => {
    const fetchShippingRules = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'shipping_rules'));
        const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any as ShippingRule[];
        setShippingRules(rules);
      } catch (error) {
        console.error('Error fetching shipping rules:', error);
      }
    };
    fetchShippingRules();
  }, []);

  if (!user) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />;
  }

  const shippingCharge = selectedZone ? (cartTotal >= (selectedZone.free_delivery_threshold || Infinity) ? 0 : selectedZone.base_charge) : 0;
  const finalTotal = cartTotal + shippingCharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return alert('Please select a shipping zone');
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          user_id: user?.id,
          promo_code: promoCode?.code,
          items: cart.map(item => ({
            variant_id: item.variant.id,
            quantity: item.quantity,
            price: (item.product.discount_price || item.product.base_price) + item.variant.additional_price
          })),
          subtotal: cartTotal, // Using the discounted subtotal
          shipping_charge: shippingCharge,
          total_amount: finalTotal
        })
      });
      
      const data = await response.json().catch(() => ({ error: 'Server returned an invalid response' }));
      if (response.ok && data.success) {
        setOrderId(data.orderId);
        setIsSuccess(true);
        clearCart();
      } else {
        alert(data.error || 'Failed to place order');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <CheckCircle2 size={48} className="text-green-600" />
        </motion.div>
        <h2 className="text-4xl font-bold tracking-tighter mb-4">ORDER CONFIRMED!</h2>
        <p className="text-gray-500 mb-2">Thank you for shopping with Fit My Fabrics.</p>
        <p className="text-sm font-mono bg-gray-100 inline-block px-4 py-2 rounded mb-12">Order ID: {orderId}</p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button onClick={() => navigate('/')} className="bg-black text-white px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest">Return Home</button>
          <button 
            onClick={() => navigate('/track-order')}
            className="border border-gray-200 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest"
          >
            Track Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold tracking-tighter mb-12">CHECKOUT</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-12">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-8 flex items-center">
              <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center mr-3 text-[10px]">1</span>
              Shipping Information
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.customer_name}
                  onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-black transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  value={formData.customer_phone}
                  onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-black transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Shipping Zone</label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {shippingRules.map(rule => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => {
                        setSelectedZone(rule);
                        setFormData({ ...formData, district: rule.zone_name });
                      }}
                      className={`p-4 border rounded-xl text-left transition-all ${selectedZone?.id === rule.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      <span className="block font-bold text-sm">{rule.zone_name}</span>
                      <span className="block text-xs text-gray-500 mt-1">{formatPrice(rule.base_charge)} • {rule.estimated_days}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Full Address</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.shipping_address}
                  onChange={e => setFormData({ ...formData, shipping_address: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-8 flex items-center">
              <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center mr-3 text-[10px]">2</span>
              Payment Method
            </h3>
            <div className="space-y-4">
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.payment_method === 'COD' ? 'border-black bg-gray-50' : 'border-gray-200'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  checked={formData.payment_method === 'COD'}
                  onChange={() => setFormData({ ...formData, payment_method: 'COD' })}
                  className="hidden" 
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-4 ${formData.payment_method === 'COD' ? 'border-black' : 'border-gray-300'}`}>
                  {formData.payment_method === 'COD' && <div className="w-2 h-2 bg-black rounded-full" />}
                </div>
                <div>
                  <span className="block font-bold text-sm">Cash on Delivery</span>
                  <span className="block text-xs text-gray-500">Pay when you receive the package</span>
                </div>
              </label>
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.payment_method === 'bKash' ? 'border-black bg-gray-50' : 'border-gray-200'}`}>
                <input 
                  type="radio" 
                  name="payment" 
                  checked={formData.payment_method === 'bKash'}
                  onChange={() => setFormData({ ...formData, payment_method: 'bKash' })}
                  className="hidden" 
                />
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-4 ${formData.payment_method === 'bKash' ? 'border-black' : 'border-gray-300'}`}>
                  {formData.payment_method === 'bKash' && <div className="w-2 h-2 bg-black rounded-full" />}
                </div>
                <div>
                  <span className="block font-bold text-sm">bKash Payment</span>
                  <span className="block text-xs text-gray-500">Send money to 01XXXXXXXXX and provide TrxID</span>
                </div>
              </label>
              
              {formData.payment_method === 'bKash' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-pink-50 rounded-xl border border-pink-100">
                  <label className="block text-xs font-bold uppercase tracking-widest text-pink-900 mb-2">bKash Transaction ID</label>
                  <input 
                    required
                    type="text" 
                    placeholder="8X7Y6Z..."
                    value={formData.bkash_trx_id}
                    onChange={e => setFormData({ ...formData, bkash_trx_id: e.target.value })}
                    className="w-full bg-white border border-pink-200 rounded-lg p-2 focus:outline-none focus:border-pink-500 transition-colors" 
                  />
                </motion.div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-8">Your Order</h3>
            <div className="space-y-6 mb-8">
              {cart.map(item => (
                <div key={item.variant.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                      {item.product.images[0]?.image_url ? (
                        <img src={item.product.images[0].image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Lock size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <span className="block font-medium">{item.product.name}</span>
                      <span className="text-xs text-gray-500">Qty: {item.quantity} • Size: {item.variant.size}</span>
                    </div>
                  </div>
                  <span className="font-bold">{formatPrice((item.product.base_price + item.variant.additional_price) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600 font-bold">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span>{selectedZone ? formatPrice(shippingCharge) : 'Select zone'}</span>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <span className="font-bold">Total</span>
                <span className="text-2xl font-bold">{formatPrice(finalTotal)}</span>
              </div>
            </div>
            <button 
              type="submit"
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-black text-white py-4 rounded-full font-bold text-sm uppercase tracking-widest mt-8 hover:bg-gray-800 transition-all disabled:bg-gray-300"
            >
              {isSubmitting ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { Package, Search, Truck, CheckCircle, Clock, MapPin, Phone, Hash, Eye, ArrowLeft } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrders([]);
    setSelectedOrder(null);

    try {
      const res = await fetch(`/api/orders/track?orderNumber=${orderNumber}&phone=${phone}`);
      const data = await res.json().catch(() => ({ error: 'Server returned an invalid response' }));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to track order');
      }

      setOrders(Array.isArray(data) ? data : [data]);
      if (Array.isArray(data) && data.length === 1) {
        setSelectedOrder(data[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-orange-500" />;
      case 'confirmed': return <CheckCircle className="text-blue-500" />;
      case 'shipped': return <Truck className="text-purple-500" />;
      case 'delivered': return <CheckCircle className="text-green-500" />;
      case 'cancelled': return <CheckCircle className="text-red-500" />;
      default: return <Clock className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'confirmed': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'shipped': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'delivered': return 'bg-green-50 text-green-600 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const steps = ['pending', 'confirmed', 'shipped', 'delivered'];
  const currentStepIndex = steps.indexOf(selectedOrder?.order_status || '');

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">TRACK YOUR ORDER</h1>
        <p className="text-gray-500 max-w-md mx-auto">Enter your phone number to see all your orders and their current status.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <form onSubmit={handleTrack} className="p-8 md:p-12 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center">
                <Phone size={12} className="mr-1" /> Phone Number
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 017XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-6 py-4 bg-white rounded-2xl border-none focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center">
                <Hash size={12} className="mr-1" /> Order Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 1001"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-6 py-4 bg-white rounded-2xl border-none focus:ring-2 focus:ring-black outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search size={20} />
                <span>TRACK ORDERS</span>
              </>
            )}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-8 text-center text-red-500 font-medium"
            >
              {error}
            </motion.div>
          )}

          {orders.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 md:p-12 space-y-6"
            >
              <h2 className="text-xl font-bold tracking-tight">WE FOUND {orders.length} ORDER{orders.length > 1 ? 'S' : ''}</h2>
              <div className="grid grid-cols-1 gap-4">
                {orders.map((order) => (
                  <div 
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsModalOpen(true);
                    }}
                    className="group flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-black transition-all cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order #{order.order_number}</div>
                      <div className="text-lg font-bold">{new Date(order.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center space-x-6 w-full md:w-auto justify-between md:justify-end">
                      <div className={`px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${getStatusColor(order.order_status)}`}>
                        {order.order_status}
                      </div>
                      <div className="text-lg font-bold">{formatPrice(order.total_amount)}</div>
                      <div className="p-2 bg-white rounded-full shadow-sm group-hover:bg-black group-hover:text-white transition-all">
                        <Eye size={16} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-black text-white rounded-2xl">
                    <Package size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tighter uppercase">Order Details</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order #{selectedOrder.order_number}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ArrowLeft size={24} className="rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12">
                {/* Status Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Status</div>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-bold uppercase tracking-widest ${getStatusColor(selectedOrder.order_status)}`}>
                      <span className="mr-2">{getStatusIcon(selectedOrder.order_status)}</span>
                      {selectedOrder.order_status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Order Date</div>
                    <div className="text-lg font-bold">{new Date(selectedOrder.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                {selectedOrder.order_status !== 'cancelled' && (
                  <div className="relative pt-8 pb-12">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
                    <div 
                      className="absolute top-1/2 left-0 h-1 bg-black -translate-y-1/2 rounded-full transition-all duration-1000"
                      style={{ width: `${(steps.indexOf(selectedOrder.order_status) / (steps.length - 1)) * 100}%` }}
                    />
                    <div className="relative flex justify-between">
                      {steps.map((step, idx) => (
                        <div key={step} className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${idx <= steps.indexOf(selectedOrder.order_status) ? 'bg-black text-white scale-110' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                            {idx < steps.indexOf(selectedOrder.order_status) ? <CheckCircle size={20} /> : idx === steps.indexOf(selectedOrder.order_status) ? getStatusIcon(step) : <Clock size={20} />}
                          </div>
                          <span className={`absolute mt-12 text-[10px] font-bold uppercase tracking-widest ${idx <= steps.indexOf(selectedOrder.order_status) ? 'text-black' : 'text-gray-300'}`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-gray-100">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center text-gray-400">
                      <MapPin size={16} className="mr-2" /> Shipping Details
                    </h3>
                    <div className="space-y-2 text-gray-600">
                      <div className="font-bold text-black">{selectedOrder.customer_name}</div>
                      <div>{selectedOrder.customer_phone}</div>
                      <div className="text-sm leading-relaxed">{selectedOrder.shipping_address}</div>
                      <div className="text-sm font-bold text-black uppercase tracking-wider">{selectedOrder.district}</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center text-gray-400">
                      <Package size={16} className="mr-2" /> Order Summary
                    </h3>
                    <div className="space-y-4">
                      {selectedOrder.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex-1">
                            <div className="font-bold">{item.product_name}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest">{item.size} / {item.color} × {item.quantity}</div>
                          </div>
                          <div className="font-bold">{formatPrice(item.price_at_time * item.quantity)}</div>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-gray-50 space-y-2">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Subtotal</span>
                          <span>{formatPrice(selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Shipping</span>
                          <span>{formatPrice(selectedOrder.shipping_charge)}</span>
                        </div>
                        {selectedOrder.discount_amount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>-{formatPrice(selectedOrder.discount_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold pt-2">
                          <span>Total</span>
                          <span>{formatPrice(selectedOrder.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-gray-50 border-t border-gray-100">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-all"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

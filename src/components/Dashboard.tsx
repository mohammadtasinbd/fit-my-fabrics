import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { motion } from 'motion/react';
import { Package, MapPin, User as UserIcon, LogOut, RotateCcw } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';

export function Dashboard() {
  const { user, logout, token } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState('orders');
  const [profileData, setProfileData] = useState({ name: '', email: '', address: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetch('/api/user/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .catch(() => [])
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
    }
  }, [token]);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const res = await fetch(`/api/user/orders/${orderId}/reorder`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch order details');
      const items = await res.json().catch(() => []);
      
      items.forEach((item: any) => {
        addToCart(item.product, item.variant, item.quantity);
      });

      navigate('/cart');
    } catch (err) {
      console.error('Reorder error:', err);
      setMessage('Failed to re-order items.');
    } finally {
      setReorderingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        setMessage('Failed to update profile.');
      }
    } catch (err) {
      setMessage('Error updating profile.');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-4">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl">
                {user.name[0]}
              </div>
              <div>
                <h2 className="font-bold tracking-tight">{user.name}</h2>
                <p className="text-xs text-gray-500">{user.phone}</p>
              </div>
            </div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveSubTab('orders')}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSubTab === 'orders' ? 'text-black bg-gray-50' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
              >
                <Package size={18} />
                <span>Orders</span>
              </button>
              <button 
                onClick={() => setActiveSubTab('profile')}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSubTab === 'profile' ? 'text-black bg-gray-50' : 'text-gray-500 hover:text-black hover:bg-gray-50'}`}
              >
                <UserIcon size={18} />
                <span>Profile</span>
              </button>
              <div className="pt-4 mt-4 border-t border-gray-100 space-y-1">
                <Link 
                  to="/"
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <RotateCcw size={18} className="-rotate-90" />
                  <span>Back to Site</span>
                </Link>
                <button 
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {activeSubTab === 'orders' && (
            <>
              <h1 className="text-3xl font-bold tracking-tighter">ORDER HISTORY</h1>
              
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-gray-200">
                  <Package size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">You haven't placed any orders yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">SL No</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Order No</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Items</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Quantity</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Total</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orders.map((order, index) => {
                          const totalQty = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                          return (
                            <motion.tr 
                              key={order.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="px-6 py-4 text-sm font-medium text-gray-400">{index + 1}</td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-bold text-black">#{order.order_number || order.id.slice(0, 8)}</span>
                                <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {order.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="text-xs text-gray-600">
                                      {item.product_name}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-center">{totalQty}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                  order.order_status === 'delivered' ? 'bg-green-100 text-green-700' :
                                  order.order_status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                  order.order_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {order.order_status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-bold text-black">{formatPrice(order.total_amount)}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleReorder(order.id)}
                                  disabled={reorderingId === order.id}
                                  className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-widest text-black hover:text-gray-600 transition-colors disabled:opacity-50"
                                >
                                  {reorderingId === order.id ? (
                                    <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <RotateCcw size={14} />
                                  )}
                                  <span>Re-order</span>
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeSubTab === 'profile' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold tracking-tighter">PROFILE SETTINGS</h1>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Full Name</label>
                    <input 
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                    <input 
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Delivery Address</label>
                    <textarea 
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-black outline-none transition-colors h-32 resize-none"
                    />
                  </div>
                  {message && (
                    <p className={`text-sm font-bold ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                      {message}
                    </p>
                  )}
                  <button 
                    type="submit"
                    className="bg-black text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { BarChart as BarChartIcon, Package, ShoppingCart, DollarSign, Users, User, Plus, Edit, Trash2, ExternalLink, Settings, FileText, ArrowLeft, Mail, HelpCircle, CheckCircle, AlertCircle, Eye, EyeOff, Share2, Phone, MessageCircle, Globe, Facebook, Instagram, Twitter } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion } from 'motion/react';

export function AdminPanel() {
  const { token, user, logout } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<{ admins: any[], customers: any[] }>({ admins: [], customers: [] });
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any[]>([]);
  const [mailSettings, setMailSettings] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [discountRules, setDiscountRules] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testMailLoading, setTestMailLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'product' | 'category' | 'banner' | 'customer' | 'admin' | 'setting' | 'page' | 'discount-rule' | 'promo-code' | 'mail' | 'mail-all' | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string, id: string | number, name?: string } | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const statsRes = await fetch('/api/admin/stats', { headers });
        
        if (statsRes.status === 403) {
          setError('Access Denied: You do not have administrator privileges.');
          setLoading(false);
          return;
        }
        
        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        
        const statsData = await statsRes.json().catch(() => null);
        if (statsData) setStats(statsData);

        if (activeTab === 'orders') {
          const ordersRes = await fetch('/api/admin/orders', { headers });
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json().catch(() => []);
            setOrders(ordersData);
          }
        }

        if (activeTab === 'users') {
          const usersRes = await fetch('/api/admin/users', { headers });
          if (usersRes.ok) {
            const usersData = await usersRes.json().catch(() => ({ admins: [], customers: [] }));
            setUsers(usersData);
          }
        }

        if (activeTab === 'products') {
          const productsRes = await fetch('/api/admin/products', { headers });
          if (productsRes.ok) {
            const productsData = await productsRes.json().catch(() => []);
            setProducts(productsData);
          }
        }

        if (activeTab === 'categories') {
          const categoriesRes = await fetch('/api/admin/categories', { headers });
          if (categoriesRes.ok) {
            const categoriesData = await categoriesRes.json().catch(() => []);
            setCategories(categoriesData);
          }
        }

        if (activeTab === 'banners') {
          const bannersRes = await fetch('/api/admin/banners', { headers });
          if (bannersRes.ok) {
            const bannersData = await bannersRes.json().catch(() => []);
            setBanners(bannersData);
          }
        }

        if (activeTab === 'settings' || activeTab === 'mail-config' || activeTab === 'connect') {
          const settingsRes = await fetch('/api/admin/site-settings', { headers });
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json().catch(() => []);
            setSiteSettings(settingsData);
            
            const REQUIRED_MAIL_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
            const filteredMail = settingsData.filter((s: any) => s.key.startsWith('SMTP_'));
            const finalMail = REQUIRED_MAIL_KEYS.map(key => {
              const existing = filteredMail.find((s: any) => s.key === key);
              return existing || { key, value: '' };
            });
            setMailSettings(finalMail);
          }
        }

        if (activeTab === 'pages') {
          const pagesRes = await fetch('/api/admin/pages', { headers });
          if (pagesRes.ok) {
            const pagesData = await pagesRes.json().catch(() => []);
            setPages(pagesData);
          }
        }

        if (activeTab === 'discounts') {
          const res = await fetch('/api/bulk-discount-rules');
          if (res.ok) {
            const data = await res.json().catch(() => []);
            setDiscountRules(data);
          }

          const promoRes = await fetch('/api/admin/promo-codes', { headers });
          if (promoRes.ok) {
            const promoData = await promoRes.json().catch(() => []);
            setPromoCodes(promoData);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, token]);

  const updateOrderStatus = async (orderId: string, status: string, paid_amount?: number, payment_remarks?: string, is_active?: boolean) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, paid_amount, payment_remarks, is_active })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { 
          ...o, 
          order_status: status, 
          paid_amount: paid_amount !== undefined ? paid_amount : o.paid_amount, 
          payment_remarks: payment_remarks !== undefined ? payment_remarks : o.payment_remarks,
          is_active: is_active !== undefined ? (is_active ? 1 : 0) : o.is_active
        } : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPlural = (type: string) => {
    if (type === 'category') return 'categories';
    if (type === 'discount-rule') return 'bulk-discount-rules';
    if (type === 'promo-code') return 'promo-codes';
    return `${type}s`;
  };

  const handleDelete = async (type: string, id: string | number, name?: string) => {
    setDeleteConfirm({ type, id, name });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    
    try {
      const res = await fetch(`/api/admin/${getPlural(type)}/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Invalid JSON response:', responseText);
        data = { error: 'Server returned an invalid response. Please check the console for details.' };
      }
      
      if (res.ok) {
        if (type === 'product') setProducts(prev => prev.filter(p => String(p.id) !== String(id)));
        if (type === 'category') setCategories(prev => prev.filter(c => String(c.id) !== String(id)));
        if (type === 'banner') setBanners(prev => prev.filter(b => String(b.id) !== String(id)));
        if (type === 'customer') setUsers(prev => ({ ...prev, customers: prev.customers.filter(c => String(c.id) !== String(id)) }));
        if (type === 'admin') setUsers(prev => ({ ...prev, admins: prev.admins.filter(a => String(a.id) !== String(id)) }));
        if (type === 'discount-rule') setDiscountRules(prev => prev.filter(r => String(r.id) !== String(id)));
        if (type === 'promo-code') setPromoCodes(prev => prev.filter(c => String(c.id) !== String(id)));
        if (type === 'order') setOrders(prev => prev.filter(o => String(o.id) !== String(id)));
        
        setDeleteConfirm(null);
      } else {
        setErrorMessage(data.error || `Failed to delete ${type}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMessage('An error occurred while deleting');
    }
  };

  const openModal = (type: 'product' | 'category' | 'banner' | 'customer' | 'admin' | 'setting' | 'mail' | 'page' | 'discount-rule' | 'promo-code' | 'mail-all', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowPassword(false);
    if (type === 'mail-all') {
      const smtpMap: any = {};
      mailSettings.forEach(s => {
        smtpMap[s.key] = s.value;
      });
      setFormData({
        SMTP_HOST: smtpMap.SMTP_HOST || '',
        SMTP_PORT: smtpMap.SMTP_PORT || '',
        SMTP_USER: smtpMap.SMTP_USER || '',
        SMTP_PASS: smtpMap.SMTP_PASS || '',
        SMTP_FROM: smtpMap.SMTP_FROM || '',
      });
    } else if (item) {
      if (type === 'product') {
        setFormData({ 
          ...item,
          color: item.variants?.[0]?.color || 'Default',
          color_code: item.variants?.[0]?.color_code || '#000000'
        });
      } else {
        setFormData({ ...item });
      }
    } else {
      // Default values for new items
      if (type === 'category') setFormData({ name: '', slug: '', image_url: '', is_featured: false });
      if (type === 'banner') setFormData({ title: '', subtitle: '', image_url: '', link_url: '', button_text: 'SHOP NOW', background_color: '#000000', priority: 0, is_active: true });
      if (type === 'customer') setFormData({ name: '', phone: '', email: '', address: '', status: 'active' });
      if (type === 'admin') setFormData({ name: '', phone: '', email: '', password: '', permissions: [], status: 'active' });
      if (type === 'discount-rule') setFormData({ min_quantity: 1, discount_percentage: 0, is_active: true });
      if (type === 'promo-code') setFormData({ code: '', discount_type: 'percentage', discount_value: 0, min_order_amount: 0, max_discount_amount: '', usage_limit: '', expires_at: '', is_active: true });
      if (type === 'setting' || type === 'mail') setFormData({ key: '', value: '' });
      if (type === 'product') setFormData({ 
        name: '', sku: '', slug: '', description: '', short_description: '', category_id: categories[0]?.id || '', 
        gsm: '', material_composition: '', fit_type: 'Regular Fit', weight: '',
        color: 'Default', color_code: '#000000',
        base_price: 0, cost_price: 0, discount_price: 0, 
        stock_quantity: 0, low_stock_alert: 10,
        is_active: true, is_new_arrival: false, is_best_seller: false,
        fabric_details: '', size_guide_url: '', images: [], 
        variants: ['S', 'M', 'L', 'XL', 'XXL'].map(size => ({
          size,
          stock_quantity: 0,
          color: 'Default',
          color_code: '#000000',
          sku: '',
          additional_price: 0
        })),
        sizes: ['S', 'M', 'L', 'XL', 'XXL']
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let method = editingItem ? 'PATCH' : 'POST';
    let url = editingItem 
      ? `/api/admin/${getPlural(modalType)}/${editingItem.id}` 
      : `/api/admin/${getPlural(modalType)}`;

    if (modalType === 'setting' || modalType === 'mail' || modalType === 'mail-all') {
      url = '/api/admin/site-settings';
      method = 'PUT';
    } else if (modalType === 'page') {
      url = editingItem 
        ? `/api/admin/pages/${editingItem.slug}` 
        : `/api/admin/pages`;
      method = editingItem ? 'PUT' : 'POST';
    }

    try {
      let bodyData = (modalType === 'setting' || modalType === 'mail') 
        ? [formData] 
        : (modalType === 'mail-all')
          ? Object.entries(formData).map(([key, value]) => ({ key, value }))
          : formData;

      if (modalType === 'product') {
        const updatedVariants = ['S', 'M', 'L', 'XL', 'XXL'].map(size => {
          const existingVariant = (formData.variants || []).find((v: any) => v.size === size) || { 
            size, 
            stock_quantity: 0,
            color: 'Default',
            color_code: '#000000',
            sku: `${formData.sku}-${size}`,
            additional_price: 0
          };
          const addition = formData[`add_${size}`] || 0;
          return {
            ...existingVariant,
            color: formData.color || 'Default',
            color_code: formData.color_code || '#000000',
            sku: existingVariant.sku || `${formData.sku}-${size}`,
            stock_quantity: (parseInt(existingVariant.stock_quantity) || 0) + (parseInt(addition) || 0)
          };
        });

        const totalStock = updatedVariants.reduce((sum: number, v: any) => sum + (parseInt(v.stock_quantity) || 0), 0);
        
        // Clean up temporary add_ fields from the payload
        const cleanedFormData = { ...formData };
        ['S', 'M', 'L', 'XL', 'XXL'].forEach(size => delete cleanedFormData[`add_${size}`]);
        
        bodyData = { 
          ...cleanedFormData, 
          variants: updatedVariants,
          stock_quantity: totalStock 
        };
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setSuccessMessage(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} saved successfully`);
        // Refresh data
        const headers = { 'Authorization': `Bearer ${token}` };
        if (modalType === 'category') {
          const r = await fetch('/api/admin/categories', { headers });
          const d = await r.json().catch(() => []);
          setCategories(d);
        }
        if (modalType === 'banner') {
          const r = await fetch('/api/admin/banners', { headers });
          const d = await r.json().catch(() => []);
          setBanners(d);
        }
        if (modalType === 'product') {
          const r = await fetch('/api/products');
          const d = await r.json().catch(() => []);
          setProducts(d);
        }
        if (modalType === 'customer' || modalType === 'admin') {
          const r = await fetch('/api/admin/users', { headers });
          const d = await r.json().catch(() => ({ admins: [], customers: [] }));
          setUsers(d);
        }
        if (modalType === 'setting' || modalType === 'mail' || modalType === 'mail-all') {
          const r = await fetch('/api/admin/site-settings', { headers });
          const data = await r.json().catch(() => []);
          setSiteSettings(data);
          setMailSettings(data.filter((s: any) => s.key.startsWith('SMTP_')));
          await refreshSettings();
        }
        if (modalType === 'page') {
          const r = await fetch('/api/admin/pages', { headers });
          const d = await r.json().catch(() => []);
          setPages(d);
        }
        if (modalType === 'discount-rule') {
          const r = await fetch('/api/bulk-discount-rules');
          const d = await r.json().catch(() => []);
          setDiscountRules(d);
        }
        if (modalType === 'promo-code') {
          const r = await fetch('/api/admin/promo-codes', { headers });
          const d = await r.json().catch(() => []);
          setPromoCodes(d);
        }
      } else {
        const responseText = await res.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Invalid JSON response:', responseText);
          data = { error: 'Server returned an invalid response. Please check the console for details.' };
        }
        setErrorMessage(data.error || 'Failed to save changes');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An error occurred while saving');
    }
  };

  if (loading) return <div className="p-12 text-center font-bold tracking-tighter">LOADING ADMIN PORTAL...</div>;

  if (!token || (user && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-2xl shadow-xl text-center space-y-6">
          <div className="text-4xl font-bold tracking-tighter">ACCESS DENIED</div>
          <p className="text-gray-500">You must be logged in as an administrator to view this page.</p>
          <a href="/login" className="block w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-all">
            GO TO LOGIN
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-2xl shadow-xl text-center space-y-6">
          <div className="text-4xl font-bold tracking-tighter text-red-600">ERROR</div>
          <p className="text-gray-500">{error}</p>
          <button onClick={() => window.location.reload()} className="block w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-all">
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="flex flex-col items-center text-center mb-8">
          {settings.site_logo && (
            <img 
              src={settings.site_logo} 
              alt={settings.site_name || 'FIT MY FABRICS'} 
              className="h-16 w-16 aspect-square object-contain mb-3"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="text-xl font-bold tracking-tighter uppercase">
            {settings.site_name || 'FIT MY FABRICS'}
          </div>
        </div>
        <nav className="space-y-2 flex-grow">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <BarChartIcon size={18} /> <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <ShoppingCart size={18} /> <span>Orders</span>
          </button>
          <div className="group flex items-center">
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex-grow flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Package size={18} /> <span>Products</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); openModal('product'); }}
              className="ml-2 p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Add New Product"
            >
              <Plus size={14} />
            </button>
          </div>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Users size={18} /> <span>Users</span>
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'categories' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Package size={18} /> <span>Categories</span>
          </button>
          <button 
            onClick={() => setActiveTab('banners')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'banners' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <BarChartIcon size={18} /> <span>Banners</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Settings size={18} /> <span>Site Settings</span>
          </button>
          <button 
            onClick={() => setActiveTab('connect')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'connect' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Share2 size={18} /> <span>Connect</span>
          </button>
          <button 
            onClick={() => setActiveTab('mail-config')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'mail-config' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Mail size={18} /> <span>Mail Configuration</span>
          </button>
          <button 
            onClick={() => setActiveTab('pages')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pages' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <FileText size={18} /> <span>Pages</span>
          </button>
          <button 
            onClick={() => setActiveTab('discounts')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'discounts' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <DollarSign size={18} /> <span>Discounts</span>
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'manual' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <HelpCircle size={18} /> <span>Help & Manual</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <User size={18} /> <span>My Profile</span>
          </button>
        </nav>
        <div className="pt-8 border-t border-gray-100 space-y-2">
          <Link 
            to="/"
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} /> <span>Back to Site</span>
          </Link>
          <button 
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <ArrowLeft size={18} className="rotate-180" /> <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-12 overflow-auto relative">
        {/* Success Message Toast */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 right-8 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center space-x-3"
          >
            <CheckCircle size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">{successMessage}</span>
          </motion.div>
        )}

        {/* Error Message Toast */}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 right-8 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center space-x-3"
          >
            <AlertCircle size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">{errorMessage}</span>
          </motion.div>
        )}

        {activeTab === 'dashboard' && stats && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={20} /></div>
                </div>
                <div className="text-xl font-bold">{formatPrice(stats.totalRevenue)}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Total Revenue</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><ShoppingCart size={20} /></div>
                </div>
                <div className="text-xl font-bold">{stats.totalOrders}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Total Orders</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Package size={20} /></div>
                </div>
                <div className="text-xl font-bold">{stats.totalStock}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Stock in Total</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Package size={20} /></div>
                </div>
                <div className="text-xl font-bold">{stats.deliveredCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Delivered</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Package size={20} /></div>
                </div>
                <div className="text-xl font-bold">{stats.inDeliveryCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">In Delivery</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Package size={20} /></div>
                </div>
                <div className="text-xl font-bold">{stats.remainingStock}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Stock in Hand</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest mb-8">Sales Overview</h3>
                <div className="flex-1 min-h-0 min-w-0">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'Mon', sales: 4000 },
                        { name: 'Tue', sales: 3000 },
                        { name: 'Wed', sales: 2000 },
                        { name: 'Thu', sales: 2780 },
                        { name: 'Fri', sales: 1890 },
                        { name: 'Sat', sales: 2390 },
                        { name: 'Sun', sales: 3490 },
                      ]}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#000" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorSales)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full bg-gray-50 animate-pulse rounded-lg" />
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Recent Orders</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-xs font-bold uppercase tracking-widest hover:underline">View All</button>
                </div>
                <div className="space-y-6">
                  {stats.recentOrders.map((order: any) => (
                    <div key={order.id} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-bold">{order.customer_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono uppercase">#{order.order_number || order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{formatPrice(order.total_amount)}</div>
                        <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${order.order_status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                          {order.order_status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tighter">ORDERS</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Order No</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Customer Details</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Bill Amount</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Paid Amount</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Payment Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Order Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map(order => (
                    <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${order.is_active === 0 ? 'opacity-50 grayscale' : ''}`}>
                      <td className="px-6 py-4 text-xs font-mono uppercase">#{order.order_number || order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold">{order.customer_name}</div>
                        <div className="text-xs text-gray-500">{order.customer_phone}</div>
                        <div className="text-[10px] text-gray-400">{order.customer_email || 'No Email'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">{formatPrice(order.total_amount)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <input 
                            type="number" 
                            className="w-24 px-2 py-1 border border-gray-200 rounded text-sm"
                            value={order.paid_amount || 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, paid_amount: val } : o));
                            }}
                            onBlur={() => updateOrderStatus(order.id, order.order_status, order.paid_amount, order.payment_remarks)}
                          />
                          <input 
                            type="text" 
                            placeholder="Remarks (bKash, Cash, Bank)"
                            className="w-32 px-2 py-1 border border-gray-200 rounded text-[10px]"
                            value={order.payment_remarks || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_remarks: val } : o));
                            }}
                            onBlur={() => updateOrderStatus(order.id, order.order_status, order.paid_amount, order.payment_remarks)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold uppercase">{order.payment_method}</div>
                        {order.bkash_trx_id && <div className="text-[10px] text-gray-400">Trx: {order.bkash_trx_id}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={order.order_status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value, order.paid_amount, order.payment_remarks)}
                          className={`text-[10px] font-bold uppercase px-2 py-1 rounded border-none focus:ring-2 focus:ring-black outline-none ${
                            order.order_status === 'pending' ? 'bg-orange-50 text-orange-600' : 
                            order.order_status === 'shipped' ? 'bg-blue-50 text-blue-600' : 
                            order.order_status === 'delivered' ? 'bg-green-50 text-green-600' : 
                            'bg-red-50 text-red-600'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => updateOrderStatus(order.id, order.order_status, order.paid_amount, order.payment_remarks, !order.is_active)}
                            className={`p-2 transition-colors ${order.is_active === 0 ? 'text-orange-500 hover:text-orange-600' : 'text-gray-400 hover:text-black'}`}
                            title={order.is_active === 0 ? "Activate Order" : "Deactivate Order"}
                          >
                            {order.is_active === 0 ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button 
                            onClick={() => handleDelete('order', order.id, `Order #${order.order_number || order.id.slice(0, 8)}`)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-black"><ExternalLink size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tighter">ADMIN USERS</h2>
                {user?.is_master && (
                  <button 
                    onClick={() => openModal('admin')}
                    className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center"
                  >
                    <Plus size={18} className="mr-2" /> Add Admin
                  </button>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Phone</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Email</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Password</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Permissions</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Joined</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.admins.map(admin => (
                      <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">
                          {admin.name}
                          {admin.is_master ? <span className="ml-2 text-[8px] bg-purple-100 text-purple-600 px-1 rounded">MASTER</span> : null}
                        </td>
                        <td className="px-6 py-4 text-sm">{admin.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{admin.email || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">********</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${admin.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {admin.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {admin.permissions?.map((p: string) => (
                              <span key={p} className="text-[8px] bg-gray-100 px-1 rounded uppercase">{p}</span>
                            )) || <span className="text-[8px] text-gray-400 italic">None</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">{new Date(admin.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          {!admin.is_master && (
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openModal('admin', admin)}
                                className="p-2 text-gray-400 hover:text-black"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete('admin', admin.id, admin.name)}
                                className="p-2 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tighter">CUSTOMER USERS</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Phone</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Email</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Joined</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.customers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{user.name}</td>
                        <td className="px-6 py-4 text-sm">{user.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{user.email || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${user.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openModal('customer', user)}
                              className="p-2 text-gray-400 hover:text-black"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete('customer', user.id, user.name)}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tighter">PRODUCTS</h2>
              <button 
                onClick={() => openModal('product')}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center"
              >
                <Plus size={18} className="mr-2" /> Add Product
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Product</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Category</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Price</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                            {product.images?.[0]?.image_url ? (
                              <img 
                                src={product.images[0].image_url} 
                                alt="" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package size={16} className="text-gray-300" />
                            )}
                          </div>
                          <div className="text-sm font-bold">{product.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.category_name}</td>
                      <td className="px-6 py-4 text-sm font-bold">{formatPrice(product.base_price)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${product.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openModal('product', product)}
                            className="p-2 text-gray-400 hover:text-black"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete('product', product.id, product.name)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'categories' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tighter">CATEGORIES</h2>
              <button 
                onClick={() => openModal('category')}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center"
              >
                <Plus size={18} className="mr-2" /> Add Category
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Image</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Name</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Slug</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Featured</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {categories.map(category => (
                    <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          {category.image_url ? (
                            <img src={category.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={16} className="text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">{category.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{category.slug}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${category.is_featured ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                          {category.is_featured ? 'Featured' : 'Standard'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openModal('category', category)}
                            className="p-2 text-gray-400 hover:text-black"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete('category', category.id, category.name)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tighter">BANNERS</h2>
              <button 
                onClick={() => openModal('banner')}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center"
              >
                <Plus size={18} className="mr-2" /> Add Banner
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Image</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Title</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Priority</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {banners.map(banner => (
                    <tr key={banner.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-20 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          {banner.image_url ? (
                            <img src={banner.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={20} className="text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold">{banner.title}</div>
                        <div className="text-xs text-gray-500">{banner.subtitle}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{banner.priority}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${banner.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openModal('banner', banner)}
                            className="p-2 text-gray-400 hover:text-black"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete('banner', banner.id, banner.title)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'connect' && (
          <div className="space-y-12">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tighter">CONNECT SETTINGS</h2>
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const keys = ['facebook_url', 'instagram_url', 'twitter_url', 'whatsapp_url', 'contact_phone', 'contact_email', 'contact_address'];
                    const settingsToUpdate = keys.map(key => ({
                      key,
                      value: (document.getElementById(`connect_${key}`) as HTMLInputElement)?.value || ''
                    }));
                    
                    const res = await fetch('/api/admin/site-settings', {
                      method: 'PUT',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify(settingsToUpdate)
                    });
                    
                    if (res.ok) {
                      setSuccessMessage('Connect settings updated successfully');
                      refreshSettings();
                    } else {
                      setErrorMessage('Failed to update connect settings');
                    }
                  } catch (err) {
                    setErrorMessage('An error occurred while saving settings');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-black text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Social Media Section */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest">Social Media</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tight">Manage your social presence</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center">
                      <Facebook size={14} className="mr-2" /> Facebook URL
                    </label>
                    <input 
                      id="connect_facebook_url"
                      type="url" 
                      defaultValue={siteSettings.find(s => s.key === 'facebook_url')?.value || ''}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center">
                      <Instagram size={14} className="mr-2" /> Instagram URL
                    </label>
                    <input 
                      id="connect_instagram_url"
                      type="url" 
                      defaultValue={siteSettings.find(s => s.key === 'instagram_url')?.value || ''}
                      placeholder="https://instagram.com/yourprofile"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center">
                      <Twitter size={14} className="mr-2" /> Twitter (X) URL
                    </label>
                    <input 
                      id="connect_twitter_url"
                      type="url" 
                      defaultValue={siteSettings.find(s => s.key === 'twitter_url')?.value || ''}
                      placeholder="https://twitter.com/yourhandle"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center">
                      <MessageCircle size={14} className="mr-2" /> WhatsApp Number/Link
                    </label>
                    <input 
                      id="connect_whatsapp_url"
                      type="text" 
                      defaultValue={siteSettings.find(s => s.key === 'whatsapp_url')?.value || ''}
                      placeholder="e.g. https://wa.me/88017XXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest">Contact Info</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tight">How customers can reach you</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center">
                      <Phone size={14} className="mr-2" /> Support Phone
                    </label>
                    <input 
                      id="connect_contact_phone"
                      type="text" 
                      defaultValue={siteSettings.find(s => s.key === 'contact_phone')?.value || ''}
                      placeholder="+880 17XX XXXXXX"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center">
                      <Mail size={14} className="mr-2" /> Support Email
                    </label>
                    <input 
                      id="connect_contact_email"
                      type="email" 
                      defaultValue={siteSettings.find(s => s.key === 'contact_email')?.value || ''}
                      placeholder="support@daccathreads.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center">
                      <Globe size={14} className="mr-2" /> Physical Address
                    </label>
                    <textarea 
                      id="connect_contact_address"
                      defaultValue={siteSettings.find(s => s.key === 'contact_address')?.value || ''}
                      placeholder="Shop Address, City, Bangladesh"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-black outline-none transition-all text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <HelpCircle size={20} className="text-gray-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-1">Visibility Note</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Data input is optional. Only the fields you fill in will be visible on the live site's footer and contact sections. 
                    Leave a field empty to hide it from your customers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-12">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tighter">SITE SETTINGS</h2>
              <button 
                onClick={() => openModal('setting')}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center"
              >
                <Plus size={18} className="mr-2" /> Add Setting
              </button>
            </div>

            {/* Branding Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">Store Branding</h3>
                  <p className="text-xs text-gray-400 mt-1">Manage your store logo and identity</p>
                </div>
                <button 
                  onClick={() => {
                    const logoSetting = siteSettings.find(s => s.key === 'site_logo') || { key: 'site_logo', value: '' };
                    openModal('setting', logoSetting);
                  }}
                  className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center hover:bg-gray-900 transition-all"
                >
                  <Plus size={18} className="mr-2" /> {siteSettings.find(s => s.key === 'site_logo') ? 'Update Logo' : 'Add Logo'}
                </button>
              </div>
              
              <div className="flex items-center space-x-8">
                <div className="w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                  {siteSettings.find(s => s.key === 'site_logo')?.value ? (
                    <img 
                      src={siteSettings.find(s => s.key === 'site_logo')?.value} 
                      alt="Logo" 
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center">
                      <Package size={32} className="text-gray-200 mx-auto mb-2" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase">No Logo</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Store Name</div>
                    <div className="text-xl font-bold tracking-tighter uppercase">
                      {siteSettings.find(s => s.key === 'site_name')?.value || 'FIT MY FABRICS'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      1:1 Resolution Recommended
                    </div>
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Transparent PNG Preferred
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Setting Key</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Value</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {siteSettings.filter(s => !s.key.startsWith('SMTP_')).map(setting => (
                    <tr key={setting.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold uppercase tracking-widest">{setting.key.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                        {setting.key === 'site_logo' && setting.value ? (
                          <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden border border-gray-100 flex items-center justify-center">
                            <img src={setting.value} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          setting.value
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => openModal('setting', setting)}
                          className="p-2 text-gray-400 hover:text-black"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-1">Cloud Synchronization</h4>
                  <p className="text-[10px] text-gray-400">Manually sync your local data with the cloud if you notice inconsistencies.</p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('This will overwrite cloud data with your local data. Continue?')) return;
                    try {
                      const res = await fetch('/api/admin/sync-cloud', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                      });
                      const data = await res.json();
                      if (res.ok) alert(data.message);
                      else alert(data.error);
                    } catch (err) {
                      alert('Failed to sync with cloud');
                    }
                  }}
                  className="px-6 py-2 bg-black text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors rounded-full"
                >
                  Sync to Cloud
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mail-config' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tighter uppercase">Mail Configuration</h2>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => openModal('mail-all')}
                  className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center hover:bg-gray-800 transition-all"
                >
                  <Settings size={16} className="mr-2" />
                  Configure SMTP
                </button>
                <button 
                  onClick={async () => {
                  setTestMailLoading(true);
                  try {
                    const res = await fetch('/api/admin/test-email', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setSuccessMessage(data.message);
                    } else {
                      let msg = data.error || "Failed to connect to server";
                      if (data.details) msg += `\n\nTechnical Details: ${data.details}`;
                      if (data.code === 'ECONNREFUSED') {
                        msg += "\n\n💡 SUGGESTION: If you are using port 465, try changing it to 587. If you are using 587, try 465.";
                      }
                      setErrorMessage(msg);
                    }
                  } catch (err) {
                    setErrorMessage("Failed to connect to server");
                  } finally {
                    setTestMailLoading(false);
                  }
                }}
                disabled={testMailLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {testMailLoading ? 'Sending...' : 'Test SMTP Connection'}
              </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Configuration Key</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mailSettings.map(setting => (
                    <tr key={setting.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold uppercase tracking-widest">{setting.key}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {setting.value || <span className="text-gray-300 italic">Not configured</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest mb-2">Instructions</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Configure your SMTP settings here to enable real email delivery for OTPs and order confirmations. 
                  If these are not configured, the system will operate in <strong>Debug Mode</strong>, showing OTPs directly in the signup form.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-700">
                <div className="space-y-2">
                  <p className="font-bold uppercase tracking-widest">Common Settings:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Gmail:</strong> host: <code>smtp.gmail.com</code>, port: <code>465</code> (SSL) or <code>587</code> (STARTTLS)</li>
                    <li><strong>Outlook/Hotmail:</strong> host: <code>smtp-mail.outlook.com</code>, port: <code>587</code></li>
                    <li><strong>cPanel/Webmail:</strong> host: <code>mail.yourdomain.com</code>, port: <code>465</code></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-bold uppercase tracking-widest">Troubleshooting:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>For Gmail, you <strong>MUST</strong> use an <strong>App Password</strong>.</li>
                    <li>Ensure your hosting provider allows outgoing connections on the chosen port.</li>
                    <li>If port 465 fails, try port 587.</li>
                    <li>Check your spam folder if emails are sent but not received.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold tracking-tighter">SITE PAGES</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Page Title</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Slug</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Last Updated</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pages.map(page => (
                    <tr key={page.slug} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold">{page.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">/{page.slug}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">{new Date(page.updated_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => openModal('page', page)}
                          className="p-2 text-gray-400 hover:text-black"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="max-w-4xl space-y-12 pb-24">
            <div className="space-y-4">
              <h2 className="text-5xl font-bold tracking-tighter uppercase">Admin Manual</h2>
              <p className="text-gray-500 text-lg">Detailed guide on how to manage your FIT MY FABRICS store.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl">01</div>
                <h3 className="text-xl font-bold tracking-tighter uppercase">Order Management</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Track and update customer orders. You can change status to <strong>Confirmed</strong>, <strong>Shipped</strong>, or <strong>Delivered</strong>. 
                  Always record the <strong>Paid Amount</strong> and <strong>Remarks</strong> (e.g., bKash Trx ID) for your records.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl">02</div>
                <h3 className="text-xl font-bold tracking-tighter uppercase">Product Inventory</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Add new products with multiple images and variants. Variants allow you to track stock for different <strong>Sizes</strong> and <strong>Colors</strong>. 
                  Low stock alerts will appear on the dashboard.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl">03</div>
                <h3 className="text-xl font-bold tracking-tighter uppercase">Email Setup (cPanel)</h3>
                <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                  <p>If your email is managed through a hosting dashboard like cPanel:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Log in to your cPanel dashboard.</li>
                    <li>Look for the <strong>Email Accounts</strong> icon.</li>
                    <li>Find your email and click <strong>Connect Devices</strong>.</li>
                    <li>Look for <strong>Mail Client Manual Settings</strong>.</li>
                    <li>Commonly, the host is <code>mail.yourdomain.com</code>.</li>
                  </ol>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl">04</div>
                <h3 className="text-xl font-bold tracking-tighter uppercase">Discounts & Promos</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Set <strong>Bulk Discount Rules</strong> (e.g., 5+ items = 5% off) which apply automatically. 
                  Create <strong>Promo Codes</strong> for marketing campaigns.
                </p>
              </div>
            </div>

            <div className="bg-black text-white p-12 rounded-[40px] space-y-6">
              <h3 className="text-3xl font-bold tracking-tighter uppercase">Pro Tips</h3>
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start">
                  <span className="text-white font-bold mr-3">•</span>
                  <span><strong>Slugs:</strong> Always use lowercase and hyphens for slugs (e.g., <code>my-new-product</code>).</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white font-bold mr-3">•</span>
                  <span><strong>Images:</strong> Use high-quality JPG or PNG images. You can upload files or paste direct URLs.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-white font-bold mr-3">•</span>
                  <span><strong>Security:</strong> Never share your Master Admin password. Block suspicious users immediately.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold tracking-tighter">MY PROFILE</h2>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Name</label>
                  <div className="text-lg font-bold">{user?.name}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</label>
                  <div className="text-lg font-bold">{user?.email}</div>
                </div>
              </div>
              
              <div className="pt-8 border-t border-gray-100">
                <h3 className="text-lg font-bold tracking-tighter mb-6">CHANGE PASSWORD</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const target = e.target as any;
                  const currentPassword = target.currentPassword.value;
                  const newPassword = target.newPassword.value;
                  const confirmPassword = target.confirmPassword.value;

                  if (newPassword !== confirmPassword) {
                    setErrorMessage("Passwords do not match");
                    return;
                  }

                  try {
                    const res = await fetch('/api/user/change-password', {
                      method: 'PATCH',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ currentPassword, newPassword })
                    });
                    if (res.ok) {
                      setSuccessMessage("Password updated successfully");
                      target.reset();
                    } else {
                      const data = await res.json();
                      setErrorMessage(data.error || "Failed to update password");
                    }
                  } catch (err) {
                    setErrorMessage("An error occurred");
                  }
                }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Password</label>
                    <input name="currentPassword" type="password" required className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">New Password</label>
                    <input name="newPassword" type="password" required className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Confirm New Password</label>
                    <input name="confirmPassword" type="password" required className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none" />
                  </div>
                  <button type="submit" className="px-8 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-900 transition-all">
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'discounts' && (
          <div className="space-y-12">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tighter">BULK DISCOUNT RULES</h2>
                <button 
                  onClick={() => openModal('discount-rule')}
                  className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center"
                >
                  <Plus size={18} className="mr-2" /> Add Rule
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Min Quantity</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Discount %</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {discountRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold">{rule.min_quantity} Units</td>
                        <td className="px-6 py-4 text-sm font-bold text-green-600">{rule.discount_percentage}% OFF</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${rule.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openModal('discount-rule', rule)}
                              className="p-2 text-gray-400 hover:text-black"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete('discount-rule', rule.id, rule.name)}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tighter">PROMO CODES</h2>
                <button 
                  onClick={() => openModal('promo-code')}
                  className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest flex items-center"
                >
                  <Plus size={18} className="mr-2" /> Add Promo Code
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Code</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Discount</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Min Order</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Usage</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Expires</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {promoCodes.map(promo => (
                      <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold font-mono">{promo.code}</td>
                        <td className="px-6 py-4 text-sm font-bold text-green-600">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatPrice(promo.discount_value)} OFF
                        </td>
                        <td className="px-6 py-4 text-sm">{formatPrice(promo.min_order_amount)}</td>
                        <td className="px-6 py-4 text-sm">
                          {promo.used_count} / {promo.usage_limit || '∞'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${promo.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openModal('promo-code', promo)}
                              className="p-2 text-gray-400 hover:text-black"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete('promo-code', promo.id, promo.code)}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 bg-gray-100 rounded-2xl border border-gray-200">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-2">How it works</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Bulk discount rules apply automatically to the cart based on the total quantity of items. 
                Promo codes are applied manually by the customer in the cart.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold tracking-tighter uppercase">
                {editingItem ? 'Edit' : 'Add'} {modalType}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-auto p-8 space-y-6">
              {modalType === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone Number</label>
                    <input 
                      type="text" 
                      required
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email || ''} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Account Status</label>
                    <select 
                      value={formData.status || 'active'} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  {!editingItem && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Password</label>
                      <input 
                        type="password" 
                        required
                        value={formData.password || ''} 
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                  )}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Permissions</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      {['products', 'orders', 'users', 'categories', 'banners', 'settings', 'pages'].map(p => (
                        <label key={p} className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={formData.permissions?.includes(p)}
                            onChange={e => {
                              const perms = formData.permissions || [];
                              if (e.target.checked) {
                                setFormData({...formData, permissions: [...perms, p]});
                              } else {
                                setFormData({...formData, permissions: perms.filter((x: string) => x !== p)});
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                          />
                          <span className="text-xs uppercase font-bold tracking-widest">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'mail-all' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SMTP Host</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. mail.example.com"
                        value={formData.SMTP_HOST || ''} 
                        onChange={e => setFormData({...formData, SMTP_HOST: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SMTP Port</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. 587 or 465"
                        value={formData.SMTP_PORT || ''} 
                        onChange={e => setFormData({...formData, SMTP_PORT: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SMTP User / Email</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. info@example.com"
                        value={formData.SMTP_USER || ''} 
                        onChange={e => setFormData({...formData, SMTP_USER: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SMTP Password</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.SMTP_PASS || ''} 
                          onChange={e => setFormData({...formData, SMTP_PASS: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none pr-12"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sender Email (From)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. FIT MY FABRICS <info@example.com>"
                        value={formData.SMTP_FROM || ''} 
                        onChange={e => setFormData({...formData, SMTP_FROM: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                      />
                      <p className="text-[10px] text-gray-400 italic">This is the email address that will appear as the sender.</p>
                    </div>
                  </div>
                </div>
              )}

              {(modalType === 'setting' || modalType === 'mail') && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Setting Key</label>
                    <input 
                      type="text" 
                      readOnly={!!editingItem}
                      value={formData.key || ''} 
                      onChange={e => setFormData({...formData, key: e.target.value.toUpperCase()})}
                      placeholder="e.g. SMTP_HOST"
                      className={`w-full px-4 py-3 rounded-xl border-none outline-none uppercase font-bold tracking-widest ${editingItem ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-black'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Value</label>
                    {formData.key === 'site_logo' ? (
                      <div className="space-y-4">
                        {formData.value && (
                          <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                            <img src={formData.value} alt="Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="flex flex-col space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase font-bold">Upload Image (1:1 Resolution Recommended)</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setFormData({ ...formData, value: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                          />
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Or enter URL:</span>
                            <input 
                              type="text"
                              value={formData.value || ''}
                              onChange={e => setFormData({...formData, value: e.target.value})}
                              placeholder="https://example.com/logo.png"
                              className="flex-1 px-4 py-2 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-black outline-none text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ) : formData.key === 'site_logo_height' ? (
                      <div className="space-y-2">
                        <input 
                          type="number"
                          required
                          value={formData.value || ''} 
                          onChange={e => setFormData({...formData, value: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                        <p className="text-[10px] text-gray-400 italic">Height in pixels (e.g. 40)</p>
                      </div>
                    ) : formData.key === 'show_logo_and_name' ? (
                      <select 
                        value={formData.value || '0'} 
                        onChange={e => setFormData({...formData, value: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                      >
                        <option value="0">Show Logo Only (if set)</option>
                        <option value="1">Show Logo and Name (Side-by-Side)</option>
                      </select>
                    ) : formData.key === 'SMTP_PASS' ? (
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.value || ''} 
                          onChange={e => setFormData({...formData, value: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none pr-12"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    ) : (
                      <textarea 
                        rows={5}
                        required
                        value={formData.value || ''} 
                        onChange={e => setFormData({...formData, value: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none resize-none"
                      />
                    )}
                  </div>
                </div>
              )}

              {modalType === 'page' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Page Title</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title || ''} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Content (Markdown Supported)</label>
                    <textarea 
                      rows={15}
                      required
                      value={formData.content || ''} 
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {modalType === 'customer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone Number</label>
                    <input 
                      type="text" 
                      required
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email || ''} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Account Status</label>
                    <select 
                      value={formData.status || 'active'} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Delivery Address</label>
                    <textarea 
                      rows={3}
                      value={formData.address || ''} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {modalType === 'category' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Slug</label>
                    <input 
                      type="text" 
                      required
                      value={formData.slug || ''} 
                      onChange={e => setFormData({...formData, slug: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category Image</label>
                    <div className="flex items-center space-x-4">
                      {formData.image_url ? (
                        <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                          <img src={formData.image_url} alt="Category" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : null}
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, image_url: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                        />
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Or enter URL:</span>
                          <input 
                            type="text"
                            value={formData.image_url || ''}
                            onChange={e => setFormData({...formData, image_url: e.target.value})}
                            placeholder="https://example.com/image.png"
                            className="flex-1 px-4 py-2 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-black outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="is_featured"
                      checked={formData.is_featured || false} 
                      onChange={e => setFormData({...formData, is_featured: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <label htmlFor="is_featured" className="text-sm font-bold uppercase tracking-widest">Featured Category</label>
                  </div>
                </div>
              )}

              {modalType === 'banner' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Title</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title || ''} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Subtitle</label>
                    <input 
                      type="text" 
                      value={formData.subtitle || ''} 
                      onChange={e => setFormData({...formData, subtitle: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Banner Image</label>
                    <div className="flex items-center space-x-4">
                      {formData.image_url ? (
                        <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                          <img src={formData.image_url} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : null}
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, image_url: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                        />
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Or enter URL:</span>
                          <input 
                            type="text"
                            value={formData.image_url || ''}
                            onChange={e => setFormData({...formData, image_url: e.target.value})}
                            placeholder="https://example.com/banner.png"
                            className="flex-1 px-4 py-2 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-black outline-none text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Link URL</label>
                    <input 
                      type="text" 
                      value={formData.link_url || ''} 
                      onChange={e => setFormData({...formData, link_url: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Button Text</label>
                    <input 
                      type="text" 
                      value={formData.button_text || ''} 
                      onChange={e => setFormData({...formData, button_text: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Background Color</label>
                    <div className="flex space-x-2">
                      <input 
                        type="color" 
                        value={formData.background_color || '#000000'} 
                        onChange={e => setFormData({...formData, background_color: e.target.value})}
                        className="w-12 h-12 rounded-xl border-none outline-none cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={formData.background_color || ''} 
                        onChange={e => setFormData({...formData, background_color: e.target.value})}
                        className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Priority</label>
                    <input 
                      type="number" 
                      value={formData.priority || 0} 
                      onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="is_active_banner"
                      checked={formData.is_active || false} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <label htmlFor="is_active_banner" className="text-sm font-bold uppercase tracking-widest">Active Banner</label>
                  </div>
                </div>
              )}

              {modalType === 'discount-rule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Minimum Quantity</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={formData.min_quantity || 1} 
                      onChange={e => setFormData({...formData, min_quantity: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Discount Percentage (%)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      max="100"
                      value={formData.discount_percentage || 0} 
                      onChange={e => setFormData({...formData, discount_percentage: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="is_active_rule"
                      checked={formData.is_active || false} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <label htmlFor="is_active_rule" className="text-sm font-bold uppercase tracking-widest">Active Rule</label>
                  </div>
                </div>
              )}

              {modalType === 'promo-code' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Promo Code</label>
                    <input 
                      type="text" 
                      required
                      placeholder="E.G. SUMMER20"
                      value={formData.code || ''} 
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Discount Type</label>
                    <select 
                      value={formData.discount_type || 'percentage'} 
                      onChange={e => setFormData({...formData, discount_type: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Discount Value</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={formData.discount_value || 0} 
                      onChange={e => setFormData({...formData, discount_value: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Min Order Amount</label>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.min_order_amount || 0} 
                      onChange={e => setFormData({...formData, min_order_amount: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Max Discount Amount (Optional)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.max_discount_amount || ''} 
                      onChange={e => setFormData({...formData, max_discount_amount: e.target.value ? parseFloat(e.target.value) : ''})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Usage Limit (Optional)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={formData.usage_limit || ''} 
                      onChange={e => setFormData({...formData, usage_limit: e.target.value ? parseInt(e.target.value) : ''})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Expiry Date (Optional)</label>
                    <input 
                      type="date" 
                      value={formData.expires_at ? formData.expires_at.split('T')[0] : ''} 
                      onChange={e => setFormData({...formData, expires_at: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="is_active_promo"
                      checked={formData.is_active || false} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <label htmlFor="is_active_promo" className="text-sm font-bold uppercase tracking-widest">Active Code</label>
                  </div>
                </div>
              )}

              {modalType === 'product' && (
                <div className="space-y-12">
                  {/* 1. Basic Product Identity */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest border-b border-gray-100 pb-2">1. Basic Product Identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Product Name</label>
                        <input 
                          type="text" 
                          required
                          value={formData.name || ''} 
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SKU (Stock Keeping Unit)</label>
                        <input 
                          type="text" 
                          required
                          value={formData.sku || ''} 
                          onChange={e => setFormData({...formData, sku: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Slug</label>
                        <input 
                          type="text" 
                          required
                          value={formData.slug || ''} 
                          onChange={e => setFormData({...formData, slug: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Color Name (e.g. Navy Blue)</label>
                        <input 
                          type="text" 
                          value={formData.color || 'Default'} 
                          onChange={e => {
                            const newColor = e.target.value;
                            setFormData({
                              ...formData, 
                              color: newColor,
                              variants: (formData.variants || []).map((v: any) => ({ ...v, color: newColor }))
                            });
                          }}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Color Code</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="color" 
                            value={formData.color_code || '#000000'} 
                            onChange={e => {
                              const newCode = e.target.value;
                              setFormData({
                                ...formData, 
                                color_code: newCode,
                                variants: (formData.variants || []).map((v: any) => ({ ...v, color_code: newCode }))
                              });
                            }}
                            className="w-12 h-12 bg-transparent border-none cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={formData.color_code || '#000000'} 
                            onChange={e => {
                              const newCode = e.target.value;
                              setFormData({
                                ...formData, 
                                color_code: newCode,
                                variants: (formData.variants || []).map((v: any) => ({ ...v, color_code: newCode }))
                              });
                            }}
                            className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</label>
                        <select 
                          required
                          value={formData.category_id || ''} 
                          onChange={e => setFormData({...formData, category_id: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        >
                          <option value="">Select Category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</label>
                        <textarea 
                          rows={4}
                          required
                          value={formData.description || ''} 
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Physical & Fabric Specifications */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest border-b border-gray-100 pb-2">2. Physical & Fabric Specifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">GSM (Grams per Square Meter)</label>
                        <input 
                          type="text" 
                          value={formData.gsm || ''} 
                          onChange={e => setFormData({...formData, gsm: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Material Composition</label>
                        <input 
                          type="text" 
                          value={formData.material_composition || ''} 
                          onChange={e => setFormData({...formData, material_composition: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fit Type</label>
                        <select 
                          value={formData.fit_type || 'Regular Fit'} 
                          onChange={e => setFormData({...formData, fit_type: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        >
                          <option value="Slim Fit">Slim Fit</option>
                          <option value="Regular Fit">Regular Fit</option>
                          <option value="Oversized">Oversized</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Weight</label>
                        <input 
                          type="text" 
                          value={formData.weight || ''} 
                          onChange={e => setFormData({...formData, weight: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Visuals & Media */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest border-b border-gray-100 pb-2">3. Visuals & Media</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Primary Image</label>
                        <div className="flex items-center space-x-4">
                          {formData.images?.find((img: any) => img.is_main)?.image_url ? (
                            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                              <img src={formData.images.find((img: any) => img.is_main).image_url} alt="Primary" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : null}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const newImages = [...(formData.images || [])];
                                  const mainIdx = newImages.findIndex(img => img.is_main);
                                  if (mainIdx >= 0) {
                                    newImages[mainIdx].image_url = reader.result as string;
                                  } else {
                                    newImages.push({ image_url: reader.result as string, is_main: true });
                                  }
                                  setFormData({ ...formData, images: newImages });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gallery Images</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {formData.images?.filter((img: any) => !img.is_main).map((img: any, idx: number) => (
                            <div key={idx} className="relative group aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                              {img.image_url ? (
                                <img src={img.image_url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Package size={24} className="text-gray-300" />
                              )}
                              <button 
                                type="button"
                                onClick={() => {
                                  const newImages = formData.images.filter((_: any, i: number) => {
                                    const actualIdx = formData.images.findIndex((img: any) => !img.is_main && formData.images.indexOf(img) === i);
                                    return i !== formData.images.indexOf(img);
                                  });
                                  setFormData({...formData, images: newImages});
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <label className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                            <Plus size={24} className="text-gray-400 mb-1" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Add Image</span>
                            <input 
                              type="file" 
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                files.forEach((file: File) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      images: [...(prev.images || []), { image_url: reader.result as string, is_main: false }]
                                    }));
                                  };
                                  reader.readAsDataURL(file);
                                });
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Pricing & Inventory */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest border-b border-gray-100 pb-2">4. Pricing & Inventory</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Base Price</label>
                        <input 
                          type="number" 
                          required
                          value={formData.base_price || 0} 
                          onChange={e => setFormData({...formData, base_price: parseFloat(e.target.value)})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cost Price (Admin Only)</label>
                        <input 
                          type="number" 
                          value={formData.cost_price || 0} 
                          onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value)})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Discount/Sale Price</label>
                        <input 
                          type="number" 
                          value={formData.discount_price || 0} 
                          onChange={e => setFormData({...formData, discount_price: parseFloat(e.target.value)})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Stock Quantity (Auto-calculated)</label>
                        <div className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold">
                          {(formData.variants || []).reduce((sum: number, v: any) => sum + (parseInt(v.stock_quantity) || 0), 0)} pcs
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Low Stock Alert</label>
                        <input 
                          type="number" 
                          required
                          value={formData.low_stock_alert || 10} 
                          onChange={e => setFormData({...formData, low_stock_alert: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Inventory by Size */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-widest border-b border-gray-100 pb-2">5. Inventory by Size</h4>
                    <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                      <div className="grid grid-cols-4 gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">
                        <div>Size</div>
                        <div>Current Stock</div>
                        <div>Add New Stock</div>
                        <div>Result</div>
                      </div>
                      <div className="space-y-3">
                        {['S', 'M', 'L', 'XL', 'XXL'].map(size => {
                          const variant = (formData.variants || []).find((v: any) => v.size === size) || { size, stock_quantity: 0 };
                          const additionKey = `add_${size}`;
                          const addition = formData[additionKey] || 0;
                          
                          return (
                            <div key={size} className="grid grid-cols-4 gap-4 items-center bg-white p-3 rounded-xl border border-gray-100">
                              <div className="font-bold">{size}</div>
                              <div className="text-sm text-gray-500">{variant.stock_quantity} pcs</div>
                              <div>
                                <input 
                                  type="number" 
                                  placeholder="0"
                                  className="w-full px-3 py-2 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-black outline-none text-sm"
                                  value={addition || ''}
                                  onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    setFormData({ ...formData, [additionKey]: val });
                                  }}
                                />
                              </div>
                              <div className="text-sm font-bold text-black">
                                {variant.stock_quantity + addition} pcs
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-gray-400 italic mt-4">
                        * Enter positive numbers to add stock, or negative numbers to reduce stock. 
                        Total stock will be updated automatically upon saving.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-6 border-t border-gray-100 flex justify-end space-x-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-900 transition-all"
                >
                  Save {modalType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl text-center space-y-6"
          >
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tighter uppercase">Confirm Deletion</h3>
              <p className="text-gray-500 text-sm">
                Are you sure you want to delete this <span className="font-bold text-black">{deleteConfirm.type}</span>
                {deleteConfirm.name && <span>: <span className="font-bold text-black">{deleteConfirm.name}</span></span>}? 
                This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-gray-100 transition-all border border-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 px-8 py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-200"
              >
                Yes, Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

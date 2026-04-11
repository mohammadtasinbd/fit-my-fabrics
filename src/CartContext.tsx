import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant } from './types';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  discountPercentage: number;
  promoCode: any | null;
  applyPromoCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  removePromoCode: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [discountRules, setDiscountRules] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState<any | null>(() => {
    const saved = localStorage.getItem('promoCode');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('promoCode', JSON.stringify(promoCode));
  }, [promoCode]);

  useEffect(() => {
    const fetchDiscountRules = async () => {
      try {
        const rulesSnapshot = await getDocs(collection(db, 'bulk_discount_rules'));
        const rulesData = rulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDiscountRules(rulesData.filter((r: any) => r.is_active).sort((a: any, b: any) => a.min_quantity - b.min_quantity));
      } catch (err) {
        console.error('Error fetching discount rules from Firestore:', err);
      }
    };
    fetchDiscountRules();
  }, []);

  const addToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.variant.id === variant.id);
      if (existing) {
        return prev.map(item => 
          item.variant.id === variant.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, variant, quantity }];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    setCart(prev => prev.map(item => 
      item.variant.id === variantId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode(null);
  };

  const applyPromoCode = async (code: string) => {
    try {
      const res = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderAmount: subtotal })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Invalid JSON from /api/promo-codes/validate:', text);
        return { success: false, error: 'Server returned an invalid response' };
      }
      
      if (res.ok && data.success) {
        setPromoCode(data);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid promo code' };
      }
    } catch (err) {
      return { success: false, error: 'Failed to validate promo code' };
    }
  };

  const removePromoCode = () => setPromoCode(null);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => {
    const price = item.product.discount_price || item.product.base_price;
    return sum + (price + item.variant.additional_price) * item.quantity;
  }, 0);

  const applicableRule = [...discountRules].reverse().find(r => totalItems >= r.min_quantity);
  const discountPercentage = applicableRule ? applicableRule.discount_percentage : 0;
  const bulkDiscountAmount = (subtotal * discountPercentage) / 100;
  
  let promoDiscountAmount = 0;
  if (promoCode) {
    if (promoCode.discount_type === 'percentage') {
      promoDiscountAmount = (subtotal * promoCode.discount_value) / 100;
    } else {
      promoDiscountAmount = promoCode.discount_value;
    }
  }

  const discountAmount = bulkDiscountAmount + promoDiscountAmount;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      totalItems, 
      subtotal,
      discountAmount,
      totalAmount,
      discountPercentage,
      promoCode,
      applyPromoCode,
      removePromoCode
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}

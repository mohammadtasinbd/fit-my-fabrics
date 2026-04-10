export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  role: 'customer' | 'admin';
  is_master?: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  image_url: string;
  is_featured: boolean;
}

export interface ProductImage {
  id: number;
  product_id: string;
  image_url: string;
  is_main: boolean;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  color_code: string;
  sku: string;
  stock_quantity: number;
  additional_price: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category_id: number;
  category_name: string;
  description: string;
  gsm: string;
  material_composition: string;
  fit_type: string;
  weight: string;
  base_price: number;
  cost_price: number;
  discount_price: number | null;
  stock_quantity: number;
  low_stock_alert: number;
  is_active: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  created_at: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface DiscountRule {
  id: number;
  min_quantity: number;
  discount_percentage: number;
  is_active: boolean;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_text: string;
  background_color: string;
  is_active: boolean;
  priority: number;
}

export interface ShippingRule {
  id: number;
  zone_name: string;
  base_charge: number;
  free_delivery_threshold: number | null;
  estimated_days: string;
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

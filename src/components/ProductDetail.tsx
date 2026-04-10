import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Product, ProductVariant } from '../types';
import { formatPrice } from '../lib/utils';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { ShoppingBag, Heart, Share2, ChevronRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

export function ProductDetail() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [discountRules, setDiscountRules] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Product by slug
        const productsSnapshot = await getDocs(query(collection(db, 'products'), where('slug', '==', slug), limit(1)));
        if (productsSnapshot.empty) return;
        
        const productDoc = productsSnapshot.docs[0];
        const p = { id: productDoc.id, ...productDoc.data() } as Product;

        // Fetch images and variants
        const imagesSnapshot = await getDocs(query(collection(db, `products/${productDoc.id}/images`), orderBy('display_order', 'asc')));
        const variantsSnapshot = await getDocs(collection(db, `products/${productDoc.id}/variants`));
        
        const productData = {
          ...p,
          images: imagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[],
          variants: variantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
        };

        setProduct(productData);
        const mainImg = productData.images.find((img: any) => img.is_main)?.image_url || productData.images[0]?.image_url;
        setSelectedImage(mainImg || null);
        if (productData.variants.length > 0) {
          setSelectedVariant(productData.variants[0]);
        }

        // Fetch discount rules
        const rulesSnapshot = await getDocs(collection(db, 'bulk_discount_rules'));
        const rulesData = rulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDiscountRules(rulesData.filter((r: any) => r.is_active).sort((a: any, b: any) => a.min_quantity - b.min_quantity));
      } catch (err) {
        console.error('Error fetching product details:', err);
      }
    };
    fetchData();
  }, [slug]);

  if (!product) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  const handleAddToCart = () => {
    if (selectedVariant) {
      addToCart(product, selectedVariant, quantity);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const currentPrice = (product.discount_price || product.base_price) + (selectedVariant?.additional_price || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs uppercase tracking-widest text-gray-400 mb-12">
        <Link to="/" className="hover:text-black">Home</Link>
        <ChevronRight size={12} />
        <Link to={`/category/${product.category_name.toLowerCase()}`} className="hover:text-black">{product.category_name}</Link>
        <ChevronRight size={12} />
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-gray-100 flex items-center justify-center">
            {selectedImage ? (
              <img 
                src={selectedImage} 
                alt={product.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <ShoppingBag size={48} className="text-gray-300" />
            )}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images.map((img) => (
              <button 
                key={img.id}
                onClick={() => setSelectedImage(img.image_url)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center ${selectedImage === img.image_url ? 'border-black' : 'border-transparent'}`}
              >
                {img.image_url ? (
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ShoppingBag size={16} className="text-gray-300" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter mb-4">{product.name}</h1>
            <div className="flex items-center space-x-4 mb-6">
              <span className="text-2xl font-bold">{formatPrice(currentPrice)}</span>
              {product.discount_price && (
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.base_price + (selectedVariant?.additional_price || 0))}</span>
              )}
            </div>
            <p className="text-gray-600 leading-relaxed">{product.short_description}</p>
          </div>

          {/* Variants */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Select Size</h3>
              <div className="flex flex-wrap gap-3">
                {Array.from(new Set(product.variants.map(v => v.size))).map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedVariant(product.variants.find(v => v.size === size) || null)}
                    className={`px-6 py-2 border rounded-full text-sm font-medium transition-all ${selectedVariant?.size === size ? 'bg-black text-white border-black' : 'hover:border-black'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Color</h3>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-200" 
                    style={{ backgroundColor: product.variants[0]?.color_code || '#000' }} 
                  />
                  <span className="text-sm font-medium">{product.variants[0]?.color || 'Default'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4 pt-6">
            {(() => {
              const applicableRule = [...discountRules].reverse().find(r => quantity >= r.min_quantity);
              const nextRule = discountRules.find(r => quantity < r.min_quantity);
              
              return (
                <>
                  {applicableRule && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center justify-between"
                    >
                      <span>🔥 BULK DISCOUNT APPLIED!</span>
                      <span>{applicableRule.discount_percentage}% OFF</span>
                    </motion.div>
                  )}
                  {nextRule && (
                    <p className="text-xs text-gray-400 font-medium italic">
                      Add {nextRule.min_quantity - quantity} more pieces to unlock a {nextRule.discount_percentage}% bulk discount!
                    </p>
                  )}
                </>
              );
            })()}
            <div className="flex space-x-4">
              <div className="flex items-center border border-gray-200 rounded-full px-4">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2">-</button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="p-2">+</button>
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.stock_quantity === 0 || user?.role === 'admin'}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-all ${isAdded ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed'}`}
              >
                {isAdded ? (
                  <><Check size={18} /> <span>Added to Cart</span></>
                ) : user?.role === 'admin' ? (
                  <span>Admin View Only</span>
                ) : selectedVariant?.stock_quantity === 0 ? (
                  <span>Out of Stock</span>
                ) : (
                  <><ShoppingBag size={18} /> <span>Add to Cart</span></>
                )}
              </button>
              <button className="p-4 border border-gray-200 rounded-full hover:border-black transition-colors">
                <Heart size={20} />
              </button>
            </div>
          </div>

          {/* Details Tabs */}
          <div className="border-t border-gray-100 pt-8 space-y-6">
            <details className="group" open>
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <span className="text-xs font-bold uppercase tracking-widest">Description</span>
                <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-4 text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            </details>
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <span className="text-xs font-bold uppercase tracking-widest">Fabric & Care</span>
                <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-4 text-sm text-gray-500 leading-relaxed space-y-2">
                {product.gsm && <p><strong>GSM:</strong> {product.gsm}</p>}
                {product.material_composition && <p><strong>Material:</strong> {product.material_composition}</p>}
                {product.fit_type && <p><strong>Fit:</strong> {product.fit_type}</p>}
                {product.weight && <p><strong>Weight:</strong> {product.weight}</p>}
                <div className="pt-2">{product.fabric_details}</div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

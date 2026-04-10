import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Banner, Product, Category } from '../types';
import { formatPrice } from '../lib/utils';
import { db } from '../firebase';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

export function Home() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Banners
        const bannersSnapshot = await getDocs(query(collection(db, 'hero_banners'), where('is_active', '==', true), orderBy('priority', 'asc')));
        const bannersData = bannersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Banner));
        setBanners(bannersData);

        // Fetch Featured Products (Best Sellers)
        const productsSnapshot = await getDocs(query(collection(db, 'products'), where('is_active', '==', true), where('is_best_seller', '==', true), limit(8)));
        const productsData = await Promise.all(productsSnapshot.docs.map(async (doc) => {
          const p = { id: doc.id, ...doc.data() } as Product;
          const imagesSnapshot = await getDocs(query(collection(db, `products/${doc.id}/images`), orderBy('display_order', 'asc')));
          const variantsSnapshot = await getDocs(collection(db, `products/${doc.id}/variants`));
          return {
            ...p,
            images: imagesSnapshot.docs.map(imgDoc => ({ id: imgDoc.id, ...imgDoc.data() })),
            variants: variantsSnapshot.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() }))
          };
        }));
        setFeaturedProducts(productsData);

        // Fetch New Arrivals
        const newArrivalsSnapshot = await getDocs(query(collection(db, 'products'), where('is_active', '==', true), where('is_new_arrival', '==', true), limit(8)));
        const newArrivalsData = await Promise.all(newArrivalsSnapshot.docs.map(async (doc) => {
          const p = { id: doc.id, ...doc.data() } as Product;
          const imagesSnapshot = await getDocs(query(collection(db, `products/${doc.id}/images`), orderBy('display_order', 'asc')));
          const variantsSnapshot = await getDocs(collection(db, `products/${doc.id}/variants`));
          return {
            ...p,
            images: imagesSnapshot.docs.map(imgDoc => ({ id: imgDoc.id, ...imgDoc.data() })),
            variants: variantsSnapshot.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() }))
          };
        }));
        setNewArrivals(newArrivalsData);

        // Fetch Categories
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Category));
        const order = ['polo', 'round-neck', 'others'];
        const sorted = categoriesData.sort((a, b) => {
          const idxA = order.indexOf(a.slug);
          const idxB = order.indexOf(b.slug);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
        setCategories(sorted);
      } catch (error) {
        console.error("Error fetching home data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Slider */}
      <section className="relative h-[80vh] overflow-hidden bg-gray-100">
        {banners.length > 0 ? banners.map((banner, idx) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: idx === currentBanner ? 1 : 0,
              zIndex: idx === currentBanner ? 10 : 0
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {banner.image_url ? (
              <motion.img 
                src={banner.image_url} 
                alt={banner.title || 'Banner'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                initial={{ scale: 1.2 }}
                animate={{ scale: idx === currentBanner ? 1 : 1.2 }}
                transition={{ duration: 6, ease: "easeOut" }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <ArrowRight size={48} className="text-gray-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center text-center px-4" style={{ backgroundColor: `${banner.background_color}44` }}>
              <div className="max-w-4xl">
                {banner.title && (
                  <motion.h1 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: idx === currentBanner ? 0 : 50, opacity: idx === currentBanner ? 1 : 0 }}
                    transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                    className="text-6xl md:text-8xl font-bold text-white tracking-tighter mb-8"
                  >
                    {banner.title}
                  </motion.h1>
                )}
                {banner.subtitle && (
                  <motion.p 
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: idx === currentBanner ? 0 : 30, opacity: idx === currentBanner ? 1 : 0 }}
                    transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                    className="text-xl md:text-2xl text-white/90 mb-10 font-light tracking-wide"
                  >
                    {banner.subtitle}
                  </motion.p>
                )}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: idx === currentBanner ? 0 : 30, opacity: idx === currentBanner ? 1 : 0 }}
                  transition={{ delay: 1.1, duration: 1, ease: "easeOut" }}
                >
                  <Link 
                    to={banner.link_url}
                    className="inline-flex items-center px-10 py-5 bg-white text-black font-bold text-sm uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all rounded-full shadow-2xl"
                  >
                    {banner.button_text || 'Shop Now'} <ArrowRight size={20} className="ml-3" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Banners...</p>
            </div>
          </div>
        )}
        
        {banners.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentBanner ? 'bg-white w-8' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Bulk Order Offer Section */}
      <section className="bg-red-600 py-12 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
          <span className="text-[20vw] font-black text-white whitespace-nowrap">BULK OFFER • BULK OFFER • BULK OFFER</span>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-white">
            <div className="text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 italic">BIGGER ORDER, BIGGER DISCOUNT!</h2>
              <p className="text-lg md:text-xl font-medium text-red-100">Order 5+ pieces and get a discount equal to your quantity (up to 20%)!</p>
            </div>
            <Link to="/shop" className="bg-white text-red-600 px-10 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-xl">
              Shop Bulk Now
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tighter">SHOP BY CATEGORY</h2>
            <p className="text-gray-500 mt-2">Curated collections for every occasion</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.filter(c => c.is_featured).map((category) => (
            <Link 
              key={category.id} 
              to={`/category/${category.slug}`}
              className="group relative h-[400px] overflow-hidden rounded-2xl bg-gray-100"
            >
              {category.image_url ? (
                <img 
                  src={category.image_url} 
                  alt={category.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <ArrowRight size={32} className="text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8">
                <h3 className="text-2xl font-bold text-white tracking-tight mb-2">{category.name}</h3>
                <span className="text-sm font-bold text-white/80 uppercase tracking-widest flex items-center group-hover:text-white transition-colors">
                  Explore <ArrowRight size={16} className="ml-2" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Best Sellers */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter">BEST SELLERS</h2>
              <p className="text-gray-500 mt-2">Most loved pieces from our community</p>
            </div>
            <Link to="/shop" className="text-sm font-bold uppercase tracking-widest hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {featuredProducts.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter">NEW ARRIVALS</h2>
              <p className="text-gray-500 mt-2">Fresh drops just for you</p>
            </div>
            <Link to="/shop" className="text-sm font-bold uppercase tracking-widest hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {newArrivals.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Brand Values */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🇧🇩</span>
              </div>
              <h3 className="text-lg font-bold mb-4">MADE IN BANGLADESH</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Supporting local artisans and ethical manufacturing in the heart of Dhaka.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-lg font-bold mb-4">PREMIUM QUALITY</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Using only the finest fabrics sourced sustainably for long-lasting wear.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="text-lg font-bold mb-4">FAST DELIVERY</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Nationwide shipping with 24-48 hour delivery within Dhaka city.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images.find(img => img.is_main)?.image_url || product.images[0]?.image_url;
  
  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-gray-100 mb-4 flex items-center justify-center">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <ArrowRight size={32} className="text-gray-200" />
        )}
        {product.discount_price && (
          <span className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">
            Sale
          </span>
        )}
        {product.is_new_arrival && (
          <span className="absolute top-4 right-4 bg-white text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm">
            New
          </span>
        )}
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-black text-white text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-[0.2em] shadow-xl">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1 group-hover:underline">{product.name}</h3>
      <p className="text-xs text-gray-500 mb-2">{product.category_name}</p>
      <div className="flex items-center space-x-2">
        {product.discount_price ? (
          <>
            <span className="text-sm font-bold text-black">{formatPrice(product.discount_price)}</span>
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.base_price)}</span>
          </>
        ) : (
          <span className="text-sm font-bold text-black">{formatPrice(product.base_price)}</span>
        )}
      </div>
    </Link>
  );
}

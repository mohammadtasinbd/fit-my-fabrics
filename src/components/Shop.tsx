import React, { useEffect, useState } from 'react';
import { Product, Category } from '../types';
import { ProductCard } from './Home';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'categories'));
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Category)));
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, 'products'), where('is_active', '==', true));
        
        // Note: Firestore has limitations on multiple inequality filters and combined filters.
        // For simplicity and to avoid complex index requirements, we'll filter some things client-side if needed,
        // but let's try basic category filtering first.
        if (selectedCategory) {
          // We need the category ID, but the state stores the slug.
          const cat = categories.find(c => c.slug === selectedCategory);
          if (cat) {
            q = query(q, where('category_id', '==', cat.id));
          }
        }

        const snapshot = await getDocs(q);
        const productsData = await Promise.all(snapshot.docs.map(async (doc) => {
          const p = { id: doc.id, ...doc.data() } as Product;
          const imagesSnapshot = await getDocs(query(collection(db, `products/${doc.id}/images`), orderBy('display_order', 'asc')));
          const variantsSnapshot = await getDocs(collection(db, `products/${doc.id}/variants`));
          return {
            ...p,
            images: imagesSnapshot.docs.map(imgDoc => ({ id: imgDoc.id, ...imgDoc.data() })),
            variants: variantsSnapshot.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() }))
          };
        }));

        // Client-side filtering for search and price range
        let filtered = productsData.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                               p.description?.toLowerCase().includes(search.toLowerCase());
          const matchesPrice = p.base_price >= priceRange[0] && p.base_price <= priceRange[1];
          return matchesSearch && matchesPrice;
        });

        // Sorting
        if (sortBy === 'price-low') filtered.sort((a, b) => a.base_price - b.base_price);
        else if (sortBy === 'price-high') filtered.sort((a, b) => b.base_price - a.base_price);
        else filtered.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        setProducts(filtered);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, search, priceRange, sortBy, categories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">OUR COLLECTION</h1>
          <p className="text-gray-500 mt-2">Premium garments crafted for comfort and style.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-black outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Filters Sidebar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full lg:w-64 space-y-8"
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Categories</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setSelectedCategory('')}
                    className={`block text-sm font-medium transition-colors ${selectedCategory === '' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                  >
                    All Products
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`block text-sm font-medium transition-colors ${selectedCategory === cat.slug ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Price Range</h3>
                <div className="space-y-4">
                  <input 
                    type="range" 
                    min="0" 
                    max="5000" 
                    step="100"
                    className="w-full accent-black"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  />
                  <div className="flex justify-between text-sm font-bold">
                    <span>৳0</span>
                    <span>৳{priceRange[1]}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Sort By</h3>
                <select 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-black outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-100 rounded-xl mb-4" />
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl">
              <p className="text-gray-500 font-medium">No products found matching your criteria.</p>
              <button 
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setPriceRange([0, 10000]);
                }}
                className="mt-4 text-sm font-bold underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {products.map((product) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

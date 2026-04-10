import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Product } from '../types';
import { ShoppingBag, ArrowRight, Clock } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const isComingSoon = slug === 'women' || slug === 'accessories';

  useEffect(() => {
    if (isComingSoon) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Find category ID by slug
        const catSnapshot = await getDocs(query(collection(db, 'categories'), where('slug', '==', slug)));
        if (catSnapshot.empty) {
          setProducts([]);
          return;
        }
        
        const categoryId = catSnapshot.docs[0].id;
        const productsSnapshot = await getDocs(query(collection(db, 'products'), where('category_id', '==', categoryId), where('is_active', '==', true)));
        
        const productsData = await Promise.all(productsSnapshot.docs.map(async (doc) => {
          const p = { id: doc.id, ...doc.data() } as Product;
          const imagesSnapshot = await getDocs(query(collection(db, `products/${doc.id}/images`), orderBy('display_order', 'asc')));
          const variantsSnapshot = await getDocs(collection(db, `products/${doc.id}/variants`));
          return {
            ...p,
            images: imagesSnapshot.docs.map(imgDoc => ({ id: imgDoc.id, ...imgDoc.data() })) as any[],
            variants: variantsSnapshot.docs.map(vDoc => ({ id: vDoc.id, ...vDoc.data() })) as any[]
          };
        }));

        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [slug, isComingSoon]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (isComingSoon) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-full mb-8">
            <Clock size={40} />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 uppercase">
            {slug} Collection
          </h1>
          <p className="text-xl text-gray-500 mb-10 font-light leading-relaxed">
            We are currently handcrafting our finest pieces for the {slug} collection. 
            Something extraordinary is arriving soon.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/category/men"
              className="inline-flex items-center px-8 py-4 bg-black text-white font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all rounded-full"
            >
              Shop Men's Collection <ArrowRight size={18} className="ml-2" />
            </Link>
            <Link 
              to="/"
              className="inline-flex items-center px-8 py-4 border border-black text-black font-bold text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-all rounded-full"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tighter uppercase mb-4">{slug}</h1>
          <p className="text-gray-500 max-w-xl">
            Explore our curated selection of premium {slug}'s apparel, designed for comfort and style.
          </p>
        </div>
        <div className="text-sm font-medium text-gray-400 uppercase tracking-widest">
          {products.length} Products Found
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl">
          <p className="text-gray-400 italic">No products found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {products.map((product) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group"
            >
              <Link to={`/product/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-gray-100 mb-6 rounded-2xl flex items-center justify-center">
                {product.images.find(img => img.is_main)?.image_url || product.images[0]?.image_url ? (
                  <img 
                    src={product.images.find(img => img.is_main)?.image_url || product.images[0]?.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ShoppingBag size={32} className="text-gray-300" />
                )}
                {product.discount_price && (
                  <div className="absolute top-4 left-4 bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                    Sale
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
              </Link>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold uppercase tracking-tight">
                    <Link to={`/product/${product.slug}`} className="hover:underline underline-offset-4">
                      {product.name}
                    </Link>
                  </h3>
                  <div className="text-right">
                    {product.discount_price ? (
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold">৳{product.discount_price}</span>
                        <span className="text-[10px] text-gray-400 line-through">৳{product.base_price}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold">৳{product.base_price}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-1">{product.short_description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// ১. TypeScript-er jonno Fabric-er ekta structure (Interface) banano
interface Fabric {
  id: string;
  name: string;
  material: string;
  price_per_unit: number;
  stock_status: string;
}

function App() {
  // ২. Type-ta ekhane bole deya <Fabric[]>
  const [products, setProducts] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fabrics')
      .select('*');

    if (error) {
      console.error('Error:', error);
    } else {
      // Data ashole sheta products state-e set kora
      setProducts(data || []);
    }
    setLoading(false);
  }

  if (loading) return <div className="text-center p-10">Loading Fabrics...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Dacca Threads Collection</h1>
      
      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((item) => (
          <div key={item.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md transition">
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-600">Material: {item.material}</p>
            <p className="text-blue-600 font-bold mt-2">{item.price_per_unit} BDT</p>
            <div className={`mt-2 text-sm ${item.stock_status === 'In Stock' ? 'text-green-600' : 'text-red-500'}`}>
              {item.stock_status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

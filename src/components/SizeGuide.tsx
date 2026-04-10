import React from 'react';
import { motion } from 'motion/react';

export function SizeGuide() {
  const sizes = [
    { size: 'S', chest: '18" - 19"', length: '26"', sleeve: '7.5"' },
    { size: 'M', chest: '19" - 20"', length: '27"', sleeve: '8"' },
    { size: 'L', chest: '20" - 21"', length: '28"', sleeve: '8.5"' },
    { size: 'XL', chest: '21" - 22"', length: '29"', sleeve: '9"' },
    { size: 'XXL', chest: '22" - 23"', length: '30"', sleeve: '9.5"' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter uppercase mb-4">Size Guide</h1>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">Measurements are in inches and refer to the garment dimensions.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Size</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Chest (Half)</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Length</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-400">Sleeve Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sizes.map((s, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold">{s.size}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.chest}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.length}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.sleeve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 p-8 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest">How to Measure</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">Chest</p>
              <p className="text-sm text-gray-600">Measure across the chest, 1 inch below the armhole, while the garment is laid flat.</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">Length</p>
              <p className="text-sm text-gray-600">Measure from the highest point of the shoulder down to the bottom hem.</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400 mb-2">Sleeve</p>
              <p className="text-sm text-gray-600">Measure from the shoulder seam down to the end of the sleeve cuff.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Ei port-ta Supabase Authentication settings-eo mil thakte hobe
  }
})

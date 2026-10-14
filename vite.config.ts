import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('nuclear_detonations_database')) return 'data-detonations';
          if (id.includes('global_reactors_database')) return 'data-reactors';
          if (id.includes('global_incidents_register') || id.includes('historical_incidents_database')) return 'data-incidents';
          if (id.includes('all_nuclides') || id.includes('nuclides.json')) return 'data-nuclides';
          if (id.includes('node_modules/plotly.js') || id.includes('node_modules/react-plotly.js')) return 'vendor-plotly';
          if (id.includes('node_modules/katex') || id.includes('node_modules/react-katex')) return 'vendor-katex';
          if (id.includes('node_modules/reactflow') || id.includes('node_modules/@reactflow')) return 'vendor-reactflow';
        }
      }
    }
  }
})


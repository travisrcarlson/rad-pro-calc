import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rawBasePath = process.env.VITE_BASE_PATH || '/'
const normalizedBase = rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`

/**
 * Generates dist/precache-manifest.json at build completion so public/sw.js
 * can warm lazy-loaded module chunks in the background for 100% offline field operation.
 */
function radproOfflineManifestPlugin(): Plugin {
  return {
    name: 'radpro-offline-manifest',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir || path.resolve(__dirname, 'dist')
      const buildVersion = `v5-${Date.now().toString(36)}`
      const assets: string[] = []
      for (const fileName of Object.keys(bundle)) {
        if (/\.(js|css|woff2)$/i.test(fileName)) {
          assets.push(`${normalizedBase}${fileName.replace(/\\/g, '/')}`)
        }
      }
      fs.writeFileSync(
        path.join(outDir, 'precache-manifest.json'),
        JSON.stringify({ version: buildVersion, assets }, null, 2),
        'utf8'
      )
      const builtSwPath = path.join(outDir, 'sw.js')
      if (fs.existsSync(builtSwPath)) {
        const swContent = fs.readFileSync(builtSwPath, 'utf8')
        fs.writeFileSync(
          builtSwPath,
          swContent.replace('radpro-cache-v5', `radpro-cache-${buildVersion}`),
          'utf8'
        )
      }
      const builtIndexPath = path.join(outDir, 'index.html')
      if (fs.existsSync(builtIndexPath)) {
        fs.copyFileSync(builtIndexPath, path.join(outDir, '404.html'))
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: normalizedBase,
  plugins: [react(), radproOfflineManifestPlugin()],
  resolve: {
    alias: [
      {
        find: /^react-plotly\.js$/,
        replacement: path.resolve(__dirname, 'src/components/Plot.tsx')
      }
    ]
  },
  build: {
    chunkSizeWarningLimit: 3500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('nuclear_detonations_database')) return 'data-detonations';
          if (id.includes('global_reactors_database')) return 'data-reactors';
          if (id.includes('global_incidents_register') || id.includes('historical_incidents_database')) return 'data-incidents';
          if (id.includes('all_nuclides')) return 'data-all-nuclides';
          if (id.includes('nuclides.json')) return 'data-nuclides-core';
          if (id.includes('methodDocsData')) return 'data-method-docs';
          if (id.includes('node_modules/plotly.js') || id.includes('node_modules/react-plotly.js')) return 'vendor-plotly';
          if (id.includes('node_modules/katex') || id.includes('node_modules/react-katex')) return 'vendor-katex';
          if (id.includes('node_modules/reactflow') || id.includes('node_modules/@reactflow')) return 'vendor-reactflow';
        }
      }
    }
  }
})

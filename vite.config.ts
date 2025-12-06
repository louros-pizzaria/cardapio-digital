import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React (100KB)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // React Query (50KB)
          'query-vendor': ['@tanstack/react-query'],
          
          // Supabase (80KB)
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // Radix UI Components (150KB) - agrupados por funcionalidade
          'radix-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          'radix-forms': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
          ],
          'radix-extended': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
          ],
          
          // Charts & Visualizations (70KB)
          'charts-vendor': ['recharts'],
          
          // Form & Validation (40KB)
          'forms-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          
          // Payment & PIX (30KB) - removido pois gera chunk vazio
          // 'payment-vendor': ['mercadopago', '@mercadopago/sdk-js', 'pix-utils', 'qrcode'],
          
          // Utilities (20KB)
          'utils-vendor': [
            'date-fns',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'zustand',
          ],
        },
        // Nomenclatura otimizada para cache
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          // Vendor chunks com hash estável
          if (name.includes('vendor')) {
            return 'assets/vendor/[name].[hash].js';
          }
          // Admin chunks separados
          if (name.includes('admin')) {
            return 'assets/admin/[name].[hash].js';
          }
          // Outros chunks
          return 'assets/[name].[hash].js';
        },
        // Otimizar imports de entrada
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // Aumentar limite de warning para chunks grandes esperados
    chunkSizeWarningLimit: 600,
    // Otimizações de minificação
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
}));

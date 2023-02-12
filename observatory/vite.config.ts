import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
    server: {
        port: 8080
    },
    
    resolve: {
        alias: {
          'tailwind-config': path.resolve(__dirname, './tailwind.config.cjs'),
        },
    },

    build: {
        commonjsOptions: {
            include: ['tailwind.config.cjs', 'node_modules/**']
        }
    },

    optimizeDeps: {
        include: ['tailwind-config'],
    },

    plugins: [vue()],
    
})

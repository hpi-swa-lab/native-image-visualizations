import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
    server: {
        port: 8080
    },
    plugins: [vue()]
})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),cesium()]
})

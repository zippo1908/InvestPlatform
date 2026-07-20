import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 相对资源路径:同一份构建既能在 :8089 根路径直连,也能挂 portal.tinci.com/invest/ 子路径
  // (应用是 hash 路由,相对 base 无副作用)。
  base: './',
  plugins: [react()],
})

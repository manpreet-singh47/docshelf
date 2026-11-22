import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  server:{
    // Polling keeps the dev server in sync in restricted macOS environments.
    watch:{usePolling:true,interval:500},
    proxy:{'/api':process.env.VITE_API_PROXY_TARGET||'http://localhost:4000'}
  }
});

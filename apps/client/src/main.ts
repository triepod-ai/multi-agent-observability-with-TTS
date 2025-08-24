import { createApp } from 'vue'
import './styles/main.css'
import './styles/themes.css'
import App from './App.vue'
import { loader } from '@guolao/vue-monaco-editor'

// Configure Monaco Editor CDN for better CSP compliance and reduced bundle size
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
})

// Apply dark theme by default for better readability
document.documentElement.classList.add('theme-dark')

createApp(App).mount('#app')

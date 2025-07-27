import { createApp } from 'vue'
import './styles/main.css'
import './styles/themes.css'
import App from './App.vue'

// Apply dark theme by default for better readability
document.documentElement.classList.add('theme-dark')

createApp(App).mount('#app')

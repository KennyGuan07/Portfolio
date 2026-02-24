import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initAuth } from './composables/useAuth'
import Oruga from '@oruga-ui/oruga-next'
import '@oruga-ui/theme-bootstrap/style.css'

const app = createApp(App)

app.use(router)
app.use(Oruga)

initAuth().finally(() => {
	app.mount('#app')
})

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
    faFileExport,
    faArrowLeft,
    faXmark,
    faPlus,
    faChevronLeft,
    faInfoCircle,
    faCircleQuestion
} from '@fortawesome/free-solid-svg-icons'

library.add(
    faFileExport,
    faArrowLeft,
    faXmark,
    faPlus,
    faChevronLeft,
    faInfoCircle,
    faCircleQuestion
)

const pinia = createPinia()
const app = createApp(App)

app.use(pinia).component('font-awesome-icon', FontAwesomeIcon).mount('#app')

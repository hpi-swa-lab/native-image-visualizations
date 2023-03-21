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
    faCircleQuestion
} from '@fortawesome/free-solid-svg-icons'
import VueCarousel from 'vue-carousel'

library.add(faFileExport, faArrowLeft, faXmark, faPlus, faChevronLeft, faCircleQuestion)

const pinia = createPinia()
const app = createApp(App)

app.use(pinia).use(VueCarousel).component('font-awesome-icon', FontAwesomeIcon).mount('#app')

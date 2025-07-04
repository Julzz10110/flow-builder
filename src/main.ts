import { createApp } from 'vue'
import App from './App.vue'
import clickOutside from './directives/clickOutside';
import naive from 'naive-ui'

const app = createApp(App)
app.directive('click-outside', clickOutside);
app.use(naive)

app.mount('#app')

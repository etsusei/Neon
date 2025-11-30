import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/main.vue'),
  },
  {
    path: '/listpage/:listId',
    name: 'List',
    component: () => import('../views/list.vue'),
    props: true,
  },
  {
    path: '/artistpage/:artistId',
    name: 'Artist',
    component: () => import('../views/artist.vue'),
    props: true,
  },
  {
    path: '/albumpage/:albumId',
    name: 'Album',
    component: () => import('../views/album.vue'),
    props: true,
  },
  {
    path: '/searchpage/:keyword',
    name: 'Search',
    component: () => import('../views/search.vue'),
    props: true,
  },
  {
    path: '/dynamic',
    name: 'Dynamic',
    component: () => import('../views/dynamicBackground.vue'),
    //props: true,
  },{
    path: '/background',
    name: 'Background',
    component: () => import('../views/background.vue'),
  }

]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router

import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import VideoPlayer from '../views/VideoPlayer.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/video/:id',
    name: 'VideoPlayer',
    component: VideoPlayer,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
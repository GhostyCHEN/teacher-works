import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../layout/index.vue'
import { isMobileDevice } from '../utils/device'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/mobile',
    name: 'Mobile',
    component: () => import('../views/mobile/index.vue'),
    meta: { title: '班级工作台' }
  },
  {
    path: '/mobile/disciplines',
    name: 'MobileDisciplines',
    component: () => import('../views/mobile/disciplines.vue'),
    meta: { title: '违纪登记' }
  },
  {
    path: '/',
    component: Layout,
    redirect: () => (isMobileDevice() ? '/mobile' : '/dashboard'),
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '班级首页', icon: 'Odometer' }
      },
      // 教师工作
      {
        path: 'teacher/homework',
        name: 'Homework',
        component: () => import('../views/teacher/homework.vue'),
        meta: { title: '欠交登记', icon: 'EditPen' }
      },
      {
        path: 'teacher/tasks',
        name: 'Tasks',
        component: () => import('../views/teacher/tasks.vue'),
        meta: { title: '班级待办', icon: 'List' }
      },
      // 班主任工作
      {
        path: 'advisor/students',
        name: 'Students',
        component: () => import('../views/advisor/students.vue'),
        meta: { title: '学生档案', icon: 'User' }
      },
      {
        path: 'advisor/scores',
        name: 'Scores',
        component: () => import('../views/advisor/scores.vue'),
        meta: { title: '成绩分析', icon: 'DataLine' }
      },
      {
        path: 'advisor/disciplines',
        name: 'Disciplines',
        component: () => import('../views/advisor/disciplines.vue'),
        meta: { title: '违纪管理', icon: 'WarningFilled' }
      },
      {
        path: 'advisor/leaves',
        name: 'Leaves',
        component: () => import('../views/advisor/leaves.vue'),
        meta: { title: '请假管理', icon: 'Calendar' }
      },
      {
        path: 'advisor/communications',
        name: 'Communications',
        component: () => import('../views/advisor/communications.vue'),
        meta: { title: '家校沟通', icon: 'ChatDotRound' }
      },
      {
        path: 'advisor/seats',
        name: 'Seats',
        component: () => import('../views/advisor/seats.vue'),
        meta: { title: '座位表', icon: 'Grid' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：设备判断与权限拦截
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isMobile = isMobileDevice()

  // 1. 未登录状态：统一拦截至登录页
  if (!token) {
    if (to.path === '/login') return next()
    return next('/login')
  }

  // 2. 已登录状态访问登录页：根据设备类型分流
  if (to.path === '/login') {
    if (isMobile) return next('/mobile')
    return next('/dashboard')
  }

  next()
})

export default router

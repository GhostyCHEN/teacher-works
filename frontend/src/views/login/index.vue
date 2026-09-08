<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">
          <el-icon><Notebook /></el-icon>
        </div>
        <div class="notion-badge-pill">高中班主任工作空间</div>
        <h1 class="login-title">班级工作台</h1>
        <p class="login-subtitle">欢迎回来，让今天的工作有序展开。</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username" label="用户名">
          <el-input
            v-model="loginForm.username"
            size="large"
            placeholder="请输入用户名"
            autocomplete="username"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password" label="密码">
          <el-input
            v-model="loginForm.password"
            size="large"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            native-type="submit"
          >
            进入工作台
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-tip">
        <span class="tip-kbd">默认测试账号</span>
        <code>admin</code> / <code>admin123</code>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { login } from '../../api'
import { ElMessage } from 'element-plus'
import { isMobileDevice } from '../../utils/device'

const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return
  try {
    await loginFormRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    const data = await login({
      username: loginForm.username,
      password: loginForm.password
    })
    localStorage.setItem('token', data.token)
    localStorage.setItem('username', data.username)
    ElMessage.success('登录成功')

    // 设备判断：移动端直接跳转到快速记违纪，电脑端跳转到数据看板
    const targetUrl = isMobileDevice() ? '/mobile' : '/dashboard'
    await router.push(targetUrl)
    setTimeout(() => {
      if (router.currentRoute.value.path !== targetUrl) {
        window.location.href = targetUrl
      }
    }, 100)
  } catch (err) {
    // 错误信息已由 request 拦截器提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container { min-height: 100dvh; display: grid; place-items: center; padding: 28px 16px; background: #f7f7f5; }
.login-card { width: 410px; max-width: 100%; padding: 40px; background: #fff; border: 1px solid #e5e3df; border-radius: 12px; box-shadow: 0 8px 32px #37352f06; }
.login-header { margin-bottom: 30px; }
.logo-icon { width: 44px; height: 48px; display: grid; place-items: center; border: 1.5px solid #37352f; border-radius: 7px; font-size: 28px; margin-bottom: 24px; }
.notion-badge-pill { color: #787671; font-size: 11px; letter-spacing: 1px; margin-bottom: 10px; }
.login-title { font-size: 28px; letter-spacing: -1px; margin: 0 0 10px; color: #37352f; }
.login-subtitle { margin: 0; color: #787671; font-size: 13px; line-height: 1.7; }
.login-btn { width: 100%; margin-top: 8px; }
.login-tip { display: flex; gap: 6px; justify-content: center; color: #787671; font-size: 11px; padding-top: 16px; border-top: 1px solid #ede9e4; }
.login-tip code { color: #5d5b54; }
@media (max-width: 480px) { .login-card { padding: 28px; } }
</style>

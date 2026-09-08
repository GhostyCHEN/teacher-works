<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
const props = defineProps({ enableShortcut: { type: Boolean, default: true } })
const emit = defineEmits(['navigate'])
const router = useRouter()
const query = ref('')
const searchInput = ref(null)
const groups = computed(() => [
  { title: '工作空间', pages: router.getRoutes().filter(r => r.path === '/dashboard') },
  { title: '日常事务', pages: router.getRoutes().filter(r => r.path.startsWith('/teacher/')) },
  { title: '班级管理', pages: router.getRoutes().filter(r => r.path.startsWith('/advisor/')) }
].map(group => ({ ...group, pages: group.pages.filter(r => r.meta.title.includes(query.value.trim())) })))
const hasResults = computed(() => groups.value.some(g => g.pages.length))
function focusSearch(event) {
  if (props.enableShortcut && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', focusSearch))
onBeforeUnmount(() => window.removeEventListener('keydown', focusSearch))
</script>

<template>
  <nav class="workspace-nav" aria-label="工作台导航">
    <label class="nav-search">
      <el-icon><Search /></el-icon>
      <input ref="searchInput" v-model="query" placeholder="查找页面" aria-label="查找页面" @keydown.esc="query = ''" />
      <kbd v-if="enableShortcut">⌘ K</kbd>
    </label>
    <template v-for="group in groups" :key="group.title">
      <section v-if="group.pages.length" class="nav-group">
        <div class="nav-group-title">{{ group.title }}</div>
        <RouterLink v-for="page in group.pages" :key="page.path" :to="page.path" class="nav-link" @click="emit('navigate')">
          <el-icon><component :is="page.meta.icon" /></el-icon>
          <span>{{ page.meta.title }}</span>
        </RouterLink>
      </section>
    </template>
    <p v-if="!hasResults" class="nav-empty">没有找到页面，试试其他名称</p>
  </nav>
</template>

<style scoped>
.workspace-nav { padding: 8px 12px 24px; }
.nav-search { display: flex; align-items: center; gap: 8px; padding: 8px; color: #787671; border: 1px solid #e5e3df; border-radius: 6px; background: #fff; margin-bottom: 22px; }
.nav-search input { min-width: 0; width: 100%; border: 0; outline: 0; font: inherit; font-size: 13px; color: #37352f; background: transparent; }
.nav-search:focus-within { outline: 2px solid #5645d4; outline-offset: 2px; }
kbd { white-space: nowrap; font: 10px system-ui; color: #787671; }
.nav-group { margin: 18px 0; }
.nav-group-title { padding: 0 10px 7px; font-size: 11px; font-weight: 600; color: #787671; letter-spacing: .6px; }
.nav-link { display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 6px 10px; margin: 2px 0; border-radius: 5px; color: #5d5b54; text-decoration: none; font-size: 13px; transition: background .15s; }
.nav-link .el-icon { font-size: 17px; color: #787671; }
.nav-link:hover { background: #eeedeb; }
.nav-link.router-link-active { color: #37352f; background: #e9e8e5; font-weight: 600; }
.nav-empty { font-size: 12px; color: #787671; line-height: 1.8; }
</style>

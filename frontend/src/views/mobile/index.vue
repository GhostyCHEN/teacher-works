<script setup>
import { computed, onMounted, ref } from 'vue'
import { getClasses, getStats, getSettings, getGradeInfo } from '../../api'
const classes = ref([])
const currentClassId = ref(null)
const teacherName = ref('班主任')
const grade = ref('')
const data = ref({ tasks: [], leaves: [], stats: { pending_tasks: 0, active_leaves: 0 } })
const failed = ref(false)
const loading = ref(true)
const currentClass = computed(() => classes.value.find(c => c.id === currentClassId.value))
const entries = [
  { title: '违纪登记', description: '记录与跟进', icon: 'EditPen', to: '/mobile/disciplines' },
  { title: '请假登记', description: '请假与销假', icon: 'Calendar', to: '/advisor/leaves?create=1' },
  { title: '学生查询', description: '档案与联系方式', icon: 'User', to: '/advisor/students' },
  { title: '班级待办', description: '材料、活动与日常', icon: 'List', to: '/teacher/tasks' }
]
async function load() {
  loading.value = true; failed.value = false
  try {
    classes.value = await getClasses()
    const saved = Number(localStorage.getItem('currentClassId'))
    currentClassId.value = (classes.value.find(c => c.id === saved) || classes.value.find(c => c.is_default) || classes.value[0])?.id ?? null
    localStorage.setItem('currentClassId', String(currentClassId.value || ''))
    const [stats, settings, gradeInfo] = await Promise.all([getStats(), getSettings(), getGradeInfo()])
    if (!Array.isArray(stats.tasks) || !Array.isArray(stats.leaves) || !stats.stats) throw new Error('首页数据格式不完整')
    data.value = stats; teacherName.value = settings.teacher_name || '班主任'; grade.value = gradeInfo.grade_level
  } catch { failed.value = true } finally { loading.value = false }
}
function switchClass(id) { localStorage.setItem('currentClassId', String(id)); load() }
onMounted(load)
</script>
<template>
  <div class="mobile-home" v-loading="loading">
    <header class="mobile-home-header"><div class="class-context"><el-icon><Notebook /></el-icon><el-select v-if="classes.length > 1" v-model="currentClassId" aria-label="切换班级" @change="switchClass"><el-option v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" /></el-select><span v-else>{{ currentClass?.name || '班级工作台' }}</span></div><RouterLink to="/dashboard" aria-label="打开完整班级工作台"><el-icon><Setting /></el-icon></RouterLink></header>
    <main>
      <div class="home-heading"><span>{{ grade || '高中' }} · {{ teacherName }}</span><h1>班级的事，随手办</h1><p>及时记录，有序跟进。</p></div>
      <el-alert v-if="failed" title="加载失败，请重试" type="error" :closable="false"><el-button link @click="load">重新加载</el-button></el-alert>
      <div class="entry-grid"><RouterLink v-for="entry in entries" :key="entry.to" :to="entry.to"><el-icon><component :is="entry.icon" /></el-icon><strong>{{ entry.title }}</strong><span>{{ entry.description }}</span></RouterLink></div>
      <section><header><h2>班级待办 <small>{{ data.stats.pending_tasks }}</small></h2><RouterLink to="/teacher/tasks">查看全部 →</RouterLink></header><p v-if="!data.tasks.length" class="empty">暂无待办事项</p><RouterLink v-for="task in data.tasks.slice(0,4)" :key="task.id" to="/teacher/tasks" class="list-row"><el-icon><CircleCheck /></el-icon><span>{{ task.title }}</span><small>{{ task.due_date || '未设日期' }}</small></RouterLink></section>
      <section><header><h2>当前在假 <small>{{ data.stats.active_leaves }}</small></h2><RouterLink to="/advisor/leaves">查看全部 →</RouterLink></header><p v-if="!data.leaves.length" class="empty">当前没有在假学生</p><RouterLink v-for="leave in data.leaves.slice(0,4)" :key="leave.id" to="/advisor/leaves" class="list-row"><span>{{ leave.student_name || '已删除学生' }}</span><small>{{ leave.end_date }} 结束</small></RouterLink></section>
      <RouterLink to="/teacher/homework" class="homework-entry">查看作业欠交 <span>{{ data.stats.homework_pending || 0 }} 条 →</span></RouterLink>
    </main>
  </div>
</template>
<style scoped>
.mobile-home { max-width: 640px; margin: 0 auto; min-height: 100dvh; background: #fff; padding-bottom: env(safe-area-inset-bottom, 0px); }
.mobile-home-header { display: flex; justify-content: space-between; align-items: center; min-height: 60px; padding: env(safe-area-inset-top, 0px) 20px 0; border-bottom: 1px solid #ede9e4; }
.class-context { display: flex; align-items: center; gap: 8px; font-size: 13px; min-width: 0; } .class-context > .el-select { width: 180px; } .mobile-home-header > a { display: grid; place-items: center; min-height: 44px; min-width: 44px; color: #787671; }
main { padding: 28px 20px; } .home-heading > span { font-size: 11px; color: #787671; } h1 { font-size: 26px; margin: 14px 0 10px; letter-spacing: -.7px; } .home-heading p { font-size: 13px; color: #787671; margin: 0; }
.entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 28px 0; } .entry-grid a { display: flex; flex-direction: column; gap: 12px; padding: 20px 16px; color: #37352f; text-decoration: none; border: 1px solid #e5e3df; border-radius: 9px; } .entry-grid .el-icon { color: #5645d4; padding: 7px; box-sizing: content-box; background: #f0edf9; font-size: 18px; border-radius: 6px; } .entry-grid strong { font-size: 14px; } .entry-grid span { font-size: 11px; color: #787671; }
section { border-top: 1px solid #ede9e4; padding: 22px 0; } section header { display: flex; align-items: center; justify-content: space-between; gap: 8px; } h2 { font-size: 14px; margin: 0; } h2 small { background: #f0eeec; color: #787671; font-size: 11px; padding: 2px 6px; margin-left: 5px; border-radius: 4px; } section header a { font-size: 11px; color: #787671; text-decoration: none; }
.empty { padding: 18px 0 0; text-align: center; color: #787671; font-size: 12px; } .list-row { display: flex; align-items: center; gap: 10px; padding: 16px 0; border-bottom: 1px solid #ede9e4; color: #37352f; text-decoration: none; font-size: 13px; } .list-row > span { flex: 1; overflow-wrap: anywhere; } .list-row small { font-size: 10px; color: #787671; } .homework-entry { display: flex; justify-content: space-between; gap: 12px; border: 1px solid #e5e3df; border-radius: 8px; padding: 16px; text-decoration: none; color: #5d5b54; font-size: 12px; }
</style>

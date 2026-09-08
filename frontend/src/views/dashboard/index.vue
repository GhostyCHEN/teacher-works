<script setup>
import { ref, onMounted } from 'vue'
import { getStats } from '../../api'
import FocusPanel from '../../components/dashboard/FocusPanel.vue'
const data = ref({ stats: { pending_tasks: 0, active_leaves: 0, homework_pending: 0 }, tasks: [], leaves: [], followups: [] })
const loading = ref(true)
const failed = ref(false)
async function load() { loading.value = true; failed.value = false; try { const result = await getStats(); if (!Array.isArray(result.tasks) || !Array.isArray(result.leaves) || !Array.isArray(result.followups) || !result.stats) throw new Error('首页数据格式不完整'); data.value = result } catch { failed.value = true } finally { loading.value = false } }
onMounted(load)
</script>
<template>
  <div class="dashboard-container" v-loading="loading">
    <header class="workspace-welcome"><div><span class="welcome-eyebrow">高中班主任 · 班级日常</span><h1>今天，关注这些事</h1><p>待办、出勤和近期记录，一眼掌握。</p></div><RouterLink to="/advisor/disciplines" class="primary-link">登记违纪</RouterLink></header>
    <el-alert v-if="failed" title="首页加载失败，请稍后重试" type="error" :closable="false"><el-button link @click="load">重新加载</el-button></el-alert>
    <template v-else>
      <div class="summary-grid">
        <RouterLink to="/teacher/tasks"><span>班级待办</span><strong>{{ data.stats.pending_tasks }}</strong><small>未完成事项</small></RouterLink>
        <RouterLink to="/advisor/leaves"><span>当前在假</span><strong>{{ data.stats.active_leaves }}</strong><small>留意返校与销假</small></RouterLink>
        <RouterLink to="/teacher/homework"><span>作业待补交</span><strong>{{ data.stats.homework_pending }}</strong><small>需继续跟进</small></RouterLink>
      </div>
      <div class="focus-grid">
        <FocusPanel title="班级待办" to="/teacher/tasks" empty-text="暂无待办事项">
          <template v-if="data.tasks.length"><RouterLink v-for="task in data.tasks" :key="task.id" to="/teacher/tasks" class="focus-row"><el-icon><CircleCheck /></el-icon><span>{{ task.title }}</span><small>{{ task.due_date || '未设日期' }}</small></RouterLink></template>
        </FocusPanel>
        <FocusPanel title="当前在假学生" to="/advisor/leaves" empty-text="当前没有在假学生">
          <template v-if="data.leaves.length"><RouterLink v-for="leave in data.leaves" :key="leave.id" to="/advisor/leaves" class="focus-row"><el-icon><Calendar /></el-icon><span>{{ leave.student_name || '已删除学生' }}<small class="row-subtitle">{{ leave.reason }}</small></span><small>{{ leave.end_date }} 结束</small></RouterLink></template>
        </FocusPanel>
      </div>
      <FocusPanel title="近期关注 · 近 7 日违纪记录" to="/advisor/disciplines" empty-text="近 7 日暂无违纪记录">
        <template v-if="data.followups.length"><RouterLink v-for="record in data.followups" :key="record.id" to="/advisor/disciplines" class="focus-row"><span>{{ record.student_name || '已删除学生' }} · {{ record.type }}<small class="row-subtitle">{{ record.description }}</small></span><el-tag size="small" :type="record.severity === '严重' ? 'danger' : 'info'">{{ record.severity }}</el-tag><small>{{ record.incident_date }}</small></RouterLink></template>
      </FocusPanel>
    </template>
  </div>
</template>
<style scoped>
.dashboard-container { max-width: 1180px; margin: 0 auto; }
.workspace-welcome { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px 0 32px; }
.welcome-eyebrow { color: #787671; font-size: 12px; }
h1 { font-size: 32px; margin: 16px 0 12px; letter-spacing: -1px; }
.workspace-welcome p { color: #787671; font-size: 13px; margin: 0; }
.primary-link { color: #fff; background: #5645d4; padding: 11px 16px; font-size: 13px; border-radius: 8px; text-decoration: none; white-space: nowrap; }
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.summary-grid a { border: 1px solid #e5e3df; padding: 22px; border-radius: 10px; text-decoration: none; display: flex; flex-direction: column; gap: 12px; color: #37352f; }
.summary-grid a:hover { background: #fafaf9; }
.summary-grid span { font-size: 13px; } .summary-grid strong { font-size: 32px; font-weight: 600; } .summary-grid small { font-size: 11px; color: #787671; }
.focus-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.focus-row { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #ede9e4; text-decoration: none; color: #37352f; font-size: 13px; }
.focus-row:last-child { border-bottom: 0; } .focus-row:hover { background: #fafaf9; } .focus-row > span { flex: 1; overflow-wrap: anywhere; } .focus-row small { color: #787671; font-size: 11px; } .row-subtitle { display: block; margin-top: 6px; }
@media (max-width: 768px) { h1 { font-size: 25px; } .workspace-welcome { align-items: flex-start; flex-direction: column; } .summary-grid { gap: 8px; } .summary-grid a { padding: 14px 10px; } .summary-grid small { line-height: 1.6; } .focus-grid { grid-template-columns: 1fr; } }
</style>

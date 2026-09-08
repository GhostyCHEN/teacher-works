<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMissingHomework, updateMissingHomework, deleteMissingHomework, getStudents } from '../../api'
import MissingHomeworkForm from '../../components/homework/MissingHomeworkForm.vue'
const records = ref([])
const students = ref([])
const query = ref('')
const status = ref('pending')
const loading = ref(false)
const dialog = ref(false)
const busyId = ref(null)
const filtered = computed(() => records.value.filter(r =>
  (status.value === 'all' || r.status === (status.value === 'pending' ? 0 : 1)) &&
  [r.student_name, r.subject, r.title].some(v => (v || '').includes(query.value.trim()))))
async function load() {
  loading.value = true
  try { [records.value, students.value] = await Promise.all([getMissingHomework(), getStudents()]) } catch {} finally { loading.value = false }
}
async function toggle(row) {
  busyId.value = row.id
  try { await updateMissingHomework(row.id, { status: row.status === 1 ? 0 : 1 }); await load(); ElMessage.success(row.status === 1 ? '已恢复为待补交' : '已标记补交') } catch {} finally { busyId.value = null }
}
async function remove(id) { try { await deleteMissingHomework(id); await load(); ElMessage.success('已删除记录') } catch {} }
function saved() { dialog.value = false; load() }
onMounted(load)
</script>
<template>
  <div v-loading="loading" class="missing-homework">
    <div class="homework-toolbar">
      <el-input v-model="query" placeholder="搜索姓名、科目或作业" clearable prefix-icon="Search" />
      <el-radio-group v-model="status"><el-radio-button value="pending">待补交</el-radio-button><el-radio-button value="completed">已补交</el-radio-button><el-radio-button value="all">全部</el-radio-button></el-radio-group>
      <el-button type="primary" @click="dialog = true"><el-icon><Plus /></el-icon>登记欠交</el-button>
    </div>
    <p class="result-count">共 {{ filtered.length }} 条记录</p>
    <div class="homework-records">
      <article v-for="r in filtered" :key="r.id" class="homework-row">
        <div class="row-copy"><h2>{{ r.student_name || '已删除学生' }} <el-tag :type="r.status === 1 ? 'success' : 'warning'" size="small">{{ r.status === 1 ? '已补交' : '待补交' }}</el-tag></h2><p>{{ r.subject }} · {{ r.title }}</p><small>欠交日期：{{ r.homework_date || '未填写' }}<span v-if="r.completed_at"> · 补交：{{ r.completed_at.slice(0,10) }}</span></small><p v-if="r.remark" class="record-note">{{ r.remark }}</p></div>
        <div class="row-actions"><el-button :loading="busyId === r.id" @click="toggle(r)">{{ r.status === 1 ? '撤销补交' : '标记补交' }}</el-button><el-popconfirm title="确认删除这条欠交记录？" @confirm="remove(r.id)"><template #reference><el-button text type="danger">删除</el-button></template></el-popconfirm></div>
      </article>
      <el-empty v-if="!loading && !filtered.length" description="暂无对应的欠交记录" :image-size="80" />
    </div>
    <el-dialog v-model="dialog" title="登记欠交" width="460px" destroy-on-close><MissingHomeworkForm v-if="dialog" :students="students" @saved="saved" @cancel="dialog = false" /></el-dialog>
  </div>
</template>
<style scoped>
.homework-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.homework-toolbar > .el-input { width: 250px; }
.result-count { font-size: 12px; color: #787671; margin: 24px 0 12px; }
.homework-records { border-top: 1px solid #e5e3df; }
.homework-row { padding: 20px 0; border-bottom: 1px solid #ede9e4; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.row-copy h2 { font-size: 15px; margin: 0 0 10px; display: flex; gap: 10px; align-items: center; }
.row-copy p { font-size: 13px; margin: 8px 0; overflow-wrap: anywhere; }
.row-copy small { font-size: 11px; color: #787671; }
.record-note { color: #787671; }
.row-actions { display: flex; flex-shrink: 0; }
@media (max-width: 768px) { .homework-row { align-items: flex-start; flex-direction: column; gap: 10px; } .homework-toolbar > .el-input { width: 100%; } }
</style>

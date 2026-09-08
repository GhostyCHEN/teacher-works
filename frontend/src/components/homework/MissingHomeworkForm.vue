<script setup>
import { ref } from 'vue'
import { createMissingHomework } from '../../api'
import { ElMessage } from 'element-plus'
defineProps({ students: { type: Array, default: () => [] } })
const emit = defineEmits(['saved', 'cancel'])
const now = new Date()
const form = ref({ student_id: null, title: '', subject: '', homework_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, remark: '' })
const saving = ref(false)
const formRef = ref(null)
const rules = {
  student_id: [{ required: true, message: '请选择欠交学生', trigger: 'change' }],
  title: [{ required: true, whitespace: true, message: '请填写作业名称', trigger: 'blur' }],
  subject: [{ required: true, whitespace: true, message: '请填写科目', trigger: 'blur' }],
  homework_date: [{ required: true, message: '请选择欠交日期', trigger: 'change' }]
}
async function save() {
  if (saving.value) return
  try { await formRef.value.validate() } catch { return }
  saving.value = true
  try { await createMissingHomework(form.value); ElMessage.success('欠交已登记'); emit('saved') } catch {} finally { saving.value = false }
}
</script>
<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="save">
    <el-form-item label="欠交学生" prop="student_id"><el-select v-model="form.student_id" filterable placeholder="选择学生" style="width:100%"><el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" /></el-select></el-form-item>
    <el-form-item label="科目" prop="subject"><el-input v-model="form.subject" placeholder="如：数学" /></el-form-item>
    <el-form-item label="作业名称" prop="title"><el-input v-model="form.title" placeholder="如：周一数学练习" /></el-form-item>
    <el-form-item label="欠交日期" prop="homework_date"><el-date-picker v-model="form.homework_date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
    <el-form-item label="备注（选填）"><el-input v-model="form.remark" type="textarea" :rows="2" placeholder="需跟进的情况" /></el-form-item>
    <div class="form-actions"><el-button @click="emit('cancel')">取消</el-button><el-button type="primary" native-type="submit" :loading="saving">登记欠交</el-button></div>
  </el-form>
</template>
<style scoped>.form-actions { display: flex; justify-content: flex-end; padding-top: 8px; }</style>

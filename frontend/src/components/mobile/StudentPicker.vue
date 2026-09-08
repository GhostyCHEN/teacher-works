<script setup>
import { computed, ref } from 'vue'
const props = defineProps({
  students: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  loading: Boolean,
  failed: Boolean
})
const emit = defineEmits(['toggle', 'selectVisible', 'clear', 'retry'])
const query = ref('')
const filtered = computed(() => props.students.filter(s => (s.name || '').toLowerCase().includes(query.value.trim().toLowerCase())))
const selectedStudents = computed(() => props.students.filter(s => props.selected.includes(s.id)))
</script>

<template>
  <div class="student-picker" :aria-busy="loading">
    <div class="picker-toolbar">
      <el-input v-model="query" placeholder="搜索学生姓名" aria-label="搜索学生姓名" prefix-icon="Search" clearable />
      <button type="button" class="text-action" :disabled="!filtered.length || loading" @click="emit('selectVisible', filtered.map(s => s.id))">{{ query ? '全选结果' : '全选' }}</button>
    </div>
    <div v-if="selected.length" class="selection-summary">
      <span>已选 {{ selected.length }} 人</span>
      <button type="button" class="text-action" @click="emit('clear')">清空</button>
      <div class="selected-list">
        <button v-for="s in selectedStudents" :key="s.id" type="button" :aria-label="`取消选择${s.name}`" @click="emit('toggle', s.id)">{{ s.name }} <el-icon><Close /></el-icon></button>
      </div>
    </div>
    <p v-if="loading" class="picker-empty" role="status">正在加载学生…</p>
    <div v-else-if="failed" class="picker-empty" role="alert">学生加载失败 <button type="button" class="text-action" @click="emit('retry')">重新加载</button></div>
    <div v-else-if="!filtered.length" class="picker-empty">
      <el-icon><User /></el-icon>
      <span>{{ students.length ? '没有找到这位学生' : '这个班级还没有学生' }}</span>
      <small>{{ students.length ? '换个名字试试，已选学生会保留' : '请先在完整工作台的学生档案中添加' }}</small>
    </div>
    <div v-else class="student-grid">
      <button v-for="s in filtered" :key="s.id" type="button" class="student-option" :class="{ selected: selected.includes(s.id) }" :aria-pressed="selected.includes(s.id)" @click="emit('toggle', s.id)">
        <span class="student-initial">{{ s.name?.slice(0, 1) }}</span>
        <span class="student-name">{{ s.name }}</span>
        <el-icon v-if="selected.includes(s.id)" class="selected-check"><Check /></el-icon>
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker-toolbar { display: flex; align-items: center; gap: 12px; }
.picker-toolbar :deep(.el-input__wrapper) { min-height: 42px; background: #fafaf9; }
.text-action { border: 0; background: transparent; color: #5d5b54; font-size: 12px; padding: 10px 0; min-height: 44px; white-space: nowrap; cursor: pointer; }
.text-action:disabled { opacity: .4; cursor: default; }
.selection-summary { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 0 8px; margin-top: 8px; font-size: 12px; color: #5645d4; }
.selected-list { width: 100%; display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; }
.selected-list button { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; min-height: 36px; background: #f0edf9; border: 0; border-radius: 5px; color: #5645d4; padding: 6px 10px; }
.student-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 14px; max-height: 264px; overflow-y: auto; padding: 3px; }
.student-option { display: flex; align-items: center; gap: 8px; min-height: 46px; border: 1px solid #e5e3df; background: #fff; border-radius: 7px; padding: 8px; text-align: left; color: #37352f; cursor: pointer; }
.student-option.selected { background: #f6f3fc; border-color: #9484d6; }
.student-initial { display: grid; place-items: center; width: 25px; height: 25px; flex-shrink: 0; border-radius: 5px; background: #f0eeec; color: #787671; font-size: 11px; }
.student-name { overflow-wrap: anywhere; font-size: 13px; }
.selected-check { margin-left: auto; flex-shrink: 0; color: #5645d4; }
.picker-empty { display: flex; align-items: center; flex-direction: column; gap: 8px; text-align: center; color: #787671; font-size: 13px; padding: 22px 8px 8px; }
.picker-empty > .el-icon { font-size: 24px; color: #a4a097; }
.picker-empty small { font-size: 11px; line-height: 1.6; }
</style>

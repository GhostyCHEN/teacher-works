<template>
  <div class="students-container">
    <el-card shadow="never">
      <template #header>
        <div class="header-actions">
          <el-input
            v-model="searchQuery"
            placeholder="搜索学生姓名"
            style="width: 250px"
            clearable
            @input="filterStudents"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <div class="action-buttons">
            <el-button
              v-if="selectedRows.length"
              type="danger"
              plain
              @click="handleBatchDelete"
            >
              <el-icon><Delete /></el-icon>批量删除（{{ selectedRows.length }}）
            </el-button>
            <el-button type="success" plain :loading="exporting" @click="handleExport">
              <el-icon><Download /></el-icon>导出花名册
            </el-button>
            <el-button type="success" plain @click="importVisible = true">
              <el-icon><Download /></el-icon>Excel导入
            </el-button>
            <el-button type="primary" @click="openCreate">
              <el-icon><Plus /></el-icon>新增学生
            </el-button>
          </div>
        </div>
      </template>

      <div class="compact-mobile-list" v-loading="loading">
        <article v-for="student in pagedData" :key="student.id" class="compact-record">
          <h3>{{ student.name }} <small>{{ student.gender }} · {{ student.id }}</small></h3>
          <p>{{ student.parent_name ? '家长：' + student.parent_name : '未填写家长姓名' }}</p>
          <a v-if="student.phone" :href="`tel:${student.phone}`">{{ student.phone }}</a>
          <div class="compact-actions"><el-button @click="viewDetail(student)">查看档案</el-button><el-button text @click="openEdit(student)">编辑</el-button></div>
        </article>
        <el-empty v-if="!loading && !pagedData.length" description="暂无学生" :image-size="60" />
      </div>
      <el-table class="full-desktop-table" :data="pagedData" style="width: 100%" v-loading="loading" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="学号" width="80" />
        <el-table-column label="头像" width="70" align="center">
          <template #default="scope">
            <el-avatar :size="36" :src="avatarSrc(scope.row.avatar) || undefined">
              {{ avatarText(scope.row.avatar) || (scope.row.name ? scope.row.name.slice(0, 1) : '') }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="gender" label="性别" width="70" />
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="class" label="班级" width="100" />
        <el-table-column prop="birth" label="出生年月" width="120" />
        <el-table-column prop="parent_name" label="家长姓名" width="100" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="is_special" label="特殊情况" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.is_special === 1" type="danger">
              {{ scope.row.special_type || '是' }}
            </el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="特长类型" width="120" align="center">
          <template #default="scope">
            <div class="tag-group">
              <el-tag v-if="scope.row.is_sports === 1" type="success" size="small" effect="light">体育生</el-tag>
              <el-tag v-if="scope.row.is_arts === 1" type="warning" size="small" effect="light">艺术生</el-tag>
              <span v-if="scope.row.is_sports !== 1 && scope.row.is_arts !== 1" class="text-muted">普通</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="health_condition" label="疾病/健康状况" width="150" show-overflow-tooltip>
          <template #default="scope">
            <el-tag
              v-if="scope.row.health_condition && !['无', '良好', '健康', '正常', '良好无特殊病史'].includes(scope.row.health_condition.trim())"
              type="danger"
              size="small"
              effect="light"
            >
              {{ scope.row.health_condition }}
            </el-tag>
            <span v-else class="text-health-good">
              {{ scope.row.health_condition || '健康良好' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="viewDetail(scope.row)">详情</el-button>
            <el-button link type="primary" size="small" @click="openEdit(scope.row)">编辑</el-button>
            <el-popconfirm title="删除后将同时删除其成绩、请假等关联数据，确定吗？" @confirm="handleDelete(scope.row.id)">
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="filtered.length"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end;"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑学生' : '新增学生'" width="640px">
      <p class="form-tip">仅姓名和性别必填，其余信息按需填写。</p>
      <el-form ref="formRef" :model="form" :rules="studentRules" label-width="100px">
        <el-form-item label="头像">
          <div class="avatar-upload">
            <el-avatar
              v-if="avatarPreview.src || avatarPreview.text"
              :size="64"
              :src="avatarPreview.src || undefined"
              class="avatar-preview"
            >{{ avatarPreview.text }}</el-avatar>
            <el-upload
              ref="avatarUploadRef"
              :auto-upload="false"
              :limit="1"
              accept="image/*"
              :show-file-list="false"
              :on-change="onAvatarChange"
              :on-remove="onAvatarRemove"
            >
              <el-button type="primary" plain>
                <el-icon><Upload /></el-icon>上传头像
              </el-button>
            </el-upload>
          </div>
          <div class="avatar-grid">
            <div
              v-for="a in BUILTIN_AVATARS"
              :key="a.emoji"
              class="avatar-opt"
              :class="{ active: form.avatar === 'emoji:' + a.emoji }"
              @click="pickEmoji(a)"
            >
              <el-avatar :size="40">{{ a.emoji }}</el-avatar>
              <span class="avatar-opt-name">{{ a.name }}</span>
            </div>
          </div>
          <div class="form-tip" v-if="avatarFile">已选择上传头像，保存后生效</div>
        </el-form-item>
        <el-form-item label="姓名" prop="name" required>
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出生年月">
          <el-date-picker
            v-model="form.birth"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择出生日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="家长姓名">
          <el-input v-model="form.parent_name" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="家庭住址">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="家庭情况">
          <el-input v-model="form.family_info" placeholder="家庭成员、经济状况等" />
        </el-form-item>
        <el-form-item label="年级">
          <el-input v-model="form.grade" placeholder="如：高一（选填）" />
        </el-form-item>
        <el-form-item label="班级">
          <el-input v-model="form.class" placeholder="如：1班" />
        </el-form-item>
        <el-form-item label="特长类型">
          <el-checkbox v-model="form.is_sports" :true-label="1" :false-label="0">体育生</el-checkbox>
          <el-checkbox v-model="form.is_arts" :true-label="1" :false-label="0">艺术生</el-checkbox>
        </el-form-item>
        <el-form-item label="健康/疾病状况">
          <el-input
            v-model="form.health_condition"
            placeholder="如：良好无特定病史、哮喘、心脏病史、过敏体质等"
            clearable
          />
          <div class="quick-health-tags">
            <span class="quick-tag-label">快捷填入：</span>
            <el-tag
              v-for="tag in QUICK_HEALTH_TAGS"
              :key="tag"
              size="small"
              class="clickable-tag"
              @click="setHealthTag(tag)"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>
        <el-form-item label="特殊情况">
          <el-switch v-model="form.is_special" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="情况说明" v-if="form.is_special === 1">
          <el-input v-model="form.special_type" placeholder="如单亲/孤儿等" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="可选，如：性格特点、关注事项等"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="Excel 导入学生" width="560px">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="仅 name(姓名) 与 gender(性别，男/女) 必填，其余列选填。支持表头：name(姓名)、gender(性别)、birth(出生年月)、parent_name(家长姓名)、phone(联系电话)、health_condition(疾病健康状况)、is_sports(体育生)、is_arts(艺术生)、family_info(家庭情况)、address(地址)、special_type(特殊情况)"
      />
      <el-upload
        ref="importUploadRef"
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        drag
        :on-change="onImportChange"
        style="margin-top: 16px"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">拖拽 Excel 到此处或 <em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">支持 .xlsx / .xls 格式</div>
        </template>
      </el-upload>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="importVisible = false">取消</el-button>
          <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="学生档案详情" width="640px">
      <div class="detail-header" v-if="detail">
        <el-avatar :size="64" :src="avatarSrc(detail.avatar) || undefined">
          {{ avatarText(detail.avatar) || (detail.name ? detail.name.slice(0, 1) : '') }}
        </el-avatar>
      </div>
      <el-descriptions :column="2" border v-if="detail">
        <el-descriptions-item label="学号">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ detail.gender }}</el-descriptions-item>
        <el-descriptions-item label="出生年月">{{ detail.birth }}</el-descriptions-item>
        <el-descriptions-item label="家长姓名">{{ detail.parent_name }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.phone }}</el-descriptions-item>
        <el-descriptions-item label="特长生类别">
          <div class="tag-group">
            <el-tag v-if="detail.is_sports === 1" type="success" size="small">体育生</el-tag>
            <el-tag v-if="detail.is_arts === 1" type="warning" size="small">艺术生</el-tag>
            <span v-if="detail.is_sports !== 1 && detail.is_arts !== 1" class="text-muted">普通学生</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="疾病/健康状况">
          <el-tag
            v-if="detail.health_condition && !['无', '良好', '健康', '正常', '良好无特殊病史'].includes(detail.health_condition.trim())"
            type="danger"
            size="small"
          >
            {{ detail.health_condition }}
          </el-tag>
          <span v-else class="text-health-good">{{ detail.health_condition || '健康良好/无特殊病史' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="特殊情况" :span="2">
          <el-tag v-if="detail.is_special === 1" type="danger">{{ detail.special_type || '是' }}</el-tag>
          <el-tag v-else type="info">否</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="家庭情况" :span="2">{{ detail.family_info || '—' }}</el-descriptions-item>
        <el-descriptions-item label="家庭住址" :span="2">{{ detail.address || '—' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  batchDeleteStudents,
  importStudents,
  exportStudents,
  uploadStudentAvatar
} from '../../api'

const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const exporting = ref(false)
const searchQuery = ref('')
const dialogVisible = ref(false)
const importVisible = ref(false)
const detailVisible = ref(false)
const importUploadRef = ref()
const formRef = ref()
const allStudents = ref([])
const filtered = ref([])
const detail = ref(null)
const importFile = ref(null)

// 批量操作：选中行
const selectedRows = ref([])
const handleSelectionChange = (val) => { selectedRows.value = val }

// 分页：当前页与每页条数
const currentPage = ref(1)
const pageSize = ref(20)

// 当前页数据（基于过滤后的数据切片）
const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const form = ref({
  id: null,
  name: '',
  gender: '男',
  birth: '',
  parent_name: '',
  phone: '',
  family_info: '',
  address: '',
  grade: '',
  class: '',
  is_special: 0,
  special_type: '',
  is_sports: 0,
  is_arts: 0,
  health_condition: '',
  remark: '',
  avatar: ''
})

// 常见健康/疾病情况快捷标签
const QUICK_HEALTH_TAGS = ['健康良好', '过敏体质', '哮喘病史', '心脏病史', '严重近视', '骨折康复期', '体质偏弱']
const setHealthTag = (tag) => {
  if (tag === '健康良好') {
    form.value.health_condition = '健康良好'
    return
  }
  if (!form.value.health_condition || form.value.health_condition === '健康良好') {
    form.value.health_condition = tag
  } else if (!form.value.health_condition.includes(tag)) {
    form.value.health_condition += `、${tag}`
  }
}

// 内置卡通头像：选择后存储为 emoji:xxx，上传头像存储为文件名
const BUILTIN_AVATARS = [
  { name: '小猫咪', emoji: '🐱' },
  { name: '小狗狗', emoji: '🐶' },
  { name: '大熊猫', emoji: '🐼' },
  { name: '小兔子', emoji: '🐰' },
  { name: '棕小熊', emoji: '🐻' },
  { name: '小狐狸', emoji: '🦊' },
  { name: '小老虎', emoji: '🐯' },
  { name: '小狮子', emoji: '🦁' },
  { name: '小青蛙', emoji: '🐸' },
  { name: '小企鹅', emoji: '🐧' },
  { name: '独角兽', emoji: '🦄' },
  { name: '小考拉', emoji: '🐨' }
]

const isEmojiAvatar = (v) => v && v.startsWith('emoji:')
// 上传头像的图片地址（卡通头像返回空，走文字渲染）
const avatarSrc = (v) => (v && !isEmojiAvatar(v) ? `/uploads/${v}` : '')
// 卡通头像的 emoji 字符（上传头像返回空）
const avatarText = (v) => (isEmojiAvatar(v) ? v.slice(6) : '')

// 头像上传相关：avatarFile 为新选择的文件，avatarPreview 为预览地址
const avatarUploadRef = ref()
const avatarFile = ref(null)
const avatarPreviewUrl = ref('')
const avatarPreview = computed(() => {
  if (avatarPreviewUrl.value) return { src: avatarPreviewUrl.value, text: '' }
  const a = form.value.avatar
  if (isEmojiAvatar(a)) return { src: '', text: a.slice(6) }
  return { src: a ? `/uploads/${a}` : '', text: form.value.name ? form.value.name.slice(0, 1) : '' }
})

// 选择卡通头像
const pickEmoji = (a) => {
  form.value.avatar = 'emoji:' + a.emoji
  avatarFile.value = null
  avatarPreviewUrl.value = ''
  if (avatarUploadRef.value) avatarUploadRef.value.clearFiles()
}

// 学生表单校验规则
const studentRules = {
  name: [{ required: true, whitespace: true, message: '请输入学生姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }]
}

const filterStudents = () => {
  if (!searchQuery.value) {
    filtered.value = allStudents.value
  } else {
    filtered.value = allStudents.value.filter((s) => s.name.includes(searchQuery.value))
  }
  // 搜索后重置到第一页
  currentPage.value = 1
}

const resetForm = () => {
  form.value = {
    id: null,
    name: '',
    gender: '男',
    birth: '',
    parent_name: '',
    phone: '',
    family_info: '',
    address: '',
    grade: '',
    class: '',
    is_special: 0,
    special_type: '',
    is_sports: 0,
    is_arts: 0,
    health_condition: '',
    remark: '',
    avatar: ''
  }
  avatarFile.value = null
  avatarPreviewUrl.value = ''
  if (avatarUploadRef.value) avatarUploadRef.value.clearFiles()
}

// 头像选择
const onAvatarChange = (file) => {
  avatarFile.value = file.raw
  avatarPreviewUrl.value = URL.createObjectURL(file.raw)
}

// 头像移除
const onAvatarRemove = () => {
  avatarFile.value = null
  avatarPreviewUrl.value = ''
}

const openCreate = () => {
  resetForm()
  dialogVisible.value = true
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const openEdit = (row) => {
  form.value = {
    ...row,
    is_sports: row.is_sports || 0,
    is_arts: row.is_arts || 0,
    health_condition: row.health_condition || ''
  }
  avatarFile.value = null
  avatarPreviewUrl.value = ''
  if (avatarUploadRef.value) avatarUploadRef.value.clearFiles()
  dialogVisible.value = true
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const viewDetail = (row) => {
  detail.value = row
  detailVisible.value = true
}

const loadStudents = async () => {
  loading.value = true
  try {
    allStudents.value = await getStudents()
    filterStudents()
  } catch (e) {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  try {
    // 校验通过再提交，失败时不弹 ElMessage（Element Plus 自动标红）
    await formRef.value.validate()
  } catch (e) {
    return
  }
  saving.value = true
  try {
    const payload = { ...form.value }
    if (payload.id) {
      await updateStudent(payload.id, payload)
      // 有新的头像文件时，保存信息后再上传头像
      if (avatarFile.value) {
        const fd = new FormData()
        fd.append('avatar', avatarFile.value)
        await uploadStudentAvatar(payload.id, fd)
      }
      ElMessage.success('更新成功')
    } else {
      const res = await createStudent(payload)
      if (avatarFile.value) {
        const fd = new FormData()
        fd.append('avatar', avatarFile.value)
        await uploadStudentAvatar(res.id, fd)
      }
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadStudents()
  } catch (e) {
    // 拦截器已提示
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id) => {
  try {
    await deleteStudent(id)
    ElMessage.success('删除成功')
    loadStudents()
  } catch (e) {
    // 拦截器已提示
  }
}

// 批量删除学生
const handleBatchDelete = async () => {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先选择学生')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedRows.value.length} 名学生？将同时删除其成绩、请假等关联数据。`,
      '提示',
      { type: 'warning' }
    )
  } catch (e) {
    // 用户取消
    return
  }
  try {
    const ids = selectedRows.value.map((r) => r.id)
    await batchDeleteStudents(ids)
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadStudents()
  } catch (e) {
    // 拦截器已提示
  }
}

const onImportChange = (file) => {
  importFile.value = file.raw
}

const handleImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请先选择 Excel 文件')
    return
  }
  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', importFile.value)
    const data = await importStudents(fd)
    ElMessage.success(`成功导入 ${data.imported} 名学生`)
    importVisible.value = false
    if (importUploadRef.value) importUploadRef.value.clearFiles()
    importFile.value = null
    loadStudents()
  } catch (e) {
    // 拦截器已提示
  } finally {
    importing.value = false
  }
}

// 导出学生花名册 Excel
const handleExport = async () => {
  exporting.value = true
  try {
    const blob = await exportStudents()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `学生花名册_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    // 拦截器已提示
  } finally {
    exporting.value = false
  }
}

onMounted(loadStudents)
</script>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.action-buttons {
  display: flex;
  gap: 10px;
}
.avatar-upload {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar-preview {
  flex-shrink: 0;
}
.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.avatar-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.avatar-opt:hover {
  background: #f5f7fa;
}
.avatar-opt.active {
  border-color: #409eff;
  background: #f0f7ff;
}
.avatar-opt-name {
  font-size: 11px;
  color: #606266;
  white-space: nowrap;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.detail-header {
  text-align: center;
  margin-bottom: 16px;
}
.tag-group {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}
.text-muted {
  color: #909399;
  font-size: 12px;
}
.text-health-good {
  color: #67c23a;
  font-size: 13px;
}
.quick-health-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.quick-tag-label {
  font-size: 12px;
  color: #909399;
}
.clickable-tag {
  cursor: pointer;
  user-select: none;
}
.clickable-tag:hover {
  opacity: 0.8;
}
</style>

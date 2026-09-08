<template>
  <div class="mobile-app-wrapper">
    <!-- 顶部导航栏 -->
    <header class="mobile-header">
      <div class="header-left"><button type="button" class="mobile-back" aria-label="返回班级首页" @click="router.push('/mobile')"><el-icon><ArrowLeft /></el-icon></button>
        <!-- 班级切换快捷入口 -->
        <button type="button" class="class-badge-btn" :disabled="classList.length <= 1" aria-label="切换班级" @click="openClassPicker"><el-icon><Notebook /></el-icon>
          <span class="class-name">{{ currentClassName || '加载中...' }}</span>
          <el-icon v-if="classList.length > 1" class="dropdown-icon"><ArrowDown /></el-icon>
        </button>
      </div>
      <div class="header-center">
        <span class="app-header-title">班级随手记</span>
      </div>
      <div class="header-right">
        <el-dropdown trigger="click" @command="handleUserCommand">
          <button type="button" class="user-avatar-badge" aria-label="账户菜单">
            <span class="teacher-name">{{ teacherName }}</span>
            <el-icon><UserFilled /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="desktop">
                <el-icon><Platform /></el-icon>电脑后台完整版
              </el-dropdown-item>
              <el-dropdown-item divided command="logout" style="color: #f56c6c">
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 顶部模式切换 Tab -->
    <div class="mobile-tabs-bar">
      <button type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'record' }"
        :aria-pressed="activeTab === 'record'"
        @click="activeTab = 'record'"
      >
        <el-icon><Lightning /></el-icon>
        <span>登记</span>
      </button>
      <button type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'list' }"
        :aria-pressed="activeTab === 'list'"
        @click="switchToListTab"
      >
        <el-icon><Document /></el-icon>
        <span>记录明细</span>
        <span class="tab-badge" v-if="stats.today_total">{{ stats.today_total }}</span>
      </button>
    </div>

    <!-- 主视口内容区 -->
    <main class="mobile-main-scroll">
      <!-- 页面 1：极速登记模式 (打开移动端直接展示此页面) -->
      <section v-show="activeTab === 'record'" class="record-view">
        <div class="mobile-page-heading">
          <span class="page-eyebrow">{{ currentClassName || '班级工作空间' }}</span>
          <h1>记录日常，陪伴成长</h1>
          <p>及时记录每一件小事，让跟进更有依据。</p>
        </div>
        <div class="mobile-section-card">
          <div class="section-title-row"><div class="title-left"><span class="step-num">01</span><h2 class="step-title">选择学生</h2></div><span class="section-hint">可多选</span></div>
          <StudentPicker :students="students" :selected="form.student_ids" :loading="studentsLoading" :failed="studentsFailed" @toggle="toggleStudent" @select-visible="selectVisibleStudents" @clear="clearSelectedStudents" @retry="loadInitialData" />
        </div>

        <!-- 第2步：违纪类型大按钮点选 -->
        <div class="mobile-section-card">
          <div class="section-title-row">
            <div class="title-left">
              <span class="step-num">02</span>
              <h2 class="step-title">违纪类型</h2>
            </div>
          </div>

          <div class="type-cards-grid">
            <button type="button"
              v-for="t in TYPE_OPTIONS"
              :key="t.value"
              class="type-touch-card"
              :class="{ active: form.type === t.value }"
              :aria-pressed="form.type === t.value"
              @click="selectType(t.value)"
            >
              <el-icon class="type-icon"><component :is="t.icon" /></el-icon>
              <span class="type-name">{{ t.label }}</span>
            </button>
          </div>

          <el-input
            v-if="form.type === '其他'"
            v-model="customType"
            placeholder="请输入自定义违纪类型"
            aria-label="自定义违纪类型"
            size="default"
            style="margin-top: 10px"
          />
        </div>

        <!-- 第3步：事由与快捷短语 -->
        <div class="mobile-section-card">
          <div class="section-title-row">
            <div class="title-left">
              <span class="step-num">03</span>
              <h2 class="step-title">发生了什么</h2>
            </div>
          </div>

          <!-- 常用事由标签（点选即填入） -->
          <div class="preset-chips-box">
            <button type="button"
              v-for="p in currentPresetPhrases"
              :key="p"
              class="preset-chip"
              :class="{ chosen: form.description.includes(p) }"
              @click="appendPhrase(p)"
            >
              {{ p }}
            </button>
          </div>

          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="补充具体情况，也可点选上方短语"
            aria-label="违纪详情"
            class="mt-8"
          />
        </div>

        <!-- 第4步：处理措施 -->
        <div class="mobile-section-card">
          <div class="section-title-row">
            <div class="title-left">
              <span class="step-num">04</span>
              <h2 class="step-title">处理与跟进</h2>
            </div>
          </div>

          <details class="handling-presets">
            <summary>选择常用处理措施</summary>
            <div class="preset-chips-box">
            <button type="button"
              v-for="h in PRESET_HANDLINGS"
              :key="h"
              class="preset-chip handling-chip"
              :class="{ chosen: form.handling === h }"
              :aria-pressed="form.handling === h"
              @click="form.handling = h"
            >
              {{ h }}
            </button>
            </div>
          </details>

          <el-input
            v-model="form.handling"
            placeholder="记录已采取的处理措施"
            aria-label="处理措施"
            size="default"
            class="mt-8"
          />
        </div>

        <!-- 第5步：日期与严重程度 -->
        <div class="mobile-section-card">
          <div class="meta-flex-row">
            <div class="meta-item">
              <span class="meta-label">发生日期</span>
              <input v-model="form.incident_date" type="date" class="native-date" aria-label="发生日期" />
            </div>
            <div class="meta-item">
              <span class="meta-label">严重程度</span>
              <el-radio-group v-model="form.severity" size="default">
                <el-radio-button label="轻微">轻微</el-radio-button>
                <el-radio-button label="一般">一般</el-radio-button>
                <el-radio-button label="严重">严重</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </div>

        <!-- 底部占位 -->
        <div class="bottom-spacer"></div>
      </section>

      <!-- 页面 2：违纪明细列表 -->
      <section v-show="activeTab === 'list'" class="list-view">
        <div class="mobile-page-heading"><span class="page-eyebrow">班级记录</span><h1>每一次记录，都有迹可循</h1><p>回顾日常表现，持续关注与跟进。</p></div>
        <!-- 统计指标小卡片 -->
        <div class="stats-mini-row">
          <div class="mini-stat-box danger">
            <span class="stat-num">{{ stats.current_month_total }}</span>
            <span class="stat-desc">本月违纪人次</span>
          </div>
          <div class="mini-stat-box warning">
            <span class="stat-num">{{ stats.current_month_talking }}</span>
            <span class="stat-desc">本月讲话</span>
          </div>
          <div class="mini-stat-box purple">
            <span class="stat-num">{{ stats.current_month_late }}</span>
            <span class="stat-desc">本月迟到</span>
          </div>
        </div>

        <!-- 筛选过滤 -->
        <div class="list-filter-bar">
          <el-radio-group v-model="listScope" size="small" @change="loadRecords">
            <el-radio-button label="today">今日记录</el-radio-button>
            <el-radio-button label="current">本月活跃</el-radio-button>
            <el-radio-button label="all">全部历史</el-radio-button>
          </el-radio-group>

          <el-select
            v-model="listFilterType"
            size="small"
            placeholder="全部类型"
            clearable
            style="width: 100px"
          >
            <el-option label="全部" value="" />
            <el-option label="讲话" value="讲话" />
            <el-option label="迟到" value="迟到" />
            <el-option label="走动打闹" value="走动打闹" />
            <el-option label="未交作业" value="未交作业" />
            <el-option label="其他" value="其他" />
          </el-select>
        </div>

        <div class="list-result-heading"><span>记录列表 · {{ filteredRecords.length }} 条</span><button type="button" class="refresh-button" :disabled="recordsLoading" @click="loadRecords">刷新</button></div>
        <!-- 记录卡片列表 -->
        <div class="record-card-list" v-loading="recordsLoading">
          <div
            v-for="item in filteredRecords"
            :key="item.id"
            class="record-item-card"
          >
            <div class="record-card-top">
              <div class="record-student-info">
                <el-avatar :size="32" :src="avatarSrc(item.avatar) || undefined">
                  {{ avatarText(item.avatar) || (item.student_name ? item.student_name.slice(0, 1) : '') }}
                </el-avatar>
                <div class="record-name-col">
                  <span class="student-name-text">{{ item.student_name || '已删除学生' }}</span>
                  <span class="incident-date-text">{{ item.incident_date }}</span>
                </div>
              </div>
              <div class="record-tags-row">
                <el-tag :type="typeTag(item.type)" size="small" effect="light">
                  {{ item.type }}
                </el-tag>
                <el-tag :type="severityTag(item.severity)" size="small" effect="plain">
                  {{ item.severity || '一般' }}
                </el-tag>
              </div>
            </div>

            <div class="record-card-mid" v-if="item.description || item.handling">
              <div class="record-info-row" v-if="item.description">
                <span class="row-label">事由：</span>
                <span class="row-val">{{ item.description }}</span>
              </div>
              <div class="record-info-row" v-if="item.handling">
                <span class="row-label">处理：</span>
                <span class="row-val text-success">{{ item.handling }}</span>
              </div>
            </div>

            <div class="record-card-bot">
              <span class="record-id">编号 #{{ item.id }}</span>
              <el-popconfirm title="确认删除此条违纪记录？" @confirm="handleDeleteRecord(item.id)">
                <template #reference>
                  <el-button link type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>

          <el-empty
            v-if="!recordsLoading && filteredRecords.length === 0"
            description="暂无对应违纪记录"
            :image-size="70"
          />
        </div>

        <!-- 底部切换电脑端入口 -->
        <div class="desktop-switch-footer">
          <el-button text type="primary" size="small" @click="goToDesktop">
            <el-icon><Platform /></el-icon>
            <span>切换到电脑后台完整版</span>
          </el-button>
        </div>

        <div class="bottom-spacer"></div>
      </section>
    </main>

    <!-- 极速登记模式下的固定吸底按钮栏 -->
    <footer v-show="activeTab === 'record'" class="mobile-action-footer">
      <div class="submit-summary" aria-live="polite"><strong>{{ form.student_ids.length ? `已选 ${form.student_ids.length} 人` : '尚未选择学生' }}</strong><span>{{ form.type === '其他' ? (customType || '其他') : form.type }} · {{ form.severity }}</span></div>
      <el-button
        type="primary"
        size="large"
        class="submit-action-btn"
        :loading="submitting"
        :disabled="form.student_ids.length === 0"
        @click="handleSubmit"
      >
        <el-icon><Check /></el-icon>
        <span>{{ form.student_ids.length ? `登记 ${form.student_ids.length} 人` : '请先选择学生' }}</span>
      </el-button>
    </footer>

    <!-- 班级选择抽屉（多班级支持） -->
    <el-drawer
      v-model="classPickerVisible"
      direction="btt"
      size="45%"
      :with-header="false"
      class="class-picker-drawer"
    >
      <div class="drawer-header-title">选择当前班级</div>
      <div class="class-options-list">
        <button type="button"
          v-for="c in classList"
          :key="c.id"
          class="class-pick-item"
          :class="{ active: c.id === currentClassId }"
          :aria-pressed="c.id === currentClassId"
          @click="selectClass(c.id)"
        >
          <span class="class-pick-name">{{ c.name }}</span>
          <span class="class-pick-count">{{ c.student_count }} 人</span>
          <el-icon v-if="c.id === currentClassId" class="active-check"><Check /></el-icon>
        </button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Lightning,
  Document,
  ArrowDown,
  UserFilled,
  Platform,
  SwitchButton,
  Check
} from '@element-plus/icons-vue'
import {
  getStudents,
  createDiscipline,
  getDisciplines,
  getDisciplineStats,
  deleteDiscipline,
  getClasses,
  getSettings
} from '../../api'
import StudentPicker from '../../components/mobile/StudentPicker.vue'
import { switchToDesktop } from '../../utils/device'

const router = useRouter()
const localToday = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 状态管理
const activeTab = ref('record') // 'record' 或 'list'
const submitting = ref(false)
const recordsLoading = ref(false)
const classPickerVisible = ref(false)

// 班级与教师信息
const classList = ref([])
const currentClassId = ref(null)
const teacherName = ref('陈老师')

const currentClassName = computed(() => {
  const c = classList.value.find((c) => c.id === currentClassId.value)
  return c ? c.name : ''
})

// 学生数据
const students = ref([])
const studentsLoading = ref(true)
const studentsFailed = ref(false)

// 表单状态
const form = ref({
  student_ids: [],
  type: '讲话',
  incident_date: localToday(),
  severity: '一般',
  description: '自习课随意讲话',
  handling: '口头批评教育并已纠正'
})
const customType = ref('')

// 统计与列表数据
const stats = ref({
  current_month_total: 0,
  current_month_talking: 0,
  current_month_late: 0,
  today_total: 0
})
const allRecords = ref([])
const listScope = ref('today') // 'today', 'current', 'all'
const listFilterType = ref('')

// 违纪类型定义
const TYPE_OPTIONS = [
  { value: '讲话', label: '课堂讲话', icon: 'ChatDotRound' },
  { value: '迟到', label: '出勤迟到', icon: 'Clock' },
  { value: '走动打闹', label: '走动打闹', icon: 'Position' },
  { value: '未交作业', label: '未交作业', icon: 'EditPen' },
  { value: '其他', label: '其他', icon: 'More' }
]

// 联动常用短语
const TYPE_PRESETS = {
  讲话: [
    '自习课随意讲话',
    '课堂接话起哄',
    '屡次提醒仍讲话',
    '交头接耳影响他人',
    '午休期间喧哗'
  ],
  迟到: [
    '早读迟到10分钟',
    '第一节课迟到',
    '下午上课迟到',
    '午休返校迟到',
    '出操集合迟到'
  ],
  走动打闹: [
    '上课擅自离开座位',
    '课间追逐打闹',
    '自习课嬉戏推搡'
  ],
  未交作业: [
    '未按时提交作业',
    '早读未交作业',
    '抄袭他人作业'
  ],
  其他: [
    '课堂睡觉',
    '违规使用手机',
    '顶撞班干部'
  ]
}

const PRESET_HANDLINGS = [
  '口头批评教育并已纠正',
  '课后谈心提醒注意纪律',
  '通知家长沟通协同教育',
  '已写情况说明反思',
  '罚做班级卫生一日'
]

const currentPresetPhrases = computed(() => {
  return TYPE_PRESETS[form.value.type] || TYPE_PRESETS.讲话
})

// 违纪明细过滤
const filteredRecords = computed(() => {
  let list = allRecords.value
  const todayStr = localToday()
  if (listScope.value === 'today') {
    list = list.filter((r) => r.incident_date === todayStr)
  }
  if (listFilterType.value) {
    list = list.filter((r) => r.type === listFilterType.value)
  }
  return list
})

// 头像辅助
const isEmojiAvatar = (v) => v && v.startsWith('emoji:')
const avatarSrc = (v) => (v && !isEmojiAvatar(v) ? `/uploads/${v}` : '')
const avatarText = (v) => (isEmojiAvatar(v) ? v.slice(6) : '')

// 标签样式
const typeTag = (t) => {
  if (t === '讲话') return 'warning'
  if (t === '迟到') return 'danger'
  if (t === '走动打闹') return 'warning'
  if (t === '未交作业') return 'info'
  return 'primary'
}

const severityTag = (s) => {
  if (s === '严重') return 'danger'
  if (s === '轻微') return 'info'
  return 'warning'
}

// 勾选/反选学生
const toggleStudent = (id) => {
  const idx = form.value.student_ids.indexOf(id)
  if (idx > -1) {
    form.value.student_ids.splice(idx, 1)
  } else {
    form.value.student_ids.push(id)
  }
}

const selectVisibleStudents = (ids) => {
  form.value.student_ids = [...new Set([...form.value.student_ids, ...ids])]
}

const clearSelectedStudents = () => {
  form.value.student_ids = []
}

// 选择违纪类型
const selectType = (t) => {
  form.value.type = t
  if (TYPE_PRESETS[t] && TYPE_PRESETS[t][0]) {
    form.value.description = TYPE_PRESETS[t][0]
  }
}

// 点击常用标签追加事由
const appendPhrase = (text) => {
  if (!form.value.description) {
    form.value.description = text
  } else if (!form.value.description.includes(text)) {
    form.value.description += `；${text}`
  }
}

// 提交违纪登记
const handleSubmit = async () => {
  if (submitting.value) return
  if (!form.value.student_ids.length) {
    ElMessage.warning('请选择至少一位学生')
    return
  }
  const typeVal = form.value.type === '其他' && customType.value.trim()
    ? customType.value.trim()
    : form.value.type

  submitting.value = true
  try {
    await createDiscipline({
      student_ids: form.value.student_ids,
      type: typeVal,
      incident_date: form.value.incident_date || localToday(),
      severity: form.value.severity,
      description: form.value.description,
      handling: form.value.handling
    })
    ElMessage.success(`成功为 ${form.value.student_ids.length} 位同学登记违纪`)

    // 登记完成后清空学生选择，保留常用配置便于下一轮继续
    form.value.student_ids = []
    loadStats()
  } catch (e) {
  } finally {
    submitting.value = false
  }
}

// 切换到列表 Tab
const switchToListTab = () => {
  activeTab.value = 'list'
  loadRecords()
}

// 加载统计与记录
const loadStats = async () => {
  try {
    const res = await getDisciplineStats()
    stats.value = res || {}
    // 计算今日记录
    const todayStr = localToday()
    const records = await getDisciplines({ scope: 'current' })
    stats.value.today_total = (records || []).filter((r) => r.incident_date === todayStr).length
  } catch (e) {}
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const params = {}
    if (listScope.value === 'current' || listScope.value === 'today') {
      params.scope = 'current'
    }
    allRecords.value = (await getDisciplines(params)) || []
  } catch (e) {
  } finally {
    recordsLoading.value = false
  }
}

// 删除单条记录
const handleDeleteRecord = async (id) => {
  try {
    await deleteDiscipline(id)
    ElMessage.success('已删除违纪记录')
    loadRecords()
    loadStats()
  } catch (e) {}
}

// 班级加载与切换
const loadClassesData = async () => {
  try {
    const res = await getClasses()
    classList.value = res || []
    const saved = parseInt(localStorage.getItem('currentClassId'), 10)
    const exists = classList.value.some((c) => c.id === saved)
    const target = exists
      ? saved
      : (classList.value.find((c) => c.is_default) || classList.value[0] || {}).id
    currentClassId.value = target ?? null
    localStorage.setItem('currentClassId', String(target ?? ''))
  } catch (e) {}
}

const openClassPicker = () => {
  if (classList.value.length > 1) {
    classPickerVisible.value = true
  }
}

const selectClass = (id) => {
  localStorage.setItem('currentClassId', String(id))
  classPickerVisible.value = false
  window.location.reload()
}

// 加载学生与教师
const loadInitialData = async () => {
  studentsLoading.value = true
  studentsFailed.value = false
  try {
    await loadClassesData()
    students.value = (await getStudents()) || []
    const teacherRes = await getSettings()
    if (teacherRes && teacherRes.teacher_name) {
      teacherName.value = teacherRes.teacher_name
    }
    loadStats()
  } catch (e) {
    studentsFailed.value = true
  } finally {
    studentsLoading.value = false
  }
}

// 用户菜单命令
const handleUserCommand = (cmd) => {
  if (cmd === 'desktop') {
    goToDesktop()
  } else if (cmd === 'logout') {
    ElMessageBox.confirm('确认退出登录？', '提示', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消'
    }).then(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      router.push('/login')
    }).catch(() => {})
  }
}

const goToDesktop = () => {
  switchToDesktop()
}

onMounted(() => {
  loadInitialData()
})
</script>

<style scoped>
.mobile-back { border: 0; background: transparent; min-width: 40px; min-height: 44px; padding: 8px; color: #5d5b54; font-size: 18px; }
.mobile-app-wrapper { display: flex; flex-direction: column; height: 100vh; height: 100dvh; width: 100%; max-width: 640px; margin: 0 auto; background: #fff; overflow: hidden; position: relative; color: #37352f; }
.mobile-header { min-height: 60px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: env(safe-area-inset-top, 0px) 20px 0; border-bottom: 1px solid #ede9e4; flex-shrink: 0; background: #fff; }
.header-left, .header-right { display: flex; align-items: center; min-width: 0; }
.header-left { flex: 1; }
.class-badge-btn { display: flex; align-items: center; gap: 7px; max-width: 100%; min-height: 44px; border: 0; background: transparent; padding: 0; color: #37352f; font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.class-badge-btn:disabled { cursor: default; }
.class-badge-btn > .el-icon { font-size: 18px; flex-shrink: 0; }
.class-name { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.class-badge-btn > .dropdown-icon { font-size: 10px; }
.header-center { display: none; }
.user-avatar-badge { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; border: 0; background: transparent; color: #787671; font-size: 12px; padding: 0 4px; cursor: pointer; }
.user-avatar-badge > .el-icon { display: grid; width: 28px; height: 28px; border: 1px solid #e5e3df; border-radius: 50%; background: #f6f5f4; }
.teacher-name { max-width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mobile-tabs-bar { display: flex; flex-shrink: 0; height: 49px; gap: 24px; padding: 0 20px; border-bottom: 1px solid #ede9e4; background: #fff; }
.tab-btn { display: flex; align-items: center; gap: 7px; background: transparent; border: 0; border-bottom: 2px solid transparent; color: #787671; padding: 0 2px; font-size: 13px; cursor: pointer; }
.tab-btn.active { color: #37352f; border-bottom-color: #37352f; font-weight: 600; }
.tab-badge { display: grid; place-items: center; background: #f0eeec; color: #5d5b54; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 4px; font-size: 10px; }
.mobile-main-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain; padding: 0 20px; scroll-padding-block: 20px; }
.mobile-page-heading { padding: 27px 0 24px; }
.page-eyebrow { color: #787671; font-size: 11px; }
.mobile-page-heading h1 { margin: 10px 0; font-size: 24px; line-height: 1.4; font-weight: 650; letter-spacing: -.7px; }
.mobile-page-heading p { color: #787671; font-size: 12px; line-height: 1.7; margin: 0; }
.mobile-section-card { padding: 22px 0; border-top: 1px solid #ede9e4; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.title-left { display: flex; align-items: center; gap: 10px; }
.step-num { font-size: 11px; font-variant-numeric: tabular-nums; color: #a4a097; }
.step-title { margin: 0; font-size: 14px; font-weight: 600; }
.section-hint { font-size: 11px; color: #787671; }
.type-cards-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.type-touch-card { display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 46px; padding: 8px 4px; border: 1px solid #e5e3df; border-radius: 7px; background: #fff; color: #5d5b54; font-size: 12px; cursor: pointer; }
.type-icon { color: #787671; font-size: 17px; flex-shrink: 0; }
.type-touch-card.active { border-color: #9484d6; background: #f6f3fc; color: #5645d4; }
.type-touch-card.active .type-icon { color: #5645d4; }
.preset-chips-box { display: flex; flex-wrap: wrap; gap: 7px; }
.preset-chip { min-height: 38px; padding: 8px 10px; border: 1px solid #e5e3df; border-radius: 6px; background: #fafaf9; font-size: 11px; color: #5d5b54; text-align: left; line-height: 1.5; cursor: pointer; }
.preset-chip.chosen { background: #f0edf9; border-color: #ded7f1; color: #5645d4; }
.handling-presets summary { min-height: 44px; padding: 10px 0; color: #787671; font-size: 12px; cursor: pointer; }
.handling-presets[open] .preset-chips-box { padding: 6px 0; }
.mt-8 { margin-top: 12px; }
.mobile-app-wrapper :deep(.el-textarea__inner) { padding: 12px; line-height: 1.7; min-height: 84px !important; }
.mobile-app-wrapper :deep(.el-input__wrapper) { min-height: 42px; }
.mobile-app-wrapper :deep(.el-input__inner), .mobile-app-wrapper :deep(.el-textarea__inner) { font-size: 16px; }
.meta-flex-row { display: flex; flex-direction: column; gap: 18px; }
.meta-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.meta-label { color: #787671; font-size: 12px; white-space: nowrap; }
.native-date { min-width: 0; width: 170px; min-height: 42px; border: 1px solid #e5e3df; border-radius: 7px; color: #37352f; background: #fff; padding: 8px; font: inherit; font-size: 16px; }
.meta-item :deep(.el-radio-button__inner) { padding: 12px 14px; }
.bottom-spacer { height: 18px; }
.mobile-action-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-shrink: 0; padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px)); background: #fff; border-top: 1px solid #e5e3df; }
.submit-summary { display: flex; flex-direction: column; min-width: 0; gap: 5px; }
.submit-summary strong { font-size: 12px; font-weight: 500; }
.submit-summary span { color: #787671; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.submit-action-btn { min-width: 155px; height: 46px; font-size: 13px; }
.stats-mini-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid #e5e3df; border-radius: 10px; padding: 18px 0; margin-bottom: 24px; }
.mini-stat-box { display: flex; flex-direction: column; gap: 8px; padding: 0 12px; border-right: 1px solid #ede9e4; }
.mini-stat-box:last-child { border: 0; }
.stat-num { font-size: 27px; font-weight: 600; line-height: 1.2; letter-spacing: -.5px; }
.stat-desc { font-size: 10px; color: #787671; }
.list-filter-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #ede9e4; }
.list-filter-bar :deep(.el-radio-button__inner) { padding: 12px 10px; font-size: 12px; }
.list-filter-bar :deep(.el-select) { flex: 1; min-width: 110px; }
.list-filter-bar :deep(.el-select__wrapper) { min-height: 40px; }
.list-result-heading { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #787671; padding: 10px 0; }
.refresh-button { min-height: 44px; background: transparent; border: 0; font-size: 12px; color: #5d5b54; cursor: pointer; }
.record-card-list { display: flex; flex-direction: column; gap: 12px; min-height: 100px; }
.record-item-card { padding: 16px; border: 1px solid #e5e3df; border-radius: 10px; }
.record-card-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.record-student-info { display: flex; align-items: center; gap: 9px; min-width: 0; }
.record-name-col { display: flex; flex-direction: column; gap: 5px; }
.student-name-text { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.incident-date-text { font-size: 11px; color: #787671; }
.record-tags-row { display: flex; gap: 5px; flex-wrap: wrap; }
.record-card-mid { display: flex; flex-direction: column; gap: 10px; padding: 16px 0 10px; font-size: 12px; }
.record-info-row { display: flex; align-items: baseline; gap: 5px; line-height: 1.8; }
.row-label { flex-shrink: 0; color: #787671; }
.row-val { overflow-wrap: anywhere; }
.record-card-bot { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ede9e4; margin-top: 6px; padding-top: 6px; }
.record-card-bot :deep(.el-button) { min-height: 40px; }
.record-id { font-size: 10px; color: #787671; }
.desktop-switch-footer { text-align: center; margin: 28px 0 12px; }
.drawer-header-title { font-size: 18px; font-weight: 600; padding-bottom: 20px; }
.class-options-list { display: flex; flex-direction: column; gap: 8px; padding-bottom: env(safe-area-inset-bottom, 0px); }
.class-pick-item { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 52px; padding: 12px; text-align: left; border: 1px solid #e5e3df; border-radius: 8px; color: #37352f; background: #fafaf9; cursor: pointer; }
.class-pick-item.active { background: #f6f3fc; border-color: #9484d6; }
.class-pick-name { flex: 1; font-size: 14px; overflow-wrap: anywhere; }
.class-pick-count { font-size: 12px; color: #787671; }
.active-check { color: #5645d4; }
@media (max-width: 350px) { .mobile-header, .mobile-tabs-bar { padding-left: 16px; padding-right: 16px; } .mobile-main-scroll { padding: 0 16px; } .mobile-page-heading h1 { font-size: 22px; } .mobile-action-footer { padding-left: 16px; padding-right: 16px; gap: 8px; } .submit-action-btn { min-width: 140px; } }
@media (min-width: 641px) { .mobile-app-wrapper { border-left: 1px solid #ede9e4; border-right: 1px solid #ede9e4; } }
</style>

<template>
  <div class="disciplines-container">
    <!-- 顶部数据概览卡片：Notion Pastel Feature Tints -->
    <el-row :gutter="16" class="mb-16">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card stat-rose">
          <div class="stat-inner">
            <div class="stat-icon-wrapper icon-rose">
              <el-icon class="stat-icon text-rose"><WarningFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">本月违纪人次</div>
              <div class="stat-value text-rose">{{ stats.current_month_total }}</div>
              <div class="stat-hint">每月自动重新统计</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card stat-peach">
          <div class="stat-inner">
            <div class="stat-icon-wrapper icon-peach">
              <el-icon class="stat-icon text-peach"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">本月课堂讲话</div>
              <div class="stat-value text-peach">{{ stats.current_month_talking }}</div>
              <div class="stat-hint">讲话 / 喧哗违纪</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card stat-lavender">
          <div class="stat-inner">
            <div class="stat-icon-wrapper icon-lavender">
              <el-icon class="stat-icon text-lavender"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">本月出勤迟到</div>
              <div class="stat-value text-lavender">{{ stats.current_month_late }}</div>
              <div class="stat-hint">早读 / 课堂迟到</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card stat-sky">
          <div class="stat-inner">
            <div class="stat-icon-wrapper icon-sky">
              <el-icon class="stat-icon text-sky"><Collection /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">历史全部记录</div>
              <div class="stat-value text-sky">{{ stats.all_time_total }}</div>
              <div class="stat-hint">全部档案永久保留</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 规则说明 Alert -->
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb-16 rule-alert"
      :title="`清零与归档机制：违纪统计按自然月（当前统计月：${stats.current_month || '当月'}）自动清零；所有历史违纪记录永久保留在档案库中，可随时按月份或切换到「全部历史」追溯查阅。`"
    />

    <el-card shadow="never">
      <template #header>
        <div class="header-actions">
          <!-- 左侧筛选工具栏 -->
          <div class="filter-toolbar">
            <el-radio-group v-model="viewScope" size="default" @change="handleScopeChange">
              <el-radio-button label="current">本月活跃记录</el-radio-button>
              <el-radio-button label="all">全部历史档案</el-radio-button>
            </el-radio-group>

            <el-date-picker
              v-if="viewScope === 'all'"
              v-model="filterMonth"
              type="month"
              placeholder="选择月份检索"
              value-format="YYYY-MM"
              clearable
              style="width: 140px"
              @change="loadData"
            />

            <el-select
              v-model="filterType"
              placeholder="违纪类型"
              clearable
              style="width: 130px"
              @change="applyFilter"
            >
              <el-option label="全部类型" value="" />
              <el-option label="讲话" value="讲话" />
              <el-option label="迟到" value="迟到" />
              <el-option label="走动打闹" value="走动打闹" />
              <el-option label="未交作业" value="未交作业" />
              <el-option label="其他" value="其他" />
            </el-select>

            <el-select
              v-model="filterStudentId"
              placeholder="按学生筛选"
              clearable
              filterable
              style="width: 150px"
              @change="applyFilter"
            >
              <el-option label="全部学生" :value="null" />
              <el-option
                v-for="s in students"
                :key="s.id"
                :label="s.name"
                :value="s.id"
              />
            </el-select>
          </div>

          <!-- 右侧操作按钮组 -->
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
              <el-icon><Download /></el-icon>导出 Excel
            </el-button>
            <el-button type="warning" plain class="mobile-quick-btn" @click="openQuickRecord">
              <el-icon><Lightning /></el-icon>极速记违纪
            </el-button>
            <el-button type="primary" @click="openCreate">
              <el-icon><Plus /></el-icon>录入违纪
            </el-button>
          </div>
        </div>
      </template>

      <!-- 桌面端表格视图 -->
      <div class="desktop-only-table">
        <el-table
          :data="pagedData"
          style="width: 100%"
          v-loading="loading"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column prop="id" label="编号" width="70" align="center" />
          <el-table-column label="学生" width="130">
            <template #default="scope">
              <div class="student-cell">
                <el-avatar :size="28" :src="avatarSrc(scope.row.avatar) || undefined">
                  {{ avatarText(scope.row.avatar) || (scope.row.student_name ? scope.row.student_name.slice(0, 1) : '') }}
                </el-avatar>
                <span class="student-name">{{ scope.row.student_name || '已删除学生' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="违纪类型" width="110" align="center">
            <template #default="scope">
              <el-tag :type="typeTag(scope.row.type)" effect="light">
                {{ scope.row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="incident_date" label="发生日期" width="120" align="center" sortable />
          <el-table-column label="严重程度" width="90" align="center">
            <template #default="scope">
              <el-tag :type="severityTag(scope.row.severity)" size="small" effect="plain">
                {{ scope.row.severity || '一般' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="违纪详情/事由" min-width="180" show-overflow-tooltip />
          <el-table-column prop="handling" label="处理结果/措施" width="160" show-overflow-tooltip>
            <template #default="scope">
              <span>{{ scope.row.handling || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="周期状态" width="100" align="center">
            <template #default="scope">
              <el-tag v-if="scope.row.is_current_month" type="danger" size="small" effect="light">
                本月活跃
              </el-tag>
              <el-tag v-else type="info" size="small" effect="plain">
                历史归档
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right" align="center">
            <template #default="scope">
              <el-button link type="primary" size="small" @click="openEdit(scope.row)">编辑</el-button>
              <el-popconfirm title="确定删除该条违纪记录吗？" @confirm="handleDelete(scope.row.id)">
                <template #reference>
                  <el-button link type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 移动端卡片式流式列表视图 -->
      <div class="mobile-card-list" v-loading="loading">
        <div
          v-for="row in pagedData"
          :key="row.id"
          class="mobile-item-card"
        >
          <div class="mobile-card-header">
            <div class="mobile-card-student">
              <el-avatar :size="32" :src="avatarSrc(row.avatar) || undefined">
                {{ avatarText(row.avatar) || (row.student_name ? row.student_name.slice(0, 1) : '') }}
              </el-avatar>
              <div class="mobile-student-meta">
                <span class="mobile-student-name">{{ row.student_name || '已删除学生' }}</span>
                <span class="mobile-incident-date">{{ row.incident_date }}</span>
              </div>
            </div>
            <div class="mobile-card-tags">
              <el-tag :type="typeTag(row.type)" size="small" effect="light">{{ row.type }}</el-tag>
              <el-tag :type="severityTag(row.severity)" size="small" effect="plain">{{ row.severity || '一般' }}</el-tag>
            </div>
          </div>

          <div class="mobile-card-body">
            <div class="mobile-card-row" v-if="row.description">
              <span class="row-label">事由：</span>
              <span class="row-value">{{ row.description }}</span>
            </div>
            <div class="mobile-card-row" v-if="row.handling">
              <span class="row-label">处理：</span>
              <span class="row-value text-handling">{{ row.handling }}</span>
            </div>
          </div>

          <div class="mobile-card-footer">
            <div class="status-indicator">
              <el-tag v-if="row.is_current_month" type="danger" size="small" effect="light">本月活跃</el-tag>
              <el-tag v-else type="info" size="small" effect="plain">历史归档</el-tag>
            </div>
            <div class="mobile-card-btns">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-popconfirm title="确定删除该条违纪记录吗？" @confirm="handleDelete(row.id)">
                <template #reference>
                  <el-button link type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
        <el-empty v-if="!loading && pagedData.length === 0" description="暂无违纪记录" :image-size="70" />
      </div>

      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[15, 30, 50, 100]"
          :total="filteredRecords.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <!-- 录入/编辑违纪对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '修改违纪记录' : '录入学生违纪'"
      width="580px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <!-- 新增时支持批量选择多位同学 -->
        <el-form-item v-if="!isEdit" label="违纪学生" prop="student_ids">
          <el-select
            v-model="form.student_ids"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择学生（支持多选）"
            style="width: 100%"
          >
            <el-option
              v-for="s in students"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
          <div class="form-tip">支持同时勾选多位学生批量登记（如：集体讲话、共同迟到）</div>
        </el-form-item>

        <!-- 编辑时单选学生 -->
        <el-form-item v-else label="违纪学生" prop="student_id">
          <el-select
            v-model="form.student_id"
            filterable
            placeholder="请选择学生"
            style="width: 100%"
          >
            <el-option
              v-for="s in students"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="违纪类型" prop="type">
          <div class="type-selection">
            <el-radio-group v-model="form.type" size="small">
              <el-radio-button label="讲话">讲话</el-radio-button>
              <el-radio-button label="迟到">迟到</el-radio-button>
              <el-radio-button label="走动打闹">走动打闹</el-radio-button>
              <el-radio-button label="未交作业">未交作业</el-radio-button>
              <el-radio-button label="其他">其他</el-radio-button>
            </el-radio-group>
            <el-input
              v-if="form.type === '其他' || !['讲话', '迟到', '走动打闹', '未交作业', '其他'].includes(form.type)"
              v-model="customType"
              placeholder="请输入自定义违纪类型"
              style="margin-top: 8px"
              @input="onCustomTypeInput"
            />
          </div>
        </el-form-item>

        <el-form-item label="发生日期" prop="incident_date">
          <el-date-picker
            v-model="form.incident_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择违纪日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="严重程度">
          <el-radio-group v-model="form.severity">
            <el-radio label="轻微">轻微</el-radio>
            <el-radio label="一般">一般</el-radio>
            <el-radio label="严重">严重</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="违纪事由" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请描述具体违纪行为与情境"
          />
          <!-- 快捷填入标签 -->
          <div class="quick-phrases">
            <span class="quick-phrase-label">快捷事由：</span>
            <el-tag
              v-for="p in QUICK_DESCRIPTIONS"
              :key="p"
              size="small"
              class="clickable-tag"
              @click="setQuickDesc(p)"
            >
              {{ p }}
            </el-tag>
          </div>
        </el-form-item>

        <el-form-item label="处理结果">
          <el-input
            v-model="form.handling"
            placeholder="如：口头批评教育、课后谈心、通知家长协同教育等"
          />
          <div class="quick-phrases">
            <span class="quick-phrase-label">快捷处理：</span>
            <el-tag
              v-for="h in QUICK_HANDLINGS"
              :key="h"
              size="small"
              class="clickable-tag"
              @click="form.handling = h"
            >
              {{ h }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">保存记录</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 移动端悬浮极速记违纪按钮 (FAB) -->
    <div class="mobile-fab-btn" @click="openQuickRecord">
      <el-icon class="fab-icon"><Lightning /></el-icon>
      <span class="fab-text">⚡ 记违纪</span>
    </div>

    <!-- 移动端极速记违纪抽屉（底部拉起 Bottom Sheet） -->
    <el-drawer
      v-model="quickDrawerVisible"
      direction="btt"
      size="88%"
      :with-header="false"
      class="mobile-quick-drawer"
    >
      <div class="quick-drawer-header">
        <div class="quick-drawer-title-box">
          <span class="quick-drawer-icon">⚡</span>
          <div>
            <div class="quick-drawer-title">极速记录学生违纪</div>
            <div class="quick-drawer-sub">点选学生与行为，几秒轻松登记</div>
          </div>
        </div>
        <el-button text circle size="small" @click="quickDrawerVisible = false">
          <el-icon :size="20"><Close /></el-icon>
        </el-button>
      </div>

      <div class="quick-drawer-body">
        <!-- 第1步：点选学生 -->
        <div class="quick-section">
          <div class="quick-section-header">
            <span class="quick-step-badge">1</span>
            <span class="quick-section-title">选择违纪学生</span>
            <span class="quick-selected-count" v-if="quickForm.student_ids.length">
              （已选 <b style="color: #409eff">{{ quickForm.student_ids.length }}</b> 人）
            </span>
            <div class="quick-student-actions">
              <el-button link type="primary" size="small" @click="selectAllStudents">全选</el-button>
              <el-button link type="info" size="small" @click="clearSelectedStudents">清空</el-button>
            </div>
          </div>

          <!-- 快速学生检索过滤 -->
          <el-input
            v-model="studentSearchKey"
            placeholder="搜索学生姓名..."
            prefix-icon="Search"
            size="small"
            clearable
            class="student-search-bar"
          />

          <!-- 学生芯片列表（可轻点点选） -->
          <div class="student-chips-wrapper">
            <div
              v-for="s in filteredStudentChips"
              :key="s.id"
              class="student-chip-btn"
              :class="{ selected: quickForm.student_ids.includes(s.id) }"
              @click="toggleStudentChip(s.id)"
            >
              <span class="chip-avatar-icon">
                {{ isEmojiAvatar(s.avatar) ? avatarText(s.avatar) : (s.name ? s.name.slice(0, 1) : '') }}
              </span>
              <span class="chip-student-name">{{ s.name }}</span>
              <el-icon v-if="quickForm.student_ids.includes(s.id)" class="chip-check-icon"><Check /></el-icon>
            </div>
          </div>
        </div>

        <!-- 第2步：违纪类型大卡片点选 -->
        <div class="quick-section">
          <div class="quick-section-header">
            <span class="quick-step-badge">2</span>
            <span class="quick-section-title">违纪类型</span>
          </div>
          <div class="quick-type-grid">
            <div
              v-for="item in QUICK_TYPE_OPTIONS"
              :key="item.value"
              class="quick-type-card"
              :class="{ active: quickForm.type === item.value }"
              @click="setQuickType(item.value)"
            >
              <span class="type-emoji">{{ item.emoji }}</span>
              <span class="type-text">{{ item.label }}</span>
            </div>
          </div>
          <el-input
            v-if="quickForm.type === '其他'"
            v-model="quickCustomType"
            placeholder="请输入自定义违纪类型..."
            size="small"
            style="margin-top: 6px"
          />
        </div>

        <!-- 第3步：事由与快捷短语填入 -->
        <div class="quick-section">
          <div class="quick-section-header">
            <span class="quick-step-badge">3</span>
            <span class="quick-section-title">违纪事由</span>
          </div>
          <div class="quick-chips-cloud">
            <span
              v-for="phrase in currentTypePhrases"
              :key="phrase"
              class="quick-preset-chip"
              @click="applyQuickPhrase(phrase)"
            >
              + {{ phrase }}
            </span>
          </div>
          <el-input
            v-model="quickForm.description"
            type="textarea"
            :rows="2"
            placeholder="违纪详情（可点击上方快捷标签填入）"
            style="margin-top: 6px"
          />
        </div>

        <!-- 第4步：处理措施 -->
        <div class="quick-section">
          <div class="quick-section-header">
            <span class="quick-step-badge">4</span>
            <span class="quick-section-title">处理措施</span>
          </div>
          <div class="quick-chips-cloud">
            <span
              v-for="h in QUICK_HANDLINGS"
              :key="h"
              class="quick-preset-chip handling-chip"
              @click="quickForm.handling = h"
            >
              {{ h }}
            </span>
          </div>
          <el-input
            v-model="quickForm.handling"
            size="small"
            placeholder="处理措施"
            style="margin-top: 6px"
          />
        </div>

        <!-- 第5步：日期与严重程度 -->
        <div class="quick-section">
          <div class="quick-meta-row">
            <div class="quick-meta-col">
              <span class="quick-sub-label">发生日期:</span>
              <el-date-picker
                v-model="quickForm.incident_date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="日期"
                size="small"
                style="width: 130px"
              />
            </div>
            <div class="quick-meta-col">
              <span class="quick-sub-label">程度:</span>
              <el-radio-group v-model="quickForm.severity" size="small">
                <el-radio-button label="轻微">轻微</el-radio-button>
                <el-radio-button label="一般">一般</el-radio-button>
                <el-radio-button label="严重">严重</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </div>
      </div>

      <!-- 抽屉底部大按钮（固定吸底） -->
      <div class="quick-drawer-footer">
        <el-button
          type="primary"
          size="large"
          class="quick-submit-button"
          :loading="quickSaving"
          :disabled="quickForm.student_ids.length === 0"
          @click="submitQuickRecord"
        >
          <el-icon><Check /></el-icon>
          <span>立即登记违纪（已选 {{ quickForm.student_ids.length }} 人）</span>
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getDisciplines,
  getDisciplineStats,
  createDiscipline,
  updateDiscipline,
  deleteDiscipline,
  batchDeleteDisciplines,
  exportDisciplines,
  getStudents
} from '../../api'

const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

// 筛选状态
const viewScope = ref('current') // 'current' (本月活跃) 或 'all' (全部历史)
const filterMonth = ref('')
const filterType = ref('')
const filterStudentId = ref(null)

// 统计数据
const stats = ref({
  current_month: '',
  current_month_total: 0,
  current_month_talking: 0,
  current_month_late: 0,
  all_time_total: 0,
  frequent_students: []
})

// 数据集
const allRecords = ref([])
const students = ref([])
const selectedRows = ref([])

// 分页
const currentPage = ref(1)
const pageSize = ref(15)

// 常用快捷选项
const QUICK_DESCRIPTIONS = [
  '课堂讲话影响其他同学',
  '早读/上课迟到10分钟',
  '课堂擅自离开座位走动',
  '未按时完成或提交作业',
  '午休期间喧哗打闹'
]
const QUICK_HANDLINGS = [
  '口头批评教育并已纠正',
  '课后谈心提醒注意纪律',
  '通知家长沟通协同教育',
  '已写情况说明反思',
  '罚做班级卫生一日'
]

// ================= 移动端极速录入违纪 =================
const quickDrawerVisible = ref(false)
const quickSaving = ref(false)
const studentSearchKey = ref('')
const quickCustomType = ref('')

const QUICK_TYPE_OPTIONS = [
  { value: '讲话', label: '课堂讲话', emoji: '🗣️' },
  { value: '迟到', label: '出勤迟到', emoji: '⏰' },
  { value: '走动打闹', label: '走动打闹', emoji: '🏃' },
  { value: '未交作业', label: '未交作业', emoji: '📝' },
  { value: '其他', label: '其他', emoji: '➕' }
]

const TYPE_SPECIFIC_PHRASES = {
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

const currentTypePhrases = computed(() => {
  return TYPE_SPECIFIC_PHRASES[quickForm.value.type] || QUICK_DESCRIPTIONS
})

const quickForm = ref({
  student_ids: [],
  type: '讲话',
  incident_date: '',
  severity: '一般',
  description: '自习课随意讲话',
  handling: '口头批评教育并已纠正'
})

// 学生搜索过滤
const filteredStudentChips = computed(() => {
  const kw = studentSearchKey.value.trim().toLowerCase()
  if (!kw) return students.value
  return students.value.filter((s) => s.name && s.name.toLowerCase().includes(kw))
})

const toggleStudentChip = (id) => {
  const idx = quickForm.value.student_ids.indexOf(id)
  if (idx > -1) {
    quickForm.value.student_ids.splice(idx, 1)
  } else {
    quickForm.value.student_ids.push(id)
  }
}

const selectAllStudents = () => {
  quickForm.value.student_ids = filteredStudentChips.value.map((s) => s.id)
}

const clearSelectedStudents = () => {
  quickForm.value.student_ids = []
}

const setQuickType = (t) => {
  quickForm.value.type = t
  if (TYPE_SPECIFIC_PHRASES[t] && TYPE_SPECIFIC_PHRASES[t][0]) {
    quickForm.value.description = TYPE_SPECIFIC_PHRASES[t][0]
  }
}

const applyQuickPhrase = (text) => {
  if (!quickForm.value.description) {
    quickForm.value.description = text
  } else if (!quickForm.value.description.includes(text)) {
    quickForm.value.description += `；${text}`
  }
}

const openQuickRecord = () => {
  quickForm.value = {
    student_ids: [],
    type: '讲话',
    incident_date: new Date().toISOString().slice(0, 10),
    severity: '一般',
    description: '自习课随意讲话',
    handling: '口头批评教育并已纠正'
  }
  studentSearchKey.value = ''
  quickCustomType.value = ''
  quickDrawerVisible.value = true
}

const submitQuickRecord = async () => {
  if (!quickForm.value.student_ids.length) {
    ElMessage.warning('请至少选择一名违纪学生')
    return
  }
  const typeVal = quickForm.value.type === '其他' && quickCustomType.value.trim()
    ? quickCustomType.value.trim()
    : quickForm.value.type

  quickSaving.value = true
  try {
    await createDiscipline({
      student_ids: quickForm.value.student_ids,
      type: typeVal,
      incident_date: quickForm.value.incident_date || new Date().toISOString().slice(0, 10),
      severity: quickForm.value.severity,
      description: quickForm.value.description,
      handling: quickForm.value.handling
    })
    ElMessage.success(`成功为 ${quickForm.value.student_ids.length} 位同学登记违纪`)
    quickDrawerVisible.value = false
    loadData()
  } catch (e) {
  } finally {
    quickSaving.value = false
  }
}

// 表单数据
const form = ref({
  id: null,
  student_id: null,
  student_ids: [],
  type: '讲话',
  incident_date: '',
  severity: '一般',
  description: '',
  handling: '口头批评教育并已纠正'
})
const customType = ref('')

// 表单校验规则
const rules = {
  student_ids: [{ required: true, message: '请选择学生', trigger: 'change' }],
  student_id: [{ required: true, message: '请选择学生', trigger: 'change' }],
  type: [{ required: true, message: '请选择或输入违纪类型', trigger: 'change' }],
  incident_date: [{ required: true, message: '请选择发生日期', trigger: 'change' }]
}

// 头像辅助函数
const isEmojiAvatar = (v) => v && v.startsWith('emoji:')
const avatarSrc = (v) => (v && !isEmojiAvatar(v) ? `/uploads/${v}` : '')
const avatarText = (v) => (isEmojiAvatar(v) ? v.slice(6) : '')

// 标签样式判断
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

// 过滤后的数据
const filteredRecords = computed(() => {
  let list = allRecords.value
  if (filterType.value) {
    list = list.filter((r) => r.type === filterType.value)
  }
  if (filterStudentId.value) {
    list = list.filter((r) => r.student_id === filterStudentId.value)
  }
  return list
})

// 分页数据
const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRecords.value.slice(start, start + pageSize.value)
})

const handleSelectionChange = (val) => {
  selectedRows.value = val
}

// 切换活跃/历史视图
const handleScopeChange = () => {
  filterMonth.value = ''
  currentPage.value = 1
  loadData()
}

const applyFilter = () => {
  currentPage.value = 1
}

// 加载违纪列表及统计
const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (viewScope.value === 'current') {
      params.scope = 'current'
    } else if (filterMonth.value) {
      params.month = filterMonth.value
    }
    const [recordList, statsData] = await Promise.all([
      getDisciplines(params),
      getDisciplineStats()
    ])
    allRecords.value = recordList || []
    stats.value = statsData || {}
  } catch (e) {
    // 拦截器已处理错误提示
  } finally {
    loading.value = false
  }
}

// 加载学生花名册供下拉选择
const loadStudents = async () => {
  try {
    students.value = await getStudents()
  } catch (e) {}
}

const onCustomTypeInput = (val) => {
  if (val.trim()) {
    form.value.type = val.trim()
  }
}

const setQuickDesc = (text) => {
  if (!form.value.description) {
    form.value.description = text
  } else {
    form.value.description += `；${text}`
  }
}

// 打开新增
const openCreate = () => {
  // 小屏幕模式下直接唤起极速录入模式，移动端极致顺手
  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
    openQuickRecord()
    return
  }
  isEdit.value = false
  customType.value = ''
  form.value = {
    id: null,
    student_id: null,
    student_ids: [],
    type: '讲话',
    incident_date: new Date().toISOString().slice(0, 10),
    severity: '一般',
    description: '',
    handling: '口头批评教育并已纠正'
  }
  dialogVisible.value = true
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 打开编辑
const openEdit = (row) => {
  isEdit.value = true
  form.value = {
    id: row.id,
    student_id: row.student_id,
    student_ids: [row.student_id],
    type: row.type,
    incident_date: row.incident_date,
    severity: row.severity || '一般',
    description: row.description || '',
    handling: row.handling || ''
  }
  customType.value = ['讲话', '迟到', '走动打闹', '未交作业', '其他'].includes(row.type) ? '' : row.type
  dialogVisible.value = true
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 保存违纪记录
const handleSave = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateDiscipline(form.value.id, {
        student_id: form.value.student_id,
        type: form.value.type,
        incident_date: form.value.incident_date,
        severity: form.value.severity,
        description: form.value.description,
        handling: form.value.handling
      })
      ElMessage.success('修改成功')
    } else {
      await createDiscipline({
        student_ids: form.value.student_ids,
        type: form.value.type,
        incident_date: form.value.incident_date,
        severity: form.value.severity,
        description: form.value.description,
        handling: form.value.handling
      })
      ElMessage.success('违纪记录登记成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
  } finally {
    saving.value = false
  }
}

// 删除单条
const handleDelete = async (id) => {
  try {
    await deleteDiscipline(id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

// 批量删除
const handleBatchDelete = async () => {
  if (!selectedRows.value.length) return
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedRows.value.length} 条违纪记录？`,
      '提示',
      { type: 'warning' }
    )
  } catch (e) {
    return
  }
  try {
    const ids = selectedRows.value.map((r) => r.id)
    await batchDeleteDisciplines(ids)
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadData()
  } catch (e) {}
}

// 导出 Excel
const handleExport = async () => {
  exporting.value = true
  try {
    const month = viewScope.value === 'current' ? stats.value.current_month : filterMonth.value
    const blob = await exportDisciplines(month)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `学生违纪记录_${month || '全部'}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadData()
  loadStudents()
})
</script>

<style scoped>
.disciplines-container {
  padding-bottom: 24px;
}
.mb-16 {
  margin-bottom: 16px;
}
.stat-card {
  border-radius: 12px;
  border: 1px solid #e5e3df;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.stat-card.stat-rose {
  background: #fde0ec !important;
  border-color: #f9c2db !important;
}
.stat-card.stat-peach {
  background: #ffe8d4 !important;
  border-color: #fed2b2 !important;
}
.stat-card.stat-lavender {
  background: #e6e0f5 !important;
  border-color: #cdc2eb !important;
}
.stat-card.stat-sky {
  background: #dcecfa !important;
  border-color: #bfe0f7 !important;
}

.stat-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}
.stat-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-rose { background-color: rgba(209, 43, 117, 0.12); }
.icon-peach { background-color: rgba(196, 85, 0, 0.12); }
.icon-lavender { background-color: rgba(86, 69, 212, 0.12); }
.icon-sky { background-color: rgba(26, 104, 170, 0.12); }

.text-rose { color: #d12b75 !important; }
.text-peach { color: #c45500 !important; }
.text-lavender { color: #5645d4 !important; }
.text-sky { color: #1a68aa !important; }

.stat-label {
  font-size: 13px;
  color: #5d5b54;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  margin: 2px 0;
}
.stat-hint {
  font-size: 11px;
  color: #787671;
}

.rule-alert {
  border-radius: 8px;
  background-color: #fafaf9;
  border: 1px solid #e5e3df;
  color: #5d5b54;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.action-buttons {
  display: flex;
  gap: 10px;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.student-name {
  font-weight: 500;
  color: #303133;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.type-selection {
  display: flex;
  flex-direction: column;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.quick-phrases {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.quick-phrase-label {
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

/* 桌面端 vs 移动端列表切换 */
.desktop-only-table {
  display: block;
}
.mobile-card-list {
  display: none;
}
.mobile-quick-btn {
  display: none;
}
.mobile-fab-btn {
  display: none;
}

/* 移动端卡片式列表视图 */
.mobile-item-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #ebeef5;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mobile-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mobile-card-student {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mobile-student-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mobile-student-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.mobile-incident-date {
  font-size: 12px;
  color: #909399;
}
.mobile-card-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mobile-card-body {
  background-color: #f9fbfd;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mobile-card-row {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.4;
}
.row-label {
  color: #909399;
  flex-shrink: 0;
  font-size: 12px;
}
.row-value {
  color: #303133;
}
.text-handling {
  color: #67c23a;
}
.mobile-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
  border-top: 1px dashed #f0f2f5;
}
.mobile-card-btns {
  display: flex;
  gap: 12px;
}

/* 移动端极速录入抽屉 */
.mobile-quick-drawer :deep(.el-drawer__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.quick-drawer-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}
.quick-drawer-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
}
.quick-drawer-icon {
  font-size: 24px;
}
.quick-drawer-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.quick-drawer-sub {
  font-size: 12px;
  color: #909399;
}
.quick-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  -webkit-overflow-scrolling: touch;
}
.quick-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quick-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.quick-step-badge {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background-color: #e6e0f5;
  color: #5645d4;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.quick-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}
.quick-selected-count {
  font-size: 12px;
  color: #606266;
}
.quick-student-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.student-search-bar {
  margin-bottom: 2px;
}
.student-chips-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 130px;
  overflow-y: auto;
  padding: 4px 2px;
}
.student-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  background-color: #fafaf9;
  color: #37352f;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #e5e3df;
  transition: all 0.15s ease;
  user-select: none;
}
.student-chip-btn.selected {
  background-color: #e6e0f5;
  color: #5645d4;
  border-color: #5645d4;
  font-weight: 600;
}
.chip-avatar-icon {
  font-size: 13px;
}
.chip-check-icon {
  font-size: 13px;
  color: #5645d4;
}

/* 违纪类型网格 */
.quick-type-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.quick-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 8px;
  background: #fafaf9;
  border: 1.5px solid #e5e3df;
  cursor: pointer;
  transition: all 0.15s ease;
}
.quick-type-card .type-emoji {
  font-size: 20px;
}
.quick-type-card .type-text {
  font-size: 11px;
  color: #5d5b54;
  white-space: nowrap;
}
.quick-type-card.active {
  background: #ffe8d4;
  border-color: #fed2b2;
}
.quick-type-card.active .type-text {
  color: #c45500;
  font-weight: 700;
}

/* 常用标签 */
.quick-chips-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.quick-preset-chip {
  display: inline-block;
  padding: 4px 8px;
  background-color: #f7f6f5;
  color: #37352f;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  border: 1px solid #e5e3df;
  transition: all 0.15s;
}
.quick-preset-chip:active {
  background-color: #5645d4;
  color: #ffffff;
}
.handling-chip {
  background-color: #d9f3e1;
  color: #16794c;
  border-color: #b8e7c5;
}
.handling-chip:active {
  background-color: #16794c;
  color: #ffffff;
}

.quick-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.quick-meta-col {
  display: flex;
  align-items: center;
  gap: 6px;
}
.quick-sub-label {
  font-size: 12px;
  color: #787671;
  white-space: nowrap;
}

.quick-drawer-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e3df;
  background: #ffffff;
}
.quick-submit-button {
  width: 100%;
  font-size: 15px;
  font-weight: 600;
  height: 44px;
  border-radius: 8px;
  background-color: #5645d4 !important;
  border-color: #5645d4 !important;
  color: #ffffff;
}

/* 移动端与桌面端响应式断点 */
@media (max-width: 768px) {
  .desktop-only-table {
    display: none !important;
  }
  .mobile-card-list {
    display: flex !important;
    flex-direction: column;
  }
  .mobile-quick-btn {
    display: inline-flex !important;
  }
  .mobile-fab-btn {
    display: flex !important;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: fixed;
    bottom: 24px;
    right: 20px;
    z-index: 1000;
    padding: 10px 18px;
    background: #5645d4 !important;
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    box-shadow: 0 4px 14px rgba(86, 69, 212, 0.4);
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }
  .mobile-fab-btn:active {
    transform: scale(0.95);
  }
  .header-actions {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 12px !important;
  }
  .filter-toolbar {
    width: 100% !important;
    gap: 8px !important;
  }
  .filter-toolbar > * {
    flex: 1 1 calc(50% - 8px);
    min-width: 120px;
  }
  .action-buttons {
    width: 100% !important;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px !important;
  }
  .stat-card .stat-inner {
    gap: 8px !important;
  }
  .stat-card .stat-icon-wrapper {
    width: 36px !important;
    height: 36px !important;
  }
  .stat-card .stat-icon {
    font-size: 18px !important;
  }
  .stat-card .stat-value {
    font-size: 18px !important;
  }
  .stat-card .stat-label {
    font-size: 11px !important;
  }
  .stat-card .stat-hint {
    display: none;
  }
  .rule-alert {
    font-size: 12px !important;
    padding: 8px 10px !important;
  }
  .pagination-wrapper {
    justify-content: center !important;
  }
}
</style>

<script setup>
import { computed, ref } from 'vue'
import { buildDisciplineRanking } from '../../utils/disciplineRanking'

const props = defineProps({
  records: { type: Array, default: () => [] },
  month: { type: String, default: '' },
  loading: Boolean,
  failed: Boolean,
})
const emit = defineEmits(['retry'])
const query = ref('')
const selectedId = ref(null)
const detailVisible = ref(false)
const ranking = computed(() => buildDisciplineRanking(props.records, props.month))
const visibleRanking = computed(() => ranking.value.filter(row => row.student_name.includes(query.value.trim())))
const selected = computed(() => ranking.value.find(row => row.student_id === selectedId.value))
const total = computed(() => ranking.value.reduce((sum, row) => sum + row.count, 0))
function openStudent(row) {
  selectedId.value = row.student_id
  detailVisible.value = true
}
</script>

<template>
  <el-card shadow="never" class="ranking-card" v-loading="loading">
    <template #header>
      <div class="ranking-header">
        <div>
          <h2 class="ranking-title">本月违纪排行榜</h2>
          <p class="ranking-hint">{{ month || '本月' }} · {{ ranking.length }} 名学生 · 共 {{ total }} 次</p>
        </div>
        <el-input v-model="query" placeholder="搜索学生姓名" aria-label="搜索排行榜学生" clearable class="ranking-search" />
      </div>
    </template>
    <template v-if="failed">
      <el-alert title="排行榜加载失败，请重试" type="error" :closable="false" />
      <el-button class="retry-button" @click="emit('retry')">重新加载</el-button>
    </template>
    <template v-else>
      <p class="ranking-hint">按次数从多到少排列，同次数并列；点击学生查看本月全部明细。</p>
      <div class="ranking-list">
        <button v-for="row in visibleRanking" :key="row.student_id" type="button" class="ranking-row" @click="openStudent(row)">
          <span class="ranking-position">{{ row.rank }}</span>
          <span class="ranking-student">
            <strong>{{ row.student_name }}</strong>
            <span class="ranking-hint">最近违纪 {{ row.latest_date }}</span>
          </span>
          <span class="ranking-count">{{ row.count }} 次 <span aria-hidden="true">›</span></span>
        </button>
      </div>
      <el-empty v-if="!loading && !visibleRanking.length" :description="query.trim() ? '未找到该学生的本月违纪记录' : '本月暂无违纪记录'" :image-size="60" />
    </template>
  </el-card>

  <el-dialog v-model="detailVisible" :title="`${selected?.student_name || '学生'} · 本月违纪明细`" width="min(680px, 94vw)" append-to-body>
    <template v-if="selected">
      <p class="detail-summary">{{ month }} 共 <strong>{{ selected.count }}</strong> 次违纪，排名第 {{ selected.rank }}。</p>
      <div class="type-summary">
        <el-tag v-for="(count, type) in selected.types" :key="type" type="info">{{ type }} {{ count }} 次</el-tag>
      </div>
      <div class="detail-list">
        <article v-for="record in selected.records" :key="record.id" class="detail-record">
          <div class="detail-heading"><strong>{{ record.type }}</strong><span>{{ record.incident_date }} · {{ record.severity || '一般' }}</span></div>
          <p class="detail-text">事由：{{ record.description || '未填写' }}</p>
          <p class="detail-text">处理：{{ record.handling || '未填写' }}</p>
        </article>
      </div>
    </template>
    <el-empty v-else description="该学生本月暂无违纪记录" :image-size="60" />
  </el-dialog>
</template>

<style scoped>
.ranking-card { margin-bottom: 16px; }
.ranking-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ranking-title { margin: 0; font-size: 17px; color: #37352f; }
.ranking-hint { margin: 6px 0; font-size: 12px; color: #787671; }
.ranking-search { width: 180px; max-width: 100%; }
.ranking-list { max-height: 360px; overflow-y: auto; }
.ranking-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 4px; border: 0; border-bottom: 1px solid #eeece8; background: transparent; text-align: left; font: inherit; color: #37352f; cursor: pointer; }
.ranking-row:hover { background: #f7f6fb; }
.ranking-row:focus-visible { outline: 2px solid #5645d4; outline-offset: -2px; }
.ranking-position { width: 28px; text-align: center; color: #787671; flex-shrink: 0; }
.ranking-student { display: flex; flex-direction: column; flex: 1; min-width: 0; overflow-wrap: anywhere; }
.ranking-count { color: #a63860; font-weight: 600; white-space: nowrap; }
.type-summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.detail-summary { margin-top: 0; }
.detail-list { max-height: 55vh; overflow-y: auto; }
.detail-record { border-top: 1px solid #eeece8; padding: 12px 0; }
.detail-heading { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.detail-text { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.retry-button { margin-top: 12px; }
</style>

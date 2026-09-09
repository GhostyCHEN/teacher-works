import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDisciplineRanking } from '../src/utils/disciplineRanking.js'

const record = (id, student_id, type = '讲话', incident_date = '2026-09-09') => ({
  id, student_id, student_name: '同名学生', type, incident_date,
})

test('按 ID 聚合完整月记录，排除其他月份，次数降序且并列排名', () => {
  const records = [record(1, 1), record(2, 2), record(3, 1, '迟到'), record(4, 2), record(5, 3), record(6, 3, '讲话', '2026-08-31'), record(7, 3, '讲话', '2025-09-09')]
  const rows = buildDisciplineRanking(records, '2026-09')
  assert.deepEqual(rows.map(r => [r.student_id, r.count, r.rank]), [[1, 2, 1], [2, 2, 1], [3, 1, 3]])
  assert.equal(rows[0].types['讲话'], 1)
  assert.equal(rows[0].types['迟到'], 1)
  assert.deepEqual(rows[0].records.map(r => r.id), [3, 1])
  assert.equal(records[0].id, 1)
})

test('新增、删除和修改发生月份后重新统计，明细与合计一致', () => {
  const records = [record(1, 1), record(2, 2), record(3, 2)]
  assert.equal(buildDisciplineRanking(records, '2026-09')[0].student_id, 2)
  records.pop()
  records[1].incident_date = '2026-10-01'
  const rows = buildDisciplineRanking(records, '2026-09')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].count, rows[0].records.length)
  assert.equal(rows[0].count, 1)
})

test('空月份、空记录、已删除学生与自定义类型', () => {
  assert.deepEqual(buildDisciplineRanking([], '2026-09'), [])
  assert.deepEqual(buildDisciplineRanking([record(1, 1)], ''), [])
  const rows = buildDisciplineRanking([{ ...record(1, 9, '__proto__'), student_name: null }], '2026-09')
  assert.equal(rows[0].student_name, '已删除学生')
  assert.equal(rows[0].types.__proto__, 1)
})

test('不受原统计前六名限制，保留全部学生和当月明细', () => {
  const records = Array.from({ length: 20 }, (_, i) => record(i + 1, i + 1))
  records.push(record(21, 20, '迟到', '2026-09-01'))
  const rows = buildDisciplineRanking(records, '2026-09')
  assert.equal(rows.length, 20)
  assert.equal(rows[0].student_id, 20)
  assert.equal(rows[0].latest_date, '2026-09-09')
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 21)
})

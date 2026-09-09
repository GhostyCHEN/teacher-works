// 按学生 ID 聚合，避免同名学生合并；只统计指定自然月。
export function buildDisciplineRanking(records, month) {
  if (!month) return []
  const students = new Map()
  for (const record of records) {
    if (!record.incident_date?.startsWith(`${month}-`)) continue
    const id = record.student_id
    if (!students.has(id)) {
      students.set(id, {
        student_id: id,
        student_name: record.student_name || '已删除学生',
        records: [],
        types: Object.create(null),
      })
    }
    const student = students.get(id)
    student.records.push(record)
    const type = record.type || '其他'
    student.types[type] = (student.types[type] || 0) + 1
  }
  const rows = [...students.values()]
  for (const row of rows) {
    row.count = row.records.length
    row.records.sort((a, b) => b.incident_date.localeCompare(a.incident_date) || b.id - a.id)
    row.latest_date = row.records[0].incident_date
  }
  rows.sort((a, b) => b.count - a.count || a.student_id - b.student_id)
  rows.forEach((row, index) => {
    row.rank = index > 0 && rows[index - 1].count === row.count ? rows[index - 1].rank : index + 1
  })
  return rows
}

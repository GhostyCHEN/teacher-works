import request from './request'

// ================= 认证 =================
export const login = (data) => request.post('/auth/login', data)
export const changePassword = (data) => request.put('/auth/password', data)

// ================= 班级管理（多班级支持） =================
export const getClasses = () => request.get('/classes')
export const createClass = (data) => request.post('/classes', data)
export const renameClass = (id, data) => request.put(`/classes/${id}`, data)
export const deleteClass = (id, data) => request.delete(`/classes/${id}`, { data })

// ================= 统计数据 =================
export const getStats = () => request.get('/stats')

// ================= 欠交登记 =================
export const getMissingHomework = () => request.get('/homework-missing')
export const createMissingHomework = (data) => request.post('/homework-missing', data)
export const updateMissingHomework = (id, data) => request.put(`/homework-missing/${id}`, data)
export const deleteMissingHomework = (id) => request.delete(`/homework-missing/${id}`)

// ================= 班级待办 =================
export const getTasks = () => request.get('/tasks')
export const createTask = (data) => request.post('/tasks', data)
export const updateTask = (id, data) => request.put(`/tasks/${id}`, data)
export const deleteTask = (id) => request.delete(`/tasks/${id}`)
export const completeTask = (id) => request.put(`/tasks/${id}/complete`)

// ================= 学生档案 =================
export const getStudents = () => request.get('/students')
export const getStudent = (id) => request.get(`/students/${id}`)
export const createStudent = (data) => request.post('/students', data)
export const updateStudent = (id, data) => request.put(`/students/${id}`, data)
export const deleteStudent = (id) => request.delete(`/students/${id}`)
export const batchDeleteStudents = (ids) => request.delete('/students/batch', { data: { ids } })
export const importStudents = (formData) =>
  request.post('/students/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
// 学生头像上传（先保存学生基本信息，再上传头像）
export const uploadStudentAvatar = (id, formData) =>
  request.post(`/students/${id}/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
// 教师头像上传
export const uploadTeacherAvatar = (formData) =>
  request.post('/teacher/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// ================= 成绩管理 =================
export const getScores = () => request.get('/scores')
export const importScores = (formData) =>
  request.post('/scores/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
// 成绩 - 单条操作
export const createScore = (data) => request.post('/scores', data)
export const updateScore = (id, data) => request.put(`/scores/${id}`, data)
export const deleteScore = (id) => request.delete(`/scores/${id}`)
// 成绩 - 批量操作
export const batchDeleteScores = (ids) => request.delete('/scores/batch', { data: { ids } })

// ================= 违纪管理 =================
export const getDisciplines = (params) => request.get('/disciplines', { params })
export const getDisciplineStats = () => request.get('/disciplines/stats')
export const createDiscipline = (data) => request.post('/disciplines', data)
export const updateDiscipline = (id, data) => request.put(`/disciplines/${id}`, data)
export const deleteDiscipline = (id) => request.delete(`/disciplines/${id}`)
export const batchDeleteDisciplines = (ids) => request.delete('/disciplines/batch', { data: { ids } })
export const exportDisciplines = (month) => request.get('/disciplines/export', { params: { month }, responseType: 'blob' })

// ================= 请假管理 =================
export const getLeaves = () => request.get('/leaves')
export const createLeave = (data) => request.post('/leaves', data)
export const updateLeave = (id, data) => request.put(`/leaves/${id}`, data)
// 单条销假复用批量状态接口（原误发 POST /leaves 会新建空记录）
export const changeLeaveStatus = (id, status) => request.put('/leaves/batch-status', { ids: [id], status })
export const deleteLeave = (id) => request.delete(`/leaves/${id}`)
export const batchUpdateLeaveStatus = (ids, status) => request.put('/leaves/batch-status', { ids, status })
export const batchDeleteLeaves = (ids) => request.delete('/leaves/batch', { data: { ids } })

// ================= 家校沟通 =================
export const getCommunications = () => request.get('/communications')
export const createCommunication = (formData) => request.post('/communications', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateCommunication = (id, formData) => request.put(`/communications/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteCommunication = (id) => request.delete(`/communications/${id}`)
export const batchDeleteCommunications = (ids) => request.delete('/communications/batch', { data: { ids } })

// ================= 座位表 =================
export const getSeats = () => request.get('/seats')
export const saveSeats = (data) => request.put('/seats', data)

// ================= 系统设置 =================
export const getSettings = () => request.get('/settings')
export const updateSetting = (key, value) => request.put(`/settings/${key}`, { value })
// 年级信息（动态计算）
export const getGradeInfo = () => request.get('/settings/grade-info')
export const updateGradeYear = (year) => request.put('/settings/grade-year', { grade_year: year })

// ================= 导出 =================
// 成绩导出
export const exportScores = () => request.get('/scores/export', { responseType: 'blob' })
// 学生花名册导出
export const exportStudents = () => request.get('/students/export', { responseType: 'blob' })
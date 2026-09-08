const express = require('express');
const router = express.Router();
const { getDb, getMainDb } = require('../db');

// 教师身份类设置（姓名/头像）全局共享，固定存主库，不随班级切换
const TEACHER_IDENTITY_KEYS = ['teacher_name', 'teacher_avatar'];

// Standard response formatter
// 正确映射业务状态码到 HTTP 状态码
const sendResponse = (res, data = {}, message = 'success', code = 200) => {
  const httpStatus = code >= 200 && code < 600 ? code : 500;
  res.status(httpStatus).json({ code, message, data });
};

// ================= TASKS (班级待办) =================

// GET /tasks - 获取所有任务
router.get('/tasks', async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');
    sendResponse(res, tasks);
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// POST /tasks - 创建任务
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, priority, due_date } = req.body;
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO tasks (title, description, priority, due_date) VALUES (?, ?, ?, ?)',
      [title, description, priority || 'medium', due_date]
    );
    sendResponse(res, { id: result.lastID });
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// PUT /tasks/:id - 更新任务
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, due_date } = req.body;
    const db = await getDb();
    
    const existing = await db.get('SELECT id FROM tasks WHERE id = ?', [id]);
    if (!existing) return sendResponse(res, null, '任务不存在', 404);
    
    await db.run(
      'UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, due_date = ? WHERE id = ?',
      [title, description, priority, status, due_date, id]
    );
    sendResponse(res, { id });
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// PUT /tasks/:id/complete - 完成任务
router.put('/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const existing = await db.get('SELECT id FROM tasks WHERE id = ?', [id]);
    if (!existing) return sendResponse(res, null, '任务不存在', 404);
    
    const completed_at = new Date().toISOString();
    await db.run(
      'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?',
      ['completed', completed_at, id]
    );
    sendResponse(res, { id, completed_at });
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// DELETE /tasks/:id - 删除任务
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM tasks WHERE id = ?', [id]);
    sendResponse(res, { id });
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// ================= SETTINGS =================

// GET /settings - 获取系统设置
router.get('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    // 教师身份类设置从主库读取（全局共享）
    const mainDb = await getMainDb();
    const identityRows = await mainDb.all(
      `SELECT key, value FROM settings WHERE key IN ('teacher_name', 'teacher_avatar')`
    );
    identityRows.forEach(row => { settings[row.key] = row.value; });
    sendResponse(res, settings);
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// GET /settings/grade-info - 获取年级信息（动态计算当前年级）
router.get('/settings/grade-info', async (req, res) => {
  try {
    const db = await getDb();
    const gradeYearRow = await db.get("SELECT value FROM settings WHERE key = 'grade_year'");
    const enrollmentYear = parseInt(gradeYearRow?.value || String(new Date().getFullYear()), 10);
    
    // 动态计算当前年级
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 0-indexed, so +1
    
    // 基础年级索引（0-indexed: 0=高一, 1=高二, 2=高三）
    let gradeIndex = currentYear - enrollmentYear;
    
    // 如果当前月份 < 9，说明还没有过完9月升级，需要减1
    if (currentMonth < 9) {
      gradeIndex -= 1;
    }
    
    // 限制在 [0, 2] 范围内
    gradeIndex = Math.max(0, Math.min(2, gradeIndex));
    
    // 映射到年级名称
    const gradeNames = ['高一', '高二', '高三'];
    const gradeLevel = gradeNames[gradeIndex];
    
    sendResponse(res, {
      grade_level: gradeLevel,
      grade_year: enrollmentYear,
      can_edit_year: true
    });
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// PUT /settings/grade-year - 更新入学年份
router.put('/settings/grade-year', async (req, res) => {
  try {
    const { grade_year } = req.body;
    if (!grade_year) {
      return sendResponse(res, null, 'grade_year 不能为空', 400);
    }
    
    const year = parseInt(grade_year, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return sendResponse(res, null, '入学年份格式不正确', 400);
    }
    
    const db = await getDb();
    const existing = await db.get("SELECT key FROM settings WHERE key = 'grade_year'");
    
    if (existing) {
      await db.run('UPDATE settings SET value = ? WHERE key = ?', [String(year), 'grade_year']);
    } else {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['grade_year', String(year)]);
    }
    
    sendResponse(res, { grade_year: year });
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

// PUT /settings/:key - 更新设置项
router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    // 教师身份类设置写主库（全局共享），其余随班级库
    const db = TEACHER_IDENTITY_KEYS.includes(key) ? await getMainDb() : await getDb();
    const existing = await db.get('SELECT key FROM settings WHERE key = ?', [key]);
    if (existing) {
      await db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
    } else {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
    sendResponse(res, { key, value });
  } catch (err) {
    sendResponse(res, null, err.message, 500);
  }
});

module.exports = router;

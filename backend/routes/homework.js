const express = require('express');
const { getDb } = require('../db');
const router = express.Router();
const reply = (res, data, message = 'success', code = 200) => res.status(code).json({ code, message, data });

// Existing homework records remain readable; the UI now tracks missing work only.
router.get('/homework-missing', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT r.id, r.student_id, s.name AS student_name, r.status,
      r.remark, r.completed_at, t.title, t.subject, t.homework_date
      FROM homework_records r JOIN homework_tasks t ON t.id = r.task_id
      LEFT JOIN students s ON s.id = r.student_id
      ORDER BY r.status ASC, t.homework_date DESC, r.id DESC`);
    reply(res, rows);
  } catch (err) { reply(res, null, err.message, 500); }
});

router.post('/homework-missing', async (req, res) => {
  let db;
  let taskId;
  try {
    const { student_id, title, subject, homework_date, remark } = req.body;
    if (!Number.isInteger(student_id) || typeof title !== 'string' || !title.trim() || typeof subject !== 'string' || !subject.trim()) {
      return reply(res, null, '请选择学生并填写作业名称和科目', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(homework_date || '') || !Number.isFinite(Date.parse(homework_date)) || new Date(homework_date).toISOString().slice(0, 10) !== homework_date) {
      return reply(res, null, '请填写有效的欠交日期', 400);
    }
    db = await getDb();
    if (!await db.get('SELECT id FROM students WHERE id = ?', [student_id])) return reply(res, null, '学生不存在', 404);
    const task = await db.run('INSERT INTO homework_tasks (title, subject, homework_date) VALUES (?, ?, ?)', [title.trim(), subject.trim(), homework_date]);
    taskId = task.lastID;
    const result = await db.run('INSERT INTO homework_records (task_id, student_id, status, remark) VALUES (?, ?, 0, ?)', [taskId, student_id, remark || '']);
    reply(res, { id: result.lastID });
  } catch (err) {
    // A failed record insert must not leave a new, empty task behind.
    if (db && taskId) await db.run('DELETE FROM homework_tasks WHERE id = ? AND NOT EXISTS (SELECT 1 FROM homework_records WHERE task_id = ?)', [taskId, taskId]).catch(() => {});
    reply(res, null, err.message, 500);
  }
});

router.put('/homework-missing/:id', async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT * FROM homework_records WHERE id = ?', [req.params.id]);
    if (!existing) return reply(res, null, '欠交记录不存在', 404);
    const status = req.body.status ?? existing.status;
    if (![0, 1].includes(status)) return reply(res, null, '状态必须为待补交或已补交', 400);
    const completedAt = status === 1 ? (existing.completed_at || new Date().toISOString()) : null;
    await db.run('UPDATE homework_records SET status = ?, remark = ?, completed_at = ? WHERE id = ?', [status, req.body.remark ?? existing.remark, completedAt, req.params.id]);
    reply(res, { id: existing.id });
  } catch (err) { reply(res, null, err.message, 500); }
});

router.delete('/homework-missing/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM homework_records WHERE id = ?', [req.params.id]);
    reply(res, { id: req.params.id });
  } catch (err) { reply(res, null, err.message, 500); }
});
module.exports = router;

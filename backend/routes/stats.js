const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();
    const tasks = await db.all(`SELECT * FROM tasks WHERE status != 'completed'
      ORDER BY CASE WHEN due_date IS NULL OR due_date = '' THEN 1 ELSE 0 END, due_date ASC, id DESC`);
    // "在假" excludes future leave and includes the whole end date in China time.
    const leaves = await db.all(`SELECT l.*, s.name AS student_name FROM leaves l
      LEFT JOIN students s ON s.id = l.student_id WHERE l.status = '登记'
      AND date(l.start_date) <= date('now', '+8 hours') AND date(l.end_date) >= date('now', '+8 hours')
      ORDER BY l.end_date ASC`);
    const followups = await db.all(`SELECT d.id, d.student_id, s.name AS student_name, d.type, d.severity, d.incident_date, d.description
      FROM disciplines d LEFT JOIN students s ON s.id = d.student_id
      WHERE date(d.incident_date) BETWEEN date('now', '+8 hours', '-6 days') AND date('now', '+8 hours')
      ORDER BY d.incident_date DESC, d.id DESC LIMIT 8`);
    const homework = await db.get('SELECT COUNT(*) AS count FROM homework_records WHERE status = 0');
    res.json({ code: 200, message: 'success', data: {
      stats: { pending_tasks: tasks.length, active_leaves: leaves.length, homework_pending: homework.count },
      tasks: tasks.slice(0, 8), leaves: leaves.slice(0, 8), followups
    } });
  } catch (err) { res.status(500).json({ code: 500, message: err.message, data: null }); }
});
module.exports = router;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const xlsx = require('xlsx');
let server, tempDir, token;
const port = 3138;
const base = `http://127.0.0.1:${port}/api/v1`;
async function request(url, method = 'GET', data, classId) {
  const headers = { Authorization: `Bearer ${token}` };
  if (classId) headers['X-Class-Id'] = String(classId);
  if (data && !(data instanceof FormData)) headers['Content-Type'] = 'application/json';
  const result = await fetch(base + url, { method, headers, body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined });
  return { status: result.status, ...(await result.json()) };
}
before(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'classroom-test-'));
  server = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, DB_PATH: path.join(tempDir, 'test.sqlite'), PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Test server startup timeout')), 15000);
    server.stdout.on('data', chunk => { if (String(chunk).includes('Server is running')) { clearTimeout(timeout); resolve(); } });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Test server exited ${code}`)); });
  });
  token = (await request('/auth/login', 'POST', { username: 'admin', password: 'admin123' })).data.token;
});
after(async () => { if (server && server.exitCode === null) { const exited = new Promise(resolve => server.once('exit', resolve)); server.kill(); await exited; } if (tempDir) await rm(tempDir, { recursive: true, force: true }); });
let studentId;
test('student requires only name and gender; optional fields persist', async () => {
  assert.equal((await request('/students', 'POST', { name: '测试学生' })).status, 400);
  assert.equal((await request('/students', 'POST', { name: '  ', gender: '男' })).status, 400);
  const created = await request('/students', 'POST', { name: '测试学生', gender: '男' });
  assert.equal(created.status, 200); studentId = created.data.id;
  assert.equal((await request(`/students/${studentId}`, 'PUT', { name: '测试学生' })).status, 400);
  assert.equal((await request(`/students/${studentId}`, 'PUT', { name: '测试学生', gender: '男', grade: '高二', class: '3班', phone: '', family_info: '', health_condition: '' })).status, 200);
  const student = (await request(`/students/${studentId}`)).data;
  assert.equal(student.grade, '高二'); assert.equal(student.class, '3班');
});
test('student import validates required fields before writing rows', async () => {
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet([{ name: '有效行', gender: '女' }, { name: '缺性别' }]), '学生');
  const form = new FormData(); form.append('file', new Blob([xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })]), 'test.xlsx');
  const count = (await request('/students')).data.length;
  assert.equal((await request('/students/import', 'POST', form)).status, 400);
  assert.equal((await request('/students')).data.length, count);
});
test('missing work registration, completion and reversal; class isolation', async () => {
  assert.equal((await request('/homework-missing', 'POST', { student_id: studentId, title: '数学练习', subject: '数学', homework_date: '2026-02-30' })).status, 400);
  const row = await request('/homework-missing', 'POST', { student_id: studentId, title: '数学练习', subject: '数学', homework_date: '2026-09-07' });
  assert.equal(row.status, 200);
  const otherClass = (await request('/classes', 'POST', { name: '测试隔离班' })).data;
  assert.equal((await request('/homework-missing', 'GET', undefined, otherClass.id)).data.length, 0);
  assert.equal((await request(`/homework-missing/${row.data.id}`, 'PUT', { status: 1 }, otherClass.id)).status, 404);
  assert.equal((await request('/stats')).data.stats.homework_pending, 1);
  assert.equal((await request(`/homework-missing/${row.data.id}`, 'PUT', { status: 1 })).status, 200);
  assert.equal((await request('/stats')).data.stats.homework_pending, 0);
  assert.ok((await request('/homework-missing')).data[0].completed_at);
  await request(`/homework-missing/${row.data.id}`, 'PUT', { status: 0 });
  assert.equal((await request('/homework-missing')).data[0].completed_at, null);
});
test('high school years and removed endpoints', async () => {
  const academicYear = new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0);
  for (const [offset, label] of [[0, '高一'], [1, '高二'], [2, '高三'], [4, '高三']]) {
    await request('/settings/grade-year', 'PUT', { grade_year: academicYear - offset });
    assert.equal((await request('/settings/grade-info')).data.grade_level, label);
  }
  for (const endpoint of ['/resources', '/exams', '/recitations', '/recitation-tasks', '/schedule', '/homework-tasks']) assert.equal((await request(endpoint)).status, 404, endpoint);
});
test('scores work without an exam library, dashboard lists only active leave and pending tasks', async () => {
  assert.equal((await request('/scores', 'POST', { student_id: studentId, subject: '数学', score: 120, exam_name: '高二月考' })).status, 200);
  assert.equal((await request('/scores')).data[0].exam_name, '高二月考');
  const task = (await request('/tasks', 'POST', { title: '收集回执', priority: 'medium' })).data;
  assert.equal((await request('/stats')).data.stats.pending_tasks, 1);
  await request(`/tasks/${task.id}/complete`, 'PUT');
  await request('/leaves', 'POST', { student_id: studentId, start_date: '2000-01-01', end_date: '2100-01-01', reason: '测试当前在假' });
  await request('/leaves', 'POST', { student_id: studentId, start_date: '2099-01-01', end_date: '2099-01-02', reason: '未来请假' });
  const stats = (await request('/stats')).data;
  assert.equal(stats.stats.pending_tasks, 0); assert.equal(stats.stats.active_leaves, 1);
  assert.deepEqual(Object.keys(stats.stats).sort(), ['active_leaves', 'homework_pending', 'pending_tasks']);
});

test('legacy homework records stay visible and their original fields are preserved', async () => {
  const { open } = require('sqlite');
  const sqlite3 = require('sqlite3');
  const db = await open({ filename: path.join(tempDir, 'test.sqlite'), driver: sqlite3.Database });
  try {
    const task = await db.run("INSERT INTO homework_tasks (title, subject, content, homework_date) VALUES ('原有作业', '语文', '原有要求', '2026-09-01')");
    const record = await db.run("INSERT INTO homework_records (task_id, student_id, status, score, image_path) VALUES (?, ?, 0, 95, 'legacy.png')", [task.lastID, studentId]);
    assert.ok((await request('/homework-missing')).data.some(row => row.id === record.lastID && row.title === '原有作业'));
    await request(`/homework-missing/${record.lastID}`, 'PUT', { status: 1 });
    const original = await db.get('SELECT score, image_path FROM homework_records WHERE id = ?', [record.lastID]);
    assert.equal(original.score, 95); assert.equal(original.image_path, 'legacy.png');
  } finally { await db.close(); }
});

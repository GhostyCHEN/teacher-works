# 高中班级工作台 - 详细设计文档

## 1. 架构设计
项目采用前后端分离架构，方便一键编译部署。
- **前端 (Frontend)**: Vue 3 + Vite + Element Plus + Vue Router + Axios
- **后端 (Backend)**: Node.js + Express + SQLite3
- **部署 (Deployment)**: 静态资源(Nginx) + 后端接口(PM2/Node)
- **数据持久化**: 使用轻量级的 SQLite，数据存储在 `backend/database.sqlite` 中，无需额外部署数据库服务。

## 2. 数据库设计 (SQLite)
共设计 9 张核心业务表。

资源、试卷、背书、课程表已退出当前产品。旧表仅为历史数据兼容保留，不提供业务接口，不执行清空迁移。

### 欠交登记
沿用 `homework_tasks` 和 `homework_records` 存储既有与新增记录，以学生、科目、作业名称、欠交日期、补交状态为主要字段。新入口不发布作业，不编辑评分和图片。

### 2.4 学生档案表 (students)
- `id` (INTEGER PK)
- `name` (TEXT)
- `gender` (TEXT)
- `birth` (TEXT)
- `parent_name` (TEXT)
- `phone` (TEXT)
- `family_info` (TEXT)
- `address` (TEXT)
- `health_condition` (TEXT): 疾病/健康状况/体质特质
- `is_sports` (INTEGER): 是否体育生 (0-否, 1-是)
- `is_arts` (INTEGER): 是否艺术生 (0-否, 1-是)
- `is_special` (INTEGER): 0-否, 1-是
- `special_type` (TEXT): 特殊情况(单亲/孤儿等)

### 2.5 成绩表 (scores)
- `id` (INTEGER PK)
- `student_id` (INTEGER FK)
- `subject` (TEXT)
- `score` (REAL)
- `exam_name` (TEXT)

### 2.6 违纪记录表 (disciplines)
- `id` (INTEGER PK)
- `student_id` (INTEGER FK)
- `type` (TEXT): 违纪类型 (讲话/迟到/走动打闹/未交作业等)
- `incident_date` (TEXT): 发生日期 (YYYY-MM-DD，支持月度自动清零周期计算)
- `severity` (TEXT): 程度 (轻微/一般/严重)
- `description` (TEXT): 详细事由
- `handling` (TEXT): 处理结果与措施
- `created_at` (DATETIME)

### 2.7 请假表 (leaves)
- `id` (INTEGER PK)
- `student_id` (INTEGER FK)
- `start_date` (TEXT)
- `end_date` (TEXT)
- `reason` (TEXT)
- `status` (TEXT): 登记/已销假

### 2.8 家校沟通表 (communications)
- `id` (INTEGER PK)
- `student_id` (INTEGER FK)
- `date` (TEXT)
- `method` (TEXT)
- `content` (TEXT)
- `feedback` (TEXT)

## 3. API 接口规范
统一前缀: `/api/v1`
所有接口返回标准 JSON: `{ "code": 200, "message": "success", "data": {} }`

### 日常事务
- `GET/POST /homework-missing`：查看与新增欠交记录
- `PUT/DELETE /homework-missing/:id`：补交状态、备注或删除
- `GET/POST /tasks`：查看与新增班级待办
- `PUT/DELETE /tasks/:id`：编辑或删除待办
- `PUT /tasks/:id/complete`：完成待办

### 班主任工作
- `GET /students`: 学生列表
- `POST /students/import`: Excel一键导入学生
- `GET /disciplines`: 学生违纪记录列表（支持按月/学生/类型筛选）
- `GET /disciplines/stats`: 违纪月度清零统计与历史累计
- `POST /disciplines`: 录入学生违纪（支持多选批量）
- `GET /disciplines/export`: 导出违纪记录 Excel
- `GET /scores`: 成绩列表与进退分析
- `POST /scores/import`: Excel导入成绩
- `GET /seats`: 获取座位表 (根据学生表自动生成)
- `GET /leaves`: 请假列表
- `POST /leaves`: 登记/销假
- `GET /communications`: 沟通记录
- `POST /communications`: 新增沟通

## 4. 前端 UI/UX 规范
- 参考 `frontend/DESIGN.md`，使用白底、暖灰导航、细分隔线和少量紫色强调。
- 导航分工作空间、日常事务、班级管理。
- 首页仅呈现班级待办、当前在假学生、待补交数量与近 7 日违纪记录。
- 手机入口：违纪登记、请假登记、学生查询、班级待办；学生、请假和待办使用卡片列表。
- 学生档案字段保持原样，仅姓名与性别必填，其余信息选填。
- 学段固定高中，依据入学年份和每年 9 月计算高一至高三。

## 5. 打包与部署
编写 `build.sh`：
1. 运行 `cd frontend && npm run build`
2. 确保 `backend/` 提供服务
3. 提供 Nginx 配置样例文件，将 `/` 指向 `frontend/dist`，`/api` 反向代理到 Node.js 监听端口(如 3000)。

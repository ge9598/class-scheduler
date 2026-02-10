# 微信小程序 - 授课管理系统 (Course Management Mini Program)

## 项目概述

开发一个微信小程序，用于课程排课、上课提醒和课后反馈管理。系统包含三个角色：**管理员**、**老师**和**学生（家长）**。核心流程为：管理员排课 → 老师/学生在日历中查看课程 → 课前15分钟微信推送提醒 → 课后老师填写反馈。

---

## 技术栈

- **前端**: 微信小程序原生开发（WXML + WXSS + JS/TS）
- **后端**: 微信云开发（Cloud Functions + Cloud Database + Cloud Storage）或自建后端（Node.js/Python + MySQL/MongoDB）
- **消息推送**: 微信小程序订阅消息（一次性订阅 / 长期订阅模板）
- **UI框架**: WeUI 或 Vant Weapp

> **建议优先使用微信云开发**，降低部署和运维成本，且天然集成微信生态。

---

## 角色与权限

| 功能 | 管理员 | 老师 | 学生（家长） |
|------|--------|------|-------------|
| 排课（创建/编辑/删除课程） | ✅ | ❌ | ❌ |
| 指定课程的老师和学生 | ✅ | ❌ | ❌ |
| 查看所有课程日历 | ✅ | ❌ | ❌ |
| 查看自己相关的课程日历 | ✅ | ✅ | ✅ |
| 查看课程详情 | ✅ | ✅ | ✅ |
| 接收课前提醒推送 | ✅ | ✅ | ✅ |
| 撰写课程反馈 | ❌ | ✅ | ❌ |
| 查看课程反馈 | ✅ | ✅（本节课老师） | ✅（本节课学生） |
| 管理用户（老师/学生） | ✅ | ❌ | ❌ |

---

## 数据模型

### 1. 用户表 (users)

```json
{
  "_id": "string (openid)",
  "name": "string",
  "phone": "string",
  "role": "admin | teacher | student",
  "avatar": "string (头像URL)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2. 课程模板表 (courses)

```json
{
  "_id": "string",
  "courseName": "string (课程名称，如：钢琴初级课)",
  "description": "string (课程简介)",
  "totalLessons": "number (总课时数)",
  "createdBy": "string (管理员ID)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 3. 排课记录表 (lessons)

```json
{
  "_id": "string",
  "courseId": "string (关联课程模板)",
  "courseName": "string (冗余存储，方便查询)",
  "teacherId": "string (授课老师openid)",
  "teacherName": "string (冗余存储)",
  "studentIds": ["string (学生openid列表)"],
  "studentNames": ["string (冗余存储)"],
  "date": "string (YYYY-MM-DD)",
  "startTime": "string (HH:mm)",
  "endTime": "string (HH:mm)",
  "location": "string (上课地点，可选)",
  "status": "scheduled | completed | cancelled",
  "reminderSent": "boolean (是否已发送提醒)",
  "createdBy": "string (管理员ID)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 4. 课程反馈表 (feedbacks)

```json
{
  "_id": "string",
  "lessonId": "string (关联排课记录)",
  "courseId": "string",
  "teacherId": "string (撰写反馈的老师)",
  "content": "string (反馈内容，支持富文本或纯文本)",
  "images": ["string (反馈图片URL列表，可选)"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 5. 学生购课记录表 (enrollments)

```json
{
  "_id": "string",
  "studentId": "string (学生openid)",
  "courseId": "string (课程模板ID)",
  "totalLessons": "number (购买的总课时)",
  "usedLessons": "number (已消耗课时)",
  "remainingLessons": "number (剩余课时)",
  "status": "active | expired | completed",
  "createdBy": "string (管理员ID)",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## 页面结构与功能详情

### 通用页面

#### 登录/注册页
- 微信一键授权登录（获取openid）
- 首次登录后由管理员分配角色（或使用邀请码区分角色）
- 建议方案：管理员在后台添加用户手机号+角色 → 用户首次登录时绑定手机号自动匹配角色

---

### 学生（家长）端

#### 首页 - 课程日历
- 月视图日历组件，有课的日期显示标记点（dot）
- 点击某天展示该天的课程列表卡片
- 每张卡片显示：课程名称、上课时间段（如 14:00-15:00）、授课老师姓名、上课地点（可选）
- 支持左右滑动切换月份

#### 课程详情页
- 从日历卡片点击进入
- 显示：课程名称、日期、时间、老师、地点、课程简介
- 如果课程已完成且有反馈，下方显示"老师反馈"区域（反馈内容 + 图片）

#### 我的课程页
- 列表展示已购买的所有课程
- 每项显示：课程名称、总课时 / 已用课时 / 剩余课时
- 可点击查看该课程的历史排课记录

#### 个人中心
- 头像、姓名、手机号
- 消息通知开关（引导用户订阅消息）

---

### 老师端

#### 首页 - 课程日历
- 与学生端类似的月视图日历，但仅展示该老师的课程
- 点击某天显示该天的课程卡片
- 卡片显示：课程名称、时间段、学生姓名列表

#### 课程详情页
- 显示完整课程信息 + 学生名单
- **反馈功能**：
  - 课程状态为 `completed` 时显示"写反馈"按钮
  - 填写反馈文本（建议最少20字提示）
  - 可上传图片（最多9张）
  - 提交后反馈对该课的老师、学生、管理员可见
  - 已有反馈时显示反馈内容，支持编辑

#### 个人中心
- 头像、姓名、手机号
- 今日课程快捷入口

---

### 管理员端

#### 首页 - 全局课程日历
- 月视图日历，展示所有已排课程
- 点击某天查看所有课程卡片
- 支持按老师/课程筛选

#### 排课页面（核心功能）
- **创建排课**表单：
  - 选择课程（下拉，从课程模板表中选）
  - 选择老师（下拉/搜索，从老师列表中选）
  - 选择学生（多选，从学生列表中选，支持搜索）
  - 选择日期（日期选择器）
  - 选择时间段（开始时间 + 结束时间）
  - 填写地点（可选输入框）
- **批量排课**（可选，优先级较低）：
  - 支持按周重复（如每周二 14:00-15:00，持续N周）
  - 生成多条排课记录
- **编辑排课**：可修改时间/老师/学生
- **取消排课**：将状态设为 `cancelled`
- **标记完成**：将状态设为 `completed`，触发老师可写反馈

#### 用户管理页
- 添加用户：姓名 + 手机号 + 角色
- 用户列表：支持按角色筛选（老师/学生）
- 编辑/删除用户

#### 课程管理页
- 创建课程模板：课程名称 + 简介 + 总课时
- 编辑/删除课程模板

#### 购课管理页
- 为学生添加购课记录（选择学生 + 课程 + 课时数）
- 查看学生购课情况和消耗情况

#### 反馈查看
- 在课程详情页查看老师提交的反馈
- 管理员可查看所有课程的反馈

---

## 消息推送（核心功能）

### 实现方案：微信订阅消息

1. **模板选择**：在微信公众平台选用"上课提醒"类模板，字段包括：
   - 课程名称
   - 上课时间
   - 授课老师
   - 上课地点
   - 备注（如"距开课还有15分钟"）

2. **用户订阅**：
   - 学生/老师进入小程序时，引导点击按钮触发 `wx.requestSubscribeMessage` 订阅
   - 由于一次性模板每次只能用一次，需要在关键交互节点反复引导订阅（如每次查看课程时）
   - 如有条件申请长期订阅模板（需资质）

3. **定时触发**：
   - 使用云开发定时触发器（Cloud Function Timer），每分钟/每5分钟检查一次
   - 查询未来15分钟内即将开始且 `reminderSent = false` 的课程
   - 调用 `subscribeMessage.send` 向该课程的老师和所有学生发送提醒
   - 发送成功后将 `reminderSent` 设为 `true`

4. **兜底方案**：
   - 若用户未授权订阅消息，在小程序内通过首页 banner 或弹窗显示"即将上课"提醒

---

## 云函数列表（如使用微信云开发）

| 云函数名 | 触发方式 | 功能 |
|---------|---------|------|
| `login` | 用户调用 | 处理登录，返回用户信息和角色 |
| `userManage` | 管理员调用 | 增删改查用户 |
| `courseManage` | 管理员调用 | 增删改查课程模板 |
| `lessonManage` | 管理员调用 | 排课、编辑、取消、标记完成 |
| `lessonQuery` | 所有角色调用 | 按角色/日期查询课程（自动按权限过滤） |
| `enrollmentManage` | 管理员调用 | 管理学生购课记录 |
| `feedbackManage` | 老师调用（写），所有人调用（读） | 提交/编辑/查看反馈 |
| `sendReminder` | 定时触发器（每5分钟） | 检查即将开始的课并发送订阅消息 |

---

## 开发优先级

### P0 - 核心功能（第一阶段）
1. 用户登录与角色识别
2. 管理员排课（创建/编辑/取消/完成）
3. 学生日历视图查看课程
4. 老师日历视图查看课程
5. 课前15分钟消息推送

### P1 - 重要功能（第二阶段）
6. 老师课程反馈（文字 + 图片）
7. 反馈查看（三方可见）
8. 管理员用户管理
9. 课程模板管理

### P2 - 增强功能（第三阶段）
10. 学生购课记录与课时消耗
11. 批量排课（按周重复）
12. 管理员全局筛选视图

---

## 项目结构参考

```
miniprogram/
├── app.js
├── app.json
├── app.wxss
├── pages/
│   ├── login/                  # 登录页
│   ├── student/
│   │   ├── calendar/           # 学生课程日历首页
│   │   ├── lesson-detail/      # 课程详情（含反馈查看）
│   │   ├── my-courses/         # 我的课程（购课列表）
│   │   └── profile/            # 个人中心
│   ├── teacher/
│   │   ├── calendar/           # 老师课程日历首页
│   │   ├── lesson-detail/      # 课程详情（含写反馈）
│   │   └── profile/            # 个人中心
│   └── admin/
│       ├── calendar/           # 全局课程日历
│       ├── schedule/           # 排课页面
│       ├── lesson-detail/      # 课程详情
│       ├── users/              # 用户管理
│       ├── courses/            # 课程模板管理
│       ├── enrollments/        # 购课管理
│       └── profile/            # 个人中心
├── components/
│   ├── calendar/               # 日历组件
│   ├── lesson-card/            # 课程卡片组件
│   └── feedback-form/          # 反馈表单组件
├── utils/
│   ├── auth.js                 # 登录/权限工具
│   ├── api.js                  # 云函数调用封装
│   └── date.js                 # 日期格式化工具
└── cloudfunctions/
    ├── login/
    ├── userManage/
    ├── courseManage/
    ├── lessonManage/
    ├── lessonQuery/
    ├── enrollmentManage/
    ├── feedbackManage/
    └── sendReminder/
```

---

## 注意事项

1. **订阅消息限制**：微信一次性订阅消息需要用户每次主动点击授权，设计时要在自然交互节点（如查看课表、进入小程序）引导订阅，不要频繁弹窗打扰用户。
2. **数据冗余**：在 `lessons` 表中冗余存储 `teacherName` 和 `studentNames`，避免日历视图大量关联查询，提升性能。
3. **时区**：所有时间统一使用北京时间（UTC+8），存储时注意时区转换。
4. **权限校验**：所有云函数必须在服务端校验调用者角色，不能仅依赖前端判断。
5. **小程序审核**：确保隐私协议、用户协议完整，订阅消息模板需提前在微信公众平台申请并审核通过。
6. **日历组件**：可使用成熟的开源小程序日历组件（如 `wx-calendar`），或基于 Vant Weapp 的 Calendar 组件自定义。

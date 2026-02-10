# 数据库初始化指南

在微信云开发控制台中手动完成以下操作。

## 1. 创建集合

在「云开发 → 数据库」中依次创建以下 5 个集合：

| 集合名 | 说明 |
|--------|------|
| `users` | 用户表 |
| `courses` | 课程模板表 |
| `lessons` | 排课记录表 |
| `feedbacks` | 课程反馈表 |
| `enrollments` | 学生购课记录表 |

## 2. 设置安全规则

所有集合的安全规则统一设为：

```json
{
  "read": false,
  "write": false
}
```

> 所有数据访问均通过云函数进行，不允许小程序端直接读写。

## 3. 创建索引

### users 集合
| 索引名 | 字段 | 排序 | 是否唯一 |
|--------|------|------|---------|
| `phone_1` | phone | 升序 | 是 |
| `role_1` | role | 升序 | 否 |

### lessons 集合
| 索引名 | 字段 | 排序 | 是否唯一 |
|--------|------|------|---------|
| `date_1` | date | 升序 | 否 |
| `teacherId_1_date_1` | teacherId 升序, date 升序 | — | 否 |
| `status_1_reminderSent_1` | status 升序, reminderSent 升序 | — | 否 |

> `studentIds` 为数组字段，云开发数组字段支持 `_.in` 查询，无需额外索引。

### feedbacks 集合
| 索引名 | 字段 | 排序 | 是否唯一 |
|--------|------|------|---------|
| `lessonId_1` | lessonId | 升序 | 否 |

### enrollments 集合
| 索引名 | 字段 | 排序 | 是否唯一 |
|--------|------|------|---------|
| `studentId_1_courseId_1` | studentId 升序, courseId 升序 | — | 是 |

### courses 集合
无需额外索引（数据量小，默认 `_id` 索引即可）。

## 4. 插入管理员种子数据

在 `users` 集合中手动添加一条记录：

```json
{
  "_id": "管理员的微信openid",
  "name": "管理员姓名",
  "phone": "管理员手机号",
  "role": "admin",
  "avatar": "",
  "createdAt": "当前时间戳(毫秒)",
  "updatedAt": "当前时间戳(毫秒)"
}
```

### 获取管理员 openid

1. 微信开发者工具中打开项目
2. 在控制台执行：`wx.cloud.callFunction({ name: 'login' }).then(console.log)`
3. 返回结果中的 `openid` 即为当前登录用户的 openid
4. 将此 openid 填入上方 `_id` 字段

### 快捷方式

也可在云开发控制台的数据库面板直接「添加记录」，将 `_id` 字段手动设为 openid 字符串。

## 5. 待绑定用户添加

管理员通过小程序的「用户管理」功能添加老师/学生时，系统会自动创建待绑定记录：

```json
{
  "_id": "自动生成",
  "name": "张老师",
  "phone": "13800138000",
  "role": "teacher",
  "openid": null,
  "avatar": "",
  "createdAt": "时间戳",
  "updatedAt": "时间戳"
}
```

用户首次微信登录并绑定手机号后，系统会将此记录迁移为以 openid 为 `_id` 的正式记录。

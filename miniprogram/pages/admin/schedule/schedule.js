const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    // 排课表单数据
    courseId: '',
    teacherId: '',
    studentIds: [],
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    // 选项列表
    courseList: [],
    teacherList: [],
    studentList: [],
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(1)
      this.getTabBar().setRole('admin')
    }
    // TODO Phase 2: 加载课程/老师/学生列表
  },
})

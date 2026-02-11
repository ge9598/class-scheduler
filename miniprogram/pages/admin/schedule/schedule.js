const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const { formatDate } = require('../../../utils/date')
const Dialog = require('@vant/weapp/dialog/dialog')

Page({
  data: {
    // 编辑模式
    editMode: false,
    editLessonId: null,

    // 表单数据
    form: {
      courseId: '',
      teacherId: '',
      studentIds: [],
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      repeat: false,
      repeatWeeks: 4,
    },

    // 选中项显示名称
    selectedCourseName: '',
    selectedTeacherName: '',
    selectedStudentNames: [],

    // 数据源
    courseList: [],
    teacherList: [],
    studentList: [],
    courseColumns: [],
    teacherColumns: [],

    // 学生多选临时状态
    tempStudentIds: [],

    // 弹窗控制
    showCourse: false,
    showTeacher: false,
    showStudent: false,
    showDate: false,
    showStartTime: false,
    showEndTime: false,

    // 日期选择器
    dateValue: Date.now(),
    minDate: Date.now() - 86400000, // 允许选昨天

    // 最近排课
    recentLessons: [],
    loadingLessons: false,

    submitting: false,

    statusLabels: {
      scheduled: '待上课',
      completed: '已完成',
      cancelled: '已取消',
    },
  },

  onLoad(options) {
    checkAuth('admin')
    if (options.lessonId) {
      this.setData({ editMode: true, editLessonId: options.lessonId })
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(1)
      this.getTabBar().setRole('admin')
    }
    this.loadPickerData()
    if (!this.data.editMode) {
      this.loadRecentLessons()
    } else {
      this.loadLesson(this.data.editLessonId)
    }
  },

  /**
   * 加载下拉数据源
   */
  async loadPickerData() {
    try {
      const [courseRes, teacherRes, studentRes] = await Promise.all([
        callFunction('courseManage', { action: 'list', data: { pageSize: 100 } }),
        callFunction('userManage', { action: 'getByRole', data: { role: 'teacher' } }),
        callFunction('userManage', { action: 'getByRole', data: { role: 'student' } }),
      ])

      const courseList = courseRes.data.list || []
      const teacherList = teacherRes.data || []
      const studentList = studentRes.data || []

      this.setData({
        courseList,
        teacherList,
        studentList,
        courseColumns: courseList.map(c => c.courseName),
        teacherColumns: teacherList.map(t => t.name),
      })
    } catch (err) {
      console.error('加载选项数据失败', err)
    }
  },

  /**
   * 加载最近排课
   */
  async loadRecentLessons() {
    this.setData({ loadingLessons: true })
    try {
      const res = await callFunction('lessonManage', {
        action: 'list',
        data: { page: 1, pageSize: 20 },
      })
      this.setData({ recentLessons: res.data.list || [] })
    } catch (err) {
      console.error('加载排课列表失败', err)
    } finally {
      this.setData({ loadingLessons: false })
    }
  },

  /**
   * 加载已有排课数据（编辑模式）
   */
  async loadLesson(lessonId) {
    try {
      const res = await callFunction('lessonManage', {
        action: 'get',
        data: { _id: lessonId },
      })
      const lesson = res.data
      this.setData({
        form: {
          courseId: lesson.courseId,
          teacherId: lesson.teacherId,
          studentIds: lesson.studentIds,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          location: lesson.location || '',
        },
        selectedCourseName: lesson.courseName,
        selectedTeacherName: lesson.teacherName,
        selectedStudentNames: lesson.studentNames,
      })
    } catch (err) {
      console.error('加载排课详情失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // ========== 选择器控制 ==========

  showCoursePicker() {
    if (this.data.courseColumns.length === 0) {
      wx.showToast({ title: '暂无可选课程，请先创建', icon: 'none' })
      return
    }
    this._toggleTabBar(false)
    this.setData({ showCourse: true })
  },

  showTeacherPicker() {
    if (this.data.teacherColumns.length === 0) {
      wx.showToast({ title: '暂无已激活的老师', icon: 'none' })
      return
    }
    this._toggleTabBar(false)
    this.setData({ showTeacher: true })
  },

  showStudentPicker() {
    if (this.data.studentList.length === 0) {
      wx.showToast({ title: '暂无已激活的学生', icon: 'none' })
      return
    }
    this._toggleTabBar(false)
    this.setData({
      showStudent: true,
      tempStudentIds: [...this.data.form.studentIds],
    })
  },

  showDatePicker() { this._toggleTabBar(false); this.setData({ showDate: true }) },
  showStartTimePicker() { this._toggleTabBar(false); this.setData({ showStartTime: true }) },
  showEndTimePicker() { this._toggleTabBar(false); this.setData({ showEndTime: true }) },

  closePickers() {
    this.setData({
      showCourse: false,
      showTeacher: false,
      showStudent: false,
      showDate: false,
      showStartTime: false,
      showEndTime: false,
    })
    this._toggleTabBar(true)
  },

  _toggleTabBar(visible) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setShow(visible)
    }
  },

  // ========== 选择确认回调 ==========

  onCourseConfirm(e) {
    const { index } = e.detail
    const course = this.data.courseList[index]
    this.setData({
      'form.courseId': course._id,
      selectedCourseName: course.courseName,
      showCourse: false,
    })
    this._toggleTabBar(true)
  },

  onTeacherConfirm(e) {
    const { index } = e.detail
    const teacher = this.data.teacherList[index]
    this.setData({
      'form.teacherId': teacher._id,
      selectedTeacherName: teacher.name,
      showTeacher: false,
    })
    this._toggleTabBar(true)
  },

  onStudentChange(e) {
    this.setData({ tempStudentIds: e.detail })
  },

  confirmStudents() {
    const { tempStudentIds, studentList } = this.data
    const names = tempStudentIds.map(id => {
      const s = studentList.find(s => s._id === id)
      return s ? s.name : ''
    }).filter(Boolean)

    this.setData({
      'form.studentIds': tempStudentIds,
      selectedStudentNames: names,
      showStudent: false,
    })
    this._toggleTabBar(true)
  },

  onDateConfirm(e) {
    const date = formatDate(new Date(e.detail))
    this.setData({
      'form.date': date,
      showDate: false,
    })
    this._toggleTabBar(true)
  },

  onStartTimeConfirm(e) {
    this.setData({ 'form.startTime': e.detail, showStartTime: false })
    this._toggleTabBar(true)
  },

  onEndTimeConfirm(e) {
    this.setData({ 'form.endTime': e.detail, showEndTime: false })
    this._toggleTabBar(true)
  },

  onLocationChange(e) {
    this.setData({ 'form.location': e.detail })
  },

  // ========== 重复设置 ==========

  onRepeatChange(e) {
    this.setData({ 'form.repeat': e.detail })
  },

  onRepeatWeeksChange(e) {
    this.setData({ 'form.repeatWeeks': e.detail })
  },

  // ========== 提交排课 ==========

  async handleSubmit() {
    const { form, editMode, editLessonId, submitting } = this.data
    if (submitting) return

    // 前端校验
    if (!form.courseId) return wx.showToast({ title: '请选择课程', icon: 'none' })
    if (!form.teacherId) return wx.showToast({ title: '请选择老师', icon: 'none' })
    if (form.studentIds.length === 0) return wx.showToast({ title: '请选择学生', icon: 'none' })
    if (!form.date) return wx.showToast({ title: '请选择日期', icon: 'none' })
    if (!form.startTime) return wx.showToast({ title: '请选择开始时间', icon: 'none' })
    if (!form.endTime) return wx.showToast({ title: '请选择结束时间', icon: 'none' })
    if (form.startTime >= form.endTime) {
      return wx.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' })
    }

    this.setData({ submitting: true })

    try {
      if (editMode) {
        // 编辑模式只传排课相关字段，排除 repeat/repeatWeeks
        const { repeat, repeatWeeks, ...editData } = form
        await callFunction('lessonManage', {
          action: 'update',
          data: { _id: editLessonId, ...editData },
        }, { showLoading: true })
        wx.showToast({ title: '更新成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      } else if (form.repeat) {
        // 批量排课
        const res = await callFunction('lessonManage', {
          action: 'batchCreate',
          data: {
            courseId: form.courseId,
            teacherId: form.teacherId,
            studentIds: form.studentIds,
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            location: form.location,
            repeatWeeks: form.repeatWeeks,
          },
        }, { showLoading: true })
        const result = res.data || {}
        const created = result.created || 0
        const skipped = result.skipped || []
        let msg = `成功排课 ${created} 节`
        if (skipped.length > 0) {
          msg += `，跳过 ${skipped.length} 节（冲突）`
        }
        wx.showModal({
          title: '批量排课结果',
          content: msg + (skipped.length > 0 ? '\n跳过日期：' + skipped.join('、') : ''),
          showCancel: false,
        })
        this.resetForm()
        this.loadRecentLessons()
      } else {
        await callFunction('lessonManage', {
          action: 'create',
          data: form,
        }, { showLoading: true })
        wx.showToast({ title: '排课成功', icon: 'success' })
        this.resetForm()
        this.loadRecentLessons()
      }
    } catch (err) {
      console.error('排课失败', err)
    } finally {
      this.setData({ submitting: false })
    }
  },

  resetForm() {
    this.setData({
      form: {
        courseId: '',
        teacherId: '',
        studentIds: [],
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        repeat: false,
        repeatWeeks: 4,
      },
      selectedCourseName: '',
      selectedTeacherName: '',
      selectedStudentNames: [],
    })
  },

  // ========== 排课列表操作 ==========

  handleEdit(e) {
    const lesson = e.currentTarget.dataset.lesson
    wx.navigateTo({
      url: `/pages/admin/schedule/schedule?lessonId=${lesson._id}`,
    })
  },

  handleComplete(e) {
    const id = e.currentTarget.dataset.id
    Dialog.confirm({
      title: '确认完成',
      message: '标记为已完成后，老师可撰写课程反馈',
    })
      .then(async () => {
        try {
          await callFunction('lessonManage', {
            action: 'complete',
            data: { _id: id },
          })
          wx.showToast({ title: '已完成', icon: 'success' })
          this.loadRecentLessons()
        } catch (err) {
          console.error('标记完成失败', err)
        }
      })
      .catch(() => {})
  },

  handleCancel(e) {
    const { id, name } = e.currentTarget.dataset
    Dialog.confirm({
      title: '确认取消',
      message: `确定取消排课「${name}」？`,
    })
      .then(async () => {
        try {
          await callFunction('lessonManage', {
            action: 'cancel',
            data: { _id: id },
          })
          wx.showToast({ title: '已取消', icon: 'success' })
          this.loadRecentLessons()
        } catch (err) {
          console.error('取消失败', err)
        }
      })
      .catch(() => {})
  },
})

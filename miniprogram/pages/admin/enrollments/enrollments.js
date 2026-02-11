const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')

Page({
  data: {
    form: {
      studentId: '',
      courseId: '',
      totalLessons: 10,
    },
    selectedStudentName: '',
    selectedCourseName: '',

    studentList: [],
    courseList: [],
    studentColumns: [],
    courseColumns: [],

    showStudent: false,
    showCourse: false,
    submitting: false,

    // 列表
    enrollmentList: [],
    loading: false,

    statusLabels: {
      active: '使用中',
      completed: '已用完',
      expired: '已过期',
    },

    // 编辑弹窗
    showEdit: false,
    editItem: {},
    editTotalLessons: 0,
    editSubmitting: false,
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    this.loadPickerData()
    this.loadEnrollments()
  },

  async loadPickerData() {
    try {
      const [studentRes, courseRes] = await Promise.all([
        callFunction('userManage', { action: 'getByRole', data: { role: 'student' } }),
        callFunction('courseManage', { action: 'list', data: { pageSize: 100 } }),
      ])

      const studentList = studentRes.data || []
      const courseList = courseRes.data.list || []

      this.setData({
        studentList,
        courseList,
        studentColumns: studentList.map(s => `${s.name}（${s.phone}）`),
        courseColumns: courseList.map(c => c.courseName),
      })
    } catch (err) {
      console.error('加载选项失败', err)
    }
  },

  async loadEnrollments() {
    this.setData({ loading: true })
    try {
      const res = await callFunction('enrollmentManage', {
        action: 'list',
        data: { pageSize: 100 },
      })
      this.setData({ enrollmentList: res.data.list || [] })
    } catch (err) {
      console.error('加载购课记录失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  // ========== 选择器 ==========

  showStudentPicker() {
    if (this.data.studentColumns.length === 0) {
      wx.showToast({ title: '暂无学生', icon: 'none' })
      return
    }
    this.setData({ showStudent: true })
  },

  showCoursePicker() {
    if (this.data.courseColumns.length === 0) {
      wx.showToast({ title: '暂无课程', icon: 'none' })
      return
    }
    this.setData({ showCourse: true })
  },

  closePickers() {
    this.setData({ showStudent: false, showCourse: false })
  },

  onStudentConfirm(e) {
    const { index } = e.detail
    const student = this.data.studentList[index]
    this.setData({
      'form.studentId': student._id,
      selectedStudentName: student.name,
      showStudent: false,
    })
  },

  onCourseConfirm(e) {
    const { index } = e.detail
    const course = this.data.courseList[index]
    this.setData({
      'form.courseId': course._id,
      selectedCourseName: course.courseName,
      showCourse: false,
    })
  },

  onLessonsChange(e) {
    this.setData({ 'form.totalLessons': e.detail })
  },

  // ========== 提交 ==========

  async handleSubmit() {
    const { form, submitting } = this.data
    if (submitting) return

    if (!form.studentId) return wx.showToast({ title: '请选择学生', icon: 'none' })
    if (!form.courseId) return wx.showToast({ title: '请选择课程', icon: 'none' })

    this.setData({ submitting: true })
    try {
      await callFunction('enrollmentManage', {
        action: 'create',
        data: form,
      }, { showLoading: true })
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.setData({
        form: { studentId: '', courseId: '', totalLessons: 10 },
        selectedStudentName: '',
        selectedCourseName: '',
      })
      this.loadEnrollments()
    } catch (err) {
      console.error('添加购课失败', err)
    } finally {
      this.setData({ submitting: false })
    }
  },

  // ========== 编辑 ==========

  handleEdit(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showEdit: true,
      editItem: item,
      editTotalLessons: item.totalLessons,
    })
  },

  closeEdit() {
    this.setData({ showEdit: false, editItem: {} })
  },

  onEditLessonsChange(e) {
    this.setData({ editTotalLessons: e.detail })
  },

  async confirmEdit() {
    const { editItem, editTotalLessons, editSubmitting } = this.data
    if (editSubmitting) return

    this.setData({ editSubmitting: true })
    try {
      await callFunction('enrollmentManage', {
        action: 'update',
        data: { _id: editItem._id, totalLessons: editTotalLessons },
      }, { showLoading: true })
      wx.showToast({ title: '修改成功', icon: 'success' })
      this.closeEdit()
      this.loadEnrollments()
    } catch (err) {
      console.error('修改课时失败', err)
    } finally {
      this.setData({ editSubmitting: false })
    }
  },
})

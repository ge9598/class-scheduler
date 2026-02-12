const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')

Page({
  data: {
    form: {
      studentId: '',
      courseId: '',
      teacherId: '',
      totalLessons: 10,
    },
    selectedStudentName: '',
    selectedCourseName: '',
    selectedTeacherName: '',

    studentList: [],
    courseList: [],
    teacherList: [],
    studentColumns: [],
    courseColumns: [],
    teacherColumns: [],

    showStudent: false,
    showCourse: false,
    showTeacher: false,
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
      const [studentRes, courseRes, teacherRes] = await Promise.all([
        callFunction('userManage', { action: 'getByRole', data: { role: 'student' } }),
        callFunction('courseManage', { action: 'list', data: { pageSize: 100 } }),
        callFunction('userManage', { action: 'getByRole', data: { role: 'teacher' } }),
      ])

      const studentList = studentRes.data || []
      const courseList = courseRes.data.list || []
      const teacherList = teacherRes.data || []

      this.setData({
        studentList,
        courseList,
        teacherList,
        studentColumns: studentList.map(s => `${s.name}（${s.phone}）`),
        courseColumns: courseList.map(c => c.courseName),
        teacherColumns: teacherList.map(t => `${t.name}（${t.phone}）`),
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
      console.error('加载课时包失败', err)
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

  showTeacherPicker() {
    if (this.data.teacherColumns.length === 0) {
      wx.showToast({ title: '暂无老师', icon: 'none' })
      return
    }
    this.setData({ showTeacher: true })
  },

  onTeacherConfirm(e) {
    const { index } = e.detail
    const teacher = this.data.teacherList[index]
    this.setData({
      'form.teacherId': teacher._id,
      selectedTeacherName: teacher.name,
      showTeacher: false,
    })
  },

  closePickers() {
    this.setData({ showStudent: false, showCourse: false, showTeacher: false })
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
    if (!form.teacherId) return wx.showToast({ title: '请选择老师', icon: 'none' })

    this.setData({ submitting: true })
    try {
      await callFunction('enrollmentManage', {
        action: 'create',
        data: form,
      }, { showLoading: true })
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.setData({
        form: { studentId: '', courseId: '', teacherId: '', totalLessons: 10 },
        selectedStudentName: '',
        selectedCourseName: '',
        selectedTeacherName: '',
      })
      this.loadEnrollments()
    } catch (err) {
      console.error('添加课时包失败', err)
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

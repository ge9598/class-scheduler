const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const Dialog = require('@vant/weapp/dialog/dialog').default

Page({
  data: {
    courseList: [],
    loading: false,
    showDialog: false,
    editingCourse: null,
    submitting: false,
    form: { courseName: '', description: '', totalLessons: 10 },
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    this.loadCourses()
  },

  async loadCourses() {
    this.setData({ loading: true })
    try {
      const res = await callFunction('courseManage', {
        action: 'list',
        data: { page: 1, pageSize: 100 },
      })
      this.setData({ courseList: res.data.list })
    } catch (err) {
      console.error('加载课程列表失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  showAddDialog() {
    this._toggleTabBar(false)
    this.setData({
      showDialog: true,
      editingCourse: null,
      form: { courseName: '', description: '', totalLessons: 10 },
    })
  },

  showEditDialog(e) {
    const course = e.currentTarget.dataset.course
    this._toggleTabBar(false)
    this.setData({
      showDialog: true,
      editingCourse: course,
      form: {
        courseName: course.courseName,
        description: course.description || '',
        totalLessons: course.totalLessons,
      },
    })
  },

  closeDialog() {
    this.setData({ showDialog: false, editingCourse: null })
    this._toggleTabBar(true)
  },

  _toggleTabBar(visible) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setShow(visible)
    }
  },

  onFormChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail })
  },

  onLessonsChange(e) {
    this.setData({ 'form.totalLessons': e.detail })
  },

  async handleSubmit() {
    const { form, editingCourse, submitting } = this.data
    if (submitting) return

    if (!form.courseName.trim()) {
      wx.showToast({ title: '请输入课程名称', icon: 'none' })
      return
    }
    if (!form.totalLessons || form.totalLessons < 1) {
      wx.showToast({ title: '总课时数必须大于0', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      if (editingCourse) {
        await callFunction('courseManage', {
          action: 'update',
          data: {
            _id: editingCourse._id,
            courseName: form.courseName.trim(),
            description: form.description,
            totalLessons: form.totalLessons,
          },
        })
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        await callFunction('courseManage', {
          action: 'add',
          data: {
            courseName: form.courseName.trim(),
            description: form.description,
            totalLessons: form.totalLessons,
          },
        })
        wx.showToast({ title: '创建成功', icon: 'success' })
      }
      this.closeDialog()
      this.loadCourses()
    } catch (err) {
      console.error('操作失败', err)
    } finally {
      this.setData({ submitting: false })
    }
  },

  handleDelete(e) {
    const course = e.currentTarget.dataset.course
    Dialog.confirm({
      title: '确认删除',
      message: `确定删除课程「${course.courseName}」？\n如有关联排课记录将无法删除。`,
    })
      .then(async () => {
        try {
          await callFunction('courseManage', {
            action: 'delete',
            data: { _id: course._id },
          })
          wx.showToast({ title: '删除成功', icon: 'success' })
          this.loadCourses()
        } catch (err) {
          console.error('删除失败', err)
        }
      })
      .catch(() => {})
  },
})

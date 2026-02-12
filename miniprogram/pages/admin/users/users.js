const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const Dialog = require('@vant/weapp/dialog/dialog').default

Page({
  data: {
    userList: [],
    roleFilter: 'all',
    loading: false,
    showDialog: false,
    editingUser: null,
    submitting: false,
    form: { name: '', phone: '', role: 'teacher' },
    roleLabels: {
      admin: '管理员',
      teacher: '老师',
      student: '学生',
    },
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(2)
      this.getTabBar().setRole('admin')
    }
    this.loadUsers()
  },

  async loadUsers() {
    this.setData({ loading: true })
    try {
      const params = { page: 1, pageSize: 100 }
      if (this.data.roleFilter !== 'all') {
        params.role = this.data.roleFilter
      }
      const res = await callFunction('userManage', {
        action: 'list',
        data: params,
      })
      this.setData({ userList: res.data.list })
    } catch (err) {
      console.error('加载用户列表失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  setFilter(e) {
    const role = e.currentTarget.dataset.role
    this.setData({ roleFilter: role })
    this.loadUsers()
  },

  showAddDialog() {
    this._toggleTabBar(false)
    this.setData({
      showDialog: true,
      editingUser: null,
      form: { name: '', phone: '', role: 'teacher' },
    })
  },

  showEditDialog(e) {
    const user = e.currentTarget.dataset.user
    this._toggleTabBar(false)
    this.setData({
      showDialog: true,
      editingUser: user,
      form: {
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    })
  },

  closeDialog() {
    this.setData({ showDialog: false, editingUser: null })
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

  onRoleSelect(e) {
    this.setData({ 'form.role': e.currentTarget.dataset.role })
  },

  async handleSubmit() {
    const { form, editingUser, submitting } = this.data
    if (submitting) return

    if (!form.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      if (editingUser) {
        await callFunction('userManage', {
          action: 'update',
          data: {
            _id: editingUser._id,
            name: form.name.trim(),
            phone: form.phone,
            role: form.role,
          },
        })
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        await callFunction('userManage', {
          action: 'add',
          data: {
            name: form.name.trim(),
            phone: form.phone,
            role: form.role,
          },
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      }
      this.closeDialog()
      this.loadUsers()
    } catch (err) {
      console.error('操作失败', err)
    } finally {
      this.setData({ submitting: false })
    }
  },

  handleDelete(e) {
    const user = e.currentTarget.dataset.user
    Dialog.confirm({
      title: '确认删除',
      message: `确定删除用户「${user.name}」？`,
    })
      .then(async () => {
        try {
          await callFunction('userManage', {
            action: 'delete',
            data: { _id: user._id },
          })
          wx.showToast({ title: '删除成功', icon: 'success' })
          this.loadUsers()
        } catch (err) {
          console.error('删除失败', err)
        }
      })
      .catch(() => {})
  },
})

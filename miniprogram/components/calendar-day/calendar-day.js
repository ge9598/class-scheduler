const { getLessonPosition, getCourseColor, START_HOUR } = require('../../utils/date')

Component({
  properties: {
    // 当天课程列表
    lessons: {
      type: Array,
      value: [],
    },
    // 角色：admin 时按老师分列
    role: {
      type: String,
      value: 'student',
    },
  },

  data: {
    hours: [],
    // 学生/老师：单列课程块
    lessonBlocks: [],
    // 管理员：按老师分列
    teachers: [],
    teacherColumns: [],
    totalHeight: 0,
  },

  lifetimes: {
    attached() {
      const hours = []
      for (let h = START_HOUR; h <= 22; h++) {
        hours.push(String(h).padStart(2, '0') + ':00')
      }
      // 总高度 = (22 - 7) * 120 = 1800 rpx
      this.setData({ hours, totalHeight: (22 - START_HOUR) * 120 })
    },
  },

  observers: {
    'lessons, role'() {
      this.buildBlocks()
    },
  },

  methods: {
    buildBlocks() {
      const { lessons, role } = this.data
      if (!lessons || !lessons.length) {
        this.setData({ lessonBlocks: [], teachers: [], teacherColumns: [] })
        return
      }

      if (role === 'admin') {
        this.buildAdminColumns(lessons)
      } else {
        this.buildSingleColumn(lessons)
      }
    },

    buildSingleColumn(lessons) {
      const lessonBlocks = lessons.map(l => {
        const pos = getLessonPosition(l.startTime, l.endTime)
        return {
          ...l,
          top: pos.top,
          height: pos.height,
          color: getCourseColor(l.courseId),
        }
      })
      this.setData({ lessonBlocks })
    },

    buildAdminColumns(lessons) {
      // 按老师分组
      const teacherMap = {}
      lessons.forEach(l => {
        const tid = l.teacherId || 'unknown'
        if (!teacherMap[tid]) {
          teacherMap[tid] = {
            teacherId: tid,
            teacherName: l.teacherName || '未知老师',
            lessons: [],
          }
        }
        teacherMap[tid].lessons.push(l)
      })

      const teachers = Object.keys(teacherMap).map(tid => teacherMap[tid].teacherName)

      const teacherColumns = Object.values(teacherMap).map(col => ({
        teacherName: col.teacherName,
        teacherId: col.teacherId,
        blocks: col.lessons.map(l => {
          const pos = getLessonPosition(l.startTime, l.endTime)
          return {
            ...l,
            top: pos.top,
            height: pos.height,
            color: getCourseColor(l.courseId),
          }
        }),
      }))

      this.setData({ teachers, teacherColumns })
    },

    onBlockTap(e) {
      const { lesson } = e.currentTarget.dataset
      if (lesson && lesson._id) {
        this.triggerEvent('lessonclick', { lesson })
      }
    },
  },
})

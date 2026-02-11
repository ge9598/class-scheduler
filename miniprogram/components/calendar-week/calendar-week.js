const { getLessonPosition, getCourseColor, getWeekDates, START_HOUR } = require('../../utils/date')

const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

Component({
  properties: {
    // 当周所有课程
    lessons: {
      type: Array,
      value: [],
    },
    // 周的 7 天日期列表（周一开始）
    weekDates: {
      type: Array,
      value: [],
    },
    // 角色
    role: {
      type: String,
      value: 'student',
    },
  },

  data: {
    hours: [],
    // 学生/老师：7 列时间轴数据
    dayColumns: [],
    // 管理员：概览数据
    daySummaries: [],
    totalHeight: 0,
    weekLabels: WEEK_LABELS,
  },

  lifetimes: {
    attached() {
      const hours = []
      for (let h = START_HOUR; h <= 22; h++) {
        hours.push(String(h).padStart(2, '0') + ':00')
      }
      this.setData({ hours, totalHeight: (22 - START_HOUR) * 120 })
    },
  },

  observers: {
    'lessons, weekDates, role'() {
      this.buildWeekData()
    },
  },

  methods: {
    buildWeekData() {
      const { lessons, weekDates, role } = this.data
      if (!weekDates || weekDates.length !== 7) return

      if (role === 'admin') {
        this.buildAdminOverview(lessons, weekDates)
      } else {
        this.buildTimeColumns(lessons, weekDates)
      }
    },

    buildTimeColumns(lessons, weekDates) {
      const dayColumns = weekDates.map((date, idx) => {
        const dayLessons = lessons
          .filter(l => l.date === date)
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

        const blocks = dayLessons.map(l => {
          const pos = getLessonPosition(l.startTime, l.endTime)
          return {
            ...l,
            top: pos.top,
            height: pos.height,
            color: getCourseColor(l.courseId),
            shortName: (l.courseName || '').substring(0, 3),
          }
        })

        return {
          date,
          dayOfMonth: date.split('-')[2].replace(/^0/, ''),
          label: WEEK_LABELS[idx],
          blocks,
        }
      })

      this.setData({ dayColumns })
    },

    buildAdminOverview(lessons, weekDates) {
      const daySummaries = weekDates.map((date, idx) => {
        const dayLessons = lessons
          .filter(l => l.date === date)
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

        const colorBlocks = dayLessons.slice(0, 5).map(l => ({
          color: getCourseColor(l.courseId),
          time: l.startTime + '-' + l.endTime,
          _id: l._id,
        }))

        return {
          date,
          dayOfMonth: date.split('-')[2].replace(/^0/, ''),
          label: WEEK_LABELS[idx],
          count: dayLessons.length,
          colorBlocks,
        }
      })

      this.setData({ daySummaries })
    },

    onBlockTap(e) {
      const { lesson } = e.currentTarget.dataset
      if (lesson && lesson._id) {
        this.triggerEvent('lessonclick', { lesson })
      }
    },

    onDayTap(e) {
      const { date } = e.currentTarget.dataset
      if (date) {
        this.triggerEvent('dayclick', { date })
      }
    },
  },
})

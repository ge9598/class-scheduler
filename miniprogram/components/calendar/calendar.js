const { formatDate, getMonthDays, getFirstDayOfMonth } = require('../../utils/date')

Component({
  properties: {
    // 有课的日期列表 ['2026-01-15', '2026-01-20']
    markedDates: {
      type: Array,
      value: [],
    },
    // 当前选中日期 'YYYY-MM-DD'
    selectedDate: {
      type: String,
      value: '',
    },
  },

  data: {
    year: 0,
    month: 0,
    days: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
  },

  lifetimes: {
    attached() {
      const now = new Date()
      this.setData({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      })
      this.buildCalendar()
    },
  },

  observers: {
    'markedDates, year, month'() {
      this.buildCalendar()
    },
  },

  methods: {
    buildCalendar() {
      const { year, month, markedDates } = this.data
      const totalDays = getMonthDays(year, month)
      const firstDay = getFirstDayOfMonth(year, month)

      const days = []
      // 填充前置空白
      for (let i = 0; i < firstDay; i++) {
        days.push({ day: '', date: '', isMarked: false, isToday: false })
      }
      // 填充日期
      const today = formatDate(new Date())
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({
          day: d,
          date: dateStr,
          isMarked: markedDates.includes(dateStr),
          isToday: dateStr === today,
        })
      }

      this.setData({ days })
    },

    onDayTap(e) {
      const { date } = e.currentTarget.dataset
      if (!date) return
      this.setData({ selectedDate: date })
      this.triggerEvent('dayclick', { date })
    },

    prevMonth() {
      let { year, month } = this.data
      month--
      if (month < 1) {
        month = 12
        year--
      }
      this.setData({ year, month })
      this.triggerEvent('monthchange', { year, month })
    },

    nextMonth() {
      let { year, month } = this.data
      month++
      if (month > 12) {
        month = 1
        year++
      }
      this.setData({ year, month })
      this.triggerEvent('monthchange', { year, month })
    },
  },
})

const { request, showToast } = require('../../utils/request');
const util = require('../../utils/util');

Page({
  data: {
    userInfo: null,
    greeting: '',
    streakDays: 0,
    todayPlan: null,
    weekDates: [],
    weekWorkoutCount: 0,
    totalWorkoutCount: 0,
    totalDuration: 0,
    todayCheckedIn: false,
    checkinDates: [],
    latestAnnouncement: null
  },

  onLoad() {
    this.setData({ greeting: util.getGreeting() });
    this.initWeekDates();
  },

  async onShow() {
    if (!getApp().checkLogin()) return;
    await this.loadUserInfo();
    this.loadTodayPlan();
    this.loadStats();
    this.loadCheckinStreak();
    this.loadLatestAnnouncement();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.loadTodayPlan(),
      this.loadStats(),
      this.loadCheckinStreak()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  initWeekDates() {
    const weekDates = util.getWeekDates();
    this.setData({ weekDates });
  },

  async loadUserInfo() {
    try {
      const user = await request({ url: '/user/profile' });
      this.setData({ userInfo: user });
      getApp().globalData.userInfo = user;
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  async loadTodayPlan() {
    try {
      const user = this.data.userInfo;
      if (!user || !user.currentPlanId) {
        this.setData({ todayPlan: null });
        return;
      }

      const detail = await request({ url: `/plan/${user.currentPlanId}` });
      if (!detail || !detail.days) return;

      const today = new Date();
      const dayOfWeek = today.getDay() || 7;

      const todayDay = detail.days.find(d => d.dayOfWeek === dayOfWeek && !d.isRestDay);

      if (todayDay) {
        this.setData({
          todayPlan: {
            planId: detail.id,
            planName: detail.name,
            dayLabel: todayDay.dayLabel || '训练日',
            exercises: todayDay.exercises || []
          }
        });
      } else {
        const trainingDays = detail.days.filter(d => !d.isRestDay);
        if (trainingDays.length > 0) {
          this.setData({
            todayPlan: {
              planId: detail.id,
              planName: detail.name + ' (下次)',
              dayLabel: trainingDays[0].dayLabel || '训练日',
              exercises: trainingDays[0].exercises || []
            }
          });
        }
      }
    } catch (err) {
      console.error('加载今日计划失败:', err);
    }
  },

  async loadStats() {
    try {
      const stats = await request({ url: '/workout/stats', data: { period: 'week' } });
      const history = await request({ url: '/workout/history', data: { pageSize: 100, status: 'completed' } });

      if (history && history.list) {
        const weekDates = this.data.weekDates.map(item => ({
          ...item,
          checked: history.list.some(log => log.workoutDate === item.date)
        }));

        this.setData({
          weekWorkoutCount: stats.totalWorkouts || 0,
          totalWorkoutCount: stats.totalWorkouts || 0,
          totalDuration: Math.round((stats.totalDurationMin || 0) / 60),
          weekDates
        });
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  async loadCheckinStreak() {
    try {
      const res = await request({ url: '/checkin/streak' });
      this.setData({ streakDays: res.currentStreak || 0 });
    } catch (err) {
      console.error('加载打卡失败:', err);
    }
  },

  async loadLatestAnnouncement() {
    try {
      const res = await request({ url: '/announcement/latest' });
      if (res && res.isPopup) {
        this.setData({ latestAnnouncement: res });
      }
    } catch (err) {
      console.error('加载公告失败:', err);
    }
  },

  goAIChat() {
    wx.switchTab({ url: '/pages/ai/chat' });
  },

  goAIPlanGenerator() {
    wx.navigateTo({ url: '/pages/ai/plan-generator' });
  },

  goAIChatHistory() {
    wx.navigateTo({ url: '/pages/ai/chat-history' });
  },

  goPlanDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/plan/detail?id=${id}` });
  },

  goPlanList() {
    wx.navigateTo({ url: '/pages/plan/list' });
  },

  goBodyRecord() {
    wx.navigateTo({ url: '/pages/body/record' });
  },

  goExerciseList() {
    wx.switchTab({ url: '/pages/exercise/list' });
  },

  goWorkoutHistory() {
    wx.navigateTo({ url: '/pages/workout/history' });
  },

  goBodyIndex() {
    wx.navigateTo({ url: '/pages/body/index' });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  }
});

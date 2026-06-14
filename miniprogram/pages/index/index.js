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
    latestAnnouncement: null,
    isLoggedIn: false
  },

  onLoad() {
    this.setData({ greeting: util.getGreeting() });
    this.initWeekDates();
  },

  async onShow() {
    const token = wx.getStorageSync('jwt_token');
    const isLoggedIn = !!token;
    this.setData({ isLoggedIn });

    if (!isLoggedIn) return; // 游客模式，不加载个人数据

    try {
      await this.loadUserInfo();
      this.loadTodayPlan();
      this.loadStats();
      this.loadCheckinStreak();
      this.loadLatestAnnouncement();
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
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
      const user = await request({ url: '/miniapp/user/profile' });
      // 服务器头像为空时，使用本地缓存的头像
      if (user && !user.avatarUrl) {
        user.avatarUrl = wx.getStorageSync('local_avatar') || '';
      }
      this.setData({ userInfo: user });
      getApp().globalData.userInfo = user;
    } catch (err) {
      console.error('加载用户信息失败:', err);
      throw err; // 重新抛出错误，阻止后续请求
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
            planDayId: todayDay.id,
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
              planDayId: trainingDays[0].id,
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
      const stats = await request({ url: '/miniapp/workout/stats', data: { period: 'week' } });
      const history = await request({ url: '/miniapp/workout/history', data: { pageSize: 100, status: 'completed' } });

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
      const res = await request({ url: '/miniapp/checkin/streak' });
      this.setData({ streakDays: res.currentStreak || 0 });
    } catch (err) {
      console.error('加载打卡失败:', err);
    }
  },

  async loadLatestAnnouncement() {
    try {
      const res = await request({ url: '/miniapp/announcement/latest' });
      if (res && res.isPopup) {
        this.setData({ latestAnnouncement: res });
      }
    } catch (err) {
      console.error('加载公告失败:', err);
    }
  },

  /** 检查登录状态，未登录弹出提示并跳转登录 */
  requireLogin() {
    if (this.data.isLoggedIn) return true;
    wx.showModal({
      title: '提示',
      content: '该功能需要登录后才能使用',
      confirmText: '去登录',
      confirmColor: '#2FA866',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/index' });
        }
      }
    });
    return false;
  },

  goAIChat() {
    if (!this.requireLogin()) return;
    wx.switchTab({ url: '/pages/ai/chat' });
  },

  goAIPlanGenerator() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/ai/plan-generator' });
  },

  goAIChatHistory() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/ai/chat-history' });
  },

  goPlanDetail(e) {
    if (!this.requireLogin()) return;
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/plan/detail?id=${id}` });
  },

  async onStartTodayWorkout() {
    if (!this.requireLogin()) return;
    const { todayPlan } = this.data;
    if (!todayPlan || !todayPlan.planId) {
      wx.showToast({ title: '暂无训练计划', icon: 'none' });
      return;
    }

    if (todayPlan.planDayId) {
      wx.navigateTo({
        url: `/pages/workout/start?planId=${todayPlan.planId}&planDayId=${todayPlan.planDayId}`
      });
    } else {
      wx.navigateTo({ url: `/pages/plan/detail?id=${todayPlan.planId}` });
    }
  },

  goPlanList() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/plan/list' });
  },

  goBodyRecord() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/body/record' });
  },

  goExerciseList() {
    wx.switchTab({ url: '/pages/exercise/list' });
  },

  goWorkoutHistory() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/workout/history' });
  },

  goBodyIndex() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/body/index' });
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/index' });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  async onCheckin() {
    if (!this.requireLogin()) return;
    try {
      const res = await request({
        method: 'POST',
        url: '/miniapp/checkin',
        data: { checkinType: 'workout' }
      });
      this.setData({ todayCheckedIn: true, streakDays: res.streakDays || this.data.streakDays + 1 });
      wx.showToast({ title: `打卡成功，连续${res.streakDays || this.data.streakDays}天`, icon: 'none' });
    } catch (err) {
      wx.showToast({ title: err.message || '打卡失败', icon: 'none' });
    }
  }
});

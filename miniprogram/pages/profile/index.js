const { request, showToast } = require('../../utils/request');
const { FITNESS_GOALS, FITNESS_LEVELS } = require('../../utils/constants');

Page({
  data: {
    userInfo: null,
    stats: { totalWorkouts: 0, streakDays: 0, totalDuration: 0 },
    goalLabel: '',
    levelLabel: '',
    isLoggedIn: false,
    menuList: [
      { icon: '🏋️', title: '训练历史', url: '/pages/workout/history' },
      { icon: '📈', title: '身体数据', url: '/pages/body/index' },
      { icon: '🏆', title: '个人最佳', url: '/pages/profile/pr-records' },
      { icon: '⭐', title: '收藏动作', url: '/pages/profile/favorites' },
      { icon: '🏅', title: '我的成就', url: '/pages/profile/achievements' },
      { icon: '⚙️', title: '设置', url: '/pages/profile/setting' }
    ]
  },

  onLoad() {
    this.checkLoginState();
  },

  onShow() {
    this.checkLoginState();
  },

  checkLoginState() {
    const token = wx.getStorageSync('jwt_token');
    const isLoggedIn = !!token;
    this.setData({ isLoggedIn });
    if (isLoggedIn) {
      this.loadUserInfo();
      this.loadStats();
    }
  },

  requireLogin() {
    if (this.data.isLoggedIn) return true;
    wx.showModal({
      title: '提示',
      content: '该功能需要登录后才能使用',
      confirmText: '去登录',
      confirmColor: '#FF6B35',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/index' });
        }
      }
    });
    return false;
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  async loadUserInfo() {
    try {
      const user = await request({ url: '/miniapp/user/profile' });
      if (user) {
        const goal = FITNESS_GOALS.find(g => g.value === user.fitnessGoal);
        const level = FITNESS_LEVELS.find(l => l.value === user.fitnessLevel);
        this.setData({
          userInfo: user,
          goalLabel: goal ? `${goal.icon} ${goal.label}` : '未设置',
          levelLabel: level ? level.label : '未设置'
        });
        getApp().globalData.userInfo = user;
      }
    } catch (err) {
      console.error(err);
    }
  },

  async loadStats() {
    try {
      const stats = await request({ url: '/miniapp/workout/stats', data: { period: 'all' } });
      if (stats) {
        this.setData({
          stats: {
            totalWorkouts: stats.totalWorkouts || 0,
            streakDays: stats.streakDays || 0,
            totalDuration: stats.totalDurationMin ? Math.round(stats.totalDurationMin / 60) : 0
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  },

  goEdit() {
    if (!this.requireLogin()) return;
    wx.navigateTo({ url: '/pages/profile/edit' });
  },

  onMenuTap(e) {
    if (!this.requireLogin()) return;
    const { url } = e.currentTarget.dataset;
    if (url) {
      if (url.includes('switchTab')) {
        wx.switchTab({ url });
      } else {
        wx.navigateTo({ url });
      }
    } else {
      showToast('功能开发中');
    }
  },

  onShareAppMessage() {
    return {
      title: '运动健身助手 — 科学训练，高效健身',
      path: '/pages/index/index'
    };
  }
});

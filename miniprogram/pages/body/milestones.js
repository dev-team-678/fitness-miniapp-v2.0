const { request, showToast } = require('../../utils/request');

Page({
  data: {
    milestones: [],
    totalDays: 0,
    latestWeight: null,
    targetWeight: null,
    loading: true
  },

  onLoad() {
    this.loadMilestones();
  },

  onPullDownRefresh() {
    this.loadMilestones().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadMilestones() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: '/body/milestones' });
      this.setData({
        milestones: res.milestones || [],
        totalDays: res.totalDays || 0,
        latestWeight: res.latestWeight || null,
        targetWeight: res.targetWeight || null
      });
    } catch (err) {
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
  }
});

const { request, showToast } = require('../../utils/request');

Page({
  data: {
    prList: [],
    loading: true
  },

  onLoad() {
    this.loadPRList();
  },

  onPullDownRefresh() {
    this.loadPRList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    // 兼容 "2026-06-10" 格式，避免 iOS 上 "-" 解析问题
    const date = new Date(dateStr.replace(/-/g, '/'));
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  },

  async loadPRList() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: '/miniapp/workout/pr-records' });
      const list = (res || []).map(item => ({
        ...item,
        achievedDateFormatted: this.formatDate(item.achievedDate)
      }));
      this.setData({ prList: list });
    } catch (err) {
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  goExerciseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/exercise/detail?id=${id}` });
  }
});

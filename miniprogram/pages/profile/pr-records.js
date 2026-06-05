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

  async loadPRList() {
    this.setData({ loading: true });
    try {
      const res = await request({ url: '/miniapp/workout/pr-records' });
      this.setData({ prList: res || [] });
    } catch (err) {
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  goExerciseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/exercise/detail?id=${id}` });
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
});

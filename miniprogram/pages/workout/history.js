const { request, showToast } = require('../../utils/request');
const util = require('../../utils/util');

Page({
  data: {
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    currentMonth: '',
    monthStats: { count: 0, duration: 0, volume: 0 }
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentMonth: `${now.getFullYear()}年${now.getMonth() + 1}月`
    });
    this.loadHistory();
  },

  onShow() {
    this.setData({ list: [], page: 1, hasMore: true });
    this.loadHistory();
  },

  onPullDownRefresh() {
    this.setData({ list: [], page: 1, hasMore: true });
    this.loadHistory().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadHistory();
    }
  },

  async loadHistory() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await request({
        url: '/miniapp/workout/history',
        data: {
          pageNum: this.data.page,
          pageSize: 20,
          status: 'completed'
        }
      });

      if (res) {
        const list = res.list || [];
        const formatted = list.map(item => ({
          ...item,
          dateStr: util.formatDate(new Date(item.workoutDate)),
          durationStr: item.durationMin ? `${Math.round(item.durationMin / 60)}分钟` : '-',
          volumeStr: item.totalVolumeKg ? `${Math.round(item.totalVolumeKg)}kg` : '-',
          dayOfWeek: util.getWeekdayShort(new Date(item.workoutDate))
        }));

        const newList = this.data.page === 1 ? formatted : [...this.data.list, ...formatted];

        // 计算月度统计
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthItems = newList.filter(item => new Date(item.workoutDate) >= monthStart);

        this.setData({
          list: newList,
          hasMore: list.length >= 20,
          page: this.data.page + 1,
          monthStats: {
            count: monthItems.length,
            duration: Math.round(monthItems.reduce((sum, item) => sum + (item.durationMin || 0), 0) / 60),
            volume: Math.round(monthItems.reduce((sum, item) => sum + (item.totalVolumeKg || 0), 0))
          },
          loading: false
        });
      }
    } catch (err) {
      this.setData({ loading: false });
      showToast(err.message || '加载失败');
    }
  },

  onTapItem(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.list.find(i => i.id === id);
    if (!item) return;

    const data = {
      duration: item.durationStr || '-',
      totalSets: item.totalSets || 0,
      totalVolume: Math.round(item.totalVolumeKg || 0),
      exerciseCount: item.exerciseCount || 0,
      feelingScore: item.feelingScore || 3,
      calories: item.estimatedCalories || 0
    };

    wx.navigateTo({
      url: `/pages/workout/summary?data=${encodeURIComponent(JSON.stringify(data))}`
    });
  },

  goPlanList() {
    wx.navigateTo({ url: '/pages/plan/list' });
  }
});

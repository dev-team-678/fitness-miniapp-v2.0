const { request, showToast } = require('../../utils/request');
const { FITNESS_GOALS } = require('../../utils/constants');

Page({
  data: {
    activeTab: 'system',
    selectedGoal: '',
    goals: FITNESS_GOALS,
    plans: [],
    loading: false,
    pageNum: 1,
    pageSize: 20,
    total: 0,
    noMore: false
  },

  onLoad() {
    this.loadPlans();
  },

  onPullDownRefresh() {
    this.loadPlans(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.setData({ pageNum: this.data.pageNum + 1 });
      this.loadPlans();
    }
  },

  async loadPlans(refresh = false) {
    if (this.data.loading) return;

    if (refresh) {
      this.setData({ pageNum: 1, plans: [], noMore: false });
    }

    this.setData({ loading: true });

    try {
      const params = {
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize,
        status: 1
      };
      if (this.data.selectedGoal) {
        params.fitnessGoal = this.data.selectedGoal;
      }
      if (this.data.activeTab === 'system') {
        params.aiGenerated = 0;
      }

      const res = await request({ url: '/plan/list', data: params });
      const list = res.list || [];
      const plans = refresh ? list : [...this.data.plans, ...list];
      const noMore = plans.length >= (res.total || 0);

      this.setData({ plans, total: res.total || 0, noMore });
    } catch (err) {
      showToast(err.message || '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.name });
    this.loadPlans(true);
  },

  onGoalFilter(e) {
    const goal = e.currentTarget.dataset.goal;
    this.setData({ selectedGoal: goal });
    this.loadPlans(true);
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/plan/detail?id=${id}` });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/plan/editor' });
  }
});

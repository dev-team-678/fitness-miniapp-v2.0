const { request, showLoading, hideLoading, showToast } = require('../../utils/request');
const util = require('../../utils/util');

Page({
  data: {
    aiPlanId: null,
    plan: null,
    loading: true,
    confirming: false,
    showExplanation: false,
    goalLabel: '',
    splitLabel: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ aiPlanId: parseInt(options.id) });
      this.loadPlanDetail();
    }
  },

  async loadPlanDetail() {
    this.setData({ loading: true });
    try {
      const plan = await request({ url: `/miniapp/ai/plan/${this.data.aiPlanId}` });

      const goalMap = {
        lose_fat: '减脂', gain_muscle: '增肌',
        keep_fit: '塑形', improve_endurance: '提升耐力'
      };
      const splitMap = {
        full_body: '全身训练', upper_lower: '上下肢分化',
        push_pull_legs: '推拉腿分化', bro_split: '部位分化'
      };

      // 解析 weeklyPlan（可能是 JSON 字符串）
      let weeklyPlan = plan.weeklyPlan || [];
      if (typeof plan.response === 'string') {
        try {
          const parsed = JSON.parse(plan.response);
          if (parsed.weeklyPlan) weeklyPlan = parsed.weeklyPlan;
        } catch (e) { /* ignore */ }
      }

      this.setData({
        plan: { ...plan, weeklyPlan },
        goalLabel: goalMap[plan.goal] || plan.goal || '未设置',
        splitLabel: splitMap[plan.splitType] || plan.splitType || '自定义',
        loading: false
      });
    } catch (err) {
      showToast(err.message || '加载失败');
      this.setData({ loading: false });
    }
  },

  toggleExplanation() {
    this.setData({ showExplanation: !this.data.showExplanation });
  },

  async onConfirm() {
    if (this.data.confirming) return;
    this.setData({ confirming: true });

    wx.showModal({
      title: '确认使用此计划',
      content: '确认后将保存为正式训练计划，可在"我的计划"中查看',
      confirmColor: '#2FA866',
      success: async (res) => {
        if (res.confirm) {
          try {
            showLoading('保存计划...');
            const result = await request({
              url: `/miniapp/ai/plan/${this.data.aiPlanId}/confirm`,
              method: 'POST'
            });
            hideLoading();
            showToast('计划已保存');

            setTimeout(() => {
              if (result.workoutPlanId) {
                wx.redirectTo({
                  url: `/pages/plan/detail?id=${result.workoutPlanId}`
                });
              } else {
                wx.navigateBack();
              }
            }, 1500);
          } catch (err) {
            hideLoading();
            showToast(err.message || '保存失败');
          }
        }
        this.setData({ confirming: false });
      },
      fail: () => {
        this.setData({ confirming: false });
      }
    });
  },

  onRegenerate() {
    wx.navigateBack();
  },

  goExerciseDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/exercise/detail?id=${id}` });
    }
  }
});

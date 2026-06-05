const { request, showToast } = require('../../utils/request');
const util = require('../../utils/util');
const { WEEKDAYS } = require('../../utils/constants');

Page({
  data: {
    planId: 0,
    plan: {},
    days: [],
    currentWeek: 1,
    weekCount: 1,
    currentDays: [],
    weekdays: WEEKDAYS,
    difficultyLabel: '',
    goalLabel: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ planId: parseInt(options.id) });
      this.loadPlanDetail();
    }
  },

  async loadPlanDetail() {
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await request({ url: `/plan/${this.data.planId}` });

      if (res) {
        const weekCount = res.durationWeeks || 1;

        // 处理每天的动作数据
        const processedDays = (res.days || []).map(day => ({
          ...day,
          expanded: day.exercises && day.exercises.length > 0
        }));

        this.setData({
          plan: res,
          days: processedDays,
          weekCount,
          difficultyLabel: util.getDifficultyLabel(res.difficultyLevel),
          goalLabel: util.getGoalLabel(res.fitnessGoal)
        });

        this.updateCurrentDays();
      }
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      showToast(err.message || '加载失败');
    }
  },

  onWeekChange(e) {
    const week = e.currentTarget.dataset.week;
    this.setData({ currentWeek: week });
    this.updateCurrentDays();
  },

  onCalendarWeekChange(e) {
    const week = e.detail.week;
    this.setData({ currentWeek: week });
    this.updateCurrentDays();
  },

  onCalendarDayTap(e) {
    const { weekNumber, dayOfWeek, dayData } = e.detail;
    // 找到对应的计划日
    const day = this.data.days.find(d => d.weekNumber === weekNumber && d.dayOfWeek === dayOfWeek);
    if (day && (!day.exercises || day.exercises.length === 0) === false) {
      wx.navigateTo({
        url: `/pages/workout/start?planId=${this.data.planId}&planDayId=${day.id}`
      });
    }
  },

  updateCurrentDays() {
    const { days, currentWeek } = this.data;
    const currentDays = days.filter(d => d.weekNumber === currentWeek);
    this.setData({ currentDays });
  },

  toggleDay(e) {
    const index = e.currentTarget.dataset.index;
    const key = `currentDays[${index}].expanded`;
    this.setData({
      [key]: !this.data.currentDays[index].expanded
    });
  },

  startWorkout(e) {
    const dayId = e.currentTarget.dataset.dayId;
    wx.navigateTo({
      url: `/pages/workout/start?planId=${this.data.planId}&planDayId=${dayId}`
    });
  }
});

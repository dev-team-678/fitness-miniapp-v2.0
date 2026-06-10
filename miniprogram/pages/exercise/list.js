const { request, showToast } = require('../../utils/request');
const { EXERCISE_TYPES, EQUIPMENT_TYPES } = require('../../utils/constants');

Page({
  data: {
    exercises: [],
    categories: [],
    bodyParts: [],
    currentTab: 'all',
    searchKeyword: '',
    currentBodyPart: '',
    currentType: '',
    currentEquipment: '',
    page: 1,
    hasMore: true,
    loading: false,
    showFilter: false,
    isLoggedIn: false
  },

  onLoad() {
  },

  onShow() {
    this.checkLoginState();
  },

  checkLoginState() {
    const token = wx.getStorageSync('jwt_token');
    const isLoggedIn = !!token;
    this.setData({ isLoggedIn });
    if (isLoggedIn) {
      // 已登录，加载数据
      this.loadBodyParts();
      this.loadExercises();
    }
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  onPullDownRefresh() {
    this.setData({ exercises: [], page: 1, hasMore: true });
    this.loadExercises().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadExercises();
    }
  },

  async loadBodyParts() {
    try {
      const res = await request({ url: '/category/list' });
      this.setData({ bodyParts: res || [] });
    } catch (err) {
      console.error(err);
    }
  },

  async loadExercises() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const params = { pageNum: this.data.page, pageSize: 20 };
      if (this.data.searchKeyword) params.name = this.data.searchKeyword;
      if (this.data.currentBodyPart) params.categoryId = this.data.currentBodyPart;
      if (this.data.currentType) params.exerciseType = this.data.currentType;
      if (this.data.currentEquipment) params.equipment = this.data.currentEquipment;

      const res = await request({ url: '/exercise/list', data: params });

      if (res) {
        const list = res.list || [];
        const newList = this.data.page === 1 ? list : [...this.data.exercises, ...list];
        this.setData({
          exercises: newList,
          hasMore: list.length >= 20,
          page: this.data.page + 1,
          loading: false
        });
      }
    } catch (err) {
      this.setData({ loading: false });
      showToast(err.message || '加载失败');
    }
  },

  onSearch(e) {
    this.setData({ searchKeyword: e.detail, exercises: [], page: 1, hasMore: true });
    this.loadExercises();
  },

  onSearchClear() {
    this.setData({ searchKeyword: '', exercises: [], page: 1, hasMore: true });
    this.loadExercises();
  },

  onTabChange(e) {
    const tab = e.detail.name;
    this.setData({ currentTab: tab, currentBodyPart: tab === 'all' ? '' : tab, exercises: [], page: 1, hasMore: true });
    this.loadExercises();
  },

  onTypeFilter(e) {
    this.setData({ currentType: e.currentTarget.dataset.type, exercises: [], page: 1, hasMore: true });
    this.loadExercises();
  },

  onEquipmentFilter(e) {
    this.setData({ currentEquipment: e.currentTarget.dataset.equipment, exercises: [], page: 1, hasMore: true });
    this.loadExercises();
  },

  onToggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  onTapExercise(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/exercise/detail?id=${id}` });
  }
});

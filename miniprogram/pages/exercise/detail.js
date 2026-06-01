const { request, showToast } = require('../../utils/request');

Page({
  data: {
    exercise: null,
    loading: true,
    isFavorite: false
  },

  onLoad(options) {
    if (options.id) {
      this.loadExercise(options.id);
      this.checkFavorite(options.id);
    }
  },

  async loadExercise(id) {
    try {
      const res = await request({ url: `/exercise/${id}` });
      this.setData({ exercise: res, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      showToast(err.message || '加载失败');
    }
  },

  async checkFavorite(exerciseId) {
    try {
      const res = await request({
        url: '/exercise/favorite/check',
        data: { exerciseId: parseInt(exerciseId) }
      });
      this.setData({ isFavorite: !!res.isFavorite });
    } catch (err) {
      console.error('检查收藏状态失败:', err);
    }
  },

  onPreviewImage() {
    const url = this.data.exercise?.demo_image_url;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
  },

  async onToggleFavorite() {
    if (!this.data.exercise) return;
    
    const action = this.data.isFavorite ? 'remove' : 'add';
    try {
      await request({
        method: 'POST',
        url: '/exercise/favorite',
        data: { action, exerciseId: this.data.exercise.id }
      });
      this.setData({ isFavorite: !this.data.isFavorite });
      showToast(this.data.isFavorite ? '已收藏' : '已取消收藏');
    } catch (err) {
      showToast('操作失败');
    }
  },

  onShareAppMessage() {
    const ex = this.data.exercise;
    return {
      title: `推荐动作：${ex?.name || '运动动作'}`,
      path: `/pages/exercise/detail?id=${ex?.id}`
    };
  }
});

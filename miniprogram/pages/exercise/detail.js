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
        url: '/miniapp/exercise/favorite/check',
        data: { exerciseId: parseInt(exerciseId) }
      });
      // 后端返回字段为 isFavorited
      this.setData({ isFavorite: res.isFavorited === true });
    } catch (err) {
      console.error('检查收藏状态失败:', err);
    }
  },

  onPreviewImage() {
    const url = this.data.exercise?.demoImageUrl;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
  },

  onVideoPlay() {
    console.log('视频开始播放');
  },

  onVideoPause() {
    console.log('视频暂停');
  },

  onVideoEnded() {
    console.log('视频播放结束');
  },

  async onToggleFavorite() {
    if (!this.data.exercise) return;
    
    try {
      const res = await request({
        method: 'POST',
        url: '/miniapp/exercise/favorite',
        data: { exerciseId: this.data.exercise.id }
      });
      // 后端返回 { isFavorited: true/false }
      this.setData({ isFavorite: res.isFavorited });
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

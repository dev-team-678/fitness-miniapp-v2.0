const { request, showToast, uploadFile } = require('../../utils/request');

Page({
  data: {
    content: '',
    images: [],
    canSubmit: false,
    submitting: false
  },

  onInput(e) {
    const content = e.detail.value;
    this.setData({
      content,
      canSubmit: content.trim().length > 0
    });
  },

  chooseImage() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) return;

    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => ({
          tempFilePath: f.tempFilePath,
          uploading: false,
          url: ''
        }));
        this.setData({
          images: [...this.data.images, ...newImages]
        });
      }
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({ images });
  },

  previewImage(e) {
    const urls = this.data.images.map(img => img.tempFilePath || img.url || img);
    const current = e.currentTarget.dataset.url;
    wx.previewImage({ current, urls });
  },

  /**
   * 逐张上传图片到七牛云
   */
  async uploadAllImages() {
    const uploaded = [];
    for (let i = 0; i < this.data.images.length; i++) {
      const img = this.data.images[i];
      // 已经是 URL 的跳过
      if (img.url && !img.tempFilePath) {
        uploaded.push(img.url);
        continue;
      }
      const filePath = img.tempFilePath || img;
      if (typeof filePath === 'string' && filePath.startsWith('http')) {
        uploaded.push(filePath);
        continue;
      }

      // 标记上传中
      this.setData({ [`images[${i}].uploading`]: true });
      try {
        const fileUrl = await uploadFile(filePath, 'community');
        uploaded.push(fileUrl);
        this.setData({
          [`images[${i}].uploading`]: false,
          [`images[${i}].url`]: fileUrl
        });
      } catch (err) {
        console.error('图片上传失败:', err);
        this.setData({ [`images[${i}].uploading`]: false });
        throw new Error('图片上传失败，请重试');
      }
    }
    return uploaded;
  },

  async onSubmit() {
    const { content, images, canSubmit, submitting } = this.data;
    if (!canSubmit || submitting) return;

    if (!content.trim()) {
      showToast('请输入内容');
      return;
    }

    this.setData({ submitting: true });

    try {
      // 上传图片
      const imageUrls = images.length > 0 ? await this.uploadAllImages() : [];

      // 发布帖子
      await request({
        method: 'POST',
        url: '/miniapp/post',
        data: {
          content: content.trim(),
          images: imageUrls
        }
      });

      showToast('发布成功');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      showToast(err.message || '发布失败，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  }
});

const { request, showToast, uploadFile } = require('../../utils/request');

Page({
  data: {
    targetId: null,
    targetType: 'post',
    reasons: [
      '垃圾广告',
      '色情低俗',
      '暴力血腥',
      '政治敏感',
      '人身攻击',
      '虚假信息',
      '侵权抄袭',
      '其他'
    ],
    selectedReason: '',
    description: '',
    fileList: [],
    uploadedImages: [],
    submitting: false
  },

  onLoad(options) {
    if (options.targetId) {
      this.setData({
        targetId: parseInt(options.targetId),
        targetType: options.targetType || 'post'
      });
    }
  },

  onReasonChange(event) {
    this.setData({ selectedReason: event.detail });
  },

  onReasonClick(event) {
    const reason = this.data.reasons[event.currentTarget.dataset.index];
    this.setData({ selectedReason: reason });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  async onAfterRead(event) {
    const { file } = event.detail;
    const files = Array.isArray(file) ? file : [file];

    for (const f of files) {
      try {
        const url = await uploadFile(f.url, 'report');
        const uploadedImages = [...this.data.uploadedImages, url];
        const fileList = [...this.data.fileList, { url, name: '' }];
        this.setData({ uploadedImages, fileList });
      } catch (err) {
        console.error('上传截图失败:', err);
        showToast('截图上传失败');
      }
    }
  },

  onDeleteImage(event) {
    const { index } = event.detail;
    const uploadedImages = this.data.uploadedImages.filter((_, i) => i !== index);
    const fileList = this.data.fileList.filter((_, i) => i !== index);
    this.setData({ uploadedImages, fileList });
  },

  async onSubmit() {
    const { targetId, targetType, selectedReason, description, uploadedImages, submitting } = this.data;

    if (submitting) return;

    if (!selectedReason) {
      showToast('请选择举报原因');
      return;
    }

    this.setData({ submitting: true });

    try {
      await request({
        method: 'POST',
        url: '/miniapp/post/report',
        data: {
          targetId,
          targetType,
          reason: selectedReason,
          description: description.trim() || undefined,
          images: uploadedImages.length > 0 ? uploadedImages : undefined
        }
      });

      showToast('举报已提交');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('提交举报失败:', err);
    } finally {
      this.setData({ submitting: false });
    }
  }
});

const { request, showToast, showLoading, hideLoading } = require('../../utils/request');

Page({
  data: {
    // 训练提醒
    reminderEnabled: false,
    reminderTime: '08:00',
    showTimePicker: false,
    // 缓存
    cacheSize: '0KB',
    // 意见反馈
    feedbackContent: '',
    // 关于
    version: '1.0.0'
  },

  onLoad() {
    this.loadReminderSettings();
    this.calcCacheSize();
  },

  // 训练提醒 - 读取本地设置
  loadReminderSettings() {
    const settings = wx.getStorageSync('workout_reminder') || {};
    const time = settings.time || '08:00';
    // 容错：如果本地存储了无效的 NaN 时间，重置为默认值
    const validTime = /^\d{2}:\d{2}$/.test(time) ? time : '08:00';
    this.setData({
      reminderEnabled: settings.enabled || false,
      reminderTime: validTime
    });
  },

  // 训练提醒 - 开关切换
  onReminderToggle(e) {
    const enabled = e.detail;
    this.setData({ reminderEnabled: enabled });
    this.saveReminderSettings();
    if (enabled) {
      this.setReminderAlarm();
      showToast('提醒已开启');
    } else {
      this.clearReminderAlarm();
      showToast('提醒已关闭');
    }
  },

  // 训练提醒 - 时间选择
  onShowTimePicker() {
    if (!this.data.reminderEnabled) return;
    this.setData({ showTimePicker: true });
  },

  onTimeChange(e) {
    // van-datetime-picker type="time" 返回的 e.detail 已经是 "HH:mm" 格式字符串
    const timeStr = e.detail;
    this.setData({ reminderTime: timeStr, showTimePicker: false });
    this.saveReminderSettings();
    if (this.data.reminderEnabled) {
      this.setReminderAlarm();
    }
  },

  onTimePickerCancel() {
    this.setData({ showTimePicker: false });
  },

  // 保存提醒设置到本地
  saveReminderSettings() {
    wx.setStorageSync('workout_reminder', {
      enabled: this.data.reminderEnabled,
      time: this.data.reminderTime
    });
  },

  // 设置提醒闹钟
  setReminderAlarm() {
    // 订阅消息需要用户主动触发，这里仅保存本地设置
    wx.setStorageSync('workout_reminder', {
      enabled: true,
      time: this.data.reminderTime
    });
  },

  clearReminderAlarm() {
    wx.setStorageSync('workout_reminder', {
      enabled: false,
      time: this.data.reminderTime
    });
  },

  // 计算缓存大小
  calcCacheSize() {
    try {
      const res = wx.getStorageInfoSync();
      const sizeKB = res.currentSize || 0;
      let sizeStr;
      if (sizeKB >= 1024) {
        sizeStr = (sizeKB / 1024).toFixed(1) + 'MB';
      } else {
        sizeStr = sizeKB + 'KB';
      }
      this.setData({ cacheSize: sizeStr });
    } catch (err) {
      this.setData({ cacheSize: '0KB' });
    }
  },

  // 清除缓存
  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: `当前缓存 ${this.data.cacheSize}，确定清除？`,
      confirmColor: '#FF6B35',
      success: (res) => {
        if (res.confirm) {
          const token = wx.getStorageSync('jwt_token');
          const refreshToken = wx.getStorageSync('refresh_token');
          const reminder = wx.getStorageSync('workout_reminder');
          wx.clearStorageSync();
          if (token) wx.setStorageSync('jwt_token', token);
          if (refreshToken) wx.setStorageSync('refresh_token', refreshToken);
          if (reminder) wx.setStorageSync('workout_reminder', reminder);
          this.calcCacheSize();
          showToast('缓存已清除');
        }
      }
    });
  },

  // 意见反馈 - 输入
  onFeedbackInput(e) {
    this.setData({ feedbackContent: e.detail });
  },

  // 意见反馈 - 提交
  async onSubmitFeedback() {
    const content = this.data.feedbackContent.trim();
    if (!content) {
      showToast('请输入反馈内容');
      return;
    }
    if (content.length < 5) {
      showToast('反馈内容至少5个字');
      return;
    }

    try {
      showLoading('提交中...');
      await request({
        method: 'POST',
        url: '/miniapp/user/feedback',
        data: { content }
      });
      hideLoading();
      showToast('感谢您的反馈');
      this.setData({ feedbackContent: '' });
    } catch (err) {
      hideLoading();
      showToast(err.message || '提交失败');
    }
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号？',
      confirmColor: '#FF6B35',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('jwt_token');
          wx.removeStorageSync('refresh_token');
          wx.removeStorageSync('userInfo');
          wx.reLaunch({ url: '/pages/login/index' });
        }
      }
    });
  }
});

const { request, uploadFile, showToast } = require('../../utils/request');

Page({
  data: {
    avatarUrl: '/images/default-avatar.png',
    nickname: '',
    tempAvatarPath: '',
    saving: false
  },

  onLoad() {
    // 加载当前用户信息
    this.loadUserInfo();
  },

  async loadUserInfo() {
    try {
      const user = await request({ url: '/miniapp/user/profile' });
      if (user) {
        this.setData({
          avatarUrl: user.avatarUrl || '/images/default-avatar.png',
          nickname: user.nickname || ''
        });
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl: avatarUrl,
      tempAvatarPath: avatarUrl
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onNicknameBlur(e) {
    if (e.detail.value) {
      this.setData({ nickname: e.detail.value });
    }
  },

  async onSave() {
    const { nickname, tempAvatarPath } = this.data;

    if (!nickname.trim()) {
      showToast('请输入昵称');
      return;
    }

    this.setData({ saving: true });

    try {
      const profileData = { nickname: nickname.trim() };

      // 如果选择了新头像，先上传
      if (tempAvatarPath) {
        try {
          const fileUrl = await uploadFile(tempAvatarPath, 'avatar');
          profileData.avatarUrl = fileUrl;
        } catch (uploadErr) {
          console.error('头像上传失败:', uploadErr);
          showToast('头像上传失败，将继续保存其他信息');
        }
      }

      // 保存用户资料
      await request({
        method: 'PUT',
        url: '/miniapp/user/profile',
        data: profileData
      });

      // 更新本地存储的用户信息
      try {
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.nickname = profileData.nickname;
        if (profileData.avatarUrl) userInfo.avatarUrl = profileData.avatarUrl;
        wx.setStorageSync('userInfo', userInfo);
        getApp().globalData.userInfo = userInfo;
      } catch (e) {}

      showToast('设置成功');
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1000);
    } catch (err) {
      showToast(err.message || '保存失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  onSkip() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});

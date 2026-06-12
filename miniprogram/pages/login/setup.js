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
        const localAvatar = wx.getStorageSync('local_avatar');
        this.setData({
          avatarUrl: user.avatarUrl || localAvatar || '/images/default-avatar.png',
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
      let avatarSaved = false;

      // 如果选择了新头像，先尝试上传到 CDN
      if (tempAvatarPath) {
        try {
          // 上传前检查临时文件是否存在
          const fs = wx.getFileSystemManager();
          try {
            fs.accessSync(tempAvatarPath);
          } catch (fsErr) {
            console.warn('临时头像文件不存在:', tempAvatarPath, fsErr);
            throw new Error('头像文件无效，请重新选择');
          }

          const fileUrl = await uploadFile(tempAvatarPath, 'avatar');
          profileData.avatarUrl = fileUrl;
          avatarSaved = true;
        } catch (uploadErr) {
          console.error('头像上传失败:', uploadErr.message || uploadErr);
          // 上传失败时，将临时路径存入本地存储以便本地显示
          wx.setStorageSync('local_avatar', tempAvatarPath);
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
        if (avatarSaved && profileData.avatarUrl) {
          userInfo.avatarUrl = profileData.avatarUrl;
          wx.removeStorageSync('local_avatar');
        }
        wx.setStorageSync('userInfo', userInfo);
        getApp().globalData.userInfo = userInfo;
      } catch (e) {}

      if (tempAvatarPath && !avatarSaved) {
        showToast('头像上传失败，可在设置中重新选择');
      } else {
        showToast('设置成功');
      }

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

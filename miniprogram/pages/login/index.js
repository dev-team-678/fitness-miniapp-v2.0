const { request, tokenManager, showToast } = require('../../utils/request');

Page({
  data: {
    loading: false,
    agreed: false
  },

  onLoad() {
    // 已登录则直接跳转首页
    const token = tokenManager.getToken();
    if (token) {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  openUserAgreement() {
    wx.navigateTo({ url: '/pages/login/agreement?type=user' });
  },

  openPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/login/agreement?type=privacy' });
  },

  goGuestMode() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  async onLogin() {
    if (this.data.loading || !this.data.agreed) return;
    this.setData({ loading: true });

    try {
      // 1. 调用微信登录获取 code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });

      // 2. 将 code 发送到后端换取 JWT Token
      const res = await request({
        url: '/miniapp/user/login',
        method: 'POST',
        data: { code: loginRes.code }
      });

      // 3. 存储 Token 和用户信息
      tokenManager.setToken(res.token);
      if (res.refreshToken) {
        tokenManager.setRefreshToken(res.refreshToken);
      }
      wx.setStorageSync('userInfo', res.userInfo);
      getApp().globalData.userInfo = res.userInfo;
      getApp().globalData.isLoggedIn = true;

      // 跳转到资料设置页，让用户完善头像和昵称
      wx.redirectTo({ url: '/pages/login/setup' });
    } catch (err) {
      showToast(err.message || '登录失败');
    } finally {
      this.setData({ loading: false });
    }
  }
});

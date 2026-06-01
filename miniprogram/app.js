App({
  onLaunch() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;
    this.globalData.screenHeight = systemInfo.screenHeight;
    this.globalData.screenWidth = systemInfo.screenWidth;

    // 检查登录状态
    const token = wx.getStorageSync('jwt_token');
    if (token) {
      this.globalData.isLoggedIn = true;
    }
  },

  /**
   * 检查登录状态，未登录则跳转登录页
   * @returns {Boolean}
   */
  checkLogin() {
    const token = wx.getStorageSync('jwt_token');
    if (!token) {
      wx.redirectTo({ url: '/pages/login/index' });
      return false;
    }
    return true;
  },

  globalData: {
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 0,
    screenHeight: 0,
    screenWidth: 0,
    isLoggedIn: false
  }
});

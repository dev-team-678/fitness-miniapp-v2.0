const { request, showToast } = require('../../utils/request');
const util = require('../../utils/util');

Page({
  data: {
    sessions: [],
    loading: false,
    pageNum: 1,
    pageSize: 20,
    total: 0,
    noMore: false
  },

  onLoad() {
    this.loadSessions();
  },

  onShow() {
    this.loadSessions(true);
  },

  onPullDownRefresh() {
    this.loadSessions(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (!this.data.noMore && !this.data.loading) {
      this.loadMore();
    }
  },

  async loadSessions(refresh = false) {
    if (this.data.loading) return;

    if (refresh) {
      this.setData({ pageNum: 1, sessions: [], noMore: false });
    }

    this.setData({ loading: true });

    try {
      const res = await request({
        url: '/miniapp/ai/chat/sessions',
        data: {
          pageNum: this.data.pageNum,
          pageSize: this.data.pageSize
        }
      });

      const list = (res.list || []).map(s => ({
        ...s,
        timeStr: util.timeAgo(s.createdAt || s.lastMessageTime),
        messageCountText: s.messageCount ? `${s.messageCount}条对话` : '新对话'
      }));

      const sessions = refresh ? list : [...this.data.sessions, ...list];
      const noMore = sessions.length >= (res.total || 0);

      this.setData({
        sessions,
        total: res.total || 0,
        noMore
      });
    } catch (err) {
      showToast(err.message || '加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMore() {
    this.setData({ pageNum: this.data.pageNum + 1 });
    await this.loadSessions();
  },

  goChat(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ai/chat?sessionId=${id}` });
  },

  goNewChat() {
    wx.navigateTo({ url: '/pages/ai/chat' });
  }
});

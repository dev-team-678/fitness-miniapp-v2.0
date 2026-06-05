const { request, showToast } = require('../../utils/request');

Page({
  data: {
    sessionId: null,
    messages: [],
    inputText: '',
    loading: false,
    scrollTop: 0,
    showDateHeader: false,
    dateHeader: '',
    userAvatar: ''
  },

  onLoad(options) {
    if (options.sessionId) {
      this.setData({ sessionId: parseInt(options.sessionId) });
      this.loadHistory();
    }
    this.setUserAvatar();
  },

  setUserAvatar() {
    const userInfo = getApp().globalData.userInfo;
    if (userInfo && userInfo.nickname) {
      this.setData({ userAvatar: userInfo.nickname.substring(0, 1).toUpperCase() });
    } else {
      this.setData({ userAvatar: 'U' });
    }
  },

  async loadHistory() {
    if (!this.data.sessionId) return;

    try {
      const result = await request({
        url: `/miniapp/ai/chat/${this.data.sessionId}/messages`,
        data: { pageNum: 1, pageSize: 50 }
      });

      if (result && result.list) {
        const messages = result.list.map(m => ({
          ...m,
          timeStr: this.formatTime(m.createdAt)
        }));
        this.setData({ messages });
        this.scrollToBottom();
      }
    } catch (err) {
      console.error('加载历史失败:', err);
    }
  },

  formatTime(dateInput) {
    if (!dateInput) return '';
    let date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput.replace(/-/g, '/'));
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return '';
    }
    if (isNaN(date.getTime())) return '';
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  async onSend() {
    const text = this.data.inputText.trim();
    if (!text || this.data.loading) return;

    this.setData({ inputText: '', loading: true });

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timeStr: this.formatTime(new Date().toISOString())
    };

    this.setData({
      messages: [...this.data.messages, userMsg]
    });
    this.scrollToBottom();

    try {
      const res = await request({
        url: '/miniapp/ai/chat/send',
        method: 'POST',
        data: {
          message: text,
          sessionId: this.data.sessionId
        }
      });

      if (res) {
        if (res.sessionId && !this.data.sessionId) {
          this.setData({ sessionId: res.sessionId });
        }
        const assistantMsg = {
          id: res.messageId || Date.now() + 1,
          role: 'assistant',
          content: res.content || '',
          timeStr: this.formatTime(new Date().toISOString())
        };
        this.setData({
          messages: [...this.data.messages, assistantMsg]
        });
        this.scrollToBottom();
      }
    } catch (err) {
      showToast(err.message || '发送失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  onQuickTap(e) {
    const question = e.currentTarget.dataset.q;
    this.setData({ inputText: question });
    this.onSend();
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollTop: 999999 });
    }, 100);
  },

  loadMore() {
  }
});

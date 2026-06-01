const { request, requestSSE, showToast } = require('../../utils/request');

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
        url: `/ai-chat/${this.data.sessionId}/messages`,
        data: { pageNum: 1, pageSize: 50 }
      });

      if (result && result.list) {
        const messages = result.list.map(m => ({
          ...m,
          timeStr: this.formatTime(m.created_at)
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
      let assistantContent = '';
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '',
        timeStr: this.formatTime(new Date())
      };

      this.setData({
        messages: [...this.data.messages, assistantMsg]
      });

      await requestSSE({
        url: '/ai-chat/send',
        data: {
          message: text,
          sessionId: this.data.sessionId,
          sessionType: 'chat'
        },
        onMessage: (chunk) => {
          // 解析 SSE data 行
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.sessionId && !this.data.sessionId) {
                  this.setData({ sessionId: parsed.sessionId });
                }
                if (parsed.content) {
                  assistantContent += parsed.content;
                  const msgs = [...this.data.messages];
                  const lastIdx = msgs.length - 1;
                  msgs[lastIdx] = { ...msgs[lastIdx], content: assistantContent };
                  this.setData({ messages: msgs });
                  this.scrollToBottom();
                }
              } catch (e) {
                // 非 JSON，当作纯文本追加
                assistantContent += jsonStr;
                const msgs = [...this.data.messages];
                const lastIdx = msgs.length - 1;
                msgs[lastIdx] = { ...msgs[lastIdx], content: assistantContent };
                this.setData({ messages: msgs });
                this.scrollToBottom();
              }
            }
          }
        },
        onComplete: () => {
          this.setData({ loading: false });
        }
      });
    } catch (err) {
      showToast(err.message || '发送失败');
      const failedMsg = this.data.messages.find(m => m.id === userMsg.id);
      if (failedMsg) {
        failedMsg.content = '发送失败，请重试';
      }
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

const { request, showToast } = require('../../utils/request');

/**
 * 轻量 Markdown 解析器 —— 将 AI 回复文本解析为结构化 blocks
 * 支持: 标题(##)、表格(|)、列表(- /* /1.)、粗体(**)、段落
 */
function parseRichText(content) {
  if (!content) return [{ type: 'paragraph', textParts: [{ text: '', bold: false }] }];

  const lines = content.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行跳过
    if (!trimmed) { i++; continue; }

    // ---- 表格 ----
    if (trimmed.includes('|') && trimmed !== '|') {
      const cells = trimmed.split('|').map(c => c.trim()).filter(Boolean);
      // 至少 2 列且不是分隔行
      if (cells.length >= 2 && !cells.every(c => /^[-:]+$/.test(c))) {
        const tableRows = [];
        while (i < lines.length) {
          const tl = lines[i].trim();
          if (!tl || !tl.includes('|')) break;
          const tc = tl.split('|').map(c => c.trim()).filter(Boolean);
          if (tc.length === 0 || tc.every(c => /^[-:]+$/.test(c))) { i++; continue; }
          tableRows.push(tc.map(c => ({ text: c.replace(/\*\*/g, ''), bold: /\*\*/.test(c) })));
          i++;
        }
        if (tableRows.length > 0) {
          blocks.push({ type: 'table', rows: tableRows });
        }
        continue;
      }
    }

    // ---- 列表（无序 / 有序）----
    if (/^(\*\s|-\s|\d+[.、]\s)/.test(trimmed)) {
      const items = [];
      while (i < lines.length) {
        const ll = lines[i].trim();
        const m = ll.match(/^(\*\s|-\s|\d+[.、]\s)(.*)/);
        if (!m) break;
        items.push(parseInline(m[2]));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // ---- 标题 ----
    const hMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      blocks.push({
        type: 'heading',
        level: hMatch[1].length,
        textParts: parseInline(hMatch[2].replace(/\*\*/g, ''))
      });
      i++;
      continue;
    }

    // ---- 段落（连续非空行）----
    const pLines = [];
    while (i < lines.length) {
      const pl = lines[i].trim();
      if (!pl) break;
      if (/^#{1,3}\s/.test(pl)) break;
      if (pl.includes('|') && pl.split('|').filter(Boolean).length >= 2) break;
      if (/^(\*\s|-\s|\d+[.、]\s)/.test(pl)) break;
      pLines.push(pl);
      i++;
    }
    if (pLines.length > 0) {
      blocks.push({ type: 'paragraph', textParts: parseInline(pLines.join(' ')) });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', textParts: [{ text: content, bold: false }] }];
}

/** 解析行内 **粗体** */
function parseInline(text) {
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.substring(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ text: text.substring(last), bold: false });
  if (parts.length === 0) parts.push({ text, bold: false });
  return parts;
}

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
          timeStr: this.formatTime(m.createdAt),
          blocks: m.role === 'assistant' ? parseRichText(m.content) : null
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

  requireLogin() {
    const token = wx.getStorageSync('jwt_token');
    if (token) return true;
    wx.showModal({
      title: '提示',
      content: 'AI 健身助手需要登录后才能使用',
      confirmText: '去登录',
      confirmColor: '#FF6B35',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/index' });
        }
      }
    });
    return false;
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  async onSend() {
    if (!this.requireLogin()) return;

    const text = this.data.inputText.trim();
    if (!text || this.data.loading) return;

    this.setData({ inputText: '', loading: true });

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timeStr: this.formatTime(new Date().toISOString()),
      blocks: null
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
        const rawContent = res.content || '';
        const assistantMsg = {
          id: res.messageId || Date.now() + 1,
          role: 'assistant',
          content: rawContent,
          blocks: parseRichText(rawContent),
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
    if (!this.requireLogin()) return;
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

const { request, showToast } = require('../../utils/request');

Page({
  data: {
    postId: null,
    post: null,
    comments: [],
    commentPage: 1,
    commentHasMore: true,
    commentText: '',
    replyingTo: null,
    loading: true,
    showPostMenu: false,
    postMenuActions: [
      { name: '举报', subname: '', color: '#ee0a24' }
    ]
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ postId: parseInt(options.id) });
      this.loadDetail();
    }
  },

  async loadDetail() {
    this.setData({ loading: true });

    try {
      const res = await request({
        url: `/miniapp/post/${this.data.postId}`
      });

      const post = res.post || res;
      this.setData({ post, loading: false });

      // 评论需要单独加载
      this.setData({ comments: [], commentPage: 1, commentHasMore: true });
      this.loadComments();
    } catch (err) {
      console.error('loadDetail error:', err);
      this.setData({ loading: false });
    }
  },

  async loadComments() {
    try {
      const res = await request({
        url: `/miniapp/post/${this.data.postId}/comments`,
        data: {
          pageNum: this.data.commentPage,
          pageSize: 50
        }
      });

      const newComments = res.list || [];
      const comments = this.data.commentPage === 1
        ? newComments
        : [...this.data.comments, ...newComments];
      this.setData({
        comments,
        commentHasMore: newComments.length >= 50
      });
    } catch (err) {
      console.error('loadComments error:', err);
    }
  },

  onPullDownRefresh() {
    this.loadDetail().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.commentHasMore) {
      this.setData({ commentPage: this.data.commentPage + 1 });
      this.loadComments();
    }
  },

  onShareAppMessage() {
    const post = this.data.post;
    return {
      title: post ? `${post.nickname}的训练分享` : '训练分享',
      path: `/pages/community/detail?id=${this.data.postId}`
    };
  },

  onShareTimeline() {
    const post = this.data.post;
    return {
      title: post ? `${post.nickname}的训练分享` : '训练分享'
    };
  },

  previewImage(e) {
    const { imgs, index } = e.currentTarget.dataset;
    wx.previewImage({
      current: imgs[index],
      urls: imgs
    });
  },

  onInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  async onLike() {
    const post = this.data.post;
    if (!post) return;

    const isLiked = post.isLiked;

    this.setData({
      post: {
        ...post,
        isLiked: !isLiked,
        likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
      }
    });

    try {
      const res = await request({ method: 'POST', url: '/miniapp/post/like', data: { postId: this.data.postId } });
      if (res) {
        this.setData({
          post: { ...this.data.post, isLiked: res.liked, likeCount: res.likeCount }
        });
      }
    } catch (err) {
      this.loadDetail();
    }
  },

  setReply(e) {
    const { commentid, nickname } = e.currentTarget.dataset;
    this.setData({
      replyingTo: { id: commentid, nickname }
    });
    wx.pageScrollTo({ selector: '.comment-input', scrollTop: 0 });
  },

  cancelReply() {
    this.setData({ replyingTo: null });
  },

  async onSubmitComment() {
    const { commentText, replyingTo } = this.data;

    if (!commentText.trim()) {
      wx.showToast({ title: '请输入评论', icon: 'none' });
      return;
    }

    try {
      const res = await request({
        method: 'POST',
        url: `/miniapp/post/${this.data.postId}/comments`,
        data: {
          content: commentText.trim(),
          parentId: replyingTo ? replyingTo.id : null
        }
      });

      showToast('评论成功');
      this.setData({ commentText: '', replyingTo: null });
      // 重新加载评论而非整个页面
      this.setData({ commentPage: 1 });
      this.loadComments();
      // 更新帖子的评论数
      if (this.data.post) {
        this.setData({
          post: { ...this.data.post, commentCount: (this.data.post.commentCount || 0) + 1 }
        });
      }
    } catch (err) {
      wx.showToast({ title: '评论失败', icon: 'none' });
    }
  },

  goToProfile(e) {
    const userId = e.currentTarget.dataset.userid;
    if (userId) {
      wx.navigateTo({
        url: `/pages/profile/index?userId=${userId}`
      });
    }
  },

  // 帖子更多操作菜单
  onShowPostMenu() {
    this.setData({ showPostMenu: true });
  },

  onClosePostMenu() {
    this.setData({ showPostMenu: false });
  },

  onSelectPostMenu(event) {
    this.setData({ showPostMenu: false });
    const { name } = event.detail;
    if (name === '举报') {
      wx.navigateTo({
        url: `/pages/community/report?targetId=${this.data.postId}&targetType=post`
      });
    }
  },

  // 评论举报
  goToReport(e) {
    const { targetid, targettype } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/community/report?targetId=${targetid}&targetType=${targettype}`
    });
  }
});

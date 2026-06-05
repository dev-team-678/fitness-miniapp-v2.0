const { request, showToast } = require('../../utils/request');

Page({
  data: {
    postId: null,
    post: null,
    comments: [],
    commentText: '',
    replyingTo: null,
    loading: true
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

      this.setData({
        post: res.post,
        comments: res.comments || [],
        loading: false
      });
    } catch (err) {
      console.error('loadDetail error:', err);
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadDetail().then(() => {
      wx.stopPullDownRefresh();
    });
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
    const action = isLiked ? 'unlike' : 'like';

    this.setData({
      post: {
        ...post,
        isLiked: !isLiked,
        likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
      }
    });

    try {
      await request({ method: 'POST', url: '/miniapp/post/like', data: { postId: this.data.postId, action } });
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
          postId: this.data.postId,
          content: commentText.trim(),
          parentId: replyingTo ? replyingTo.id : null
        }
      });

      showToast('评论成功');
      this.setData({ commentText: '', replyingTo: null });
      this.loadDetail();
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
  }
});

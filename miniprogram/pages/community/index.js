const { request, showToast } = require('../../utils/request');

Page({
  data: {
    posts: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    tab: 'recommend',
    tabs: [
      { key: 'recommend', label: '推荐' },
      { key: 'follow', label: '关注' },
      { key: 'my', label: '我的' }
    ]
  },

  onLoad() {
    this.loadPosts();
  },

  onShow() {
    if (this.data.posts.length > 0) {
      this.refreshPosts();
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  onPullDownRefresh() {
    this.refreshPosts();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab, posts: [], page: 1, hasMore: true });
    this.loadPosts();
  },

  async loadPosts() {
    if (this.loading) return;
    this.setData({ loading: true });

    try {
      const url = this.data.tab === 'my' ? '/miniapp/post/my' : '/miniapp/post/list';
      const res = await request({
        url,
        data: {
          pageNum: this.data.page,
          pageSize: this.data.pageSize
        }
      });

      const posts = this.data.page === 1 ? (res.list || []) : [...this.data.posts, ...(res.list || [])];
      this.setData({
        posts,
        hasMore: (res.list || []).length >= this.data.pageSize,
        loading: false
      });
    } catch (err) {
      console.error('loadPosts error:', err);
      this.setData({ loading: false });
    }
  },

  loadMore() {
    this.setData({ page: this.data.page + 1 });
    this.loadPosts();
  },

  async refreshPosts() {
    this.setData({ page: 1, hasMore: true });
    await this.loadPosts();
    wx.stopPullDownRefresh();
  },

  async onLike(e) {
    const postId = e.currentTarget.dataset.id;
    const isLiked = e.currentTarget.dataset.liked;
    const action = isLiked ? 'unlike' : 'like';

    const posts = this.data.posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !isLiked,
          likeCount: isLiked ? p.likeCount - 1 : p.likeCount + 1
        };
      }
      return p;
    });
    this.setData({ posts });

    try {
      await request({ method: 'POST', url: '/miniapp/post/like', data: { postId, action } });
    } catch (err) {
      this.setData({ posts: this.data.posts.map(p => p) });
    }
  },

  goToDetail(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/detail?id=${postId}`
    });
  },

  goToProfile(e) {
    const userId = e.currentTarget.dataset.userid;
    if (userId) {
      wx.navigateTo({
        url: `/pages/profile/index?userId=${userId}`
      });
    }
  },

  async onShare(e) {
    const postId = e.currentTarget.dataset.id;
    const post = this.data.posts.find(p => p.id === postId);
    if (!post) return;

    if (post.workoutLogId) {
      wx.navigateTo({
        url: `/pages/workout/summary?id=${post.workoutLogId}`
      });
    } else {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    }
  }
});

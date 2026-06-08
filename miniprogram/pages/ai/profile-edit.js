const { request, showToast, showLoading, hideLoading } = require('../../utils/request');

Page({
  data: {
    fitnessLevel: 'beginner',
    primaryGoal: 'gain_muscle',
    weeklyAvailableDays: 3,
    preferredDuration: '60',
    customInjury: '',
    equipmentOptions: [
      { name: 'barbell', label: '杠铃', selected: false },
      { name: 'dumbbell', label: '哑铃', selected: false },
      { name: 'machine', label: '器械', selected: false },
      { name: 'cable', label: '绳索', selected: false },
      { name: 'bodyweight', label: '自重', selected: true },
      { name: 'kettlebell', label: '壶铃', selected: false },
      { name: 'resistance_band', label: '弹力带', selected: false }
    ],
    injuryOptions: [
      { name: 'none', label: '无伤病' },
      { name: 'lower_back', label: '腰伤' },
      { name: 'knee', label: '膝伤' },
      { name: 'shoulder', label: '肩伤' },
      { name: 'wrist', label: '手腕伤' },
      { name: 'neck', label: '颈椎问题' }
    ],
    healthOptions: [
      { name: 'healthy', label: '身体健康' },
      { name: 'high_bp', label: '高血压' },
      { name: 'heart_condition', label: '心脏病' },
      { name: 'diabetes', label: '糖尿病' },
      { name: 'asthma', label: '哮喘' }
    ]
  },

  onLoad() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const result = await request({ url: '/miniapp/user/fitness-profile' });

      if (result) {
        // 后端返回 camelCase 字段: injuries, allergies, availableEquipment,
        // preferredWorkoutTime, trainingPreferences, healthConditions, aiNotes
        if (result.availableEquipment && Array.isArray(result.availableEquipment)) {
          const equipmentOptions = this.data.equipmentOptions.map(e => ({
            ...e,
            selected: result.availableEquipment.includes(e.name)
          }));
          this.setData({ equipmentOptions });
        }

        if (result.injuries && Array.isArray(result.injuries)) {
          const injuryOptions = this.data.injuryOptions.map(i => ({
            ...i,
            selected: result.injuries.includes(i.name) || result.injuries.includes(i.label)
          }));
          this.setData({ injuryOptions });
        }

        if (result.healthConditions && Array.isArray(result.healthConditions)) {
          const healthOptions = this.data.healthOptions.map(h => ({
            ...h,
            selected: result.healthConditions.includes(h.name) || result.healthConditions.includes(h.label)
          }));
          this.setData({ healthOptions });
        }
      }
    } catch (err) {
      console.error('加载健身档案失败:', err);
    }
  },

  onLevelChange(e) {
    this.setData({ fitnessLevel: e.detail });
  },

  onGoalChange(e) {
    this.setData({ primaryGoal: e.detail });
  },

  onDaysChange(e) {
    this.setData({ weeklyAvailableDays: e.detail.value });
  },

  onDurationChange(e) {
    this.setData({ preferredDuration: e.detail });
  },

  toggleEquipment(e) {
    const index = e.currentTarget.dataset.index;
    const options = this.data.equipmentOptions;
    options[index].selected = !options[index].selected;
    this.setData({ equipmentOptions: options });
  },

  toggleInjury(e) {
    const index = e.currentTarget.dataset.index;
    const options = this.data.injuryOptions;
    options[index].selected = !options[index].selected;
    this.setData({ injuryOptions: options });
  },

  toggleHealth(e) {
    const index = e.currentTarget.dataset.index;
    const options = this.data.healthOptions;
    options[index].selected = !options[index].selected;
    this.setData({ healthOptions: options });
  },

  onCustomInjury(e) {
    this.setData({ customInjury: e.detail.value });
  },

  async saveProfile() {
    showLoading('保存中...');

    try {
      const availableEquipment = this.data.equipmentOptions
        .filter(e => e.selected)
        .map(e => e.name);

      const injuries = this.data.injuryOptions
        .filter(i => i.selected)
        .map(i => i.name);

      if (this.data.customInjury.trim()) {
        injuries.push(this.data.customInjury.trim());
      }

      const healthConditions = this.data.healthOptions
        .filter(h => h.selected)
        .map(h => h.name);

      await request({
        method: 'PUT',
        url: '/miniapp/user/fitness-profile',
        data: {
          injuries,
          availableEquipment,
          healthConditions
        }
      });

      hideLoading();
      showToast('保存成功');
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      hideLoading();
      showToast(err.message || '保存失败');
    }
  }
});

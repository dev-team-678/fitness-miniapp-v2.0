const { request, showToast, requestWithLoading } = require('../../utils/request');
const { FITNESS_GOALS, FITNESS_LEVELS, GENDER_OPTIONS } = require('../../utils/constants');
const util = require('../../utils/util');

Page({
  data: {
    userInfo: null,
    nickname: '',
    gender: 0,
    birthday: '',
    email: '',
    height: '',
    weight: '',
    targetWeight: '',
    fitnessGoal: '',
    fitnessLevel: '',
    workoutDays: 3,
    workoutDuration: 45,
    // 选项
    fitnessGoals: FITNESS_GOALS,
    fitnessLevels: FITNESS_LEVELS,
    genderOptions: GENDER_OPTIONS,
    // picker
    showGoalPicker: false,
    showLevelPicker: false,
    showGenderPicker: false,
    showDatePicker: false,
    currentDate: new Date(2000, 0, 1).getTime(),
    minDate: new Date(1950, 0, 1).getTime(),
    maxDate: new Date().getTime()
  },

  onLoad() {
    this.loadUser();
  },

  async loadUser() {
    try {
      const user = await request({ url: '/miniapp/user/profile' });
      if (user) {
        this.setData({
          userInfo: user,
          nickname: user.nickname || '',
          gender: user.gender || 0,
          birthday: user.birthday || '',
          email: user.email || '',
          height: user.heightCm ? String(user.heightCm) : '',
          weight: user.currentWeightKg ? String(user.currentWeightKg) : '',
          targetWeight: user.targetWeightKg ? String(user.targetWeightKg) : '',
          fitnessGoal: user.fitnessGoal || '',
          fitnessLevel: user.fitnessLevel || 'beginner',
          workoutDays: user.workoutDaysPerWeek || 3,
          workoutDuration: user.workoutDurationMin || 45
        });
      }
    } catch (err) {
      showToast(err.message || '加载失败');
    }
  },

  onNicknameInput(e) { this.setData({ nickname: e.detail }); },
  onEmailInput(e) { this.setData({ email: e.detail }); },
  onHeightInput(e) { this.setData({ height: e.detail }); },
  onWeightInput(e) { this.setData({ weight: e.detail }); },
  onTargetWeightInput(e) { this.setData({ targetWeight: e.detail }); },

  onShowGoalPicker() { this.setData({ showGoalPicker: true }); },
  onShowLevelPicker() { this.setData({ showLevelPicker: true }); },
  onShowGenderPicker() { this.setData({ showGenderPicker: true }); },
  onShowDatePicker() { this.setData({ showDatePicker: true }); },

  onGoalConfirm(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ fitnessGoal: value, showGoalPicker: false });
  },

  onLevelConfirm(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ fitnessLevel: value, showLevelPicker: false });
  },

  onGenderRadioChange(e) {
    this.setData({ gender: e.detail });
  },

  onGenderConfirm(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ gender: value, showGenderPicker: false });
  },

  onDateConfirm(e) {
    const date = new Date(e.detail);
    this.setData({
      birthday: util.formatDate(date),
      showDatePicker: false
    });
  },

  onPickerCancel() {
    this.setData({
      showGoalPicker: false,
      showLevelPicker: false,
      showGenderPicker: false,
      showDatePicker: false
    });
  },

  onWorkoutDaysChange(e) { this.setData({ workoutDays: e.detail }); },
  onWorkoutDurationChange(e) { this.setData({ workoutDuration: e.detail }); },

  async onSubmit() {
    const { nickname, gender, birthday, email, height, weight, targetWeight,
            fitnessGoal, fitnessLevel, workoutDays, workoutDuration } = this.data;

    if (!nickname.trim()) {
      showToast('请输入昵称');
      return;
    }

    try {
      await requestWithLoading({
        method: 'PUT',
        url: '/miniapp/user/profile',
        data: {
          nickname: nickname.trim(),
          gender,
          birthday: birthday || null,
          email: (email || '').trim(),
          heightCm: parseFloat(height) || null,
          currentWeightKg: parseFloat(weight) || null,
          targetWeightKg: parseFloat(targetWeight) || null,
          fitnessGoal: fitnessGoal || null,
          fitnessLevel,
          workoutDaysPerWeek: workoutDays,
          workoutDurationMin: workoutDuration
        }
      }, '保存中...');

      showToast('保存成功 ✅');
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      showToast(err.message || '保存失败');
    }
  }
});

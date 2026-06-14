const { request, showToast, showLoading, hideLoading } = require('../../utils/request');
const { SET_TYPES, DEFAULT_REST_SEC } = require('../../utils/constants');

Page({
  data: {
    workoutLogId: null,
    exercises: [],
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    startTime: null,
    elapsed: '00:00',
    isRunning: true,
    isPaused: false,

    // 休息计时器
    isResting: false,
    restTimeLeft: 0,
    restTotal: DEFAULT_REST_SEC,

    // 当前组输入
    weightInput: '',
    repsInput: '',
    setTypes: SET_TYPES,
    currentSetType: 'normal',

    // 完成状态
    allSetsCompleted: false,
    totalVolume: 0,
    totalSets: 0,
    completedSets: 0,

    // 感受评分
    showFeelingSheet: false,
    feelingScores: [
      { value: 1, label: '很轻松', emoji: '😊' },
      { value: 2, label: '轻松', emoji: '🙂' },
      { value: 3, label: '适中', emoji: '😐' },
      { value: 4, label: '吃力', emoji: '😤' },
      { value: 5, label: '力竭', emoji: '🤯' }
    ],
    feelingScore: 3,
    notes: ''
  },

  timer: null,
  restTimer: null,
  keepScreenOn: true,

  onLoad(options) {
    if (options.planId && options.planDayId) {
      this.startFromPlan(options.planId, options.planDayId);
    } else {
      this.startFreeWorkout();
    }
    // 屏幕常亮
    wx.setKeepScreenOn({ keepScreenOn: true });
  },

  onUnload() {
    this.clearTimers();
    wx.setKeepScreenOn({ keepScreenOn: false });
  },

  onHide() {
    // 页面隐藏不停止计时，用户可能切到其他 app 看参考
  },

  clearTimers() {
    if (this.timer) clearInterval(this.timer);
    if (this.restTimer) clearInterval(this.restTimer);
  },

  async startFromPlan(planId, planDayId) {
    try {
      showLoading('加载训练...');
      const res = await request({ method: 'POST', url: '/miniapp/workout/start', data: { planId, planDayId } });
      hideLoading();

      const exercises = (res.exercises || []).map(ex => ({
        ...ex,
        setsData: [],
        targetSets: ex.sets || 3,
        targetReps: ex.reps || '12'
      }));

      this.setData({
        workoutLogId: res.workoutLogId,
        exercises,
        startTime: new Date(res.startTime)
      });
      this.startTimer();
    } catch (err) {
      hideLoading();
      showToast(err.message || '加载失败');
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async startFreeWorkout() {
    try {
      showLoading('创建训练...');
      const res = await request({ method: 'POST', url: '/miniapp/workout/start', data: {} });
      hideLoading();

      this.setData({
        workoutLogId: res.workoutLogId,
        exercises: [],
        startTime: new Date(res.startTime)
      });
      this.startTimer();
    } catch (err) {
      hideLoading();
      showToast(err.message || '创建失败');
    }
  },

  startTimer() {
    this.timer = setInterval(() => {
      if (!this.data.isPaused) {
        const now = new Date();
        const diff = Math.floor((now - this.data.startTime) / 1000);
        const min = String(Math.floor(diff / 60)).padStart(2, '0');
        const sec = String(diff % 60).padStart(2, '0');
        this.setData({ elapsed: `${min}:${sec}` });
      }
    }, 1000);
  },

  // 切换当前动作
  onExerciseChange(e) {
    this.setData({
      currentExerciseIndex: e.detail,
      currentSetIndex: 0,
      weightInput: '',
      repsInput: ''
    });
  },

  // 重量/次数输入
  onWeightInput(e) {
    this.setData({ weightInput: e.detail.value });
  },

  onRepsInput(e) {
    this.setData({ repsInput: e.detail.value });
  },

  onSetTypeChange(e) {
    this.setData({ currentSetType: e.detail });
  },

  // 完成一组
  async onCompleteSet() {
    const { exercises, currentExerciseIndex, currentSetIndex, workoutLogId,
            weightInput, repsInput, currentSetType } = this.data;

    if (!exercises.length) return;

    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;

    if (reps <= 0) {
      showToast('请输入次数');
      return;
    }

    const exercise = exercises[currentExerciseIndex];
    const setNumber = currentSetIndex + 1;

    // 保存到后端
    try {
      await request({
        method: 'POST',
        url: '/miniapp/workout/log-set',
        data: {
          logExerciseId: exercise.logExerciseId,
          setNumber,
          setType: currentSetType,
          weightKg: weight,
          reps,
          isCompleted: true
        }
      });
    } catch (err) {
      console.error('记录失败:', err);
    }

    // 更新本地数据
    const setRecord = {
      setNumber,
      setType: currentSetType,
      weightKg: weight,
      reps,
      isCompleted: true
    };
    exercise.setsData = exercise.setsData || [];
    exercise.setsData.push(setRecord);

    const newExercises = [...exercises];
    newExercises[currentExerciseIndex] = exercise;

    const completedSets = newExercises.reduce((sum, ex) => sum + (ex.setsData ? ex.setsData.length : 0), 0);
    const totalVolume = newExercises.reduce((sum, ex) => {
      return sum + (ex.setsData || []).reduce((s, set) => s + (set.weightKg || 0) * (set.reps || 0), 0);
    }, 0);

    this.setData({
      exercises: newExercises,
      completedSets,
      totalVolume: Math.round(totalVolume * 100) / 100,
      currentSetIndex: currentSetIndex + 1,
      weightInput: weight.toString(),
      currentSetType: 'normal'
    });

    showToast(`第${setNumber}组完成 💪`);

    // 开始组间休息
    this.startRest();
  },

  // 组间休息
  startRest() {
    const restSec = this.data.restTotal;
    this.setData({
      isResting: true,
      restTimeLeft: restSec
    });

    if (this.restTimer) clearInterval(this.restTimer);

    this.restTimer = setInterval(() => {
      let left = this.data.restTimeLeft - 1;
      if (left <= 0) {
        clearInterval(this.restTimer);
        this.setData({ isResting: false, restTimeLeft: 0 });
        wx.vibrateShort({ type: 'heavy' });
        showToast('休息结束，继续训练！');
      } else {
        this.setData({ restTimeLeft: left });
      }
    }, 1000);
  },

  // 跳过休息
  onSkipRest() {
    if (this.restTimer) clearInterval(this.restTimer);
    this.setData({ isResting: false, restTimeLeft: 0 });
  },

  // 调整休息时间
  onRestTimeChange(e) {
    this.setData({ restTotal: e.detail });
  },

  // 下一个动作
  onNextExercise() {
    const { currentExerciseIndex, exercises } = this.data;
    if (currentExerciseIndex < exercises.length - 1) {
      this.setData({
        currentExerciseIndex: currentExerciseIndex + 1,
        currentSetIndex: 0,
        weightInput: '',
        repsInput: ''
      });
    }
  },

  // 上一个动作
  onPrevExercise() {
    const { currentExerciseIndex } = this.data;
    if (currentExerciseIndex > 0) {
      this.setData({
        currentExerciseIndex: currentExerciseIndex - 1,
        currentSetIndex: 0,
        weightInput: '',
        repsInput: ''
      });
    }
  },

  // 暂停/继续
  onTogglePause() {
    this.setData({ isPaused: !this.data.isPaused });
  },

  // 显示完成训练确认
  onFinishTraining() {
    wx.showModal({
      title: '结束训练',
      content: '确定要结束本次训练吗？',
      confirmText: '结束',
      confirmColor: '#2BB673',
      success: (res) => {
        if (res.confirm) {
          this.setData({ showFeelingSheet: true });
        }
      }
    });
  },

  onFeelingSelect(e) {
    this.setData({ feelingScore: e.currentTarget.dataset.value });
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail });
  },

  // 完成训练
  async onCompleteWorkout() {
    const { workoutLogId, feelingScore, notes, exercises } = this.data;

    try {
      showLoading('保存训练...');
      const res = await request({
        method: 'POST',
        url: '/miniapp/workout/complete',
        data: {
          feelingScore,
          rpe: 7,
          notes
        }
      });
      hideLoading();

      const summaryData = {
        duration: this.data.elapsed,
        totalSets: res.totalSets || 0,
        totalVolume: res.totalVolumeKg || 0,
        exerciseCount: exercises.filter(ex => ex.setsData && ex.setsData.length > 0).length,
        feelingScore,
        calories: res.estimatedCalories || 0
      };

      wx.redirectTo({
        url: `/pages/workout/summary?data=${encodeURIComponent(JSON.stringify(summaryData))}`
      });
    } catch (err) {
      hideLoading();
      showToast(err.message || '保存失败');
    }
  },

  // 取消完成
  onCancelFeeling() {
    this.setData({ showFeelingSheet: false });
    this.onCompleteWorkout();
  }
});

const { request, showToast } = require('../../utils/request');
const util = require('../../utils/util');

Page({
  data: {
    currentMetric: 'weight',
    records: [],
    chartData: [],
    latestRecord: null,
    loading: true,
    metrics: [
      { key: 'weight', label: '体重', unit: 'kg' },
      { key: 'body_fat', label: '体脂率', unit: '%' },
      { key: 'muscle', label: '肌肉量', unit: 'kg' },
      { key: 'bmi', label: 'BMI', unit: '' }
    ],
    // 图表
    chartPoints: '',
    chartLabels: [],
    chartValues: [],
    maxValue: 0,
    minValue: 0,
    chartWidth: 680,
    chartHeight: 300
  },

  onLoad() {
    // 根据屏幕宽度设置图表宽度
    const sysInfo = wx.getSystemInfoSync();
    const chartWidth = sysInfo.windowWidth - 32; // 减去两侧 padding
    this.setData({ chartWidth });
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      // request 返回解析后的 data 对象
      const data = await request({ url: '/miniapp/body/stats', data: { days: 90 } });
      console.log('body-stats data:', data);

      // 构建最新记录对象
      const latestRecord = {
        weight_kg: data.currentWeight,
        body_fat_pct: data.bodyFatPct,
        bmi: data.bmi
      };

      // 根据当前指标获取对应趋势数据
      let records = [];
      const metric = this.data.currentMetric;

      if (metric === 'weight' && data.weightTrend) {
        records = data.weightTrend.map(t => ({
          record_date: t.date,
          weight_kg: t.value,
          dateStr: t.date
        }));
        console.log('weight records:', records);
      } else if (metric === 'body_fat' && data.fatTrend) {
        records = data.fatTrend.map(t => ({
          record_date: t.date,
          body_fat_pct: t.value,
          dateStr: t.date
        }));
      } else if (metric === 'muscle' && data.muscleTrend) {
        records = data.muscleTrend.map(t => ({
          record_date: t.date,
          muscle_mass_kg: t.value,
          dateStr: t.date
        }));
      } else if (metric === 'bmi' && data.bmiTrend) {
        records = data.bmiTrend.map(t => ({
          record_date: t.date,
          bmi: t.value,
          dateStr: t.date
        }));
      }

      console.log('metric:', metric, 'records:', records);
      this.setData({
        records,
        latestRecord,
        loading: false
      });
      this.buildChart(records);
    } catch (err) {
      this.setData({ loading: false });
      showToast(err.message || '加载失败');
    }
  },

  onMetricChange(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentMetric: key });
    this.loadData(); // 重新加载数据以获取对应指标的趋势
  },

  buildChart(records) {
    if (!records || records.length === 0) {
      this.setData({ chartLabels: [], chartValues: [] });
      return;
    }

    const metricKey = this.data.currentMetric === 'body_fat' ? 'body_fat_pct' :
                      this.data.currentMetric === 'muscle' ? 'muscle_mass_kg' :
                      this.data.currentMetric === 'weight' ? 'weight_kg' : 'bmi';

    const data = records.filter(r => r[metricKey] != null).slice(-14); // 最近14条
    if (data.length === 0) {
      this.setData({ chartLabels: [], chartValues: [] });
      return;
    }

    const values = data.map(d => parseFloat(d[metricKey]));
    // 直接从 record_date 截取 MM-DD，避免 dateStr 可能的问题
    const labels = data.map(d => d.record_date.substring(5, 10));

    console.log('chart data:', data);
    console.log('labels:', labels, 'values:', values);

    this.setData({
      chartLabels: labels,
      chartValues: values
    });

    // 绘制 Canvas 图表
    this.drawChart(values);
  },

  drawChart(values) {
    if (!values || values.length === 0) return;

    const query = wx.createSelectorQuery();
    query.select('#chartCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;

      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const w = this.data.chartWidth;
      const h = this.data.chartHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      // padding 使用 20px，对应 CSS 中的 40rpx
      const padding = 20;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min || 1;

      // 清空画布
      ctx.clearRect(0, 0, w, h);

      // 绘制网格线
      ctx.strokeStyle = '#F0F0F0';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const y = padding + i * ((h - padding * 2) / 2);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(w - padding, y);
        ctx.stroke();
      }

      // 绘制数据线
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      if (values.length === 1) {
        const x = w / 2;
        const y = h - padding - ((values[0] - min) / range) * (h - padding * 2);
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FF6B35';
        ctx.fill();
      } else {
        const stepX = (w - padding * 2) / (values.length - 1);
        values.forEach((val, i) => {
          const x = padding + i * stepX;
          const y = h - padding - ((val - min) / range) * (h - padding * 2);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // 绘制数据点
        ctx.fillStyle = '#FF6B35';
        values.forEach((val, i) => {
          const x = padding + i * stepX;
          const y = h - padding - ((val - min) / range) * (h - padding * 2);
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = '#FF6B35';
          ctx.lineWidth = 2;
        });
      }
    });
  },

  goRecord() {
    wx.navigateTo({ url: '/pages/body/record' });
  },

  goMilestones() {
    wx.navigateTo({ url: '/pages/body/milestones' });
  }
});

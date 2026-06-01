# 运动健身助手微信小程序 v2.0

基于 **微信小程序 + RESTful API + JWT 鉴权 + MySQL** 的运动健身助手应用，集成 AI 智能对话式健身教练。

## 功能特性

- 🏋️ **训练计划** — 系统推荐 + 自定义创建 + AI 智能生成，支持按周/天编排
- 💪 **运动动作库** — 丰富动作库，按部位/类型/器械筛选，含动作演示与要领
- 📊 **训练记录** — 逐组记录重量/次数，组间休息倒计时，自动统计训练量
- 🤖 **AI 健身助手** — 流式对话、AI 计划生成、渐进式超负荷自动调整
- 📈 **身体数据** — 体重/体脂/体围趋势图表，BMI 自动计算，里程碑追踪
- 🎯 **打卡成就** — 每日打卡、连续天数激励、成就徽章系统、个人最佳记录
- 👥 **社区动态** — 训练分享、点赞评论、关注推荐
- 👤 **个人中心** — 资料编辑、训练历史、收藏动作、健身画像管理

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生微信小程序 + Vant Weapp |
| 后端 | RESTful API（独立服务，非云函数） |
| 鉴权 | JWT Token（Access + Refresh 双令牌） |
| 数据库 | MySQL 8.0 |
| 文件存储 | 腾讯云 COS（预签名直传） |
| AI | 大模型 API + RAG 知识库 + SSE 流式推送 |
| 通信协议 | HTTPS + JSON + Server-Sent Events |

## 项目结构

```
fitness-miniapp-v2.0/
├── project.config.json              # 小程序项目配置
├── miniprogram/                     # 小程序前端
│   ├── app.js                       # 全局入口 (JWT 登录检查)
│   ├── app.json                     # 页面路由 + tabBar
│   ├── app.wxss                     # 全局样式
│   ├── pages/
│   │   ├── login/                   # 微信登录页
│   │   ├── index/                   # 首页 (今日计划/本周概览)
│   │   ├── plan/                    # 训练计划 (list, detail, editor)
│   │   ├── workout/                 # 训练执行 (start, history, summary)
│   │   ├── exercise/                # 动作库 (list, detail)
│   │   ├── body/                    # 身体数据 (index, record, milestones)
│   │   ├── profile/                 # 个人中心 (index, edit, pr-records, favorites, achievements)
│   │   ├── ai/                      # AI 助手 (chat, chat-history, plan-generator, plan-preview, profile-edit)
│   │   └── community/               # 社区动态 (index, detail)
│   ├── components/                  # 公共组件
│   │   ├── exercise-card/           # 动作卡片
│   │   ├── plan-calendar/           # 计划日历
│   │   ├── timer/                   # 计时器
│   │   ├── stat-card/               # 统计卡片
│   │   └── empty-state/             # 空状态占位
│   ├── images/                      # 静态资源
│   └── utils/
│       ├── request.js               # RESTful API 封装 (JWT + SSE + 文件上传)
│       ├── constants.js             # 常量定义
│       └── util.js                  # 工具函数
├── cloudfunctions/                  # [v1.x 遗留] 云函数 (v2.0 不再使用)
├── sql/
│   ├── 00_full_schema.sql           # 完整建表语句 (小程序 + 管理后台共用)
│   └── 01_seed_data.sql             # 初始化种子数据
└── tmp/
    ├── fitness-miniapp-prd-v2.md    # v2.0 产品需求文档
    └── API_DOCUMENTATION.md         # 管理后台 API 文档
```

## 快速开始

### 1. 前置条件

| 工具/服务 | 说明 |
|-----------|------|
| [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) | 最新稳定版 |
| 微信小程序账号 | 需已注册并获取 AppID |
| MySQL 8.0 | 本地或云服务器均可 |
| Node.js >= 18 | 后端 API 服务运行环境 |
| HTTPS 域名 + SSL 证书 | 小程序要求所有请求走 HTTPS |
| 腾讯云 COS（可选） | 文件上传/存储 |

### 2. 数据库初始化

#### 2.1 创建数据库

```sql
CREATE DATABASE `fitness` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

#### 2.2 执行建表脚本

使用 MySQL 客户端或命令行依次执行：

```bash
# 1. 创建全部表结构 (小程序 + 管理后台共用)
mysql -u root -p fitness < sql/00_full_schema.sql

# 2. 导入种子数据 (系统预设动作/成就/身体部位等)
mysql -u root -p fitness < sql/01_seed_data.sql
```

> **重要**: `00_full_schema.sql` 包含 **25+ 张数据表**，覆盖用户、训练计划、动作库、训练记录、身体数据、打卡成就、社区动态、AI 对话、AI 计划、知识库等全部模块。请确保按顺序执行，先建表再导数据。

#### 2.3 主要数据表概览

| 模块 | 核心表 | 说明 |
|------|--------|------|
| 用户 | `user`, `user_fitness_profile` | 用户基础信息 + AI 健身画像 |
| 计划 | `workout_plan`, `plan_day`, `plan_day_exercise` | 训练计划模板 + 每日编排 + 动作详情 |
| 动作 | `exercise`, `body_part`, `exercise_body_part` | 动作库 + 部位关联 |
| 训练 | `workout_log`, `workout_log_exercise`, `workout_log_set` | 训练记录 + 动作 + 逐组数据 |
| 身体 | `body_metric`, `body_milestone` | 身体数据记录 + 里程碑 |
| 成就 | `achievement`, `user_achievement`, `checkin`, `pr_record` | 成就系统 + 打卡 + 个人最佳 |
| 社区 | `post`, `post_like`, `comment` | 动态 + 点赞 + 评论 |
| AI | `ai_chat_session`, `ai_chat_message`, `ai_plan` | AI 对话 + AI 计划生成 |
| 收藏 | `exercise_favorite` | 动作收藏 |

### 3. 部署后端 API 服务

> v2.0 已移除微信云函数依赖，改为独立 RESTful API 服务。后端代码需单独部署（不在本仓库中）。

#### 3.1 后端服务要求

后端需实现以下核心 API 端点（小程序 Base URL: `/api/v1`）：

| 模块 | 端点示例 | 方法 |
|------|---------|------|
| 认证 | `POST /user/login` | 微信 code 换取 JWT |
| 认证 | `POST /auth/refresh` | 刷新 Access Token |
| 用户 | `GET /user/profile` | 获取用户信息 |
| 用户 | `PUT /user/profile` | 更新用户信息 |
| 计划 | `GET /plan/list`, `GET /plan/:id` | 计划列表/详情 |
| 训练 | `POST /workout/start`, `POST /workout/complete` | 开始/完成训练 |
| 动作 | `GET /exercise/list`, `GET /exercise/:id` | 动作列表/详情 |
| 身体 | `GET /body/stats`, `POST /body/record` | 趋势数据/记录 |
| AI | `POST /ai-chat/send` (SSE) | 流式 AI 对话 |
| AI | `POST /ai/plan/generate` | AI 生成计划 |
| 文件 | `GET /upload/media` | 获取 COS 预签名 URL |

#### 3.2 通用响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": 1234567890
}
```

#### 3.3 鉴权方式

所有需鉴权的接口通过 HTTP Header 传递 JWT Token：

```
Authorization: Bearer <access_token>
```

Token 过期时自动使用 Refresh Token 刷新，对业务层透明。

### 4. 配置小程序前端

#### 4.1 修改 API 地址

编辑 `miniprogram/utils/request.js`，将 `BASE_URL` 替换为你的后端 API 地址：

```javascript
// 第 6 行
const BASE_URL = 'https://your-api-domain.com/api/v1';
```

> **注意**: 小程序要求 API 地址必须为 HTTPS，且域名需在微信公众平台「开发管理 → 开发设置 → 服务器域名」中配置为 `request 合法域名`。

#### 4.2 配置微信小程序后台

登录 [微信公众平台](https://mp.weixin.qq.com/)，进入「开发管理 → 开发设置」：

1. **服务器域名** — 添加你的 API 域名到 `request 合法域名`
2. **uploadFile 合法域名** — 如使用 COS 直传，添加 COS bucket 域名
3. **downloadFile 合法域名** — 同上
4. **业务域名** — 如有 webview 页面则需配置

### 5. 导入小程序项目

1. 打开 **微信开发者工具**
2. 选择「导入项目」
3. 项目目录选择 `fitness-miniapp-v2.0/`
4. AppID 填入你的小程序 AppID（或修改 `project.config.json` 中的 `appid` 字段）
5. 点击「导入」

### 6. 安装前端依赖

在 `miniprogram/` 目录下执行：

```bash
cd miniprogram
npm install
```

然后在微信开发者工具中：**工具 → 构建 npm**

> 主要依赖: `@vant/weapp` (Vant Weapp UI 组件库)

### 7. 运行与调试

1. 点击开发者工具中的 **「编译」** 按钮
2. 首次打开会跳转登录页，点击登录按钮完成微信授权
3. 登录成功后自动跳转首页

#### 开发调试技巧

- **关闭域名校验**: 开发阶段可在开发者工具「详情 → 本地设置」中勾选「不校验合法域名」
- **模拟登录**: 可在 Storage 面板手动写入 `jwt_token` 跳过登录
- **真机预览**: 点击「预览」生成二维码，扫码在真机上测试

## 页面路由

### TabBar 页面（底部导航）

| Tab | 页面路径 | 功能 |
|-----|---------|------|
| 首页 | `pages/index/index` | 今日计划、本周训练概览、快速入口、公告 |
| AI 助手 | `pages/ai/chat` | AI 对话式健身教练 (SSE 流式输出) |
| 动作库 | `pages/exercise/list` | 按部位/类型/器械筛选动作 |
| 我的 | `pages/profile/index` | 个人统计、功能菜单入口 |

### 功能页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 登录 | `pages/login/index` | 微信一键登录，获取 JWT Token |
| 计划列表 | `pages/plan/list` | 浏览/搜索/筛选训练计划 |
| 计划详情 | `pages/plan/detail` | 查看计划按周编排，开始训练 |
| 计划编辑器 | `pages/plan/editor` | 自定义创建训练计划 |
| 训练执行 | `pages/workout/start` | 逐组记录、计时、休息倒计时 |
| 训练历史 | `pages/workout/history` | 按月查看训练记录与统计 |
| 训练汇总 | `pages/workout/summary` | 本次训练数据汇总与分享 |
| 动作详情 | `pages/exercise/detail` | 动作演示图/视频、步骤要领、收藏 |
| 身体数据 | `pages/body/index` | 体重/体脂/肌肉量趋势图表 |
| 记录数据 | `pages/body/record` | 录入体重/体脂/体围数据 |
| 里程碑 | `pages/body/milestones` | 身体数据里程碑成就 |
| 编辑资料 | `pages/profile/edit` | 个人信息、健身目标、训练偏好 |
| 个人最佳 | `pages/profile/pr-records` | 各动作最大重量记录 |
| 收藏动作 | `pages/profile/favorites` | 已收藏动作列表 |
| 我的成就 | `pages/profile/achievements` | 成就徽章解锁进度 |
| AI 对话历史 | `pages/ai/chat-history` | 历史对话会话列表 |
| AI 计划生成 | `pages/ai/plan-generator` | 分步引导 AI 生成训练计划 |
| AI 计划预览 | `pages/ai/plan-preview` | 预览 AI 生成的计划并确认 |
| AI 画像编辑 | `pages/ai/profile-edit` | 编辑健身画像 (器械/伤病/偏好) |
| 社区动态 | `pages/community/index` | 推荐/关注/我的动态 |
| 动态详情 | `pages/community/detail` | 动态内容、评论、点赞 |

## API 端点映射表

以下为小程序前端调用的完整 API 端点映射：

| 功能 | 方法 | API 端点 | 对应文件 |
|------|------|---------|---------|
| 微信登录 | POST | `/user/login` | `pages/login/index.js` |
| 刷新 Token | POST | `/auth/refresh` | `utils/request.js` |
| 获取用户信息 | GET | `/user/profile` | `pages/index/index.js`, `pages/profile/index.js` |
| 更新用户信息 | PUT | `/user/profile` | `pages/profile/edit.js` |
| 计划列表 | GET | `/plan/list` | `pages/plan/list.js` |
| 计划详情 | GET | `/plan/:id` | `pages/plan/detail.js` |
| 创建计划 | POST | `/plan` | `pages/plan/editor.js` |
| 开始训练 | POST | `/workout/start` | `pages/workout/start.js` |
| 记录组数 | POST | `/workout/log-set` | `pages/workout/start.js` |
| 完成训练 | POST | `/workout/complete` | `pages/workout/start.js` |
| 训练历史 | GET | `/workout/history` | `pages/workout/history.js`, `pages/index/index.js` |
| 训练统计 | GET | `/workout/stats` | `pages/index/index.js` |
| 动作列表 | GET | `/exercise/list` | `pages/exercise/list.js`, `pages/plan/editor.js` |
| 动作详情 | GET | `/exercise/:id` | `pages/exercise/detail.js` |
| 身体部位 | GET | `/exercise/body-parts` | `pages/plan/editor.js` |
| 收藏检查 | GET | `/exercise/favorite/check` | `pages/exercise/detail.js` |
| 收藏操作 | POST | `/exercise/favorite` | `pages/exercise/detail.js`, `pages/profile/favorites.js` |
| 收藏列表 | GET | `/exercise/favorite/list` | `pages/profile/favorites.js` |
| 身体趋势 | GET | `/body/stats` | `pages/body/index.js` |
| 记录身体数据 | POST | `/body/record` | `pages/body/record.js` |
| 身体里程碑 | GET | `/body/milestones` | `pages/body/milestones.js` |
| 成就列表 | GET | `/achievement/list` | `pages/profile/achievements.js` |
| 个人最佳 | GET | `/pr-record/list` | `pages/profile/pr-records.js` |
| 打卡连续 | GET | `/checkin/streak` | `pages/index/index.js` |
| AI 对话 (SSE) | POST | `/ai-chat/send` | `pages/ai/chat.js` |
| AI 历史消息 | GET | `/ai-chat/:sessionId/messages` | `pages/ai/chat.js` |
| AI 会话列表 | GET | `/ai/chat/sessions` | `pages/ai/chat-history.js` |
| AI 生成计划 | POST | `/ai/plan/generate` | `pages/ai/plan-generator.js` |
| AI 确认计划 | POST | `/ai/plan/confirm` | `pages/ai/plan-generator.js` |
| 健身画像 | GET/PUT | `/fitness-profile` | `pages/ai/profile-edit.js` |
| 动态列表 | GET | `/post/list` | `pages/community/index.js` |
| 我的动态 | GET | `/post/my` | `pages/community/index.js` |
| 动态详情 | GET | `/post/:id` | `pages/community/detail.js` |
| 点赞 | POST | `/post/like` | `pages/community/index.js`, `pages/community/detail.js` |
| 评论 | POST | `/comment` | `pages/community/detail.js` |
| 最新公告 | GET | `/announcement/latest` | `pages/index/index.js` |
| 文件上传 | GET | `/upload/media` | `utils/request.js` |

## 设计规范

| 属性 | 值 |
|------|------|
| 主色 | `#FF6B35` (活力橙) |
| 辅助色 | `#1A1A2E` (深蓝黑) |
| 背景色 | `#F5F5FA` |
| 成功色 | `#4CAF50` |
| 卡片圆角 | 16rpx |
| 按钮圆角 | 8rpx |

## 部署上线

### 1. 生产环境检查清单

- [ ] 后端 API 服务已部署并可通过 HTTPS 访问
- [ ] `miniprogram/utils/request.js` 中 `BASE_URL` 已改为生产域名
- [ ] MySQL 数据库已初始化（执行了 `00_full_schema.sql` 和 `01_seed_data.sql`）
- [ ] 微信公众平台已配置 `request 合法域名`
- [ ] 微信公众平台已配置 `uploadFile/downloadFile 合法域名`
- [ ] COS 存储桶已创建并配置好跨域策略
- [ ] AI 大模型 API Key 已在后端配置
- [ ] JWT 密钥已在后端配置（生产环境务必使用强随机密钥）

### 2. 上传代码

1. 在微信开发者工具中点击右上角 **「上传」**
2. 填写版本号（如 `2.0.0`）和项目备注
3. 登录微信公众平台 → 「版本管理」
4. 在「开发版本」中点击 **「提交审核」**
5. 审核通过后点击 **「发布」**

### 3. 后端部署建议

| 方案 | 适用场景 |
|------|---------|
| 腾讯云 CloudBase 云托管 (CloudRun) | 推荐，免运维、自动扩缩容 |
| 腾讯云轻量应用服务器 + Docker | 低成本，适合个人项目 |
| 云服务器 + Nginx + Node.js | 传统方案，灵活可控 |
| Serverless 函数 (SCF) | 按量计费，适合低流量 |

## 注意事项

- 训练执行页面会保持 **屏幕常亮**，组间休息结束时手机会 **震动提示**
- AI 对话使用 **SSE 流式推送**，需要后端支持 `text/event-stream`
- 所有 API 使用 **参数化查询** 防止 SQL 注入
- 用户数据通过 **JWT + user_id** 隔离，确保数据安全
- `cloudfunctions/` 目录为 v1.x 遗留代码，v2.0 不再使用，可安全删除
- TabBar 图标文件需放在 `miniprogram/images/` 目录下，命名为 `tab-*.png`

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v2.0 | 2026-06 | 架构升级: 云函数 → RESTful API + JWT；新增 AI 对话/计划生成、社区动态、成就系统 |
| v1.0 | 2026-05 | 初始版本: 微信云开发，基础训练记录功能 |

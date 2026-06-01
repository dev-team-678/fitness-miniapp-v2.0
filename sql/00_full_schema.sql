-- ================================================================
-- 运动健身助手 — 完整合并数据库表结构
-- 适用于: 小程序 + 管理后台 共用同一个数据库
-- 数据库名: fitness
-- 字符集: utf8mb4
-- 生成日期: 2026-05-30
--
-- 来源:
--   1. deploy/fitness-miniapp-prd.md (小程序 PRD v1.1)
--   2. fitness-admin/fitness-admin-prd.md (管理后台后端 PRD v2.0)
--   3. fitness-admin-web/db-init.sql (管理后台初始化脚本)
--
-- 合并规则:
--   - 两份 PRD 共有表，字段取并集
--   - 管理后台 PRD 对小程序已有表的扩展字段，以 ALTER 形式合并
--   - db-init.sql 与 PRD 有差异时，以 db-init.sql 的实际实现为准
-- ================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ================================================================
-- 一、用户模块
-- ================================================================

-- -----------------------------------------------------------
-- 1.1 用户表 (小程序用户)
-- 来源: miniapp PRD §3.1
-- -----------------------------------------------------------
CREATE TABLE `user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `openid` VARCHAR(64) NOT NULL COMMENT '微信openid',
  `unionid` VARCHAR(64) DEFAULT NULL COMMENT '微信unionid',
  `nickname` VARCHAR(64) DEFAULT NULL COMMENT '昵称',
  `avatar_url` VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
  `gender` TINYINT DEFAULT 0 COMMENT '性别: 0-未知 1-男 2-女',
  `birthday` DATE DEFAULT NULL COMMENT '生日',
  `height_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '身高(cm)',
  `current_weight_kg` DECIMAL(5,2) DEFAULT NULL COMMENT '当前体重(kg)',
  `target_weight_kg` DECIMAL(5,2) DEFAULT NULL COMMENT '目标体重(kg)',
  `fitness_goal` VARCHAR(32) DEFAULT NULL COMMENT '健身目标: lose_fat/gain_muscle/keep_fit/improve_endurance',
  `fitness_level` VARCHAR(32) DEFAULT 'beginner' COMMENT '健身水平: beginner/intermediate/advanced',
  `workout_days_per_week` TINYINT DEFAULT 3 COMMENT '每周训练天数',
  `workout_duration_min` TINYINT DEFAULT 45 COMMENT '每次训练时长(分钟)',
  `current_plan_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '当前活跃计划ID',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1-正常 0-禁用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_unionid` (`unionid`),
  KEY `idx_current_plan` (`current_plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- -----------------------------------------------------------
-- 1.2 用户标签 (管理后台 PRD §4.2)
-- 来源: admin PRD
-- -----------------------------------------------------------
CREATE TABLE `user_tag` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(32) NOT NULL COMMENT '标签名称',
  `color` VARCHAR(16) DEFAULT NULL COMMENT '标签颜色',
  `description` VARCHAR(128) DEFAULT NULL COMMENT '标签描述',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序权重',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1-启用 0-禁用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户标签';

CREATE TABLE `user_tag_relation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `tag_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_tag` (`user_id`, `tag_id`),
  CONSTRAINT `fk_utr_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_utr_tag` FOREIGN KEY (`tag_id`) REFERENCES `user_tag`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户标签关联';

-- -----------------------------------------------------------
-- 1.3 用户健身画像 (AI 维护)
-- 来源: miniapp PRD §3.9
-- -----------------------------------------------------------
CREATE TABLE `user_fitness_profile` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `injuries` JSON DEFAULT NULL COMMENT '伤病史记录',
  `allergies` JSON DEFAULT NULL COMMENT '过敏信息',
  `available_equipment` JSON DEFAULT NULL COMMENT '可用器械列表',
  `preferred_workout_time` VARCHAR(32) DEFAULT NULL COMMENT '偏好训练时间',
  `training_preferences` JSON DEFAULT NULL COMMENT '训练偏好(喜欢/不喜欢的动作)',
  `health_conditions` JSON DEFAULT NULL COMMENT '健康状况(腰椎间盘突出等)',
  `ai_notes` TEXT DEFAULT NULL COMMENT 'AI 对用户的整体理解摘要',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user` (`user_id`),
  CONSTRAINT `fk_ufp_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户健身画像';


-- ================================================================
-- 二、管理员与权限模块 (管理后台专用)
-- ================================================================

-- -----------------------------------------------------------
-- 2.1 管理角色表
-- 来源: admin PRD §4.1 + db-init.sql
-- 说明: 以 db-init.sql 实现为准
-- -----------------------------------------------------------
CREATE TABLE `admin_role` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(64) NOT NULL COMMENT '角色编码',
  `description` VARCHAR(256) DEFAULT NULL,
  `permissions` JSON NOT NULL COMMENT '权限配置JSON',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理角色';

-- -----------------------------------------------------------
-- 2.2 管理员账号表
-- 来源: admin PRD §4.1 + db-init.sql
-- 说明: 合并 PRD 的 user_id 外键 + db-init.sql 的实际字段
-- -----------------------------------------------------------
CREATE TABLE `admin_user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联小程序 user.id(可选)',
  `username` VARCHAR(64) NOT NULL COMMENT '管理员登录用户名',
  `password` VARCHAR(256) NOT NULL COMMENT '密码(MD5)',
  `nickname` VARCHAR(64) DEFAULT NULL COMMENT '昵称',
  `avatar` VARCHAR(256) DEFAULT NULL COMMENT '头像',
  `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `role_id` INT UNSIGNED DEFAULT NULL COMMENT '角色ID(关联 admin_role.id)',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1-正常 2-禁用',
  `deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-正常 1-已删除',
  `last_login_ip` VARCHAR(45) DEFAULT NULL,
  `last_login_time` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员账号';

-- -----------------------------------------------------------
-- 2.3 操作日志表
-- 来源: admin PRD §4.1 + db-init.sql
-- -----------------------------------------------------------
CREATE TABLE `admin_operation_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_user_id` BIGINT UNSIGNED NOT NULL COMMENT '管理员ID(关联 admin_user.id)',
  `action` VARCHAR(16) NOT NULL COMMENT 'CREATE/UPDATE/DELETE/LOGIN/EXPORT',
  `module` VARCHAR(32) NOT NULL COMMENT '操作模块',
  `target_id` VARCHAR(64) DEFAULT NULL COMMENT '操作对象ID',
  `detail` JSON DEFAULT NULL COMMENT '变更详情',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(512) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin` (`admin_user_id`),
  KEY `idx_module_action` (`module`, `action`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志';

-- -----------------------------------------------------------
-- 2.4 登录日志表
-- 来源: admin PRD §4.1 + db-init.sql
-- -----------------------------------------------------------
CREATE TABLE `admin_login_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '管理员ID(关联 admin_user.id)',
  `username` VARCHAR(64) DEFAULT NULL COMMENT '登录用户名',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(512) DEFAULT NULL,
  `login_status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1-成功 2-失败',
  `fail_reason` VARCHAR(256) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin` (`admin_user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志';


-- ================================================================
-- 三、训练计划模块
-- ================================================================

-- -----------------------------------------------------------
-- 3.1 训练计划模板
-- 来源: miniapp PRD §3.2
-- -----------------------------------------------------------
CREATE TABLE `workout_plan` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL COMMENT '计划名称',
  `description` TEXT COMMENT '计划描述',
  `cover_image_url` VARCHAR(512) DEFAULT NULL COMMENT '封面图',
  `difficulty_level` VARCHAR(32) NOT NULL DEFAULT 'beginner' COMMENT '难度: beginner/intermediate/advanced',
  `fitness_goal` VARCHAR(32) NOT NULL COMMENT '适用目标: lose_fat/gain_muscle/keep_fit',
  `duration_weeks` TINYINT UNSIGNED NOT NULL COMMENT '计划周期(周)',
  `days_per_week` TINYINT UNSIGNED NOT NULL COMMENT '每周训练天数',
  `avg_duration_min` TINYINT UNSIGNED DEFAULT NULL COMMENT '平均每次时长(分钟)',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统预设',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建者用户ID(NULL=系统)',
  `ai_generated` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否AI生成',
  `ai_generation_params` JSON DEFAULT NULL COMMENT 'AI生成参数快照',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态: 0-下架 1-上架',
  `is_paused` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否暂停 0-正常 1-暂停',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_goal_level` (`fitness_goal`, `difficulty_level`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练计划模板';

-- -----------------------------------------------------------
-- 3.2 计划每日安排
-- 来源: miniapp PRD §3.2
-- -----------------------------------------------------------
CREATE TABLE `plan_day` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_id` BIGINT UNSIGNED NOT NULL COMMENT '所属计划ID',
  `week_number` TINYINT UNSIGNED NOT NULL COMMENT '第几周',
  `day_of_week` TINYINT UNSIGNED NOT NULL COMMENT '星期几(1-7)',
  `day_label` VARCHAR(32) DEFAULT NULL COMMENT '如"胸+三头"、"休息日"',
  `is_rest_day` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否休息日',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_plan_week` (`plan_id`, `week_number`),
  CONSTRAINT `fk_plan_day_plan` FOREIGN KEY (`plan_id`) REFERENCES `workout_plan`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='计划每日安排';

-- -----------------------------------------------------------
-- 3.3 计划动作详情
-- 来源: miniapp PRD §3.2
-- -----------------------------------------------------------
CREATE TABLE `plan_day_exercise` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_day_id` BIGINT UNSIGNED NOT NULL,
  `exercise_id` BIGINT UNSIGNED NOT NULL COMMENT '动作ID',
  `sets` TINYINT UNSIGNED DEFAULT NULL COMMENT '组数',
  `reps` INT DEFAULT NULL COMMENT '次数',
  `duration` INT UNSIGNED DEFAULT NULL COMMENT '时长(秒)',
  `rest_seconds` TINYINT UNSIGNED DEFAULT 60 COMMENT '组间休息(秒)',
  `sort` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_day` (`plan_day_id`),
  KEY `idx_exercise` (`exercise_id`),
  CONSTRAINT `fk_pe_plan_day` FOREIGN KEY (`plan_day_id`) REFERENCES `plan_day`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='计划动作详情';


-- ================================================================
-- 四、运动动作库
-- ================================================================

-- -----------------------------------------------------------
-- 4.1 身体部位
-- 来源: miniapp PRD §3.3
-- -----------------------------------------------------------
CREATE TABLE `body_part` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(32) NOT NULL COMMENT '部位名称',
  `icon_url` VARCHAR(512) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='身体部位';

-- -----------------------------------------------------------
-- 4.2 动作分类
-- 来源: miniapp PRD §3.3
-- -----------------------------------------------------------
CREATE TABLE `exercise_category` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL COMMENT '分类名称',
  `parent_id` INT UNSIGNED DEFAULT NULL COMMENT '父分类',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动作分类';

-- -----------------------------------------------------------
-- 4.3 运动动作表
-- 来源: miniapp PRD §3.3
-- -----------------------------------------------------------
CREATE TABLE `exercise` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(128) NOT NULL COMMENT '动作名称',
  `name_en` VARCHAR(128) DEFAULT NULL COMMENT '英文名',
  `category_id` INT UNSIGNED DEFAULT NULL COMMENT '分类ID',
  `difficulty` VARCHAR(32) DEFAULT 'beginner' COMMENT '难度',
  `exercise_type` VARCHAR(32) NOT NULL COMMENT '类型: strength/cardio/flexibility/balance',
  `equipment` VARCHAR(64) DEFAULT NULL COMMENT '所需器械: none/dumbbell/barbell/machine/cable/band',
  `description` TEXT COMMENT '动作描述',
  `instructions` JSON DEFAULT NULL COMMENT '动作步骤(数组)',
  `tips` JSON DEFAULT NULL COMMENT '注意事项(数组)',
  `demo_image_url` VARCHAR(512) DEFAULT NULL COMMENT '演示图',
  `demo_video_url` VARCHAR(512) DEFAULT NULL COMMENT '演示视频',
  `calories_per_rep` DECIMAL(5,2) DEFAULT NULL COMMENT '每次消耗热量(kcal)',
  `calories_per_min` DECIMAL(5,2) DEFAULT NULL COMMENT '每分钟消耗热量(有氧)',
  `is_compound` TINYINT(1) DEFAULT 0 COMMENT '是否复合动作',
  `status` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_type` (`exercise_type`),
  KEY `idx_name` (`name`),
  CONSTRAINT `fk_exercise_cat` FOREIGN KEY (`category_id`) REFERENCES `exercise_category`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运动动作库';

-- -----------------------------------------------------------
-- 4.4 动作-部位关联(多对多)
-- 来源: miniapp PRD §3.3
-- -----------------------------------------------------------
CREATE TABLE `exercise_body_part` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `exercise_id` BIGINT UNSIGNED NOT NULL,
  `body_part_id` INT UNSIGNED NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否主要目标肌群',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_exercise_part` (`exercise_id`, `body_part_id`),
  CONSTRAINT `fk_ebp_exercise` FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ebp_part` FOREIGN KEY (`body_part_id`) REFERENCES `body_part`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动作-部位关联';


-- ================================================================
-- 五、训练记录模块
-- ================================================================

-- -----------------------------------------------------------
-- 5.1 训练记录主表
-- 来源: miniapp PRD §3.4
-- -----------------------------------------------------------
CREATE TABLE `workout_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联计划(自由训练为NULL)',
  `plan_day_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联计划日',
  `workout_date` DATE NOT NULL COMMENT '训练日期',
  `start_time` DATETIME NOT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `duration_min` INT UNSIGNED DEFAULT NULL COMMENT '实际时长(秒)',
  `total_volume_kg` DECIMAL(10,2) DEFAULT 0 COMMENT '总训练量(kg)',
  `total_sets` INT UNSIGNED DEFAULT 0 COMMENT '总组数',
  `estimated_calories` DECIMAL(8,2) DEFAULT 0 COMMENT '估算消耗(kcal)',
  `notes` TEXT COMMENT '训练备注',
  `feeling_score` TINYINT DEFAULT NULL COMMENT '训练感受 1-5',
  `rpe` TINYINT DEFAULT NULL COMMENT '主观疲劳度 RPE 1-10',
  `status` VARCHAR(16) NOT NULL DEFAULT 'in_progress' COMMENT 'in_progress/completed/cancelled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`, `workout_date`),
  KEY `idx_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_wl_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练记录';

-- -----------------------------------------------------------
-- 5.2 训练记录-动作
-- 来源: miniapp PRD §3.4
-- -----------------------------------------------------------
CREATE TABLE `workout_log_exercise` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workout_log_id` BIGINT UNSIGNED NOT NULL,
  `exercise_id` BIGINT UNSIGNED NOT NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_log` (`workout_log_id`),
  CONSTRAINT `fk_wle_log` FOREIGN KEY (`workout_log_id`) REFERENCES `workout_log`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wle_exercise` FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练记录-动作';

-- -----------------------------------------------------------
-- 5.3 训练记录-组数
-- 来源: miniapp PRD §3.4
-- -----------------------------------------------------------
CREATE TABLE `workout_log_set` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `log_exercise_id` BIGINT UNSIGNED NOT NULL,
  `set_number` TINYINT UNSIGNED NOT NULL COMMENT '第几组',
  `set_type` VARCHAR(16) DEFAULT 'normal' COMMENT 'normal/warmup/dropset/failure',
  `weight_kg` DECIMAL(6,2) DEFAULT NULL COMMENT '重量(kg)',
  `reps` INT UNSIGNED DEFAULT NULL COMMENT '次数',
  `duration_sec` INT UNSIGNED DEFAULT NULL COMMENT '时长(秒),有氧用',
  `distance_m` DECIMAL(10,2) DEFAULT NULL COMMENT '距离(米),跑步用',
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否完成',
  `is_pr` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否个人记录',
  `notes` VARCHAR(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_log_exercise` (`log_exercise_id`),
  CONSTRAINT `fk_wls_le` FOREIGN KEY (`log_exercise_id`) REFERENCES `workout_log_exercise`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练记录-组数';


-- ================================================================
-- 六、身体数据追踪模块
-- ================================================================

-- -----------------------------------------------------------
-- 6.1 身体数据记录
-- 来源: miniapp PRD §3.5
-- -----------------------------------------------------------
CREATE TABLE `body_metric` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `record_date` DATE NOT NULL COMMENT '记录日期',
  `weight_kg` DECIMAL(5,2) DEFAULT NULL COMMENT '体重(kg)',
  `body_fat_pct` DECIMAL(4,1) DEFAULT NULL COMMENT '体脂率(%)',
  `muscle_mass_kg` DECIMAL(5,2) DEFAULT NULL COMMENT '肌肉量(kg)',
  `bmi` DECIMAL(4,1) DEFAULT NULL COMMENT 'BMI',
  `chest_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '胸围(cm)',
  `waist_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '腰围(cm)',
  `hip_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '臀围(cm)',
  `left_arm_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '左臂围(cm)',
  `right_arm_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '右臂围(cm)',
  `left_thigh_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '左大腿围(cm)',
  `right_thigh_cm` DECIMAL(5,1) DEFAULT NULL COMMENT '右大腿围(cm)',
  `note` VARCHAR(256) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `record_date`),
  CONSTRAINT `fk_bm_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='身体数据记录';


-- ================================================================
-- 七、打卡与习惯养成模块
-- ================================================================

-- -----------------------------------------------------------
-- 7.1 打卡记录
-- 来源: miniapp PRD §3.6
-- -----------------------------------------------------------
CREATE TABLE `checkin` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `checkin_date` DATE NOT NULL COMMENT '打卡日期',
  `workout_log_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联训练记录',
  `checkin_type` VARCHAR(16) NOT NULL DEFAULT 'workout' COMMENT 'workout/rest/custom',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `checkin_date`),
  CONSTRAINT `fk_ci_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡记录';

-- -----------------------------------------------------------
-- 7.2 成就配置
-- 来源: miniapp PRD §3.6
-- -----------------------------------------------------------
CREATE TABLE `achievement` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL COMMENT '成就名称',
  `description` VARCHAR(256) DEFAULT NULL,
  `icon_url` VARCHAR(512) DEFAULT NULL,
  `condition_type` VARCHAR(32) NOT NULL COMMENT '条件类型: total_workouts/streak_days/total_volume/total_duration',
  `condition_value` INT UNSIGNED NOT NULL COMMENT '条件值',
  `badge_color` VARCHAR(16) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成就配置';

-- -----------------------------------------------------------
-- 7.3 用户成就
-- 来源: miniapp PRD §3.6
-- -----------------------------------------------------------
CREATE TABLE `user_achievement` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `achievement_id` INT UNSIGNED NOT NULL,
  `unlocked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_achievement` (`user_id`, `achievement_id`),
  CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`),
  CONSTRAINT `fk_ua_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `achievement`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户已解锁成就';


-- ================================================================
-- 八、社区互动模块
-- ================================================================

-- -----------------------------------------------------------
-- 8.1 社区动态
-- 来源: miniapp PRD §3.7
-- -----------------------------------------------------------
CREATE TABLE `post` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `content` TEXT NOT NULL COMMENT '动态内容',
  `images` JSON DEFAULT NULL COMMENT '图片URL数组',
  `workout_log_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联训练记录',
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `comment_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0-隐藏 1-正常',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fk_post_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区动态';

-- -----------------------------------------------------------
-- 8.2 点赞记录
-- 来源: miniapp PRD §3.7
-- -----------------------------------------------------------
CREATE TABLE `post_like` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_post_user` (`post_id`, `user_id`),
  CONSTRAINT `fk_pl_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pl_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞记录';

-- -----------------------------------------------------------
-- 8.3 评论
-- 来源: miniapp PRD §3.7
-- -----------------------------------------------------------
CREATE TABLE `comment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '回复的评论ID',
  `content` VARCHAR(512) NOT NULL,
  `like_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
  `status` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post` (`post_id`),
  CONSTRAINT `fk_comment_post` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comment_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论';

-- -----------------------------------------------------------
-- 8.4 敏感词库 (管理后台)
-- 来源: admin PRD §4.2
-- -----------------------------------------------------------
CREATE TABLE `sensitive_word` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `word` VARCHAR(64) NOT NULL,
  `category` VARCHAR(32) DEFAULT 'general',
  `level` TINYINT NOT NULL DEFAULT 1 COMMENT '1-替换 2-拦截 3-审核',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_word` (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='敏感词库';

-- -----------------------------------------------------------
-- 8.5 举报管理 (管理后台)
-- 来源: admin PRD §4.2
-- -----------------------------------------------------------
CREATE TABLE `report` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reporter_id` BIGINT UNSIGNED NOT NULL COMMENT '举报人ID',
  `target_id` BIGINT UNSIGNED NOT NULL COMMENT '被举报内容ID',
  `target_type` VARCHAR(32) NOT NULL COMMENT '举报对象类型: post/comment/user',
  `reason` VARCHAR(64) NOT NULL COMMENT '举报原因',
  `description` VARCHAR(512) DEFAULT NULL COMMENT '详细描述',
  `images` JSON DEFAULT NULL COMMENT '举报截图URL数组',
  `status` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0-待处理 1-已处理 2-已忽略',
  `handle_result` VARCHAR(256) DEFAULT NULL COMMENT '处理结果说明',
  `handler_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '处理人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_target` (`target_id`, `target_type`),
  CONSTRAINT `fk_report_user` FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='举报记录';


-- ================================================================
-- 九、AI 对话式健身助手
-- ================================================================

-- -----------------------------------------------------------
-- 9.1 AI 对话会话
-- 来源: miniapp PRD §3.9
-- -----------------------------------------------------------
CREATE TABLE `ai_chat_session` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `session_type` VARCHAR(32) NOT NULL DEFAULT 'fitness' COMMENT '会话类型: fitness/nutrition/general',
  `title` VARCHAR(128) DEFAULT NULL COMMENT '会话标题(首条消息摘要)',
  `message_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '消息数量',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1-活跃 0-已归档',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_acs_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话会话';

-- -----------------------------------------------------------
-- 9.2 AI 对话消息
-- 来源: miniapp PRD §3.9
-- -----------------------------------------------------------
CREATE TABLE `ai_chat_message` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `role` VARCHAR(16) NOT NULL COMMENT 'user/assistant/system',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `rag_refs` JSON DEFAULT NULL COMMENT 'RAG 引用来源(动作ID/知识ID)',
  `structured_data` JSON DEFAULT NULL COMMENT '结构化数据(卡片内容)',
  `token_count` INT UNSIGNED DEFAULT NULL COMMENT '消耗 token 数',
  `feedback` TINYINT DEFAULT NULL COMMENT '用户反馈: 1-有用 -1-无用 NULL-未评价',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `fk_acm_session` FOREIGN KEY (`session_id`) REFERENCES `ai_chat_session`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI对话消息';

-- -----------------------------------------------------------
-- 9.3 AI 回答问题记录 (管理后台标记)
-- 来源: admin PRD §4.3
-- -----------------------------------------------------------
CREATE TABLE `ai_chat_issue` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` BIGINT UNSIGNED NOT NULL COMMENT '问题消息ID(ai_chat_message.id)',
  `session_id` BIGINT UNSIGNED NOT NULL COMMENT '会话ID',
  `admin_user_id` BIGINT UNSIGNED NOT NULL COMMENT '标记的管理员(关联 admin_user.id)',
  `issue_type` VARCHAR(32) NOT NULL COMMENT 'hallucination/inaccurate/unsafe/irrelevant',
  `description` TEXT COMMENT '问题描述',
  `correct_answer` TEXT COMMENT '修正后的正确回答',
  `knowledge_added` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已添加到知识库',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_message` (`message_id`),
  KEY `idx_type` (`issue_type`),
  CONSTRAINT `fk_aci_message` FOREIGN KEY (`message_id`) REFERENCES `ai_chat_message`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI回答问题记录';


-- ================================================================
-- 十、AI 计划生成
-- ================================================================

-- -----------------------------------------------------------
-- 10.1 AI 生成的计划
-- 来源: miniapp PRD §3.10
-- -----------------------------------------------------------
CREATE TABLE `ai_plan` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `prompt` TEXT COMMENT '用户输入的提示词',
  `response` MEDIUMTEXT COMMENT 'AI返回的完整计划内容',
  `workout_plan_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联的训练计划(确认后生成)',
  `goal` VARCHAR(32) DEFAULT NULL COMMENT '训练目标',
  `available_equipment` JSON DEFAULT NULL COMMENT '可用器械',
  `days_per_week` TINYINT UNSIGNED DEFAULT NULL COMMENT '每周天数',
  `split_type` VARCHAR(32) DEFAULT NULL COMMENT '分化类型: full_body/upper_lower/push_pull_legs/custom',
  `generation_params` JSON DEFAULT NULL COMMENT '完整生成参数快照',
  `explanation` TEXT COMMENT 'AI 生成的计划解释(为什么这么排)',
  `version` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '计划版本(迭代次数)',
  `converted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已转换为训练计划',
  `converted_plan_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '转换后的训练计划ID',
  `status` VARCHAR(16) NOT NULL DEFAULT 'draft' COMMENT 'draft/confirmed/active/archived',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_ap_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI生成的训练计划';

-- -----------------------------------------------------------
-- 10.2 计划负荷调整记录
-- 来源: miniapp PRD §3.10
-- -----------------------------------------------------------
CREATE TABLE `plan_load_adjustment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ai_plan_id` BIGINT UNSIGNED NOT NULL,
  `week_number` TINYINT UNSIGNED NOT NULL COMMENT '第几周',
  `adjustment_type` VARCHAR(32) NOT NULL COMMENT 'increase/maintain/decrease/deload',
  `adjustment_reason` TEXT NOT NULL COMMENT '调整原因(AI 生成)',
  `metrics_snapshot` JSON NOT NULL COMMENT '触发调整的数据快照(avg_rpe, completion_rate)',
  `load_change_pct` DECIMAL(5,2) DEFAULT NULL COMMENT '负荷变化百分比',
  `exercise_changes` JSON DEFAULT NULL COMMENT '动作替换/调整详情',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_plan_week` (`ai_plan_id`, `week_number`),
  CONSTRAINT `fk_pla_plan` FOREIGN KEY (`ai_plan_id`) REFERENCES `ai_plan`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='计划负荷调整记录';

-- -----------------------------------------------------------
-- 10.3 每周训练完成统计
-- 来源: miniapp PRD §3.10
-- -----------------------------------------------------------
CREATE TABLE `weekly_training_summary` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `ai_plan_id` BIGINT UNSIGNED DEFAULT NULL,
  `week_start_date` DATE NOT NULL COMMENT '周开始日期',
  `planned_workouts` TINYINT UNSIGNED NOT NULL COMMENT '计划训练天数',
  `completed_workouts` TINYINT UNSIGNED NOT NULL COMMENT '实际完成天数',
  `completion_rate` DECIMAL(5,2) NOT NULL COMMENT '完成率(%)',
  `avg_rpe` DECIMAL(3,1) DEFAULT NULL COMMENT '平均 RPE',
  `total_volume_kg` DECIMAL(12,2) DEFAULT NULL COMMENT '本周总训练量',
  `total_duration_min` INT UNSIGNED DEFAULT NULL COMMENT '本周总时长(分钟)',
  `exercise_stats` JSON DEFAULT NULL COMMENT '各动作完成详情',
  `adjustment_applied` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已应用调整',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_week` (`user_id`, `ai_plan_id`, `week_start_date`),
  CONSTRAINT `fk_wts_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每周训练完成统计';


-- ================================================================
-- 十一、AI 知识库与 RAG
-- ================================================================

-- -----------------------------------------------------------
-- 11.1 训练知识库
-- 来源: miniapp PRD §3.9 + admin PRD §4.4 扩展字段
-- 说明: 合并两份 PRD，向量化相关字段取自 admin PRD
-- -----------------------------------------------------------
CREATE TABLE `knowledge_base` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(32) NOT NULL COMMENT '分类: training/recovery/nutrition/injury/sleep',
  `title` VARCHAR(256) NOT NULL COMMENT '知识标题',
  `content` TEXT NOT NULL COMMENT '知识内容(Markdown)',
  `tags` JSON DEFAULT NULL COMMENT '标签数组',
  `source` VARCHAR(256) DEFAULT NULL COMMENT '来源(书籍/文献/专家)',
  `vector_id` VARCHAR(128) DEFAULT NULL COMMENT '向量数据库中的ID',
  -- admin PRD 扩展字段 (向量化状态追踪)
  `vector_status` VARCHAR(16) NOT NULL DEFAULT 'pending' COMMENT '向量化状态: pending/indexing/indexed/failed',
  `vector_model` VARCHAR(64) DEFAULT NULL COMMENT '使用的 Embedding 模型',
  `vector_indexed_at` DATETIME DEFAULT NULL COMMENT '向量化完成时间',
  `vector_error` TEXT DEFAULT NULL COMMENT '向量化失败原因',
  `deleted_at` DATETIME DEFAULT NULL COMMENT '软删除时间',
  `status` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  FULLTEXT KEY `ft_content` (`title`, `content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练知识库';

-- -----------------------------------------------------------
-- 11.2 向量索引映射表
-- 来源: miniapp PRD §3.9
-- -----------------------------------------------------------
CREATE TABLE `vector_index` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source_type` VARCHAR(32) NOT NULL COMMENT 'exercise/knowledge/plan',
  `source_id` BIGINT UNSIGNED NOT NULL COMMENT '来源表的ID',
  `vector_id` VARCHAR(128) NOT NULL COMMENT '向量数据库中的ID',
  `chunk_text` TEXT DEFAULT NULL COMMENT '向量化的文本片段',
  `embedding_model` VARCHAR(64) DEFAULT NULL COMMENT '使用的 embedding 模型',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_source` (`source_type`, `source_id`),
  KEY `idx_vector` (`vector_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='向量索引映射';


-- ================================================================
-- 十二、AI 安全与规则引擎 (管理后台)
-- ================================================================

-- -----------------------------------------------------------
-- 12.1 AI 安全规则配置
-- 来源: admin PRD §4.3
-- -----------------------------------------------------------
CREATE TABLE `ai_safety_rule` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `rule_type` VARCHAR(32) NOT NULL COMMENT 'blocked_topic/sensitive_word/required_disclaimer/forbidden_content',
  `match_mode` VARCHAR(16) NOT NULL DEFAULT 'keyword' COMMENT 'keyword(关键词)/regex(正则)',
  `pattern` TEXT NOT NULL COMMENT '规则模式: keyword=逗号分隔; regex=正则表达式',
  `action` VARCHAR(16) NOT NULL COMMENT 'block/warn/disclaimer/filter',
  `response_template` TEXT COMMENT '触发时的回复模板',
  `description` VARCHAR(256) DEFAULT NULL,
  `priority` INT NOT NULL DEFAULT 0 COMMENT '优先级(越小越优先)',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `regex_timeout_ms` INT UNSIGNED NOT NULL DEFAULT 50 COMMENT '正则超时(ms)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`rule_type`),
  KEY `idx_enabled_priority` (`is_enabled`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI安全规则配置';

-- -----------------------------------------------------------
-- 12.2 AI 安全事件日志
-- 来源: admin PRD §4.3
-- -----------------------------------------------------------
CREATE TABLE `ai_safety_event` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `rule_id` INT UNSIGNED NOT NULL COMMENT '触发的规则ID',
  `session_id` BIGINT UNSIGNED DEFAULT NULL,
  `user_id` BIGINT UNSIGNED DEFAULT NULL,
  `message_content` TEXT COMMENT '触发消息内容(截取前500字)',
  `action_taken` VARCHAR(16) NOT NULL,
  `response_sent` TEXT,
  `match_latency_ms` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rule` (`rule_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI安全事件日志';

-- -----------------------------------------------------------
-- 12.3 AI Prompt 模板
-- 来源: admin PRD §4.3
-- -----------------------------------------------------------
CREATE TABLE `ai_prompt_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(64) NOT NULL,
  `template_key` VARCHAR(64) NOT NULL COMMENT 'system_prompt/chat_prompt/plan_prompt',
  `content` TEXT NOT NULL,
  `variables` JSON DEFAULT NULL COMMENT '模板变量列表',
  `version` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `activated_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key_version` (`template_key`, `version`),
  UNIQUE KEY `uk_active` (`template_key`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI Prompt 模板';

-- -----------------------------------------------------------
-- 12.4 AI 每日使用统计
-- 来源: admin PRD §4.3
-- -----------------------------------------------------------
CREATE TABLE `ai_usage_daily` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stat_date` DATE NOT NULL,
  `total_chat_sessions` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_chat_messages` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_plan_generated` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_plan_confirmed` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_tokens_used` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `positive_feedback_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `negative_feedback_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `satisfaction_rate` DECIMAL(5,2) DEFAULT NULL,
  `avg_response_time_ms` INT UNSIGNED DEFAULT NULL,
  `rag_hit_rate` DECIMAL(5,2) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI每日使用统计';

-- -----------------------------------------------------------
-- 12.5 AI 微调规则配置
-- 来源: admin PRD §4.3
-- -----------------------------------------------------------
CREATE TABLE `ai_adjustment_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(64) NOT NULL,
  `config_value` VARCHAR(256) NOT NULL,
  `description` VARCHAR(256) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI微调规则配置';


-- ================================================================
-- 十三、系统配置与公告
-- ================================================================

-- -----------------------------------------------------------
-- 13.1 系统配置
-- 来源: miniapp PRD §3.8 + admin PRD + db-init.sql
-- -----------------------------------------------------------
CREATE TABLE `sys_config` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(128) NOT NULL COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `description` VARCHAR(256) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置';

-- -----------------------------------------------------------
-- 13.2 系统公告
-- 来源: admin PRD + db-init.sql
-- -----------------------------------------------------------
CREATE TABLE `announcement` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `content` TEXT NOT NULL COMMENT '内容',
  `type` VARCHAR(32) NOT NULL DEFAULT 'notice' COMMENT '类型: notice-通知, update-更新, event-活动',
  `target` VARCHAR(32) NOT NULL DEFAULT 'all' COMMENT '公告对象: all-全部, vip-会员, new-新用户',
  `start_time` DATETIME DEFAULT NULL COMMENT '生效开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '生效结束时间',
  `is_popup` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否弹窗: 1-是 0-否',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1-已发布 0-草稿',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序权重',
  `created_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统公告';


-- -----------------------------------------------------------
-- 训练提醒设置
-- 来源: miniapp PRD §3.6 训练提醒
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workout_reminder` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '提醒ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `reminder_time` VARCHAR(8) NOT NULL COMMENT '提醒时间，格式 HH:MM:SS',
  `reminder_days` VARCHAR(32) NOT NULL DEFAULT '1,2,3,4,5,6,7' COMMENT '提醒日期，1-7 代表周一到周日',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用 0-关闭 1-开启',
  `template_id` VARCHAR(64) DEFAULT NULL COMMENT '微信订阅消息模板ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user` (`user_id`),
  CONSTRAINT `fk_wr_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='训练提醒设置';

-- -----------------------------------------------------------
-- 个人最佳记录 (PR)
-- 来源: miniapp PRD §3.4 训练记录
-- -----------------------------------------------------------
CREATE TABLE `pr_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `exercise_id` BIGINT UNSIGNED NOT NULL COMMENT '动作ID',
  `weight_kg` DECIMAL(6,2) DEFAULT NULL COMMENT '最大重量(kg)',
  `reps` INT UNSIGNED DEFAULT NULL COMMENT '对应次数',
  `one_rm_kg` DECIMAL(6,2) DEFAULT NULL COMMENT '估算1RM(kg)',
  `achieved_at` DATE NOT NULL COMMENT '达成日期',
  `workout_log_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联训练记录',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_exercise` (`user_id`, `exercise_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_exercise` (`exercise_id`),
  CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pr_exercise` FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='个人最佳记录';

-- -----------------------------------------------------------
-- 动作收藏
-- 来源: miniapp PRD §3.3 动作库
-- -----------------------------------------------------------
CREATE TABLE `exercise_favorite` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `exercise_id` BIGINT UNSIGNED NOT NULL COMMENT '动作ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_exercise` (`user_id`, `exercise_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_ef_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ef_exercise` FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='动作收藏';

-- -----------------------------------------------------------
-- 身体数据里程碑
-- 来源: miniapp PRD §3.5 身体数据追踪
-- -----------------------------------------------------------
CREATE TABLE `body_milestone` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `metric_type` VARCHAR(32) NOT NULL COMMENT '指标类型: weight/body_fat/muscle/bmi',
  `milestone_value` DECIMAL(10,2) NOT NULL COMMENT '里程碑值',
  `direction` VARCHAR(16) NOT NULL DEFAULT 'reach' COMMENT 'reach-达到/cross_above-突破/cross_below-低于',
  `achieved_at` DATE NOT NULL COMMENT '达成日期',
  `body_metric_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联身体数据记录',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_type` (`user_id`, `metric_type`),
  CONSTRAINT `fk_bml_user` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='身体数据里程碑';


SET FOREIGN_KEY_CHECKS = 1;


-- ================================================================
-- 初始数据
-- ================================================================

-- 超级管理员角色
INSERT INTO `admin_role` (`name`, `code`, `description`, `permissions`) VALUES
('超级管理员', 'super_admin', '拥有所有权限', '["dashboard","user","content","workout","achievement","community","ai","system"]');

-- 测试管理员账号 (admin / 123456)
INSERT INTO `admin_user` (`username`, `password`, `nickname`, `email`, `role_id`, `status`, `deleted`) VALUES
('admin', 'e10adc3949ba59abbe56e057f20f883e', '系统管理员', 'admin@example.com', 1, 1, 0);

-- AI 微调规则预设
INSERT INTO `ai_adjustment_config` (`config_key`, `config_value`, `description`) VALUES
('load_increase_completion_threshold', '95', '增负荷完成率阈值(%)'),
('load_increase_rpe_max', '7', '增负荷RPE上限'),
('load_increase_pct_min', '2.5', '最小增负荷幅度(%)'),
('load_increase_pct_max', '5', '最大增负荷幅度(%)'),
('load_decrease_completion_threshold', '80', '降负荷完成率阈值(%)'),
('load_decrease_pct_min', '5', '最小降负荷幅度(%)'),
('load_decrease_pct_max', '10', '最大降负荷幅度(%)'),
('overfatigue_rpe_threshold', '10', '过度疲劳RPE阈值'),
('load_increase_streak_weeks', '2', '连续达标周数触发增负荷'),
('exercise_pr_streak_count', '3', '连续PR次数触发动作进阶');

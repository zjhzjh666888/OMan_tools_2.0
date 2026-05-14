-- 浪尖儿 AI 工具导航站 数据库初始化脚本
-- 使用前请先创建数据库：CREATE DATABASE langjianr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE langjianr;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '仅允许QQ邮箱',
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar VARCHAR(255) DEFAULT '' COMMENT '头像URL，注册后领取',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户星标记录表（保证每个用户对每个工具只能点一次）
CREATE TABLE IF NOT EXISTS user_stars (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  tool_id VARCHAR(100) NOT NULL COMMENT '对应 tools.json 中的 id',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_tool (user_id, tool_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 工具星标计数表（汇总，方便前端展示）
CREATE TABLE IF NOT EXISTS tool_stars_count (
  tool_id VARCHAR(100) NOT NULL PRIMARY KEY,
  stars_count INT UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 付费API权限表（站长手动开通）
CREATE TABLE IF NOT EXISTS paid_api_access (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间，NULL表示永久',
  status ENUM('active', 'revoked') DEFAULT 'active',
  note VARCHAR(255) DEFAULT '' COMMENT '站长备注',
  UNIQUE KEY uk_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

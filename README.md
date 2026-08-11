# OMan Tools 2.0

在线工具导航站，聚合实用工具，支持用户注册登录、工具收藏、付费 API 权限管理。

**线上地址**: [omaleai.qzz.io/otools](https://omaleai.qzz.io/otools)

## 功能

- 工具导航与分类展示
- QQ 邮箱注册 / 登录
- 工具星标收藏
- 预设头像选择与自定义上传
- 站长管理后台（开通/撤销付费 API 权限）
- 用户付费申请（邮件通知站长）

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express |
| 数据库 | MySQL 5.7+ |
| 鉴权 | JWT + bcryptjs |
| 邮件 | Resend |
| 反向代理 | Nginx |
| 部署 | Ubuntu 22.04 (腾讯云轻量) + systemd |

## 项目结构

```
├── index.html          # 首页（工具导航）
├── login.html          # 登录/注册页
├── admin.html          # 站长管理后台
├── tools.json          # 工具数据
├── assets/             # 前端静态资源
├── server/
│   ├── app.js          # Express 服务入口
│   ├── package.json
│   └── package-lock.json
└── uploads/            # 用户上传文件
    └── avatars/        # 用户头像
```

## 快速开始

### 环境要求

- Node.js 18+
- MySQL 5.7+
- Nginx

### 安装

```bash
git clone git@github.com:zjhzjh666888/OMan_tools_2.0.git
cd OMan_tools_2.0/server
npm install
```

### 配置环境变量

```bash
export PORT=3002
export JWT_SECRET=your-secret-key
export RESEND_KEY=your-resend-api-key
export ADMIN_EMAIL=your-email@qq.com
export ADMIN_KEY=your-admin-key
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASS=your-db-password
export DB_NAME=langjianr
```

### 启动

```bash
node server/app.js
```

服务默认监听 `127.0.0.1:3002`。

### Nginx 反向代理

```nginx
location /otools/ {
    proxy_pass http://127.0.0.1:3002/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### systemd 服务

```ini
[Unit]
Description=OMan Tools 2.0
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/oman_tools
EnvironmentFile=/home/ubuntu/oman_tools/.env
ExecStart=/usr/bin/node server/app.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## API 接口

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/register` | 注册 | 限流 |
| POST | `/api/login` | 登录 | 限流 |
| GET | `/api/me` | 获取当前用户 | JWT |
| GET | `/api/stars` | 全局星标计数 | 无 |
| GET | `/api/my-stars` | 我的星标 | JWT |
| POST | `/api/star` | 点星标 | JWT |
| DELETE | `/api/star` | 取消星标 | JWT |
| GET | `/api/avatars` | 预设头像列表 | 无 |
| POST | `/api/avatar` | 选择预设头像 | JWT |
| POST | `/api/avatar/upload` | 上传自定义头像 | JWT |
| POST | `/api/profile/nickname` | 修改昵称 | JWT |
| POST | `/api/send-email` | 反馈邮件 | 限流 |
| GET | `/api/paid-api/check` | 检查付费权限 | JWT |
| POST | `/api/paid-api/apply` | 申请开通 | JWT + 限流 |
| POST | `/api/paid-api/grant` | 站长开通 | Admin Key |
| POST | `/api/paid-api/revoke` | 站长撤销 | Admin Key |
| POST | `/api/admin/users` | 查看用户列表 | Admin Key |

## 安全措施

- 静态文件白名单，禁止暴露源码和配置文件
- Helmet 安全响应头
- CORS 来源白名单
- 登录/注册接口限流
- 邮件接口限流 + HTML 实体转义防注入
- JWT 鉴权保护敏感接口
- 敏感配置通过环境变量注入，不进入代码仓库

## License

MIT

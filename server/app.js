const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'langjianr_secret_key_change_in_production';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// MySQL 连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'langjianr',
  waitForConnections: true,
  connectionLimit: 10
});

// JWT 鉴权中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

// 预设头像列表（注册后可领取）
const AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Lily',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Coco',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nala',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oscar',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Pepper',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ruby',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow'
];

// ==================== API 路由 ====================

// 注册
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password || !nickname) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    // 仅允许 QQ 邮箱
    if (!/@qq\.com$/i.test(email)) {
      return res.status(400).json({ error: '仅支持QQ邮箱注册' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    if (nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({ error: '昵称长度需2-20字符' });
    }

    // 检查邮箱是否已注册
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: '该邮箱已注册' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)',
      [email, passwordHash, nickname]
    );

    const token = jwt.sign({ id: result.insertId, email, nickname }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: '注册成功',
      token,
      user: { id: result.insertId, email, nickname, avatar: '' },
      avatars: AVATARS
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: { id: user.id, email: user.email, nickname: user.nickname, avatar: user.avatar }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户信息
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, email, nickname, avatar FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: '用户不存在' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 领取头像
app.post('/api/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: '请选择头像' });

    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
    res.json({ message: '头像领取成功', avatar });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取可选头像列表
app.get('/api/avatars', (req, res) => {
  res.json({ avatars: AVATARS });
});

// 点星标（登录后每个工具只能点一次）
app.post('/api/star', authMiddleware, async (req, res) => {
  try {
    const { tool_id } = req.body;
    if (!tool_id) return res.status(400).json({ error: '缺少工具ID' });

    // 检查是否已点过
    const [existing] = await pool.query(
      'SELECT id FROM user_stars WHERE user_id = ? AND tool_id = ?',
      [req.user.id, tool_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: '您已经点过星标了', starred: true });
    }

    // 插入记录
    await pool.query(
      'INSERT INTO user_stars (user_id, tool_id) VALUES (?, ?)',
      [req.user.id, tool_id]
    );

    // 更新计数表
    await pool.query(
      'INSERT INTO tool_stars_count (tool_id, stars_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE stars_count = stars_count + 1',
      [tool_id]
    );

    // 返回最新计数
    const [countRow] = await pool.query(
      'SELECT stars_count FROM tool_stars_count WHERE tool_id = ?',
      [tool_id]
    );
    const count = countRow[0]?.stars_count || 1;

    res.json({ message: '点赞成功', stars_count: count });
  } catch (err) {
    console.error('点星标失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 取消星标
app.delete('/api/star', authMiddleware, async (req, res) => {
  try {
    const { tool_id } = req.body;
    if (!tool_id) return res.status(400).json({ error: '缺少工具ID' });

    const [result] = await pool.query(
      'DELETE FROM user_stars WHERE user_id = ? AND tool_id = ?',
      [req.user.id, tool_id]
    );

    if (result.affectedRows > 0) {
      await pool.query(
        'UPDATE tool_stars_count SET stars_count = GREATEST(stars_count - 1, 0) WHERE tool_id = ?',
        [tool_id]
      );
    }

    const [countRow] = await pool.query(
      'SELECT stars_count FROM tool_stars_count WHERE tool_id = ?',
      [tool_id]
    );
    const count = countRow[0]?.stars_count || 0;

    res.json({ message: '已取消', stars_count: count });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取所有工具的星标计数
app.get('/api/stars', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT tool_id, stars_count FROM tool_stars_count');
    const map = {};
    rows.forEach(r => { map[r.tool_id] = r.stars_count; });
    res.json({ stars: map });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户已点赞的工具列表
app.get('/api/my-stars', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT tool_id FROM user_stars WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ starred: rows.map(r => r.tool_id) });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 启动
app.listen(PORT, () => {
  console.log(`OTOOLS API 服务已启动: http://localhost:${PORT}`);
});

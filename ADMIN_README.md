# PonyMind 管理端使用说明

## 前置要求

在使用管理端之前，请确保以下服务已正确配置：

### MongoDB 数据库

系统需要 MongoDB 数据库支持。您可以选择以下任一方式：

#### 选项1：本地 MongoDB
1. 下载并安装 [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. 启动 MongoDB 服务
3. 默认连接地址：`mongodb://127.0.0.1:27017/ponymind`

#### 选项2：MongoDB Atlas（云服务）
1. 注册 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 账户
2. 创建免费集群
3. 获取连接字符串并设置环境变量：
   ```bash
   # 在 .env.local 文件中设置
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ponymind
   ```

#### 选项3：Docker MongoDB
```bash
# 使用 Docker 快速启动 MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:latest
```

### 环境变量配置

创建 `.env.local` 文件（如果不存在）：

```bash
# MongoDB 连接字符串
MONGODB_URI=mongodb://127.0.0.1:27017/ponymind

# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# 应用环境
NODE_ENV=development
```

## 功能概述

PonyMind 管理端提供了完整的后台管理功能，包括：

### 🏠 仪表板
- 系统概览统计
- 用户和内容数据汇总
- 最近活动展示
- 热门标签统计
- 数据图表展示

### 👥 用户管理
- 用户列表查看和搜索
- 用户角色管理（用户/版主/管理员）
- 用户状态管理（活跃/非活跃/已封禁）
- 用户数据统计
- 批量操作功能

### 📝 内容管理
- 文章和问题列表管理
- 内容状态控制
- 内容搜索和筛选
- 内容统计分析
- 内容删除功能

### ⚙️ 系统设置
- 基本站点配置
- 用户注册设置
- 内容发布限制
- 通知系统配置
- 安全和审核设置
- 维护模式控制

## 快速开始

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 创建管理员账户

确保 MongoDB 正在运行，然后执行：

```bash
npm run create-admin
```

这将创建一个默认的管理员账户：
- 邮箱：`admin@ponymind.com`
- 密码：`admin123`

**⚠️ 重要：首次登录后请立即修改默认密码！**

### 3. 访问管理后台

1. 使用管理员账户登录系统
2. 登录后，点击右上角用户菜单中的"管理后台"
3. 或直接访问：`http://localhost:3000/admin`

### 4. 权限说明

系统支持三种用户角色：

- **用户 (user)**：普通用户，可以发布内容和评论
- **版主 (moderator)**：可以管理内容，访问部分管理功能
- **管理员 (admin)**：拥有全部管理权限

## 故障排除

### 常见问题

#### 1. MongoDB 连接失败
```
❌ 操作失败: Command find requires authentication
```

**解决方案：**
- 确保 MongoDB 服务正在运行
- 检查连接字符串是否正确
- 如果使用 MongoDB Atlas，确认用户名密码正确
- 如果是本地 MongoDB，确认是否启用了认证

#### 2. 无法创建管理员账户
```
❌ 操作失败: connect ECONNREFUSED 127.0.0.1:27017
```

**解决方案：**
- 启动 MongoDB 服务
- 检查端口 27017 是否被占用
- 尝试使用 Docker 启动 MongoDB

#### 3. 权限验证失败

**解决方案：**
- 清除浏览器缓存
- 重新登录
- 检查用户角色是否为 admin 或 moderator

## 主要功能详解

### 用户管理

#### 查看用户列表
- 支持按用户名、邮箱搜索
- 按角色和状态筛选
- 分页浏览用户数据

#### 用户角色管理
- 直接在列表中修改用户角色
- 实时更新用户权限

#### 用户状态控制
- **活跃**：正常使用所有功能
- **非活跃**：暂时限制部分功能
- **已封禁**：禁止登录和使用

### 内容管理

#### 内容类型
- **文章**：技术分享、教程等
- **问题**：技术问答、求助等

#### 状态管理
- **待解决**：新发布的问题
- **已回答**：有回答的问题
- **已关闭**：不再接受新回答

#### 内容操作
- 查看内容详情
- 修改内容状态
- 删除违规内容

### 系统设置

#### 基本设置
- 站点名称和描述
- 用户注册开关
- 邮箱验证要求

#### 内容限制
- 每日发布数量限制
- 标签数量限制
- 自动关闭问题设置

#### 安全设置
- 内容审核模式
- 垃圾信息过滤
- 维护模式控制

## 安全建议

1. **定期更改管理员密码**
2. **限制管理员账户数量**
3. **开启内容审核功能**
4. **定期备份数据库**
5. **监控系统日志**

## API 接口

管理端提供以下 API 接口：

### 用户管理
- `GET /api/admin/users` - 获取用户列表
- `PUT /api/admin/users` - 更新用户信息
- `DELETE /api/admin/users` - 删除用户

### 内容管理
- `GET /api/admin/posts` - 获取内容列表
- `PUT /api/admin/posts` - 更新内容状态
- `DELETE /api/admin/posts` - 删除内容

### 仪表板
- `GET /api/admin/dashboard` - 获取仪表板数据

## 技术架构

- **前端框架**：Next.js 14 + React 18
- **UI 组件**：Tailwind CSS
- **状态管理**：React Hooks
- **身份验证**：NextAuth.js
- **数据库**：MongoDB + Mongoose
- **API 设计**：RESTful API

## 更新日志

### v1.0.0
- ✅ 基础管理功能
- ✅ 用户和内容管理
- ✅ 系统设置面板
- ✅ 权限控制系统
- ✅ 仪表板数据展示

---

如有问题或建议，请联系系统管理员。 
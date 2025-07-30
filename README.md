# PonyMind - 智能问答社区

一个基于 Next.js 构建的现代化问答社区平台，集成了 AI 功能、图片管理和用户交互系统。

## ✨ 主要功能

- 🤖 AI 智能问答
- 📝 Markdown 编辑器支持
- 🖼️ 图片上传和管理 (MinIO 存储)
- 👥 用户认证和权限管理
- 💬 评论和回复系统
- 🏷️ 标签分类
- 📊 数据统计和分析
- ⚙️ 管理员后台

## 🚀 快速开始

### 环境要求

- Node.js 18+
- MongoDB
- MinIO (可选，用于图片存储)

### 1. 克隆项目

```bash
git clone <repository-url>
cd ponymind
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ponymind

# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# GitHub OAuth (可选)
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret

# MinIO 配置 (可选)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=ponymind-images
MINIO_PUBLIC_URL=http://localhost:9000
```

### 4. 启动 MinIO (可选)

使用 Docker Compose：

```bash
docker-compose -f docker-compose.minio.yml up -d
```

或使用 Docker：

```bash
docker run -p 9000:9000 -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v minio_data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```

### 5. 初始化 MinIO

```bash
npm run init-minio
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
ponymind/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React 组件
│   ├── lib/                 # 工具库和配置
│   ├── models/              # MongoDB 模型
│   └── types/               # TypeScript 类型定义
├── scripts/                 # 脚本文件
├── public/                  # 静态资源
└── docker-compose.minio.yml # MinIO Docker 配置
```

## 🛠️ 可用脚本

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查

# 管理
npm run create-admin # 创建管理员账户
npm run init-minio   # 初始化 MinIO 存储
npm run migrate-images # 迁移图片到 MinIO
```

## 🖼️ 图片存储

项目支持两种图片存储方式：

1. **本地存储** (默认) - 文件存储在 `public/uploads` 目录
2. **MinIO 存储** (推荐) - 使用 MinIO 对象存储服务

### 迁移到 MinIO

如果您想从本地存储迁移到 MinIO：

```bash
# 1. 启动 MinIO
docker-compose -f docker-compose.minio.yml up -d

# 2. 初始化 MinIO
npm run init-minio

# 3. 迁移现有图片
npm run migrate-images
```

详细配置请参考 [MinIO 设置指南](MINIO_SETUP.md)。

## 🔧 技术栈

- **前端**: Next.js 15, React 18, TypeScript
- **样式**: Tailwind CSS
- **数据库**: MongoDB
- **认证**: NextAuth.js
- **图片存储**: MinIO
- **编辑器**: React MD Editor
- **UI 组件**: Radix UI

## 📚 文档

- [MinIO 设置指南](MINIO_SETUP.md) - 详细的 MinIO 配置说明
- [管理员指南](ADMIN_README.md) - 管理员功能使用说明

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

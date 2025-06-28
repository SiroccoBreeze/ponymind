import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';

interface PostData {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  views: number;
  likes: number;
  answers: number;
  type: string;
  status: string;
  difficulty: string;
  createdAt: Date;
  author: {
    name: string;
    avatar?: string;
  };
}

export async function GET() {
  try {
    await connectDB();

    // 获取所有问题类型的帖子，按浏览量和点赞数排序
    const posts = await Post.find({
      type: 'question' // 只获取问题类型的帖子
    })
    .populate('author', 'name email avatar')
    .sort({ views: -1, likes: -1, createdAt: -1 })
    .limit(100) // 限制数量，避免数据过多
    .lean();

    // 按标签分类整理FAQ
    const categoryMap = new Map<string, PostData[]>();
    
    posts.forEach((post: any) => {
      // 处理标签分类
      if (post.tags && post.tags.length > 0) {
        post.tags.forEach((tag: string) => {
          const categoryName = tag;
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, []);
          }
          
          // 避免重复添加同一个帖子到同一分类
          const categoryPosts = categoryMap.get(categoryName)!;
          const exists = categoryPosts.some(p => p._id.toString() === post._id.toString());
          if (!exists) {
            categoryPosts.push({
              _id: post._id.toString(),
              title: post.title,
              content: post.content,
              tags: post.tags,
              views: post.views || 0,
              likes: post.likes || 0,
              answers: post.answers || 0,
              type: post.type || 'question',
              status: post.status || 'open',
              difficulty: post.difficulty || 'intermediate',
              createdAt: post.createdAt,
              author: {
                name: post.author?.name || '匿名用户',
                avatar: post.author?.avatar
              }
            });
          }
        });
      } else {
        // 没有标签的帖子归类到"其他"
        if (!categoryMap.has('其他')) {
          categoryMap.set('其他', []);
        }
        categoryMap.get('其他')!.push({
          _id: post._id.toString(),
          title: post.title,
          content: post.content,
          tags: [],
          views: post.views || 0,
          likes: post.likes || 0,
          answers: post.answers || 0,
          type: post.type || 'question',
          status: post.status || 'open',
          difficulty: post.difficulty || 'intermediate',
          createdAt: post.createdAt,
          author: {
            name: post.author?.name || '匿名用户',
            avatar: post.author?.avatar
          }
        });
      }
    });

    // 转换为数组格式并按帖子数量排序
    const categories = Array.from(categoryMap.entries())
      .map(([name, items]) => ({
        name,
        count: items.length,
        items: items.slice(0, 20) // 每个分类最多显示20个问题
      }))
      .sort((a, b) => b.count - a.count); // 按帖子数量降序排列

    // 添加一些预设的热门分类（如果数据库中没有对应内容）
    const popularCategories = [
      '技术问题', '使用教程', '功能建议', '错误报告', '新手指南'
    ];

    popularCategories.forEach(categoryName => {
      if (!categoryMap.has(categoryName)) {
        categories.push({
          name: categoryName,
          count: 0,
          items: []
        });
      }
    });

    return NextResponse.json({
      success: true,
      categories,
      total: posts.length,
      message: 'FAQ数据获取成功'
    });

  } catch (error) {
    console.error('获取FAQ数据失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取FAQ数据失败',
        categories: [],
        total: 0
      },
      { status: 500 }
    );
  }
} 
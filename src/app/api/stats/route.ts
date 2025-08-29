import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Comment from '@/models/Comment';

export async function GET() {
  try {
    await connectDB();
    
    // 获取今天的开始时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 获取本周的开始时间
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // 并行获取各种统计数据
    const [
      // 今日热点 - 按浏览量和点赞数排序
      hotPosts,
      // 热门标签 - 按使用频率排序
      popularTags,
      // 社区统计
      todayPosts,
      todayComments,
      unansweredQuestions,
      // 本周活跃用户
      activeUsers
    ] = await Promise.all([
      // 今日热点
      Post.find({
        reviewStatus: 'published'
      })
      .populate('author', 'name email avatar')
      .sort({ views: -1, likes: -1, createdAt: -1 })
      .limit(5)
      .select('_id title type views likes answers createdAt'),
      
      // 热门标签统计（仅文章）
      Post.aggregate([
        { $match: { reviewStatus: 'published' } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // 今日新帖子数
      Post.countDocuments({
        createdAt: { $gte: today },
        reviewStatus: 'published'
      }),
      
      // 今日新评论数
      Comment.countDocuments({
        createdAt: { $gte: today }
      }),
      
      // 待解决问题数（包括：1.完全没有回答的问题 2.有回答但未标记最佳答案的问题）
      Post.countDocuments({
        type: 'question',
        $or: [
          { status: 'open' }, // 完全没有回答
          { 
            status: 'answered', 
            acceptedAnswer: { $exists: false } 
          } // 有回答但未标记最佳答案
        ],
        reviewStatus: 'published'
      }),
      

      
      // 本周活跃用户（按本周发帖和评论数排序）
      User.aggregate([
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'author',
            as: 'weekPosts',
            pipeline: [
              { $match: { createdAt: { $gte: weekStart }, reviewStatus: 'published' } }
            ]
          }
        },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'author',
            as: 'weekComments',
            pipeline: [
              { $match: { createdAt: { $gte: weekStart } } }
            ]
          }
        },
        {
          $addFields: {
            weekActivity: { $add: [{ $size: '$weekPosts' }, { $size: '$weekComments' }] }
          }
        },
        { $match: { weekActivity: { $gt: 0 } } },
        { $sort: { weekActivity: -1 } },
        { $limit: 5 },
        {
          $project: {
            name: 1,
            email: 1,
            reputation: { $ifNull: ['$reputation', 0] },
            weekActivity: 1
          }
        }
      ])
    ]);
    
    // 格式化数据
    const formattedHotPosts = hotPosts.map(post => ({
      _id: post._id.toString(),  // 将 ObjectId 转换为字符串
      title: post.title,
      type: post.type,
      views: post.views,
      answers: post.answers,
      likes: post.likes,
      createdAt: post.createdAt
    }));
    
    const formattedTags = popularTags.map(tag => ({
      name: tag._id,
      count: tag.count
    }));
    
    const formattedActiveUsers = (activeUsers || []).map((user: { name: string; reputation: number; weekActivity: number }, index: number) => ({
      name: user.name,
      reputation: user.reputation,
      weekActivity: user.weekActivity,
      badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'
    }));
    
    return NextResponse.json({
      hotPosts: formattedHotPosts,
      popularTags: formattedTags,
      stats: {
        todayPosts,
        todayComments,
        unansweredQuestions
      },
      activeUsers: formattedActiveUsers
    });
    
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    );
  }
} 
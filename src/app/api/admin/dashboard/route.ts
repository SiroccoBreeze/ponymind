import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Message from '@/models/Message';
import Comment from '@/models/Comment';
import Event from '@/models/Event';

// 检查管理员权限
async function checkAdminPermission() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { error: '请先登录', status: 401 };
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return { error: '权限不足', status: 403 };
  }

  return { user, status: 200 };
}

// 获取仪表板数据
export async function GET() {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    // 获取基础统计数据
    const [userStats, postStats] = await Promise.all([
      // 用户统计
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            adminUsers: {
              $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
            },
            newUsersThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      // 文章统计
      Post.aggregate([
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            publishedPosts: {
              $sum: { $cond: [{ $eq: ['$reviewStatus', 'published'] }, 1, 0] }
            },
            articles: {
              $sum: { $cond: [{ $eq: ['$type', 'article'] }, 1, 0] }
            },
            publishedArticles: {
              $sum: { $cond: [{ $and: [{ $eq: ['$type', 'article'] }, { $eq: ['$reviewStatus', 'published'] }] }, 1, 0] }
            },
            questions: {
              $sum: { $cond: [{ $eq: ['$type', 'question'] }, 1, 0] }
            },
            publishedQuestions: {
              $sum: { $cond: [{ $and: [{ $eq: ['$type', 'question'] }, { $eq: ['$reviewStatus', 'published'] }] }, 1, 0] }
            },
            openQuestions: {
              $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
            },
            draftPosts: {
              $sum: { $cond: [{ $eq: ['$reviewStatus', 'draft'] }, 1, 0] }
            },
            pendingPosts: {
              $sum: { $cond: [{ $eq: ['$reviewStatus', 'pending'] }, 1, 0] }
            },
            rejectedPosts: {
              $sum: { $cond: [{ $eq: ['$reviewStatus', 'rejected'] }, 1, 0] }
            },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' },
            newPostsThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            publishedThisMonth: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$reviewStatus', 'published'] },
                      {
                        $gte: [
                          '$createdAt',
                          new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // 获取最近活动数据
    const [recentPosts, recentUsers, popularPosts] = await Promise.all([
      // 最近发布的文章
      Post.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('author', 'name email avatar')
        .select('title type status createdAt author views likes'),
      
      // 最近注册的用户
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email avatar role status createdAt'),
      
      // 热门文章
      Post.find()
        .sort({ views: -1, likes: -1 })
        .limit(10)
        .populate('author', 'name email avatar')
        .select('title type views likes createdAt author')
    ]);

    // 获取每日统计数据（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [dailyUserStats, dailyPostStats] = await Promise.all([
      // 每日新用户统计
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // 每日新文章统计
      Post.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // 获取标签统计（文章和事件）
    const [postTagStats, eventTagStats] = await Promise.all([
      Post.aggregate([
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        }
      ]),
      Event.aggregate([
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // 合并文章和事件的标签计数
    const tagCounts: Record<string, number> = {};
    
    // 统计文章标签
    postTagStats.forEach(tag => {
      tagCounts[tag._id] = (tagCounts[tag._id] || 0) + tag.count;
    });
    
    // 统计事件标签
    eventTagStats.forEach(tag => {
      tagCounts[tag._id] = (tagCounts[tag._id] || 0) + tag.count;
    });
    
    // 转换为数组并排序
    const tagStats = Object.entries(tagCounts)
      .map(([name, count]) => ({ _id: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // 获取消息统计
    const messageStats = await Message.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          unreadMessages: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          rejectionMessages: {
            $sum: { $cond: [{ $eq: ['$type', 'rejection'] }, 1, 0] }
          },
          successMessages: {
            $sum: { $cond: [{ $eq: ['$type', 'success'] }, 1, 0] }
          },
          warningMessages: {
            $sum: { $cond: [{ $eq: ['$type', 'warning'] }, 1, 0] }
          },
          messagesThisMonth: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$createdAt',
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 获取待审核内容统计
    const pendingStats = await Promise.all([
      Post.countDocuments({ reviewStatus: 'pending' }),
      Comment.countDocuments({ reviewStatus: 'pending' })
    ]);

    return NextResponse.json({
      overview: {
        users: userStats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          adminUsers: 0,
          newUsersThisMonth: 0
        },
        posts: postStats[0] || {
          totalPosts: 0,
          publishedPosts: 0,
          articles: 0,
          publishedArticles: 0,
          questions: 0,
          publishedQuestions: 0,
          openQuestions: 0,
          draftPosts: 0,
          pendingPosts: 0,
          rejectedPosts: 0,
          totalViews: 0,
          totalLikes: 0,
          newPostsThisMonth: 0,
          publishedThisMonth: 0
        },
        messages: messageStats[0] || {
          totalMessages: 0,
          unreadMessages: 0,
          rejectionMessages: 0,
          successMessages: 0,
          warningMessages: 0,
          messagesThisMonth: 0
        },
        pending: {
          pendingPosts: pendingStats[0] || 0,
          pendingComments: pendingStats[1] || 0
        }
      },
      recentActivity: {
        recentPosts,
        recentUsers,
        popularPosts
      },
      charts: {
        dailyUsers: dailyUserStats,
        dailyPosts: dailyPostStats,
        topTags: tagStats
      }
    });
  } catch (error) {
    console.error('获取仪表板数据失败:', error);
    return NextResponse.json(
      { error: '获取仪表板数据失败' },
      { status: 500 }
    );
  }
} 
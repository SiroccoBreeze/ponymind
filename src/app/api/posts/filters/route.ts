import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

interface TagAggregateResult {
  _id: string;
  count: number;
}

interface AuthorAggregateResult {
  _id: string;
  count: number;
}

// 获取筛选选项（标签和作者）
export async function GET() {
  try {
    await connectDB();

    // 获取所有不重复的标签（仅文章）
    const postTagsResult = await Post.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } }
    ]) as TagAggregateResult[];
    
    // 统计文章标签
    const tagCounts: Record<string, number> = {};
    postTagsResult.forEach(item => {
      tagCounts[item._id] = item.count;
    });
    
    // 转换为数组并排序
    const tagsResult = Object.entries(tagCounts)
      .map(([name, count]) => ({ _id: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
    
    const tags = tagsResult.map(item => item._id);

    // 获取活跃作者（有发布内容的用户）
    const authorsResult = await Post.aggregate([
      { $group: { _id: '$author', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]) as AuthorAggregateResult[];
    
    const authorIds = authorsResult.map(item => item._id);
    
    const authors = await User.find(
      { _id: { $in: authorIds } },
      { name: 1, email: 1 }
    );

    const authorsWithCount = authors.map(author => {
      const authorData = authorsResult.find(item => item._id.toString() === author._id.toString());
      return {
        id: author._id.toString(),
        name: author.name,
        email: author.email,
        postCount: authorData ? authorData.count : 0
      };
    }).sort((a, b) => b.postCount - a.postCount);

    return NextResponse.json({
      tags,
      tagCounts,
      authors: authorsWithCount
    });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    return NextResponse.json(
      { error: '获取筛选选项失败' },
      { status: 500 }
    );
  }
} 
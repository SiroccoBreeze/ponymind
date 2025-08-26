import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Tag from '@/models/Tag';
import Post from '@/models/Post';
import User from '@/models/User';

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

// 获取标签列表
export async function GET(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // 构建查询条件
    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 获取标签列表
    const skip = (page - 1) * limit;
    const [tags, total] = await Promise.all([
      Tag.find(query)
        .populate('createdBy', 'name email')
        .sort({ postCount: -1, eventCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tag.countDocuments(query)
    ]);

    // 更新标签的文章数量和事件数量（分别从Post和Event集合中统计）
    for (const tag of tags) {
      const [postCount, eventCount] = await Promise.all([
        Post.countDocuments({ 
          tags: tag.name,
          status: { $ne: 'deleted' }
        }),
        Event.countDocuments({ 
          tags: tag.name
        })
      ]);
      
      // 如果数量不一致，更新标签的计数
      if (tag.postCount !== postCount || tag.eventCount !== eventCount) {
        await Tag.findByIdAndUpdate(tag._id, { postCount, eventCount });
        tag.postCount = postCount;
        tag.eventCount = eventCount;
      }
    }

    // 统计信息
    const [totalTags, activeTags, unusedTags] = await Promise.all([
      Tag.countDocuments({ isActive: true }),
      Tag.countDocuments({ 
        isActive: true, 
        $or: [
          { postCount: { $gt: 0 } },
          { eventCount: { $gt: 0 } }
        ]
      }),
      Tag.countDocuments({ 
        isActive: true, 
        postCount: 0,
        eventCount: 0
      })
    ]);

    return NextResponse.json({
      tags: tags.map(tag => ({
        _id: tag._id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        postCount: tag.postCount,
        eventCount: tag.eventCount,
        isActive: tag.isActive,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
        createdBy: tag.createdBy
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalTags,
        activeTags,
        unusedTags
      }
    });
  } catch (error) {
    console.error('获取标签列表失败:', error);
    return NextResponse.json({ error: '获取标签列表失败' }, { status: 500 });
  }
}

// 创建标签
export async function POST(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { name, description, color } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '标签名称不能为空' }, { status: 400 });
    }

    const tagName = name.trim();

    // 检查标签名称是否已存在（包括已删除的标签）
    const existingTag = await Tag.findOne({ 
      name: { $regex: new RegExp(`^${tagName}$`, 'i') }
    });
    
    if (existingTag) {
      if (existingTag.isActive) {
        return NextResponse.json({ error: '标签名称已存在' }, { status: 400 });
      } else {
        // 如果标签已存在但被删除，询问是否要重新启用
        return NextResponse.json({ 
          error: '标签已存在但已被删除',
          existingTagId: existingTag._id,
          existingTag: {
            _id: existingTag._id,
            name: existingTag.name,
            description: existingTag.description,
            color: existingTag.color
          }
        }, { status: 409 }); // 409 Conflict
      }
    }

    // 验证颜色格式
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (color && !colorRegex.test(color)) {
      return NextResponse.json({ error: '颜色格式不正确' }, { status: 400 });
    }

    // 创建新标签
    const newTag = new Tag({
      name: tagName,
      description: description || '',
      color: color || '#3b82f6',
      createdBy: permissionCheck.user._id
    });

    await newTag.save();

    // 返回创建的标签（包含用户信息）
    const createdTag = await Tag.findById(newTag._id).populate('createdBy', 'name email');

    return NextResponse.json({
      message: '标签创建成功',
      tag: {
        _id: createdTag._id,
        name: createdTag.name,
        description: createdTag.description,
        color: createdTag.color,
        postCount: createdTag.postCount,
        createdAt: createdTag.createdAt,
        updatedAt: createdTag.updatedAt,
        createdBy: createdTag.createdBy
      }
    });
  } catch (error: any) {
    console.error('创建标签失败:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: '标签名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '创建标签失败' }, { status: 500 });
  }
}

// 更新标签
export async function PUT(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { tagId, name, description, color } = await request.json();

    if (!tagId || !name || !name.trim()) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const tagName = name.trim();

    // 查找要更新的标签
    const tag = await Tag.findById(tagId);
    if (!tag || !tag.isActive) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }

    // 如果名称发生变化，检查新名称是否已存在
    if (tag.name !== tagName) {
      const existingTag = await Tag.findOne({ 
        name: { $regex: new RegExp(`^${tagName}$`, 'i') },
        _id: { $ne: tagId },
        isActive: true 
      });
      
      if (existingTag) {
        return NextResponse.json({ error: '标签名称已存在' }, { status: 400 });
      }

      // 更新所有使用该标签的文章
      await Post.updateMany(
        { tags: tag.name },
        { $set: { 'tags.$': tagName } }
      );
    }

    // 验证颜色格式
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (color && !colorRegex.test(color)) {
      return NextResponse.json({ error: '颜色格式不正确' }, { status: 400 });
    }

    // 更新标签
    const updatedTag = await Tag.findByIdAndUpdate(
      tagId,
      {
        name: tagName,
        description: description || '',
        color: color || '#3b82f6'
      },
      { new: true }
    ).populate('createdBy', 'name email');

    return NextResponse.json({
      message: '标签更新成功',
      tag: {
        _id: updatedTag._id,
        name: updatedTag.name,
        description: updatedTag.description,
        color: updatedTag.color,
        postCount: updatedTag.postCount,
        createdAt: updatedTag.createdAt,
        updatedAt: updatedTag.updatedAt,
        createdBy: updatedTag.createdBy
      }
    });
  } catch (error: any) {
    console.error('更新标签失败:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: '标签名称已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '更新标签失败' }, { status: 500 });
  }
}

// 删除标签
export async function DELETE(request: Request) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');
    const action = searchParams.get('action'); // 'delete' 或 'restore'

    if (!tagId) {
      return NextResponse.json({ error: '标签ID不能为空' }, { status: 400 });
    }

    // 查找标签
    const tag = await Tag.findById(tagId);
    if (!tag) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }

    if (action === 'restore') {
      // 重新启用标签
      await Tag.findByIdAndUpdate(tagId, { isActive: true });
      return NextResponse.json({ message: '标签重新启用成功' });
    } else {
      // 删除标签
      if (!tag.isActive) {
        return NextResponse.json({ error: '标签已被删除' }, { status: 400 });
      }

      // 检查标签是否被使用
      const postsWithTag = await Post.countDocuments({ 
        tags: tag.name,
        status: { $ne: 'deleted' }
      });
      
      if (postsWithTag > 0) {
        return NextResponse.json({ 
          error: `该标签正在被 ${postsWithTag} 篇内容使用，无法删除。请先移除相关内容中的标签引用。` 
        }, { status: 400 });
      }

      // 软删除标签（设置为非活跃状态）
      await Tag.findByIdAndUpdate(tagId, { isActive: false });

      return NextResponse.json({ message: '标签删除成功' });
    }
  } catch (error) {
    console.error('标签操作失败:', error);
    return NextResponse.json({ error: '标签操作失败' }, { status: 500 });
  }
} 
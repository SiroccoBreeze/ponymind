import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectDB from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Image from '@/models/Image';
import { deleteFromMinio } from '@/lib/minio';
import { extractImagesFromContent } from '@/lib/cascade-delete';
import { moveImageToPost } from '@/lib/minio';
import { updateImageLinksInContent } from '@/lib/image-utils';

// 获取文章列表
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // 获取查询参数
    const type = searchParams.get('type'); // 'article' | 'question'
    const status = searchParams.get('status'); // 'open' | 'answered' | 'closed'
    const sort = searchParams.get('sort') || 'newest'; // 'newest' | 'active' | 'votes' | 'views' | 'bounty'
    const trending = searchParams.get('trending') === 'true';
    const answers = searchParams.get('answers');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const author = searchParams.get('author');

    // 构建查询条件
    const query: Record<string, any> = {
      reviewStatus: 'published' // 默认只显示已发布的内容
    };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (answers !== null) {
      query.answers = parseInt(answers || '0');
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tag) {
      query.tags = { $in: [tag] };
    }
    
    if (author) {
      const authorUser = await User.findById(author);
      if (authorUser) {
        query.author = author;
      }
    }

    // 构建排序条件
    let sortCondition: any = {};
    
    switch (sort) {
      case 'newest':
        sortCondition = { createdAt: -1 };
        break;
      case 'active':
        sortCondition = { updatedAt: -1 };
        break;
      case 'votes':
        sortCondition = { likes: -1, createdAt: -1 };
        break;
      case 'views':
        sortCondition = { views: -1, createdAt: -1 };
        break;
      case 'bounty':
        sortCondition = { bounty: -1, createdAt: -1 };
        break;
      default:
        sortCondition = { createdAt: -1 };
    }
    
    // 热门内容的特殊处理
    if (trending) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      query.createdAt = { $gte: oneWeekAgo };
      sortCondition = { views: -1, likes: -1, createdAt: -1 };
    }

    const posts = await Post.find(query)
      .populate('author', 'name email avatar')
      .sort(sortCondition)
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取文章列表失败:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

// 创建新文章
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    const { 
      title, 
      content, 
      summary,
      tags, 
      type, 
      difficulty, 
      bounty, 
      questionDetails, 
      status = 'draft',
      imageIds = [] // 保留但不使用，改为从内容中提取
    } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 创建文章/问题
    const postData: Record<string, any> = {
      title,
      content,
      summary: summary || content.substring(0, 200) + '...',
      tags: tags || [],
      type,
      difficulty: type === 'question' ? difficulty : 'intermediate',
      status: type === 'question' ? 'open' : 'answered',
      reviewStatus: status, // 审核状态：draft, pending, published, rejected
      bounty: type === 'question' ? bounty : 0,
      author: user._id,
    };

    // 如果是问题类型，添加问题详情
    if (type === 'question' && questionDetails) {
      postData.questionDetails = questionDetails;
    }

    const post = new Post(postData);
    await post.save();

    // 处理图片移动：从文章内容中提取实际使用的图片
    try {
      // 从文章内容中提取图片URL
      const imageUrls = extractImagesFromContent(content);
      console.log(`从文章内容中提取到 ${imageUrls.length} 张图片链接`);
      
      if (imageUrls.length > 0) {
        // 查找这些图片对应的数据库记录
        const usedImages = await Image.find({
          uploader: user._id,
          associatedPost: null,
          objectName: { $regex: /\/temp\// }
        });
        
        console.log(`找到 ${usedImages.length} 张临时图片`);
        
        // 将实际使用的图片关联到文章
        const imagesToMove = usedImages.filter(image => {
          const imageUrl = `/api/images/${image.objectName}`;
          return imageUrls.includes(imageUrl);
        });
        
        console.log(`移动 ${imagesToMove.length} 张图片到文章目录`);
        
        // 移动图片文件并更新数据库记录
        for (const image of imagesToMove) {
          try {
            // 移动MinIO中的文件从temp目录到文章目录
            await moveImageToPost(
              image.objectName,
              user._id.toString(),
              post._id.toString(),
              image.filename
            );

            // 更新数据库记录
            const newObjectName = `images/${user._id}/post/${post._id}/${image.filename}`;
            await Image.findByIdAndUpdate(image._id, {
              associatedPost: post._id,
              isUsed: true,
              url: `/api/images/${newObjectName}`,
              objectName: newObjectName,
              updatedAt: new Date()
            });
            
            console.log(`✅ 图片已移动到文章: ${image.filename}`);
          } catch (imageError) {
            console.error(`❌ 移动图片 ${image.filename} 失败:`, imageError);
          }
        }
        
        // 更新文章内容中的图片链接
        if (imagesToMove.length > 0) {
          const updatedContent = updateImageLinksInContent(
            content, 
            user._id.toString(), 
            post._id.toString(), 
            imagesToMove
          );
          
          // 如果内容有更新，重新保存文章
          if (updatedContent !== content) {
            await Post.findByIdAndUpdate(post._id, {
              content: updatedContent,
              summary: updatedContent.substring(0, 200) + '...',
              updatedAt: new Date()
            });
            console.log(`✅ 文章内容已更新，图片链接已修正`);
          }
        }
      }
      
      // 清理所有未使用的临时图片
      const allTempImages = await Image.find({
        uploader: user._id,
        associatedPost: null,
        objectName: { $regex: /\/temp\// }
      });
      
      const unusedImages = allTempImages.filter(image => {
        const imageUrl = `/api/images/${image.objectName}`;
        return !imageUrls.includes(imageUrl);
      });
      
      console.log(`清理 ${unusedImages.length} 张未使用的临时图片`);
      
      for (const unusedImage of unusedImages) {
        try {
          // 删除MinIO中的文件
          if (unusedImage.storageType === 'minio' && unusedImage.objectName) {
            await deleteFromMinio(unusedImage.objectName);
            console.log(`✅ 已删除未使用的MinIO文件: ${unusedImage.objectName}`);
          }
          
          // 删除数据库记录
          await Image.findByIdAndDelete(unusedImage._id);
          console.log(`✅ 已删除未使用的图片记录: ${unusedImage.filename}`);
        } catch (error) {
          console.error(`❌ 清理未使用图片失败: ${unusedImage.filename}`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ 处理图片移动失败:', error);
      // 图片移动失败不影响帖子创建
    }

    // 返回带有作者信息的文章
          await post.populate('author', 'name email avatar');

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('创建文章失败:', error);
    return NextResponse.json(
      { error: '创建文章失败' },
      { status: 500 }
    );
  }
} 
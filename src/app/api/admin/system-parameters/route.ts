import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import connectMongoDB from '@/lib/mongodb';
import SystemParameter from '@/models/SystemParameter';

// 检查管理员权限
async function checkAdminPermission() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { error: '请先登录', status: 401 };
  }

  await connectMongoDB();
  const User = (await import('@/models/User')).default;
  const user = await User.findOne({ email: session.user.email });
  if (!user || user.role !== 'admin') {
    return { error: '权限不足', status: 403 };
  }

  return { user, status: 200 };
}

// 获取所有系统参数
export async function GET() {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const parameters = await SystemParameter.find().sort({ category: 1, key: 1 });
    
    return NextResponse.json({
      success: true,
      parameters
    });
  } catch (error) {
    console.error('获取系统参数失败:', error);
    return NextResponse.json(
      { error: '获取系统参数失败' },
      { status: 500 }
    );
  }
}

// 创建或更新系统参数
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const body = await request.json();
    const { action, parameters } = body;

    if (action === 'reset') {
      // 重置所有参数到默认值
      const parametersToReset = await SystemParameter.find({ defaultValue: { $exists: true, $ne: null } });
      
      const bulkOps = parametersToReset.map(param => ({
        updateOne: {
          filter: { _id: param._id },
          update: { 
            $set: { 
              value: param.defaultValue, 
              updatedAt: new Date() 
            } 
          }
        }
      }));
      
      await SystemParameter.bulkWrite(bulkOps);
      
      // 重新获取参数
      const updatedParameters = await SystemParameter.find().sort({ category: 1, key: 1 });
      
      return NextResponse.json({
        success: true,
        message: '参数重置成功',
        parameters: updatedParameters
      });
    }

    if (action === 'init') {
      // 初始化系统参数（如果数据库中没有参数）
      const existingCount = await SystemParameter.countDocuments();
      
      if (existingCount === 0) {
        // 创建默认参数
        const defaultParameters = [
          // 基本设置
          {
            key: 'siteName',
            name: '站点名称',
            description: '网站显示的名称',
            value: 'PonyMind',
            type: 'string',
            category: '基本设置',
            isRequired: true,
            isEditable: true,
            defaultValue: 'PonyMind'
          },
          {
            key: 'siteDescription',
            name: '站点描述',
            description: '网站的描述信息，用于SEO',
            value: '技术问答与知识分享的专业平台',
            type: 'string',
            category: '基本设置',
            isRequired: true,
            isEditable: true,
            defaultValue: '技术问答与知识分享的专业平台'
          },
          {
            key: 'siteKeywords',
            name: '站点关键词',
            description: '网站的关键词，用逗号分隔',
            value: '技术,问答,知识分享,编程,开发',
            type: 'string',
            category: '基本设置',
            isRequired: false,
            isEditable: true,
            defaultValue: '技术,问答,知识分享,编程,开发'
          },
          // 用户设置
          {
            key: 'allowRegistration',
            name: '允许用户注册',
            description: '是否允许新用户自主注册账号',
            value: true,
            type: 'boolean',
            category: '用户设置',
            isRequired: true,
            isEditable: true,
            defaultValue: true
          },
          {
            key: 'requireEmailVerification',
            name: '邮箱验证',
            description: '注册时是否需要邮箱验证',
            value: false,
            type: 'boolean',
            category: '用户设置',
            isRequired: true,
            isEditable: true,
            defaultValue: false
          },
          // 内容设置
          {
            key: 'maxPostsPerDay',
            name: '每日最大发布数',
            description: '单个用户每天最多可发布的内容数量',
            value: 10,
            type: 'number',
            category: '内容设置',
            min: 1,
            max: 100,
            unit: '篇',
            isRequired: true,
            isEditable: true,
            defaultValue: 10
          },
          {
            key: 'maxTagsPerPost',
            name: '每篇内容最大标签数',
            description: '每篇内容最多可添加的标签数量',
            value: 5,
            type: 'number',
            category: '内容设置',
            min: 1,
            max: 20,
            unit: '个',
            isRequired: true,
            isEditable: true,
            defaultValue: 5
          },
          {
            key: 'enableComments',
            name: '启用评论功能',
            description: '是否允许用户对内容进行评论',
            value: true,
            type: 'boolean',
            category: '内容设置',
            isRequired: true,
            isEditable: true,
            defaultValue: true
          },
          {
            key: 'enableLikes',
            name: '启用点赞功能',
            description: '是否允许用户对内容进行点赞',
            value: true,
            type: 'boolean',
            category: '内容设置',
            isRequired: true,
            isEditable: true,
            defaultValue: true
          },
          {
            key: 'enableViews',
            name: '启用浏览统计',
            description: '是否统计和显示内容浏览次数',
            value: true,
            type: 'boolean',
            category: '内容设置',
            isRequired: true,
            isEditable: true,
            defaultValue: true
          },
          // 通知设置
          {
            key: 'enableNotifications',
            name: '启用站内通知',
            description: '是否启用站内消息通知功能',
            value: true,
            type: 'boolean',
            category: '通知设置',
            isRequired: true,
            isEditable: true,
            defaultValue: true
          },
          {
            key: 'enableEmailNotifications',
            name: '启用邮件通知',
            description: '是否发送邮件通知给用户',
            value: true,
            type: 'boolean',
            category: '通知设置',
            isRequired: true,
            isEditable: true,
            defaultValue: true
          },
          // 安全设置
          {
            key: 'moderationMode',
            name: '内容审核模式',
            description: '选择内容发布前的审核方式',
            value: 'auto',
            type: 'select',
            category: '安全设置',
            options: ['auto', 'manual', 'disabled'],
            isRequired: true,
            isEditable: true,
            defaultValue: 'auto'
          },
          {
            key: 'spamFilterEnabled',
            name: '启用垃圾内容过滤',
            description: '自动检测和过滤垃圾内容',
            value: true,
            type: 'boolean',
            category: '安全设置',
            isRequired: true,
            isEditable: true,
            defaultValue: true
          },
          {
            key: 'maxFileSize',
            name: '最大文件大小',
            description: '用户上传文件的最大大小限制',
            value: 5,
            type: 'number',
            category: '安全设置',
            min: 1,
            max: 100,
            unit: 'MB',
            isRequired: true,
            isEditable: true,
            defaultValue: 5
          },
          {
            key: 'allowedFileTypes',
            name: '允许的文件类型',
            description: '用户可上传的文件类型，用逗号分隔',
            value: 'jpg,jpeg,png,gif,pdf,doc,docx',
            type: 'string',
            category: '安全设置',
            isRequired: true,
            isEditable: true,
            defaultValue: 'jpg,jpeg,png,gif,pdf,doc,docx'
          },
          // 系统设置
          {
            key: 'maintenanceMode',
            name: '维护模式',
            description: '启用后，只有管理员可以访问网站',
            value: false,
            type: 'boolean',
            category: '系统设置',
            isRequired: true,
            isEditable: true,
            defaultValue: false
          }
        ];

        await SystemParameter.insertMany(defaultParameters);
        
        return NextResponse.json({
          success: true,
          message: '系统参数初始化成功',
          parameters: defaultParameters
        });
      } else {
        // 返回现有参数
        const existingParameters = await SystemParameter.find().sort({ category: 1, key: 1 });
        
        return NextResponse.json({
          success: true,
          message: '系统参数已存在',
          parameters: existingParameters
        });
      }
    }

    return NextResponse.json(
      { error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('操作系统参数失败:', error);
    return NextResponse.json(
      { error: '操作系统参数失败' },
      { status: 500 }
    );
  }
}

// 批量更新系统参数
export async function PUT(request: NextRequest) {
  try {
    const permissionCheck = await checkAdminPermission();
    if (permissionCheck.error) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const body = await request.json();
    const { parameters } = body;

    if (!Array.isArray(parameters)) {
      return NextResponse.json(
        { error: '参数格式错误' },
        { status: 400 }
      );
    }

    // 验证参数值
    for (const param of parameters) {
      const existingParam = await SystemParameter.findOne({ key: param.key });
      if (existingParam) {
        // 简单的类型验证
        let isValid = true;
        switch (existingParam.type) {
          case 'string':
            isValid = typeof param.value === 'string';
            break;
          case 'number':
            isValid = typeof param.value === 'number';
            if (isValid && existingParam.min !== undefined && param.value < existingParam.min) {
              isValid = false;
            }
            if (isValid && existingParam.max !== undefined && param.value > existingParam.max) {
              isValid = false;
            }
            break;
          case 'boolean':
            isValid = typeof param.value === 'boolean';
            break;
          case 'array':
            isValid = Array.isArray(param.value);
            break;
          case 'select':
            isValid = existingParam.options ? existingParam.options.includes(param.value) : false;
            break;
        }
        
        if (!isValid) {
          return NextResponse.json(
            { error: `参数 ${param.key} 的值无效` },
            { status: 400 }
          );
        }
      }
    }

    // 批量更新参数
    const bulkOps = parameters.map(param => ({
      updateOne: {
        filter: { key: param.key },
        update: { $set: { value: param.value, updatedAt: new Date() } }
      }
    }));
    
    await SystemParameter.bulkWrite(bulkOps);
    
    // 重新获取更新后的参数
    const updatedParameters = await SystemParameter.find().sort({ category: 1, key: 1 });
    
    return NextResponse.json({
      success: true,
      message: '参数更新成功',
      parameters: updatedParameters
    });
  } catch (error) {
    console.error('更新系统参数失败:', error);
    return NextResponse.json(
      { error: '更新系统参数失败' },
      { status: 500 }
    );
  }
}

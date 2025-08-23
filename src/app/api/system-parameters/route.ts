import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import SystemParameter from '@/models/SystemParameter';

// 获取系统参数（公开接口，无需认证）
export async function GET() {
  try {
    await connectMongoDB();
    
    // 获取所有系统参数
    const parameters = await SystemParameter.find().sort({ category: 1, key: 1 });
    
    // 转换为键值对格式，便于前端使用
    const paramsMap: { [key: string]: any } = {};
    parameters.forEach(param => {
      paramsMap[param.key] = param.value;
    });
    
    return NextResponse.json({
      success: true,
      parameters: paramsMap
    });
  } catch (error) {
    console.error('获取系统参数失败:', error);
    return NextResponse.json(
      { error: '获取系统参数失败' },
      { status: 500 }
    );
  }
}

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import UserGroup from '@/models/UserGroup';

export interface PermissionCheckResult {
  hasPermission: boolean;
  userGroups: any[];
  user: any;
}

/**
 * 检查用户是否具有指定权限
 * @param userEmail 用户邮箱
 * @param requiredPermission 需要的权限
 * @returns 权限检查结果
 */
export async function checkUserPermission(
  userEmail: string, 
  requiredPermission: string
): Promise<PermissionCheckResult> {
  try {
    await connectDB();
    
    const user = await User.findOne({ email: userEmail })
      .populate('userGroups')
      .lean() as any;
    
    if (!user) {
      return {
        hasPermission: false,
        userGroups: [],
        user: null
      };
    }

    // 管理员拥有所有权限
    if (user.role === 'admin') {
      return {
        hasPermission: true,
        userGroups: user.userGroups || [],
        user
      };
    }

    // 检查用户组权限
    const userGroups = user.userGroups || [];
    const hasPermission = userGroups.some((group: any) => 
      group.permissions && group.permissions.includes(requiredPermission)
    );

    return {
      hasPermission,
      userGroups,
      user
    };
  } catch (error) {
    console.error('权限检查失败:', error);
    return {
      hasPermission: false,
      userGroups: [],
      user: null
    };
  }
}

/**
 * 检查用户是否属于指定用户组
 * @param userEmail 用户邮箱
 * @param groupId 用户组ID
 * @returns 是否属于该用户组
 */
export async function checkUserGroupMembership(
  userEmail: string, 
  groupId: string
): Promise<boolean> {
  try {
    await connectDB();
    
    const user = await User.findOne({ email: userEmail })
      .populate('userGroups')
      .lean() as any;
    
    if (!user) {
      return false;
    }

    // 管理员可以访问所有用户组
    if (user.role === 'admin') {
      return true;
    }

    // 检查用户是否属于指定用户组
    const userGroups = user.userGroups || [];
    return userGroups.some((group: any) => group._id.toString() === groupId);
  } catch (error) {
    console.error('用户组成员检查失败:', error);
    return false;
  }
}

/**
 * 获取用户可访问的用户组列表
 * @param userEmail 用户邮箱
 * @returns 用户组列表
 */
export async function getUserAccessibleGroups(userEmail: string): Promise<any[]> {
  try {
    await connectDB();
    
    const user = await User.findOne({ email: userEmail })
      .populate('userGroups')
      .lean() as any;
    
    if (!user) {
      return [];
    }

    // 管理员可以访问所有用户组
    if (user.role === 'admin') {
      const allGroups = await UserGroup.find({ isActive: true }).lean();
      return allGroups;
    }

    // 返回用户所属的用户组
    return user.userGroups || [];
  } catch (error) {
    console.error('获取用户可访问用户组失败:', error);
    return [];
  }
}

/**
 * 中间件：检查用户权限
 * @param requiredPermission 需要的权限
 * @returns 中间件函数
 */
export function requirePermission(requiredPermission: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return res.status(401).json({ error: '未登录' });
      }

      const permissionResult = await checkUserPermission(
        session.user.email, 
        requiredPermission
      );

      if (!permissionResult.hasPermission) {
        return res.status(403).json({ error: '权限不足' });
      }

      // 将用户信息添加到请求对象中
      req.user = permissionResult.user;
      req.userGroups = permissionResult.userGroups;
      
      next();
    } catch (error) {
      console.error('权限中间件错误:', error);
      return res.status(500).json({ error: '权限检查失败' });
    }
  };
}

/**
 * 中间件：检查用户组访问权限
 * @param groupId 用户组ID
 * @returns 中间件函数
 */
export function requireGroupAccess(groupId: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.email) {
        return res.status(401).json({ error: '未登录' });
      }

      const hasAccess = await checkUserGroupMembership(
        session.user.email, 
        groupId
      );

      if (!hasAccess) {
        return res.status(403).json({ error: '无权访问该用户组' });
      }

      next();
    } catch (error) {
      console.error('用户组访问中间件错误:', error);
      return res.status(500).json({ error: '权限检查失败' });
    }
  };
}

/**
 * 权限常量
 */
export const PERMISSIONS = {
  READ_POSTS: 'read_posts',
  WRITE_POSTS: 'write_posts',
  DELETE_POSTS: 'delete_posts',
  MODERATE_COMMENTS: 'moderate_comments',
  MANAGE_USERS: 'manage_users',
  MANAGE_TAGS: 'manage_tags',
  VIEW_ANALYTICS: 'view_analytics',
  ADMIN_ACCESS: 'admin_access'
} as const;

/**
 * 权限描述
 */
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.READ_POSTS]: '阅读文章',
  [PERMISSIONS.WRITE_POSTS]: '发布文章',
  [PERMISSIONS.DELETE_POSTS]: '删除文章',
  [PERMISSIONS.MODERATE_COMMENTS]: '管理评论',
  [PERMISSIONS.MANAGE_USERS]: '管理用户',
  [PERMISSIONS.MANAGE_TAGS]: '管理标签',
  [PERMISSIONS.VIEW_ANALYTICS]: '查看分析',
  [PERMISSIONS.ADMIN_ACCESS]: '管理员权限'
} as const;

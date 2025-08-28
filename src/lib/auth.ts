/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码');
        }

        try {
          await connectDB();

          // 查找用户
          const user = await User.findOne({ email: credentials.email });
          if (!user) {
            throw new Error('邮箱或密码错误');
          }

          // 添加详细的调试日志
          console.log('=== 用户登录尝试 ===');
          console.log('用户信息:', {
            email: user.email,
            name: user.name,
            status: user.status,
            role: user.role,
            _id: user._id
          });
          console.log('状态类型:', typeof user.status);
          console.log('状态值:', user.status);
          console.log('状态比较结果:', {
            isBanned: user.status === 'banned',
            isInactive: user.status === 'inactive',
            isActive: user.status === 'active',
            strictBanned: user.status === 'banned',
            includesBanned: String(user.status).includes('banned')
          });

          // 检查用户状态
          if (user.status === 'banned') {
            console.log('✅ 用户被封禁，拒绝登录:', user.email);
            throw new Error('账户已被封禁，无法登录');
          }

          // 检查用户状态是否为非活跃
          if (user.status === 'inactive') {
            console.log('✅ 用户非活跃，拒绝登录:', user.email);
            throw new Error('账户处于非活跃状态，请联系管理员');
          }

          console.log('✅ 用户状态检查通过:', user.email);

          // 验证密码
          const isValid = await user.comparePassword(credentials.password);
          if (!isValid) {
            throw new Error('邮箱或密码错误');
          }

          // 更新用户最后登录时间
          try {
            await User.findByIdAndUpdate(user._id, {
              lastLoginAt: new Date(),
              updatedAt: new Date()
            });
            console.log('✅ 已更新用户最后登录时间:', user.email);
          } catch (updateError) {
            console.warn('⚠️ 更新用户最后登录时间失败:', updateError);
            // 不阻止登录，只是记录警告
          }

          // 返回用户信息（不包含密码）
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.avatar, // 添加头像信息
            role: user.role, // 添加角色信息
            status: user.status, // 添加状态信息
          };
        } catch (error) {
          console.error('Auth error:', error);
          // 如果是我们抛出的错误，直接重新抛出
          if (error instanceof Error && (error.message === '请输入邮箱和密码' || error.message === '邮箱或密码错误')) {
            throw error;
          }
          // 其他错误显示通用错误信息
          throw new Error('登录失败，请稍后重试');
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 3 * 60 * 60, // 3小时（单位：秒）
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
  },
};

export { authOptions }; 
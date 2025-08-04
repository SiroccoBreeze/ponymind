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

          // 验证密码
          const isValid = await user.comparePassword(credentials.password);
          if (!isValid) {
            throw new Error('邮箱或密码错误');
          }

          // 返回用户信息（不包含密码）
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.avatar, // 添加头像信息
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
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};

export { authOptions }; 
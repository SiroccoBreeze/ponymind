import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码');
        }

        await connectDB();

        // 查找用户
        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error('用户不存在');
        }

        // 验证密码
        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) {
          throw new Error('密码错误');
        }

        // 返回用户信息（不包含密码）
        const userObject = user.toObject();
        delete userObject.password;
        return userObject;
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST }; 
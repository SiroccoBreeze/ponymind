/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { authOptions } from '@/lib/auth';

const NextAuth = require('next-auth').default;
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 
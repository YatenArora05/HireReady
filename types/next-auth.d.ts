import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    credits?: number;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      credits?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    credits?: number;
  }
}

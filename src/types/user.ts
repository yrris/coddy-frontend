export type AuthProvider = 'LOCAL' | 'GOOGLE';
export type UserRole = 'USER' | 'ADMIN';

export type LoginUser = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string;
  authProvider: AuthProvider;
  userRole: UserRole;
};

export type UserRegisterRequest = {
  email: string;
  password: string;
  checkPassword: string;
  displayName?: string;
};

export type UserLoginRequest = {
  email: string;
  password: string;
};

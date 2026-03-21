import type { LoginUser } from './user';

export type AppId = string | number;

export type CodeGenType = 'HTML_SINGLE' | 'HTML_MULTI';

export type AppVO = {
  id: AppId;
  appName: string;
  cover?: string;
  initPrompt?: string;
  codeGenType: CodeGenType;
  deployKey?: string;
  deployedTime?: string;
  priority: number;
  userId: AppId;
  createTime: string;
  updateTime: string;
  user?: LoginUser;
  previewKey?: string;
};

export type PageVO<T> = {
  pageNum: number;
  pageSize: number;
  totalRow: number;
  records: T[];
};

export type AppAddRequest = {
  initPrompt: string;
  codeGenType?: CodeGenType;
};

export type AppUpdateRequest = {
  id: AppId;
  appName: string;
};

export type AppAdminUpdateRequest = {
  id: AppId;
  appName?: string;
  cover?: string;
  priority?: number;
};

export type AppQueryRequest = {
  pageNum?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc' | 'ascend' | 'descend';
  id?: AppId;
  appName?: string;
  cover?: string;
  initPrompt?: string;
  codeGenType?: CodeGenType;
  deployKey?: string;
  priority?: number;
  userId?: AppId;
};

export type AppDeployRequest = {
  appId: AppId;
};

import type { LoginUser } from './user';

export type AppId = string | number;

export type CodeGenType = 'HTML_SINGLE' | 'HTML_MULTI' | 'REACT_VITE';

export type StreamMessageType = 'AI_RESPONSE' | 'TOOL_EXECUTED' | 'COMPLETE' | 'ERROR';

export type StreamMessage = {
  type: StreamMessageType;
  data: string | { toolName: string; result: string };
};

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

export type ChatHistoryQueryRequest = {
  pageNum?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  projectId?: number;
  senderType?: 'USER' | 'ASSISTANT' | '';
  content?: string;
};

export type ChatHistoryVO = {
  id: number;
  projectId: number;
  senderType: 'USER' | 'ASSISTANT';
  content: string;
  messageStatus: string;
  createdAt: string;
};

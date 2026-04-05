export type Platform = 'ChatGPT' | 'Claude' | 'Gemini';

export type Role = 'user' | 'assistant' | 'system' | 'tool' | 'dalle';

export type MessagePart = 
  | { type: 'text'; content: string }
  | { type: 'image'; imageId: string }
  | { type: 'code'; content: string; language?: string }
  | { type: 'output'; content: string }
  | { type: 'tool'; content: string };

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  model?: string;
  parts?: MessagePart[];
  attachments?: string[]; // Blob URLs or file IDs
}

export interface Session {
  id: string;
  title: string;
  platform: Platform;
  model?: string;
  createTime: number;
  updateTime: number;
  folderId?: string;
  messages: Message[];
  systemPrompt?: string; // Added as requested
  mapping?: Record<string, { message: Message | null, parent: string | null, children: string[] }>;
  currentNode?: string;
}

export interface Folder {
  id: string;
  name: string;
  platform?: Platform;
}

export interface AppState {
  sessions: Session[];
  folders: Folder[];
  activeSessionId: string | null;
  searchQuery: string;
  platformFilter: Platform | 'All';
  view: 'chat' | 'calendar' | 'settings';
}

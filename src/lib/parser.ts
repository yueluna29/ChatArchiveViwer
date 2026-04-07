import { unzip, zip } from 'fflate';
import { Session, Message, Platform, Role, MessagePart, Folder } from '../types';
import { saveImage, saveFolder, getAllSessions, getAllFolders, getAllImageKeys, getImage } from './db';

// fflate 解压 Promise 包装
function unzipAsync(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export interface ImportProgress {
  phase: string;      // '解压中...' / '解析中...' / '保存中...'
  current: number;
  total: number;
}

export async function parseFile(
  file: File,
  onProgress?: (progress: ImportProgress) => void,
  onBatch?: (sessions: Session[]) => Promise<void>
): Promise<Session[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.zip')) {
    return parseZip(file, onProgress, onBatch);
  } else if (fileName.endsWith('.json')) {
    return parseJson(file, onProgress, onBatch);
  }

  throw new Error('Unsupported file format');
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// 让出主线程，防止卡死 UI
const yieldToUI = () => new Promise<void>(r => setTimeout(r, 0));

async function parseZip(
  file: File,
  onProgress?: (p: ImportProgress) => void,
  onBatch?: (sessions: Session[]) => Promise<void>
): Promise<Session[]> {
  onProgress?.({ phase: '读取文件...', current: 0, total: 1 });
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  onProgress?.({ phase: '解压中...', current: 0, total: 1 });
  let files: Record<string, Uint8Array>;
  try {
    files = await unzipAsync(data);
  } catch (err) {
    throw new Error('ZIP 解压失败: ' + (err as Error).message);
  }

  const fileNames = Object.keys(files);
  const decoder = new TextDecoder();

  // 检测 ChatArchive 专属格式
  const metaKey = fileNames.find(f => f.endsWith('chatarchive/meta.json') || f === 'chatarchive/meta.json');
  if (metaKey) {
    return importChatArchive(files, fileNames, onProgress);
  }

  const conversationsKey = fileNames.find(f => f.toLowerCase().endsWith('conversations.json'));

  if (conversationsKey) {
    onProgress?.({ phase: '解析 JSON...', current: 0, total: 1 });
    const content = decoder.decode(files[conversationsKey]);
    const jsonData = JSON.parse(content);

    if (Array.isArray(jsonData) && jsonData.length > 0) {
      if (jsonData[0].mapping) {
        // ChatGPT format — 提取图片
        const imageFiles = fileNames.filter(f => /\.(jpeg|jpg|png|webp|gif)$/i.test(f));
        let zipImageCount = 0;
        for (let i = 0; i < imageFiles.length; i++) {
          const filename = imageFiles[i];
          const basename = filename.split('/').pop() || filename;
          const match = basename.match(/^(file_[a-f0-9]+)/i);
          if (match) {
            const normalizedId = match[1];
            zipImageCount++;
            const blob = new Blob([files[filename]]);
            const base64 = await blobToBase64(blob);
            await saveImage(normalizedId, base64);
          }
          if (i % 50 === 0) {
            onProgress?.({ phase: '提取图片...', current: i, total: imageFiles.length });
            await yieldToUI();
          }
        }
        console.log(`[ZIP图片] 成功提取: ${zipImageCount} 张`);

        return parseChatGPTBatched(jsonData, onProgress, onBatch);
      } else if (jsonData[0].chat_messages) {
        // Claude format
        let projectMap: Record<string, string> = {};
        const projectsKey = fileNames.find(f => f.toLowerCase().endsWith('projects.json'));
        if (projectsKey) {
          const projectsContent = decoder.decode(files[projectsKey]);
          const projectsData = JSON.parse(projectsContent);
          if (Array.isArray(projectsData)) {
            for (const proj of projectsData) {
              if (proj.uuid && proj.name) {
                projectMap[proj.uuid] = proj.name;
                const folder: Folder = { id: proj.uuid, name: proj.name, platform: 'Claude' };
                await saveFolder(folder);
              }
            }
          }
        }
        return parseClaude(jsonData, projectMap);
      }
    }

    if (Array.isArray(jsonData) && jsonData.length === 0) return [];
  }

  // Gemini Takeout
  const myActivityKey = fileNames.find(f => f.toLowerCase().endsWith('myactivity.html'));
  if (myActivityKey) {
    const htmlContent = decoder.decode(files[myActivityKey]);
    for (const filename of fileNames) {
      if (!filename.match(/\.(jpeg|jpg|png|webp|gif)$/i)) continue;
      const basename = filename.split('/').pop() || filename;
      const imageId = basename.replace(/\.[^.]+$/, '');
      const blob = new Blob([files[filename]]);
      const base64 = await blobToBase64(blob);
      await saveImage(imageId, base64);
      const encodedId = encodeURIComponent(basename).replace(/\.[^.]+$/, '');
      if (encodedId !== imageId) await saveImage(encodedId, base64);
    }
    return parseGeminiHtml(htmlContent);
  }

  throw new Error('Could not find conversations.json or MyActivity.html in ZIP');
}

async function parseJson(
  file: File,
  onProgress?: (p: ImportProgress) => void,
  onBatch?: (sessions: Session[]) => Promise<void>
): Promise<Session[]> {
  onProgress?.({ phase: '读取文件...', current: 0, total: 1 });
  const content = await file.text();
  onProgress?.({ phase: '解析 JSON...', current: 0, total: 1 });
  const data = JSON.parse(content);

  if (Array.isArray(data)) {
    if (data.length > 0 && data[0].chat_messages) {
      return parseClaude(data);
    } else if (data.length > 0 && data[0].mapping) {
      return parseChatGPTBatched(data, onProgress, onBatch);
    }
  }

  if (data.conversations) {
    return parseGemini(data.conversations);
  }

  throw new Error('Unknown JSON structure');
}

// 分批处理 ChatGPT 数据，每批处理 BATCH_SIZE 个会话后让出线程
const BATCH_SIZE = 50;

async function parseChatGPTBatched(
  data: any[],
  onProgress?: (p: ImportProgress) => void,
  onBatch?: (sessions: Session[]) => Promise<void>
): Promise<Session[]> {
  const allSessions: Session[] = [];
  const total = data.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = data.slice(i, i + BATCH_SIZE);
    const batch = parseChatGPT(chunk);

    if (onBatch) {
      // 边解析边保存，不累积在内存中
      await onBatch(batch);
    }
    allSessions.push(...batch);

    onProgress?.({ phase: '解析会话...', current: Math.min(i + BATCH_SIZE, total), total });
    await yieldToUI();
  }

  return allSessions;
}

function parseChatGPTMessage(msg: any, conv: any): Message | null {
  if (!msg.content || !msg.author) return null;
  const role = msg.author.role as Role;
  if (role === 'system' && (!msg.content.parts || msg.content.parts.join('').trim() === '')) return null;

  const parts: MessagePart[] = [];
  let combinedContent = '';
  const contentType = msg.content.content_type;

  if (contentType === 'text') {
    combinedContent = (msg.content.parts || []).join('\n');
    if (combinedContent.trim() !== '') {
      parts.push({ type: 'text', content: combinedContent });
    }
  } else if (contentType === 'multimodal_text') {
    for (const part of msg.content.parts || []) {
      if (typeof part === 'string') {
        combinedContent += part + '\n';
        if (part.trim() !== '') {
          parts.push({ type: 'text', content: part });
        }
      } else if (part.content_type === 'image_asset_pointer') {
        const assetPointer = part.asset_pointer || '';
        let normalizedId = '';
        if (assetPointer.startsWith('sediment://')) {
          // sediment://file_00000000xxxxx → file_00000000xxxxx
          normalizedId = assetPointer.replace('sediment://', '');
        } else if (assetPointer.startsWith('file-service://')) {
          // file-service://file-XXXXX → file_XXXXX
          const fileId = assetPointer.replace('file-service://', '');
          normalizedId = fileId.replace(/^file-/, 'file_');
        }
        if (normalizedId) {
          parts.push({ type: 'image', imageId: normalizedId });
        }
      }
    }
  } else if (contentType === 'code') {
    combinedContent = msg.content.text || '';
    parts.push({ type: 'code', content: combinedContent, language: msg.content.language });
  } else if (contentType === 'execution_output') {
    combinedContent = msg.content.text || '';
    parts.push({ type: 'output', content: combinedContent });
  } else if (contentType === 'tether_browsing_display') {
    combinedContent = 'Browsing the web...';
    parts.push({ type: 'tool', content: combinedContent });
  }

  // 没有任何有意义的内容时返回 null
  if (parts.length === 0 && combinedContent.trim() === '') return null;

  return {
    id: msg.id,
    role: msg.recipient === 'dalle.text2im' ? 'dalle' : role,
    content: combinedContent,
    timestamp: (msg.create_time || conv.create_time) * 1000,
    model: msg.metadata?.model_slug,
    parts: parts.length > 0 ? parts : undefined
  };
}

function parseChatGPT(data: any[]): Session[] {
  return data.map(conv => {
    const mapping = conv.mapping;
    const currentNode = conv.current_node;
    if (!mapping || !currentNode) return null;

    const parsedMapping: Record<string, { message: Message | null, parent: string | null, children: string[] }> = {};
    let systemPrompt = '';

    for (const key in mapping) {
      const node = mapping[key];
      let parsedMsg: Message | null = null;
      if (node.message) {
        parsedMsg = parseChatGPTMessage(node.message, conv);
        if (parsedMsg && parsedMsg.role === 'system' && !systemPrompt) {
          systemPrompt = parsedMsg.content;
        }
      }
      parsedMapping[key] = {
        message: parsedMsg,
        parent: node.parent || null,
        children: node.children || []
      };
    }

    // Reconstruct linear path from current_node upwards
    const path: Message[] = [];
    let tempNodeId: string | null = currentNode;
    while (tempNodeId && parsedMapping[tempNodeId]) {
      const pm = parsedMapping[tempNodeId].message;
      if (pm) {
        path.unshift(pm);
      }
      tempNodeId = parsedMapping[tempNodeId].parent;
    }

    return {
      id: conv.conversation_id || conv.id || Math.random().toString(36).substr(2, 9),
      title: conv.title || 'Untitled Session',
      platform: 'ChatGPT',
      createTime: conv.create_time * 1000,
      updateTime: conv.update_time * 1000,
      messages: path,
      systemPrompt,
      mapping: parsedMapping,
      currentNode
    };
  }).filter(Boolean) as Session[];
}

function parseClaude(data: any[], projectMap?: Record<string, string>): Session[] {
  return data.filter(conv => {
    // 过滤掉空对话（没有消息，或只有空消息）
    if (!conv.chat_messages || conv.chat_messages.length === 0) return false;
    const hasContent = conv.chat_messages.some((msg: any) => msg.text && msg.text.trim());
    return hasContent;
  }).map(conv => {
    const messages: Message[] = conv.chat_messages.map((msg: any) => {
      const role = msg.sender === 'human' ? 'user' : 'assistant';
      let content = msg.text || '';
      let parts: MessagePart[] | undefined;

      // Check if content is an array (Claude thinking chain format)
      if (Array.isArray(msg.content)) {
        parts = [];
        const textParts: string[] = [];
        for (const block of msg.content) {
          if (block.type === 'thinking' && block.thinking) {
            parts.push({ type: 'thinking', content: block.thinking });
          } else if (block.type === 'text' && block.text) {
            parts.push({ type: 'text', content: block.text });
            textParts.push(block.text);
          } else if (block.type === 'tool_use') {
            parts.push({ type: 'tool', content: `Tool: ${block.name || 'unknown'}` });
          } else if (block.type === 'tool_result') {
            const resultText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            parts.push({ type: 'output', content: resultText });
          }
        }
        content = textParts.join('\n') || content;
        if (parts.length === 0) parts = undefined;
      } else if (content) {
        parts = [{ type: 'text', content }];
      }

      return {
        id: msg.uuid || Math.random().toString(36).substr(2, 9),
        role: role as Role,
        content,
        timestamp: new Date(msg.created_at).getTime(),
        parts
      };
    });

    let folderId = undefined;
    if (projectMap && conv.project_uuid && projectMap[conv.project_uuid]) {
      folderId = conv.project_uuid;
    }

    return {
      id: conv.uuid || Math.random().toString(36).substr(2, 9),
      title: conv.name || 'Untitled Session',
      platform: 'Claude',
      createTime: new Date(conv.created_at).getTime(),
      updateTime: new Date(conv.updated_at).getTime(),
      folderId,
      messages,
      systemPrompt: '' // Claude export might not have explicit system prompt in same way
    };
  });
}

function parseGeminiHtml(html: string): Session[] {
  // Split into blocks by outer-cell divs
  const blocks = html.split('outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp');

  // Parse each block into a message pair
  interface GeminiFile {
    filename: string;
    content: string;
  }

  interface GeminiEntry {
    userText: string;
    assistantText: string;
    timestamp: number;
    imageIds: string[];
    files: GeminiFile[];
  }

  const entries: GeminiEntry[] = [];
  const timestampRegex = /(\w+ \d+, \d{4}, [\d:]+\s*[AP]M(?:\s*[A-Z]{2,5})?)/;

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Find first body cell content
    const bodyMatch = block.match(/mdl-typography--body-1">([\s\S]*?)<\/div>/);
    if (!bodyMatch) continue;
    const body = bodyMatch[1];

    // Split by timestamp to get [prompt, timestamp, response]
    const parts = body.split(timestampRegex);
    if (parts.length < 2) continue;

    const rawPrompt = parts[0];
    const timeStr = parts[1];
    const rawResponse = parts.slice(2).join('');

    // Clean HTML tags
    const cleanHtml = (s: string) => s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&emsp;/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Extract attached file references from raw HTML before cleaning
    const files: GeminiFile[] = [];
    const fileLinks = rawPrompt.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/gi);
    for (const fl of fileLinks) {
      const href = fl[1];
      const displayName = fl[2];
      // Skip image files — those are handled separately
      if (/\.(png|jpg|jpeg|gif|webp)$/i.test(displayName)) continue;
      files.push({ filename: displayName, content: href });
    }

    let userText = cleanHtml(rawPrompt);
    // Remove "Prompted " prefix
    userText = userText.replace(/^Prompted\s+/, '');
    // Remove "Attached N files." lines and file list items
    userText = userText.replace(/Attached \d+ files?\.\s*/g, '');
    userText = userText.replace(/^-\s+\S+.*$/gm, '');
    userText = userText.replace(/\n{3,}/g, '\n\n').trim();

    let assistantText = cleanHtml(rawResponse);
    // Remove leading timezone artifact if timestamp regex didn't fully capture it
    assistantText = assistantText.replace(/^[A-Z]{2,5}\s*/, '').trim();

    // Skip empty entries
    if (!userText && !assistantText && files.length === 0) continue;

    // Parse timestamp
    let timestamp = 0;
    try {
      // "Apr 5, 2026, 2:15:49 AM" → parseable
      const cleaned = timeStr.replace(/\s*(JST|EST|PST|UTC|GMT|CST|CET|CEST|PDT|CDT|EDT|KST|AEST)\s*$/, '').trim();
      timestamp = new Date(cleaned).getTime();
    } catch { /* ignore */ }
    if (!timestamp || isNaN(timestamp)) timestamp = Date.now();

    // Extract image references
    const imageIds: string[] = [];
    const imgMatches = block.matchAll(/src="([^"]+\.(png|jpg|jpeg|gif|webp))"/gi);
    for (const m of imgMatches) {
      const imgName = m[1].replace(/\.[^.]+$/, '');
      imageIds.push(imgName);
    }

    entries.push({ userText, assistantText, timestamp, imageIds, files });
  }

  // Entries are in reverse chronological order — reverse them
  entries.reverse();

  // Group entries into sessions by time proximity (>30 min gap = new session)
  const GAP_MS = 30 * 60 * 1000;
  const sessions: Session[] = [];
  let currentMessages: Message[] = [];
  let sessionStart = 0;
  let sessionEnd = 0;

  for (const entry of entries) {
    if (currentMessages.length > 0 && entry.timestamp - sessionEnd > GAP_MS) {
      // Save current session
      const title = currentMessages[0].content.substring(0, 50).replace(/\n/g, ' ') || 'Gemini Session';
      sessions.push({
        id: Math.random().toString(36).substr(2, 9),
        title,
        platform: 'Gemini',
        createTime: sessionStart,
        updateTime: sessionEnd,
        messages: currentMessages,
        systemPrompt: ''
      });
      currentMessages = [];
    }

    if (currentMessages.length === 0) {
      sessionStart = entry.timestamp;
    }
    sessionEnd = entry.timestamp;

    // Add user message
    if (entry.userText || entry.files.length > 0 || entry.imageIds.length > 0) {
      const parts: MessagePart[] = [];
      if (entry.userText) {
        // Detect "Created Gemini Canvas" with embedded code
        const canvasMatch = entry.userText.match(/^(Created Gemini Canvas titled .+?)\n([\s\S]+)/);
        if (canvasMatch) {
          parts.push({ type: 'text', content: canvasMatch[1] });
          parts.push({ type: 'code', content: canvasMatch[2].trim(), language: '' });
        } else {
          parts.push({ type: 'text', content: entry.userText });
        }
      }
      for (const imgId of entry.imageIds) {
        parts.push({ type: 'image', imageId: imgId });
      }
      for (const file of entry.files) {
        parts.push({ type: 'file', filename: file.filename, content: file.content });
      }
      currentMessages.push({
        id: Math.random().toString(36).substr(2, 9),
        role: 'user',
        content: entry.userText || '',
        timestamp: entry.timestamp,
        parts
      });
    }

    // Add assistant message
    if (entry.assistantText) {
      currentMessages.push({
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: entry.assistantText,
        timestamp: entry.timestamp + 1
      });
    }
  }

  // Don't forget the last session
  if (currentMessages.length > 0) {
    const title = currentMessages[0].content.substring(0, 50).replace(/\n/g, ' ') || 'Gemini Session';
    sessions.push({
      id: Math.random().toString(36).substr(2, 9),
      title,
      platform: 'Gemini',
      createTime: sessionStart,
      updateTime: sessionEnd,
      messages: currentMessages,
      systemPrompt: ''
    });
  }

  return sessions;
}

// ========== ChatArchive 导出/导入 ==========

function zipAsync(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function base64DataUrlToBytes(dataUrl: string): { data: Uint8Array; ext: string } {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const ext = mime.split('/')[1] || 'jpg';
  const binary = atob(b64);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  return { data, ext };
}

function bytesToBase64DataUrl(data: Uint8Array, ext: string): string {
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * 导出 IndexedDB 中所有数据为 ChatArchive .zip
 * includeImages=false 时只导出文字
 */
export async function exportArchive(
  includeImages: boolean,
  onProgress?: (p: ImportProgress) => void
): Promise<Blob> {
  onProgress?.({ phase: '读取会话...', current: 0, total: 1 });

  const sessions = await getAllSessions();
  const folders = await getAllFolders();

  const encoder = new TextEncoder();
  const files: Record<string, Uint8Array> = {
    'chatarchive/meta.json': encoder.encode(JSON.stringify({
      version: 1,
      exportDate: new Date().toISOString(),
      sessionCount: sessions.length,
      hasImages: includeImages,
    })),
    'chatarchive/sessions.json': encoder.encode(JSON.stringify(sessions)),
  };

  if (folders.length > 0) {
    files['chatarchive/folders.json'] = encoder.encode(JSON.stringify(folders));
  }

  if (includeImages) {
    // 收集所有引用的图片 ID
    const imageIds = new Set<string>();
    for (const s of sessions) {
      for (const m of s.messages) {
        if (m.parts) {
          for (const p of m.parts) {
            if (p.type === 'image' && p.imageId) imageIds.add(p.imageId);
          }
        }
      }
    }

    const ids = [...imageIds];
    let saved = 0;
    for (const id of ids) {
      const base64 = await getImage(id);
      if (base64) {
        try {
          const { data, ext } = base64DataUrlToBytes(base64);
          files[`chatarchive/images/${id}.${ext}`] = data;
          saved++;
        } catch { /* 跳过损坏的图片 */ }
      }
      if (saved % 20 === 0) {
        onProgress?.({ phase: '打包图片...', current: saved, total: ids.length });
        await yieldToUI();
      }
    }
    console.log(`[导出] 打包了 ${saved}/${ids.length} 张图片`);
  }

  onProgress?.({ phase: '压缩中...', current: 0, total: 1 });
  const zipData = await zipAsync(files);
  return new Blob([zipData], { type: 'application/zip' });
}

/**
 * 导入 ChatArchive 专属格式
 */
async function importChatArchive(
  files: Record<string, Uint8Array>,
  fileNames: string[],
  onProgress?: (p: ImportProgress) => void
): Promise<Session[]> {
  const decoder = new TextDecoder();

  // 读取 sessions
  const sessionsKey = fileNames.find(f => f.endsWith('sessions.json'))!;
  onProgress?.({ phase: '解析会话...', current: 0, total: 1 });
  const sessions: Session[] = JSON.parse(decoder.decode(files[sessionsKey]));

  // 读取 folders
  const foldersKey = fileNames.find(f => f.endsWith('folders.json'));
  if (foldersKey) {
    const folders: Folder[] = JSON.parse(decoder.decode(files[foldersKey]));
    for (const f of folders) await saveFolder(f);
  }

  // 导入图片
  const imageFiles = fileNames.filter(f => f.startsWith('chatarchive/images/'));
  if (imageFiles.length > 0) {
    for (let i = 0; i < imageFiles.length; i++) {
      const filePath = imageFiles[i];
      const basename = filePath.split('/').pop() || '';
      const lastDot = basename.lastIndexOf('.');
      const id = lastDot > 0 ? basename.substring(0, lastDot) : basename;
      const ext = lastDot > 0 ? basename.substring(lastDot + 1) : 'jpg';

      const base64 = bytesToBase64DataUrl(files[filePath], ext);
      await saveImage(id, base64);

      if (i % 20 === 0) {
        onProgress?.({ phase: '导入图片...', current: i, total: imageFiles.length });
        await yieldToUI();
      }
    }
    console.log(`[导入] 恢复了 ${imageFiles.length} 张图片`);
  }

  return sessions;
}

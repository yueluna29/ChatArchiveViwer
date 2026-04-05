import JSZip from 'jszip';
import { Session, Message, Platform, Role, MessagePart, Folder } from '../types';
import { saveImage, saveFolder } from './db';

export async function parseFile(file: File): Promise<Session[]> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.zip')) {
    return parseZip(file);
  } else if (fileName.endsWith('.json')) {
    return parseJson(file);
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

async function parseZip(file: File): Promise<Session[]> {
  const zip = await JSZip.loadAsync(file);
  
  // Find conversations.json anywhere in the zip
  const conversationsFiles = zip.file(/conversations\.json$/i);
  const conversationsFile = conversationsFiles.length > 0 ? conversationsFiles[0] : null;
  
  if (conversationsFile) {
    const content = await conversationsFile.async('string');
    const data = JSON.parse(content);
    
    if (Array.isArray(data) && data.length > 0) {
      if (data[0].mapping) {
        // ChatGPT format
        const zipFileList = Object.keys(zip.files);
        
        // Process all images in ZIP
        let zipImageCount = 0;
        for (const filename of zipFileList) {
          if (!filename.match(/\.(jpeg|jpg|png|webp|gif)$/i)) continue;

          // 取纯文件名（去掉子目录前缀）
          const basename = filename.split('/').pop() || filename;

          // 提取 file_XXXXX 部分作为 ID
          // 格式1: file_XXXXX-sanitized.jpg
          // 格式2: file_XXXXX-UUID.png (用户上传的，在 user-xxx/ 子目录)
          // 格式2b: file_XXXXX-UUID.part0.png
          const match = basename.match(/^(file_[a-f0-9]+)/i);
          if (match) {
            const normalizedId = match[1];
            zipImageCount++;
            const blob = await zip.files[filename].async('blob');
            const base64 = await blobToBase64(blob);
            await saveImage(normalizedId, base64);
          }
        }
        console.log(`[ZIP图片] 成功提取: ${zipImageCount} 张`);

        return parseChatGPT(data);
      } else if (data[0].chat_messages) {
        // Claude format
        let projectMap: Record<string, string> = {};
        const projectsFiles = zip.file(/projects\.json$/i);
        const projectsFile = projectsFiles.length > 0 ? projectsFiles[0] : null;
        
        if (projectsFile) {
          const projectsContent = await projectsFile.async('string');
          const projectsData = JSON.parse(projectsContent);
          
          if (Array.isArray(projectsData)) {
            for (const proj of projectsData) {
              if (proj.uuid && proj.name) {
                projectMap[proj.uuid] = proj.name;
                // Create and save folder
                const folder: Folder = {
                  id: proj.uuid,
                  name: proj.name,
                  platform: 'Claude'
                };
                await saveFolder(folder);
              }
            }
          }
        }
        
        return parseClaude(data, projectMap);
      }
    }
    
    // If empty array, return empty
    if (Array.isArray(data) && data.length === 0) {
      return [];
    }
  }
  
  // Check for Gemini Takeout format (MyActivity.html)
  const myActivityFiles = zip.file(/MyActivity\.html$/i);
  const myActivityFile = myActivityFiles.length > 0 ? myActivityFiles[0] : null;

  if (myActivityFile) {
    const htmlContent = await myActivityFile.async('string');

    // Extract images from ZIP
    const zipFileList = Object.keys(zip.files);
    for (const filename of zipFileList) {
      if (!filename.match(/\.(jpeg|jpg|png|webp|gif)$/i)) continue;
      const basename = filename.split('/').pop() || filename;
      const imageId = basename.replace(/\.[^.]+$/, ''); // remove extension as ID
      const blob = await zip.files[filename].async('blob');
      const base64 = await blobToBase64(blob);
      await saveImage(imageId, base64);
      // Also save with URL-encoded key (HTML src uses %20 for spaces etc.)
      const encodedId = encodeURIComponent(basename).replace(/\.[^.]+$/, '');
      if (encodedId !== imageId) {
        await saveImage(encodedId, base64);
      }
    }

    return parseGeminiHtml(htmlContent);
  }

  throw new Error('Could not find conversations.json or MyActivity.html in ZIP');
}

async function parseJson(file: File): Promise<Session[]> {
  const content = await file.text();
  const data = JSON.parse(content);
  
  // Basic heuristic to identify platform
  if (Array.isArray(data)) {
    if (data.length > 0 && data[0].chat_messages) {
      return parseClaude(data);
    } else if (data.length > 0 && data[0].mapping) {
      return parseChatGPT(data);
    }
  }
  
  // Gemini Takeout heuristic
  if (data.conversations) {
    return parseGemini(data.conversations);
  }

  throw new Error('Unknown JSON structure');
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
        parts.push({ type: 'text', content: entry.userText });
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

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
        const zipImageSamples: string[] = [];
        for (const filename of zipFileList) {
          if (filename.match(/\.(jpeg|jpg|png|webp|gif)$/i)) {
            // 🔍 DEBUG: 记录所有图片文件，不只是 -sanitized 的
            if (zipImageSamples.length < 10) {
              zipImageSamples.push(filename);
            }
            if (filename.includes('-sanitized')) {
              const match = filename.match(/(file_[a-zA-Z0-9]+)-sanitized/);
              if (match) {
                const normalizedId = match[1];
                zipImageCount++;
                if (zipImageCount <= 10) {
                  console.log(`[ZIP图片] 文件: ${filename} → normalizedId: ${normalizedId}`);
                }
                const blob = await zip.files[filename].async('blob');
                const base64 = await blobToBase64(blob);
                await saveImage(normalizedId, base64);
              } else {
                console.warn(`[ZIP图片] ⚠️ 包含-sanitized但正则不匹配: ${filename}`);
              }
            } else {
              console.log(`[ZIP图片] ⚠️ 图片文件不含-sanitized: ${filename}`);
            }
          }
        }
        console.log(`[ZIP图片] 共发现图片文件: ${zipImageSamples.length}+, 成功提取: ${zipImageCount}`);
        console.log(`[ZIP图片] 前10个图片文件名:`, zipImageSamples);

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
  
  throw new Error('Could not find conversations.json in ZIP or unrecognized format');
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
        const assetPointer = part.asset_pointer;
        const fileId = assetPointer.replace('file-service://', '');
        const normalizedId = fileId.replace(/^file-/, 'file_');
        console.log(`[JSON引用] asset_pointer: ${assetPointer} → normalizedId: ${normalizedId}`);
        parts.push({ type: 'image', imageId: normalizedId });
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
  return data.map(conv => {
    const messages: Message[] = conv.chat_messages.map((msg: any) => ({
      id: msg.uuid || Math.random().toString(36).substr(2, 9),
      role: msg.sender === 'human' ? 'user' : 'assistant',
      content: msg.text,
      timestamp: new Date(msg.created_at).getTime()
    }));

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

function parseGemini(data: any[]): Session[] {
  return data.map(conv => {
    const messages: Message[] = conv.messages.map((msg: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      role: msg.author === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: new Date(msg.create_time).getTime()
    }));

    return {
      id: conv.id || Math.random().toString(36).substr(2, 9),
      title: conv.title || 'Untitled Session',
      platform: 'Gemini',
      createTime: new Date(conv.create_time).getTime(),
      updateTime: new Date(conv.update_time).getTime(),
      messages,
      systemPrompt: ''
    };
  });
}

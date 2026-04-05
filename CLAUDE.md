# CLAUDE.md — ChatArchive 项目指南

## 项目概述

ChatArchive 是一个纯前端多平台AI聊天记录归档查看器。用户上传从 ChatGPT / Claude / Gemini 导出的ZIP或JSON文件，数据存储在浏览器本地 IndexedDB 中，支持浏览、搜索、编辑、删除聊天记录。

**所有者**：Luna（非程序员，产品直觉极强，不要低估她的理解力）
**部署**：Vercel
**仓库**：私有

---

## 技术栈

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4（通过 @tailwindcss/vite 插件）
- IndexedDB（通过 `idb` 库封装）
- JSZip（ZIP解压）
- react-markdown（Markdown渲染）
- lucide-react（图标）
- motion（动画，从 framer-motion 迁移后的包名）
- date-fns（日期格式化）

---

## 文件结构

```
src/
├── main.tsx              → 入口
├── App.tsx               → 根组件，状态管理，路由
├── types.ts              → 所有 TypeScript 类型定义
├── index.css             → 全局样式 + CSS变量（换肤系统）
├── lib/
│   ├── db.ts             → IndexedDB 封装（sessions/folders/images 三个 store）
│   └── parser.ts         → 🔴 核心解析器：ZIP/JSON → Session[]，含三平台 adapter
└── components/
    ├── AsyncImage.tsx     → 异步图片组件：从 IndexedDB 按 imageId 加载 base64
    ├── CalendarView.tsx   → 月历视图
    ├── ChatView.tsx       → 💬 聊天气泡视图（最大最复杂的组件，418行）
    ├── ConfirmModal.tsx   → 确认弹窗
    ├── Notification.tsx   → 通知提示
    ├── PhotoView.tsx      → 图片浏览
    ├── SessionList.tsx    → 左侧session列表
    ├── SettingsView.tsx   → 设置页
    ├── Sidebar.tsx        → 侧边栏导航
    └── ThemeStudio.tsx    → 主题/换肤
```

---

## 数据流

```
用户上传 ZIP/JSON
    → parseFile()（parser.ts）
        → 检测格式（ZIP/JSON）
        → 检测平台（ChatGPT/Claude/Gemini）
        → 调用对应 adapter（parseChatGPT / parseClaude / parseGemini）
        → 图片从ZIP提取 → base64 → saveImage() 存入 IndexedDB images store
        → Session[] 返回
    → saveSession() 逐个存入 IndexedDB sessions store
    → App.tsx 刷新状态 → 渲染 SessionList + ChatView
```

---

## 三平台数据格式差异

### ChatGPT
- **输入**：ZIP包（含 `conversations.json` 300MB+ 和图片文件）
- **消息结构**：树状 mapping（parent/children UUID链表），需从 current_node 往上遍历还原线性路径
- **角色字段**：`author.role` = "user" / "assistant" / "system" / "tool"
- **时间格式**：Unix 时间戳（float）
- **图片**：ZIP中有 `file_XXXXX-sanitized.jpeg/png`，JSON中引用格式为 `file-service://file-XXXXX`
- **模型**：`metadata.model_slug`
- **特殊**：支持分支浏览（ChatView 中已实现 branch navigation）

### Claude
- **输入**：ZIP包（含 `conversations.json` + `projects.json` + `memories.json` + `users.json`）
- **消息结构**：扁平数组 `chat_messages[]`，已有序
- **角色字段**：`sender` = "human" / "assistant"
- **时间格式**：ISO 8601 字符串
- **图片**：❌ 不包含在导出中
- **模型**：可能缺失
- **项目分类**：`projects.json` 提供 project UUID → name 映射
- **思维链**：assistant 消息的 `content` 可能是数组，含 `{type: "thinking", thinking: "..."}` 块
  - ⚠️ 当前 parseClaude 只读取 `msg.text`，未处理 content 数组中的 thinking/tool_use blocks

### Gemini
- **输入**：Google Takeout ZIP（`Gemini Apps/` 目录下的 JSON 文件）
- **消息结构**：`entries[]` 数组
- **角色字段**：`role` = "user" / "model"
- **时间格式**：ISO 8601 字符串
- **图片**：未知，待确认
- **模型**：未知
- ⚠️ Google Takeout 格式经常变化，导出质量可能不佳（内容截断）
- ⚠️ 当前 parseGemini 假设 `data.conversations[].messages[]` 结构，但实际 Takeout 用的是 `entries[]`

---

## 🔴 当前最高优先级 Bug：ChatGPT 图片不显示

### 症状
导入 ChatGPT ZIP 后，包含图片的消息显示 "Image not found"。ZIP 中确认包含对应图片文件（用户上传的截图 AND DALL-E 生成的图片都在）。

### 调试方向

**parser.ts 第43-53行**（ZIP图片提取）：
```javascript
// 当前正则：/(file_[a-zA-Z0-9]+)-sanitized/
// 可能的问题：
// 1. ZIP内的文件可能有子目录路径前缀
// 2. 文件名中的ID格式可能不完全匹配正则
// 3. 图片文件可能不全带 "-sanitized" 后缀
```

**parser.ts 第137-141行**（JSON asset_pointer 解析）：
```javascript
// 当前逻辑：
// "file-service://file-XXXXX" → 去前缀 → "file-XXXXX" → 替换 "file-" 为 "file_" → "file_XXXXX"
// 可能的问题：
// 1. asset_pointer 格式可能不都以 "file-service://" 开头
// 2. 某些图片可能不是 image_asset_pointer 类型
// 3. DALL-E 生成的图片的引用格式可能完全不同（可能是 URL 而非 file-service）
```

### 调试步骤
1. 在 `parseZip` 图片提取循环中加 `console.log`：
   - 打印前 10 个匹配到的 ZIP 图片文件名
   - 打印提取到的 normalizedId
   - 打印 saveImage 调用次数
2. 在 `parseChatGPTMessage` 的 multimodal_text 分支中加 `console.log`：
   - 打印前 10 个 asset_pointer 原始值
   - 打印转换后的 normalizedId
3. 在 `AsyncImage.tsx` 的 `getImage` 调用中加 `console.log`：
   - 打印请求的 imageId
   - 打印是否获取到 base64 数据
4. **对比两侧的 ID 是否完全一致**——差一个字符都不行

### 可能的修复方向
- 如果是路径前缀问题：提取文件名时用 `filename.split('/').pop()` 取最后一段
- 如果是正则不够宽泛：改为 `/(file_[^-]+)-sanitized/` 或更宽松的匹配
- 如果是 DALL-E 图片格式不同：需要处理 `dalle.text2im` recipient 的消息中的图片引用

---

## 📋 TODO 优先级列表

### P0（立即修复）
1. **ChatGPT 图片不显示**——上面的调试步骤
2. **空消息过滤**——`parseChatGPTMessage` 返回 null 的消息应该在 ChatView 中不渲染（当前有些空气泡还是显示了）

### P1（功能完善）
3. **Claude 思维链支持**——`parseClaude` 需要检查 `msg.content` 是否为数组，提取 thinking/text/tool_use blocks，映射到 `MessagePart[]`
4. **Claude 空 session 处理**——大量 "Untitled Session · No messages"，提供批量清理功能
5. **Gemini adapter 修正**——当前 `parseGemini` 的字段名可能与实际 Takeout 格式不匹配（`messages` vs `entries`，`author` vs `role`），需要用实际导出数据验证

### P2（体验优化）
6. **消息编辑/删除持久化**——编辑后需要写回 IndexedDB
7. **消息时间间隔分隔线**——两条消息时间跨度大于1小时时，显示日期分隔线
8. **隐藏工具/system消息**——设置中增加开关
9. **DALL-E prompt 占位卡片**——对于无法显示的 DALL-E 图片，显示 prompt 描述

### P3（新功能）
10. **搜索功能**——全文搜索 session 标题和消息内容
11. **导出修改后的数据**——允许用户导出清理/编辑后的 JSON
12. **Gemini Takeout 格式验证**——等 Luna 收到 Takeout 导出后，用实际数据修正 adapter

---

## 代码规范

1. **保留 Tailwind 类名**——不要把 Tailwind 转成普通 CSS
2. **组件文件位置**——所有组件放 `src/components/`
3. **类型定义**——所有接口和类型放 `src/types.ts`
4. **数据库操作**——所有 IndexedDB 操作通过 `src/lib/db.ts` 的函数
5. **解析逻辑**——所有平台 adapter 集中在 `src/lib/parser.ts`
6. **不要动 UI 布局和样式**——除非 Luna 明确要求。只改逻辑和数据层
7. **中文注释 OK**——Luna 看得懂中文比英文快

---

## 开发命令

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器 (localhost:3000)
npm run build      # 生产构建
npm run lint       # TypeScript 类型检查
```

---

## 部署

Vercel 自动部署。`git push` 到 main 分支即触发构建。

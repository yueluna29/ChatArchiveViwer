import { openDB, IDBPDatabase } from 'idb';
import { Session, Folder } from '../types';

const DB_NAME = 'chat_archive_db';
const DB_VERSION = 2;

export interface ChatArchiveDB extends IDBPDatabase {
  sessions: {
    key: string;
    value: Session;
    indexes: { 'by-platform': string; 'by-folder': string; 'by-time': number };
  };
  folders: {
    key: string;
    value: Folder;
  };
  images: {
    key: string;
    value: string; // base64 string
  };
}

export async function initDB() {
  return openDB<ChatArchiveDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-platform', 'platform');
        sessionStore.createIndex('by-folder', 'folderId');
        sessionStore.createIndex('by-time', 'updateTime');
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    },
  });
}

export async function saveSession(session: Session) {
  const db = await initDB();
  return db.put('sessions', session);
}

export async function getAllSessions() {
  const db = await initDB();
  return db.getAll('sessions');
}

export async function deleteSession(id: string) {
  const db = await initDB();
  return db.delete('sessions', id);
}

export async function saveFolder(folder: Folder) {
  const db = await initDB();
  return db.put('folders', folder);
}

export async function getAllFolders() {
  const db = await initDB();
  return db.getAll('folders');
}

export async function deleteFolder(id: string) {
  const db = await initDB();
  return db.delete('folders', id);
}

export async function saveImage(id: string, base64: string) {
  const db = await initDB();
  return db.put('images', base64, id);
}

export async function getImage(id: string) {
  const db = await initDB();
  return db.get('images', id);
}

export async function clearAllData() {
  const db = await initDB();
  const tx = db.transaction(['sessions', 'folders', 'images'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('folders').clear();
  await tx.objectStore('images').clear();
  await tx.done;
}

// src/lib/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'data', 'app.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_prompt TEXT NOT NULL,
    enhanced_prompt TEXT NOT NULL,
    image_filename TEXT NOT NULL,
    thumbs_up INTEGER DEFAULT 0,
    thumbs_down INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating_type TEXT NOT NULL CHECK (rating_type IN ('thumbs_up', 'thumbs_down')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(image_id, user_id),
    FOREIGN KEY (image_id) REFERENCES images (id)
  );
`);

export interface ImageEntry {
  id: string;
  user_id: string;
  original_prompt: string;
  enhanced_prompt: string;
  image_filename: string;
  image_url?: string; // For compatibility with your existing components
  thumbs_up: number;
  thumbs_down: number;
  created_at: string;
}

export interface NewImagePayload {
  user_id: string;
  original_prompt: string;
  enhanced_prompt: string;
  image_data: Buffer;
}

// Save image to file system and return filename
function saveImageFile(imageBuffer: Buffer, imageId: string): string {
  const imagesDir = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  const filename = `${imageId}.png`;
  const filepath = path.join(imagesDir, filename);
  fs.writeFileSync(filepath, imageBuffer);
  return filename;
}

export const addImage = (imageData: NewImagePayload): string => {
  const id = crypto.randomUUID();
  const filename = saveImageFile(imageData.image_data, id);
  
  const stmt = db.prepare(`
    INSERT INTO images (id, user_id, original_prompt, enhanced_prompt, image_filename)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, imageData.user_id, imageData.original_prompt, imageData.enhanced_prompt, filename);
  return id;
};

export const getImages = (): ImageEntry[] => {
  const stmt = db.prepare(`
    SELECT * FROM images 
    ORDER BY created_at DESC
  `);
  
  const images = stmt.all() as ImageEntry[];
  
  // Add image_url for compatibility
  return images.map(image => ({
    ...image,
    image_url: `/images/${image.image_filename}`
  }));
};

export const rateImage = (imageId: string, userId: string, ratingType: 'thumbs_up' | 'thumbs_down'): void => {
  db.transaction(() => {
    // Remove any existing rating from this user for this image
    const deleteStmt = db.prepare('DELETE FROM ratings WHERE image_id = ? AND user_id = ?');
    deleteStmt.run(imageId, userId);
    
    // Add new rating
    const insertStmt = db.prepare(`
      INSERT INTO ratings (image_id, user_id, rating_type)
      VALUES (?, ?, ?)
    `);
    insertStmt.run(imageId, userId, ratingType);
    
    // Update counts in images table
    const updateStmt = db.prepare(`
      UPDATE images SET 
        thumbs_up = (SELECT COUNT(*) FROM ratings WHERE image_id = ? AND rating_type = 'thumbs_up'),
        thumbs_down = (SELECT COUNT(*) FROM ratings WHERE image_id = ? AND rating_type = 'thumbs_down')
      WHERE id = ?
    `);
    updateStmt.run(imageId, imageId, imageId);
  })();
};

export default db;
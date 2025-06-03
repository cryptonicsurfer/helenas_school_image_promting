// src/lib/database.ts
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure DATABASE_URL is set, otherwise throw an error or provide a default
// For now, we'll assume it's set in the environment as per your instructions.
if (!process.env.DATABASE_URL) {
  console.warn(
    'DATABASE_URL environment variable is not set. PostgreSQL connection will likely fail.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initializeSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      -- NextAuth.js Tables (must be created first due to FK dependencies)
      CREATE TABLE IF NOT EXISTS users (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        image TEXT,
        password TEXT -- For Credentials provider
      );

      CREATE TABLE IF NOT EXISTS accounts (
        "userId" TEXT NOT NULL,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        PRIMARY KEY (provider, "providerAccountId"),
        FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT NOT NULL PRIMARY KEY,
        "sessionToken" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        FOREIGN KEY ("userId") REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      );

      -- Application Specific Tables (can now reference users table)
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_prompt TEXT NOT NULL,
        enhanced_prompt TEXT NOT NULL,
        image_filename TEXT NOT NULL,
        thumbs_up INTEGER DEFAULT 0,
        thumbs_down INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating_type TEXT NOT NULL CHECK (rating_type IN ('thumbs_up', 'thumbs_down')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(image_id, user_id)
      );
    `);
    console.log('Database schema (including NextAuth tables) initialized successfully.');
  } catch (err) {
    console.error('Error initializing database schema:', err);
    // Depending on the error, you might want to exit the process
    // or handle it in a way that allows the application to continue (if possible)
    // For critical schema errors, exiting might be appropriate: process.exit(1);
  } finally {
    client.release();
  }
};

// Call initialization
initializeSchema().catch(err => {
  console.error("Failed to initialize database schema on startup:", err);
  // Potentially exit if schema initialization is critical for app startup
  // process.exit(1);
});

export interface ImageEntry {
  id: string;
  user_id: string;
  user_name?: string; // Added for displaying user's name
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

export const addImage = async (imageData: NewImagePayload): Promise<string> => {
  const id = crypto.randomUUID();
  const filename = saveImageFile(imageData.image_data, id);
  
  const queryText = `
    INSERT INTO images (id, user_id, original_prompt, enhanced_prompt, image_filename)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const values = [id, imageData.user_id, imageData.original_prompt, imageData.enhanced_prompt, filename];
  
  try {
    await pool.query(queryText, values);
    return id;
  } catch (err) {
    console.error('Error adding image to database:', err);
    throw err; // Re-throw the error to be handled by the caller
  }
};

export const getImages = async (): Promise<ImageEntry[]> => {
  const queryText = `
    SELECT
      i.id,
      i.user_id,
      u.name AS user_name, -- Select the user's name
      i.original_prompt,
      i.enhanced_prompt,
      i.image_filename,
      i.thumbs_up,
      i.thumbs_down,
      i.created_at::TEXT AS created_at
    FROM images i
    LEFT JOIN users u ON i.user_id = u.id -- Join with users table
    ORDER BY i.created_at DESC
  `;
  // Note: Casting created_at to TEXT. Adjust if specific date formatting is needed client-side.
  // Alternatively, handle Date objects directly in your application.
  
  try {
    const result = await pool.query(queryText);
    const images = result.rows as ImageEntry[];
    
    // Add image_url for compatibility
    return images.map(image => ({
      ...image,
      image_url: `/images/${image.image_filename}`
    }));
  } catch (err) {
    console.error('Error fetching images from database:', err);
    throw err;
  }
};

export const rateImage = async (imageId: string, userId: string, ratingType: 'thumbs_up' | 'thumbs_down'): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove any existing rating from this user for this image
    const deleteQuery = 'DELETE FROM ratings WHERE image_id = $1 AND user_id = $2';
    await client.query(deleteQuery, [imageId, userId]);
    
    // Add new rating
    const insertQuery = `
      INSERT INTO ratings (image_id, user_id, rating_type)
      VALUES ($1, $2, $3)
    `;
    await client.query(insertQuery, [imageId, userId, ratingType]);
    
    // Update counts in images table
    // Using a subquery to count directly in the UPDATE statement
    const updateQuery = `
      UPDATE images SET
        thumbs_up = (SELECT COUNT(*) FROM ratings WHERE image_id = $1 AND rating_type = 'thumbs_up'),
        thumbs_down = (SELECT COUNT(*) FROM ratings WHERE image_id = $1 AND rating_type = 'thumbs_down')
      WHERE id = $1
    `;
    await client.query(updateQuery, [imageId]);
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error rating image, transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Export the pool for potential direct use elsewhere, though using the functions is preferred.
export { pool };
// Default export can be the pool or undefined, depending on preference.
// For consistency with the previous 'db' export, let's export the pool.
export default pool;
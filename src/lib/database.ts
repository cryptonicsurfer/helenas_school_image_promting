// src/lib/database.ts
import { Pool } from 'pg';
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
        image_base64_data TEXT, -- Store base64 encoded image data
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

      CREATE TABLE IF NOT EXISTS user_image_favorites (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, image_id)
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
  image_base64_data?: string; // Added to hold the base64 data
  image_url?: string; // Will be a data URI
  thumbs_up: number;
  thumbs_down: number;
  created_at: string;
  is_favorited?: boolean; // To indicate if the current user has favorited this image
}

export type ImageSortCriteria = 'created_at_desc' | 'thumbs_up_desc';
export type ImageFilterCriteria = 'all' | 'favorites';

export interface NewImagePayload {
  user_id: string;
  original_prompt: string;
  enhanced_prompt: string;
  image_data: Buffer;
}

export const addImage = async (imageData: NewImagePayload): Promise<string> => {
  const id = crypto.randomUUID();
  const imageBase64 = imageData.image_data.toString('base64');
  
  const queryText = `
    INSERT INTO images (id, user_id, original_prompt, enhanced_prompt, image_base64_data)
    VALUES ($1, $2, $3, $4, $5)
  `;
  const values = [id, imageData.user_id, imageData.original_prompt, imageData.enhanced_prompt, imageBase64];
  
  try {
    await pool.query(queryText, values);
    return id;
  } catch (err) {
    console.error('Error adding image to database:', err);
    throw err; // Re-throw the error to be handled by the caller
  }
};

export const getImages = async (
  currentUserId?: string, // Optional: to check if the current user has favorited images
  sortBy: ImageSortCriteria = 'created_at_desc',
  filterBy: ImageFilterCriteria = 'all'
): Promise<ImageEntry[]> => {
  let orderByClause = 'ORDER BY i.created_at DESC';
  if (sortBy === 'thumbs_up_desc') {
    orderByClause = 'ORDER BY i.thumbs_up DESC, i.created_at DESC';
  }

  const queryParams: string[] = [];
  
  const selectBase = [
    'i.id',
    'i.user_id',
    'u.name AS user_name',
    'i.original_prompt',
    'i.enhanced_prompt',
    'i.image_base64_data',
    'i.thumbs_up',
    'i.thumbs_down',
    'i.created_at::TEXT AS created_at'
  ];
  const joinClauses = ['LEFT JOIN users u ON i.user_id = u.id'];
  const whereConditions: string[] = [];

  if (currentUserId) {
    // currentUserId will always be $1 if present.
    queryParams.push(currentUserId);
    selectBase.push(`(EXISTS(SELECT 1 FROM user_image_favorites WHERE user_id = $1 AND image_id = i.id)) AS is_favorited`);

    if (filterBy === 'favorites') {
      joinClauses.push('INNER JOIN user_image_favorites f ON i.id = f.image_id');
      whereConditions.push(`f.user_id = $1`);
    }
  }
  // API route ensures filterBy !== 'favorites' if currentUserId is null.

  const selectClause = `SELECT ${selectBase.join(', ')}`;
  const fromClause = 'FROM images i';
  const joins = joinClauses.join(' ');
  const wheres = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const queryText = `${selectClause} ${fromClause} ${joins} ${wheres} ${orderByClause}`;
  
  try {
    const result = await pool.query(queryText, queryParams);
    const images = result.rows as ImageEntry[];
    
    return images.map(image => {
      const { image_base64_data, ...rest } = image;
      return {
        ...rest,
        image_url: image_base64_data ? `data:image/png;base64,${image_base64_data}` : undefined,
        is_favorited: image.is_favorited === undefined ? false : image.is_favorited // Ensure boolean
      };
    });
  } catch (err) {
    console.error('Error fetching images from database:', err);
    console.error('Query:', queryText); // Log the query for debugging
    console.error('Params:', queryParams); // Log the params for debugging
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

export const deleteImage = async (imageId: string, userId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    // First, verify the user owns the image
    const verifyQuery = 'SELECT user_id FROM images WHERE id = $1';
    const verifyResult = await client.query(verifyQuery, [imageId]);

    if (verifyResult.rows.length === 0) {
      console.log(`Image with id ${imageId} not found.`);
      return false; // Image not found
    }

    const imageOwnerId = verifyResult.rows[0].user_id;
    if (imageOwnerId !== userId) {
      console.warn(`User ${userId} attempted to delete image ${imageId} owned by ${imageOwnerId}.`);
      return false; // User does not own the image
    }

    // If verification passes, delete the image
    // Associated ratings will be deleted due to ON DELETE CASCADE
    const deleteQuery = 'DELETE FROM images WHERE id = $1 AND user_id = $2';
    const result = await client.query(deleteQuery, [imageId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  } catch (err) {
    console.error(`Error deleting image ${imageId} for user ${userId}:`, err);
    throw err; // Re-throw the error to be handled by the caller
  } finally {
    client.release();
  }
};

// Export the pool for potential direct use elsewhere, though using the functions is preferred.
export { pool };
// Default export can be the pool or undefined, depending on preference.
// For consistency with the previous 'db' export, let's export the pool.
export default pool;

export const addFavorite = async (userId: string, imageId: string): Promise<void> => {
  const queryText = `
    INSERT INTO user_image_favorites (user_id, image_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, image_id) DO NOTHING;
  `;
  try {
    await pool.query(queryText, [userId, imageId]);
  } catch (err) {
    console.error(`Error adding favorite for user ${userId}, image ${imageId}:`, err);
    throw err;
  }
};

export const removeFavorite = async (userId: string, imageId: string): Promise<void> => {
  const queryText = 'DELETE FROM user_image_favorites WHERE user_id = $1 AND image_id = $2';
  try {
    await pool.query(queryText, [userId, imageId]);
  } catch (err) {
    console.error(`Error removing favorite for user ${userId}, image ${imageId}:`, err);
    throw err;
  }
};
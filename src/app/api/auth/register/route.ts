import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { pool } from '@/lib/database'; // Your existing PostgreSQL connection pool
import { randomUUID } from 'crypto'; // For generating user IDs

const SALT_ROUNDS = 10; // For bcrypt hashing

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields (name, email, password)' }, { status: 400 });
    }

    // Basic email validation (consider a more robust library for production)
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Check if email already exists
      const existingUserResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUserResult.rowCount && existingUserResult.rowCount > 0) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 }); // 409 Conflict
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const userId = randomUUID(); // Generate a UUID for the user

      // Insert new user
      const insertQuery = `
        INSERT INTO users (id, name, email, password, "emailVerified") 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name; 
      `;
      // Setting emailVerified to null by default. 
      // You might want to implement an email verification flow later.
      const newUserResult = await client.query(insertQuery, [userId, name, email, hashedPassword, null]);
      
      if (newUserResult.rows[0]) {
        const newUser = newUserResult.rows[0];
        // Do not return password
        return NextResponse.json({ 
            success: true, 
            user: { id: newUser.id, email: newUser.email, name: newUser.name } 
        }, { status: 201 });
      } else {
        throw new Error("User creation failed after insert.");
      }

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    // Check if error is a known type or has a specific message to provide more context
    if (error instanceof Error && error.message.includes("duplicate key value violates unique constraint")) {
        return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
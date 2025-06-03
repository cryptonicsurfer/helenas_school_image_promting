// src/app/api/images/[id]/favorite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { addFavorite, removeFavorite } from '@/lib/database';
import { revalidatePath } from 'next/cache';

interface RouteParams {
  params: {
    id: string; // Image ID from the route
  };
}

async function handler(request: NextRequest, { params }: RouteParams, method: 'POST' | 'DELETE') {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const authenticatedUserId = session.user.id;
  const { id: imageId } = params;

  if (!imageId) {
    return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
  }

  try {
    if (method === 'POST') {
      await addFavorite(authenticatedUserId, imageId);
    } else if (method === 'DELETE') {
      await removeFavorite(authenticatedUserId, imageId);
    } else {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Revalidate paths where images are displayed and favorite status might change
    revalidatePath('/prompt');
    revalidatePath('/collage');
    // Potentially revalidate user-specific favorite pages if they exist

    return NextResponse.json({ success: true, message: `Favorite ${method === 'POST' ? 'added' : 'removed'} successfully` });
  } catch (error) {
    console.error(`Error in ${method} /api/images/${imageId}/favorite:`, error);
    return NextResponse.json({ error: `Failed to ${method === 'POST' ? 'add' : 'remove'} favorite` }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return handler(request, context, 'POST');
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return handler(request, context, 'DELETE');
}
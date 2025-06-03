// src/app/api/images/[id]/rate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { submitRating } from '@/services/imageService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjusted path

interface RouteParams {
  params: { // params is not a Promise here, it's directly available
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const authenticatedUserId = session.user.id;

  try {
    // userId is now taken from session, no longer from request body
    const { ratingType } = await request.json();
    const { id: imageId } = params; // imageId from route params
    
    // Updated validation: userId is from session
    if (!ratingType || !['thumbs_up', 'thumbs_down'].includes(ratingType)) {
      return NextResponse.json({ error: 'Invalid rating data (ratingType is required)' }, { status: 400 });
    }
    
    await submitRating(imageId, authenticatedUserId, ratingType as 'thumbs_up' | 'thumbs_down');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rating image:', error);
    return NextResponse.json({ error: 'Failed to rate image' }, { status: 500 });
  }
}
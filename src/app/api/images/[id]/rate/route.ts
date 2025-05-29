// src/app/api/images/[id]/rate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { submitRating } from '@/services/imageService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, ratingType } = await request.json();
    const { id } = await params; // ✅ Await params before using
    
    if (!userId || !ratingType || !['thumbs_up', 'thumbs_down'].includes(ratingType)) {
      return NextResponse.json({ error: 'Invalid rating data' }, { status: 400 });
    }
    
    await submitRating(id, userId, ratingType);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rating image:', error);
    return NextResponse.json({ error: 'Failed to rate image' }, { status: 500 });
  }
}
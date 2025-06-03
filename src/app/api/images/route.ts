// src/app/api/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllImages, addImageToDatabase } from '@/services/imageService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjusted path
import { ImageSortCriteria, ImageFilterCriteria } from '@/lib/database'; // Import criteria types

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') as ImageSortCriteria | null;
    const filterBy = searchParams.get('filterBy') as ImageFilterCriteria | null;

    // Validate sortBy parameter
    const validSortCriteria: ImageSortCriteria[] = ['created_at_desc', 'thumbs_up_desc'];
    const sortCriteria = sortBy && validSortCriteria.includes(sortBy) ? sortBy : 'created_at_desc';

    // Validate filterBy parameter
    const validFilterCriteria: ImageFilterCriteria[] = ['all', 'favorites'];
    const filterCriteria = filterBy && validFilterCriteria.includes(filterBy) ? filterBy : 'all';
    
    // If filtering by favorites, user must be logged in
    if (filterCriteria === 'favorites' && !currentUserId) {
      return NextResponse.json({ error: 'Unauthorized to filter by favorites' }, { status: 401 });
    }

    const images = await getAllImages(currentUserId, sortCriteria, filterCriteria);
    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const data = await request.json();
    // user_id is now taken from session, no longer from request body
    const { original_prompt, enhanced_prompt, image_data_uri } = data;
    
    // Updated validation: user_id is from session
    if (!image_data_uri || !original_prompt || !enhanced_prompt) {
      return NextResponse.json({ error: 'Missing required fields (original_prompt, enhanced_prompt, image_data_uri)' }, { status: 400 });
    }
    
    // Convert base64 to buffer
    const base64Data = image_data_uri.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const imageId = await addImageToDatabase({
      user_id: userId, // Use user ID from session
      original_prompt,
      enhanced_prompt,
      image_data: imageBuffer,
    });
    
    return NextResponse.json({ success: true, imageId });
  } catch (error) {
    console.error('Error adding image:', error);
    return NextResponse.json({ error: 'Failed to add image' }, { status: 500 });
  }
}
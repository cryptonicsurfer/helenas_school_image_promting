// src/app/api/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllImages, addImageToDatabase } from '@/services/imageService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjusted path

export async function GET() {
  // Consider if this route should also be protected or if public images are intended
  try {
    const images = await getAllImages();
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
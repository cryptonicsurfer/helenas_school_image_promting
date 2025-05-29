// src/app/api/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllImages, addImageToDatabase } from '@/services/imageService';

export async function GET() {
  try {
    const images = getAllImages();
    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { user_id, original_prompt, enhanced_prompt, image_data_uri } = data;
    
    if (!image_data_uri || !user_id || !original_prompt || !enhanced_prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Convert base64 to buffer
    const base64Data = image_data_uri.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const imageId = await addImageToDatabase({
      user_id,
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
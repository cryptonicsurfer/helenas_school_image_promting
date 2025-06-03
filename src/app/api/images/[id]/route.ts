// src/app/api/images/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { deleteImage } from '@/lib/database'; // Import the new deleteImage function

interface RouteParams {
  params: {
    id: string; // Image ID from the route
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const success = await deleteImage(imageId, authenticatedUserId);

    if (!success) {
      // This could be because the image wasn't found or the user doesn't own it.
      // The database function logs the specific reason.
      return NextResponse.json({ error: 'Failed to delete image or image not found/not owned' }, { status: 404 });
    }

    // Revalidate paths where images are displayed
    revalidatePath('/prompt');
    revalidatePath('/collage');
    // If images are also on the home page or other specific image list pages, add them here.
    // e.g., revalidatePath('/');

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error(`Error in DELETE /api/images/${imageId}:`, error);
    return NextResponse.json({ error: 'Failed to delete image due to a server error' }, { status: 500 });
  }
}
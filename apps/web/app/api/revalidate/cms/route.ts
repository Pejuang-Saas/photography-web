import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const providedSecret = request.headers.get('x-revalidate-secret');

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('landing-cms', 'max');
  return NextResponse.json({ revalidated: true, tag: 'landing-cms' });
}

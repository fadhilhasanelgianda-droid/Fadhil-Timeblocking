import { NextRequest, NextResponse } from 'next/server';
import { updateTimeBlock, deleteTimeBlock } from '@/lib/sheetsService';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const data = await req.json();
    const block = await updateTimeBlock(id, data);
    if (!block) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(block);
  } catch (error) {
    console.error('Failed to update timeblock:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const success = await deleteTimeBlock(id);
    if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete timeblock:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

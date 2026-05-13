import { NextRequest, NextResponse } from 'next/server';
import { getTimeBlocks, createTimeBlock } from '@/lib/sheetsService';
import { validateCreatePayload } from '@/lib/validation';

export async function GET() {
  try {
    const blocks = await getTimeBlocks();
    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Failed to get timeblocks:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const errors = validateCreatePayload(data);
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const block = await createTimeBlock(data);
    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error('Failed to create timeblock:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

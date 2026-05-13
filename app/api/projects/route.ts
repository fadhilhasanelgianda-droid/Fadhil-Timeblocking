import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/sheetsService';
import { COLOR_BG_MAP } from '@/src/constants';

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to get projects:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const errors: { field: string; message: string }[] = [];

    const name = typeof data?.name === 'string' ? data.name.trim() : '';
    const color = typeof data?.color === 'string' ? data.color.trim() : '';

    if (!name) errors.push({ field: 'name', message: 'Nama project wajib diisi' });
    if (name.length > 60) errors.push({ field: 'name', message: 'Nama maksimal 60 karakter' });
    if (!color) errors.push({ field: 'color', message: 'Warna wajib dipilih' });
    else if (!COLOR_BG_MAP[color]) errors.push({ field: 'color', message: 'Warna tidak valid' });

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const project = await createProject(name, color);
    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create project:', error);
    // Duplicate name returns 409
    if (message.toLowerCase().includes('sudah ada')) {
      return NextResponse.json({ errors: [{ field: 'name', message }] }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

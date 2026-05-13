import { NextRequest, NextResponse } from 'next/server';
import { deleteProject, getProjects, countActiveTasksForProject } from '@/lib/sheetsService';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const force = req.nextUrl.searchParams.get('force') === 'true';

    // Find project (need its name for active-task check)
    const projects = await getProjects();
    const project = projects.find(p => p.id === id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Block delete if active tasks exist, unless forced
    const activeCount = await countActiveTasksForProject(project.name);
    if (activeCount > 0 && !force) {
      return NextResponse.json(
        {
          error: 'has_active_tasks',
          message: `Project "${project.name}" masih punya ${activeCount} task aktif`,
          activeCount,
          projectName: project.name,
        },
        { status: 409 },
      );
    }

    const ok = await deleteProject(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

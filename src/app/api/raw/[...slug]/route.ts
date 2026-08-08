import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const getVaultPath = () => process.env.VAULT_PATH || '';

const mimeTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    return new NextResponse('VAULT_PATH not configured', { status: 500 });
  }

  const { slug: slugSegments } = await params;
  const slug = slugSegments.map(decodeURIComponent).join('/');
  const filePath = path.join(vaultPath, slug);

  // Prevent path traversal attacks
  const resolvedPath = path.resolve(filePath);
  const resolvedVault = path.resolve(vaultPath);
  if (!resolvedPath.startsWith(resolvedVault)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Read the file as a buffer
    const fileBuffer = await fs.readFile(resolvedPath);
    
    // Return the response with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(resolvedPath)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('File not found', { status: 404 });
  }
}

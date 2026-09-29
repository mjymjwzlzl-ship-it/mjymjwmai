import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();

    // 헤더 전달
    const headers = new Headers();
    const authorization = request.headers.get('Authorization');
    if (authorization) {
      headers.set('Authorization', authorization);
    }
    headers.set('Content-Type', 'application/json');

    // 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/support/mails/${params.id}/forward`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Forward proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward email' },
      { status: 500 }
    );
  }
}

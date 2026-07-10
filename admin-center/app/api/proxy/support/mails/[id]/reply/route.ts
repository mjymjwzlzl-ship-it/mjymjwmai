import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;

    // FormData를 그대로 전달 (파일 첨부 지원)
    const formData = await request.formData();

    // 헤더 전달
    const headers = new Headers();
    const authorization = request.headers.get('Authorization');
    if (authorization) {
      headers.set('Authorization', authorization);
    }
    // Content-Type은 자동으로 multipart/form-data로 설정됨

    // 백엔드 API 호출
    const response = await fetch(`${BACKEND_URL}/api/support/mails/${params.id}/reply`, {
      method: 'POST',
      headers,
      body: formData, // FormData 그대로 전달
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Reply proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

// 호스트에 따라 API URL 결정
function getApiBaseUrl(request: NextRequest) {
  const host = request.headers.get('host') || '';
  
  // 온라인 환경
  if (host.includes('arata.co.kr')) {
    return 'https://api.arata.co.kr';
  }
  
  // 로컬 환경
  return 'http://localhost:8000';
}

export async function GET(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl(request);
    const searchParams = request.nextUrl.searchParams;
    const isAdult = searchParams.get('adult') === 'true';
    
    const url = isAdult 
      ? `${API_BASE_URL}/api/comics/adult`
      : `${API_BASE_URL}/api/comics`;
    
    const headers: HeadersInit = {};
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Comics API proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch comics' },
      { status: 500 }
    );
  }
}
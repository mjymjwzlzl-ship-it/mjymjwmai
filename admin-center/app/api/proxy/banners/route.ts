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
    const isAdmin = searchParams.get('admin') === 'true';
    
    const url = isAdmin 
      ? `${API_BASE_URL}/api/banners/admin`
      : `${API_BASE_URL}/api/banners`;
    
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
    console.error('Banner API proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch banners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl(request);
    const formData = await request.formData();
    
    const headers: HeadersInit = {};
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/banners`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Banner API proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create banner' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Banner ID is required' },
        { status: 400 }
      );
    }
    
    const formData = await request.formData();
    
    const headers: HeadersInit = {};
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/banners/${id}`, {
      method: 'PUT',
      headers,
      body: formData,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Banner API proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update banner' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Banner ID is required' },
        { status: 400 }
      );
    }
    
    const headers: HeadersInit = {};
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/banners/${id}`, {
      method: 'DELETE',
      headers,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Banner API proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete banner' },
      { status: 500 }
    );
  }
}
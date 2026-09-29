// 이미지 URL 생성 함수 - 환경에 따라 적절한 URL 생성
export function getImageUrl(path: string): string {
  if (!path) return '/images/placeholder.png'
  
  // 이미 전체 URL인 경우
  if (path.startsWith('http')) {
    return path
  }
  
  // uploads 경로 정규화
  let finalPath = path
  if (!finalPath.startsWith('/')) {
    finalPath = '/' + finalPath
  }
  
  // uploads 폴더가 없으면 추가
  if (!finalPath.startsWith('/uploads/')) {
    finalPath = '/uploads' + finalPath
  }
  
  // URL 인코딩 처리 - 경로 부분만 인코딩 (/ 제외)
  const pathParts = finalPath.split('/')
  const encodedPathParts = pathParts.map((part, index) => 
    index === 0 || part === '' ? part : encodeURIComponent(part)
  )
  const encodedPath = encodedPathParts.join('/')
  
  // 환경에 따라 다른 처리
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // 로컬환경: 프록시 사용
      return encodedPath
    } else {
      // 외부환경: 메인 도메인의 업로드 경로 사용 (HTTPS)
      return `https://arata.co.kr${encodedPath}`
    }
  }
  
  return encodedPath
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 
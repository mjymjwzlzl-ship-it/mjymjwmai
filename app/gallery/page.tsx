import { Suspense } from 'react';
import PhotobookGalleryClient from '@/components/gallery/PhotobookGalleryClient';

// 캐릭터 화보관 (탭·검색·필터는 주소 쿼리를 쓰므로 Suspense 로 감싼다)
export default function GalleryPage() {
  return <Suspense fallback={null}><PhotobookGalleryClient /></Suspense>;
}

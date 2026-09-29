import { redirect } from 'next/navigation';

// 예전 화보관(스톡 사진 목업) → 실제 화보 목록으로
export default function LegacyGalleryPage() {
  redirect('/gallery');
}

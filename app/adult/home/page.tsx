'use client';

export default function AdultHomePage() {
  // /adult로 리다이렉트
  if (typeof window !== 'undefined') {
    window.location.href = '/adult';
  }
  
  return null;
}
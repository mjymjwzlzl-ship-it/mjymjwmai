// 데이터베이스 모델 타입들
export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  provider?: string;
  providerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comic {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  genre: string[];
  isOfficial: boolean;
  status: ComicStatus;
  authorName?: string;
  viewCount: number;
  likeCount: number;
  authorId?: string;
  author?: User;
  episodes?: Episode[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  thumbnailUrl?: string; // 에피소드별 썸네일 URL
  hasEpisodeThumbnail?: boolean; // 에피소드 전용 썸네일 존재 여부
  comicThumbnailUrl?: string; // 웹툰 대표 썸네일 URL (폴백용)
  images: string[];
  viewCount: number;
  comicId: string;
  comic?: Comic;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  user?: User;
  comicId?: string;
  comic?: Comic;
  episodeId?: string;
  episode?: Episode;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  reporterId: string;
  reporter?: User;
  comicId?: string;
  comic?: Comic;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdConfig {
  id: string;
  name: string;
  position: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Enum 타입들
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  CS_ADMIN = 'CS_ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED'
}

export enum ComicStatus {
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  HIATUS = 'HIATUS'
}

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED'
}

// API 응답 타입들
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 폼 데이터 타입들
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface ComicFormData {
  title: string;
  description: string;
  genre: string[];
  thumbnail?: File;
  authorName?: string;
}

export interface EpisodeFormData {
  title: string;
  episodeNumber: number;
  images: File[];
}

// 컴포넌트 Props 타입들
export interface ComicCardProps {
  comic: Comic;
  showAuthor?: boolean;
  showViewCount?: boolean;
}

export interface EpisodeViewerProps {
  episode: Episode;
  onNext?: () => void;
  onPrev?: () => void;
}

// 광고 관련 타입들
export interface AdSlotProps {
  position: 'header' | 'footer' | 'native' | 'interstitial';
  className?: string;
}

// 반응형 화면 크기 타입
export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

// 정렬 옵션 타입
export type SortOption = 'latest' | 'popular' | 'views' | 'likes';

// 장르 타입
export type Genre = 
  | '액션'
  | '로맨스'
  | '판타지'
  | '드라마'
  | '코미디'
  | '호러'
  | '스릴러'
  | 'SF'
  | '일상'
  | '학원'
  | '스포츠'
  | '역사'
  | 'BL'
  | 'GL'; 
import React from 'react';

export interface Webtoon {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  isNew?: boolean;
  isAdult?: boolean;
  views: number;
  // New fields for the list view
  tags?: string[];
  likes?: number;
  updatedAt?: string;
  synopsis?: string;
  freeType?: 'completely_free' | 'first_episode_free';
}

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface BoardPost {
  id: number;
  title: string;
  author: string;
  date: string;
  views: number;
  isNotice?: boolean;
  commentCount?: number;
  category?: string;
}

export interface Photobook {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    price: number; // Coin price
    isPurchased: boolean;
    imageCount: number;
}

export interface CharacterProfile {
    id: string;
    name: string;
    webtoonTitle: string; // Origin webtoon
    thumbnail: string;
    description: string;
    photobooks: Photobook[];
}

export interface ShortsVideo {
    id: string;
    title: string;
    thumbnail: string;
    duration: string; // e.g. "05:30"
    views: number;
    tags: string[];
    author: string;
}
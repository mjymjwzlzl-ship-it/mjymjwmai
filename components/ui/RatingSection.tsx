'use client'

import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { api } from '@/lib/api'

interface RatingSectionProps {
  episodeId?: string | string[] | number | undefined
  // 작품 평점 모드: comicId 를 주면 작품 단위로 평가한다
  comicId?: string | string[] | number | undefined
  onRated?: (summary: { averageRating: number; totalRatings: number }) => void
  // 작품 평점 모드 제목 (기본 '작품 평점')
  title?: string
}

const RatingSection: React.FC<RatingSectionProps> = ({ episodeId, comicId, onRated, title }) => {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [hasRated, setHasRated] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Convert ids to string for API calls
  const episodeIdStr = Array.isArray(episodeId) ? episodeId[0] : String(episodeId || '')
  const comicIdStr = Array.isArray(comicId) ? comicId[0] : String(comicId || '')
  const isComic = !!comicIdStr
  const targetId = isComic ? comicIdStr : episodeIdStr
  const summaryPath = isComic ? `/comic-ratings/${comicIdStr}` : `/episodes/${episodeIdStr}/rating`
  const myRatingPath = isComic ? `/comic-ratings/${comicIdStr}/me` : `/episodes/${episodeIdStr}/user-rating`

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsLoggedIn(!!token)
    if (targetId) {
      fetchRatingData()
    }
  }, [targetId])

  const fetchRatingData = async () => {
    let summary: { averageRating: number; totalRatings: number } | null = null
    try {
      // 평균 평점 가져오기
      const response = await api.get(summaryPath)
      if (response.data) {
        // Convert from 0-10 scale to 0-5 scale for display
        const avgRating = (response.data.averageRating || 0) / 2
        setAverageRating(avgRating)
        setTotalRatings(response.data.totalRatings || 0)
        summary = { averageRating: avgRating, totalRatings: response.data.totalRatings || 0 }
      }

      // 사용자의 평점 확인
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          const userRatingResponse = await api.get(myRatingPath, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (userRatingResponse.data?.rating) {
            // Convert from 0-10 scale to 0-5 scale for display
            setRating(userRatingResponse.data.rating / 2)
            setHasRated(true)
          }
        } catch (error) {
          // 사용자 평점이 없는 경우 무시
          console.log('사용자 평점 없음')
        }
      }
    } catch (error) {
      console.error('평점 데이터 로드 실패:', error)
    }
    return summary
  }

  const submitRating = async (stars: number) => {
    if (!isLoggedIn) {
      alert('평점을 남기려면 로그인이 필요합니다.')
      window.location.href = '/login'
      return
    }

    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('authToken')
      // Convert 1-5 stars to 2-10 score (each star = 2 points)
      const score = stars * 2
      const response = await api.post(
        summaryPath,
        { score },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.data) {
        setRating(stars)
        setHasRated(true)
        // 평점 데이터 새로고침
        const summary = await fetchRatingData()
        if (summary) onRated?.(summary)
      }
    } catch (error) {
      console.error('평점 저장 실패:', error)
      alert('평점 저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (value: number, isInteractive: boolean = false, size: string = 'w-7 h-7') => {
    const displayValue = isInteractive && hoverRating > 0 ? hoverRating : value
    
    return (
      <div className="flex shrink-0 items-center gap-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            disabled={!isInteractive || isSubmitting}
            className={`${
              isInteractive && !isSubmitting 
                ? 'cursor-pointer' 
                : 'cursor-default'
            } p-1 hover:bg-gray-100 rounded transition-colors dark:hover:bg-gray-700`}
            onMouseEnter={isInteractive && !isSubmitting ? () => setHoverRating(i) : undefined}
            onMouseLeave={isInteractive && !isSubmitting ? () => setHoverRating(0) : undefined}
            onClick={isInteractive && !isSubmitting ? () => submitRating(i) : undefined}
          >
            <Star
              className={`${size} ${
                displayValue >= i 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-gray-400 fill-transparent dark:text-gray-500'
              }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    )
  }

  // 간결한 세로 배치 (작품 평점, 또는 제목을 준 회차 평점)
  if (isComic || title) {
    const shown = hoverRating || rating
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="whitespace-nowrap text-sm font-black text-gray-950 dark:text-white">{title || (isComic ? '작품 평점' : '회차 평점')}</h3>
          <span className="whitespace-nowrap text-xs font-bold text-gray-400">{totalRatings.toLocaleString()}명 참여</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl font-black leading-none text-gray-950 dark:text-white">{averageRating.toFixed(1)}</span>
          {renderStars(Math.round(averageRating), false, 'w-4 h-4')}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-white/10">
          <p className="whitespace-nowrap text-xs font-bold text-gray-500 dark:text-gray-400">
            {hasRated ? '내 평점' : isComic ? '이 작품을 평가해주세요' : '이 회차를 평가해주세요'}
            {shown > 0 && <span className="ml-1.5 text-yellow-500">{shown}.0</span>}
          </p>
          <div className="mt-1 -ml-1">{renderStars(rating, isLoggedIn, 'w-6 h-6')}</div>
          {!isLoggedIn && (
            <button
              type="button"
              onClick={() => (window.location.href = '/login')}
              className="mt-2 text-xs font-bold text-[#00a84c] hover:underline dark:text-[#00dc64]"
            >
              로그인하고 평점 남기기
            </button>
          )}
          {hasRated && !isSubmitting && (
            <p className="mt-1.5 text-[11px] text-gray-400">별을 다시 누르면 평점을 바꿀 수 있어요.</p>
          )}
          {isSubmitting && <p className="mt-1.5 text-[11px] text-gray-400">평점을 저장하는 중...</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
      {/* 평균 평점 표시 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {averageRating.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">평균 평점</div>
          </div>
          <div className="flex items-center gap-2">
            {renderStars(Math.round(averageRating))}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ({totalRatings.toLocaleString()}명)
            </div>
          </div>
        </div>
      </div>

      {/* 사용자 평점 입력 */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {hasRated ? '내 평점' : isComic ? '이 작품을 평가해주세요' : '이 에피소드를 평가해주세요'}
          </span>
          <div className="flex items-center gap-1">
            {/* 점수를 별 바로 왼쪽에 고정 */}
            <span className="text-lg font-bold text-yellow-400 w-8 text-right">
              {(hoverRating || rating) > 0 ? `${hoverRating || rating}.0` : ''}
            </span>
            {renderStars(rating, isLoggedIn && (isComic || !hasRated))}
          </div>
        </div>
        
        {!isLoggedIn && (
          <div className="mt-3 text-center">
            <button
              onClick={() => window.location.href = '/login'}
              className="text-purple-600 hover:text-purple-500 text-sm dark:text-purple-400 dark:hover:text-purple-300"
            >
              로그인하고 평점 남기기
            </button>
          </div>
        )}
        
        {hasRated && (
          <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            {isComic ? '평점을 남겨주셔서 감사합니다! 별을 다시 누르면 바꿀 수 있어요.' : '평점을 남겨주셔서 감사합니다!'}
          </div>
        )}
        
        {isSubmitting && (
          <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            평점을 저장하는 중...
          </div>
        )}
      </div>
    </div>
  )
}

export default RatingSection

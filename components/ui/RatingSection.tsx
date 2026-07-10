'use client'

import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { api } from '@/lib/api'

interface RatingSectionProps {
  episodeId: string | string[] | number | undefined
}

const RatingSection: React.FC<RatingSectionProps> = ({ episodeId }) => {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [hasRated, setHasRated] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Convert episodeId to string for API calls
  const episodeIdStr = Array.isArray(episodeId) ? episodeId[0] : String(episodeId || '')

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsLoggedIn(!!token)
    if (episodeIdStr) {
      fetchRatingData()
    }
  }, [episodeIdStr])

  const fetchRatingData = async () => {
    try {
      // 평균 평점 가져오기
      const response = await api.get(`/episodes/${episodeIdStr}/rating`)
      if (response.data) {
        // Convert from 0-10 scale to 0-5 scale for display
        const avgRating = (response.data.averageRating || 0) / 2
        setAverageRating(avgRating)
        setTotalRatings(response.data.totalRatings || 0)
      }

      // 사용자의 평점 확인
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          const userRatingResponse = await api.get(`/episodes/${episodeIdStr}/user-rating`, {
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
        `/episodes/${episodeIdStr}/rating`,
        { score },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.data) {
        setRating(stars)
        setHasRated(true)
        // 평점 데이터 새로고침
        await fetchRatingData()
      }
    } catch (error) {
      console.error('평점 저장 실패:', error)
      alert('평점 저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (value: number, isInteractive: boolean = false) => {
    const displayValue = isInteractive && hoverRating > 0 ? hoverRating : value
    
    return (
      <div className="flex items-center gap-0">
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
              className={`w-7 h-7 ${
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
            {hasRated ? '내 평점' : '이 에피소드를 평가해주세요'}
          </span>
          <div className="flex items-center gap-1">
            {/* 점수를 별 바로 왼쪽에 고정 */}
            <span className="text-lg font-bold text-yellow-400 w-8 text-right">
              {(hoverRating || rating) > 0 ? `${hoverRating || rating}.0` : ''}
            </span>
            {renderStars(rating, !hasRated && isLoggedIn)}
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
            평점을 남겨주셔서 감사합니다!
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

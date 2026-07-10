'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { eventBus, EVENTS } from '@/lib/events'
import { useAdultStore } from '@/store/adult'

export default function AttendancePage() {
  const router = useRouter()
  const setAdult = useAdultStore((s) => s.setAdult)
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const referrer = document.referrer
    if (referrer && referrer.includes('/adult')) {
      setAdult('on')
    }
    loadAttendanceStatus()
  }, [])

  const loadAttendanceStatus = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }
      const response = await api.get('/attendance/status', {
        headers: { Authorization: 'Bearer ' + token }
      })
      setAttendanceData(response.data)
    } catch (error) {
      console.error('출석 현황 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async () => {
    try {
      setChecking(true)
      setMessage('')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }
      const response = await api.post('/attendance/check', {}, {
        headers: { Authorization: 'Bearer ' + token }
      })
      setMessage(response.data.message)
      const userResponse = await api.get('/users/me', {
        headers: { Authorization: 'Bearer ' + token }
      })
      localStorage.setItem('user', JSON.stringify(userResponse.data))
      eventBus.emit(EVENTS.COIN_BALANCE_UPDATED, {
        coinBalance: userResponse.data.coinBalance
      })
      await loadAttendanceStatus()
    } catch (error: any) {
      setMessage(error.response?.data?.message || '출석 체크 실패')
    } finally {
      setChecking(false)
    }
  }

  const renderCalendar = () => {
    if (!attendanceData) return null
    const { year, month, attendances } = attendanceData
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay()
    const attendanceDates = attendances.map((a: any) => a.date.split('-')[2])
    const today = new Date()
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={'empty-' + i} className="h-10"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0')
      const isChecked = attendanceDates.includes(dayStr)
      const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()

      days.push(
        <div key={day} className="h-10 flex items-center justify-center">
          <span className={
            isToday
              ? 'w-8 h-8 flex items-center justify-center rounded-full bg-white text-black text-sm font-medium'
              : isChecked
                ? 'w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-white text-sm'
                : 'text-sm text-zinc-600'
          }>
            {day}
          </span>
        </div>
      )
    }
    return days
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-4 pb-12">

        <h1 className="text-xl font-semibold mb-8">출석체크</h1>

        {/* 출석 버튼 */}
        {!attendanceData?.checkedToday ? (
          <button
            onClick={handleCheckIn}
            disabled={checking}
            className="w-full py-4 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {checking ? '처리 중...' : '출석하기 (+' + (attendanceData?.nextReward || 1) + '코인)'}
          </button>
        ) : (
          <div className="w-full py-4 bg-zinc-900 text-zinc-500 font-medium rounded-xl text-center">
            출석 완료
          </div>
        )}

        {/* 메시지 */}
        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('완료') || message.includes('성공') ? 'text-green-500' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-semibold">{attendanceData?.currentStreak || 0}</div>
            <div className="text-xs text-zinc-500 mt-1">연속 출석</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-semibold">{attendanceData?.totalCoins || 0}</div>
            <div className="text-xs text-zinc-500 mt-1">이번 달 획득</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-semibold">{attendanceData?.totalDays || 0}</div>
            <div className="text-xs text-zinc-500 mt-1">총 출석</div>
          </div>
        </div>

        {/* 7일 연속 출석 보상 */}
        <div className="mt-8">
          <div className="text-sm text-zinc-400 mb-3">7일 연속 출석 보상</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isCompleted = (attendanceData?.currentStreak || 0) >= day
              const isBonus = day === 7
              return (
                <div
                  key={day}
                  className={`flex-1 aspect-square rounded-lg flex flex-col items-center justify-center ${isCompleted ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
                >
                  <span className="text-xs">{day}</span>
                  <span className={`text-xs font-medium ${isBonus && !isCompleted ? 'text-yellow-500' : ''}`}>
                    {isBonus ? '+10' : '+1'}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-zinc-600 mt-2">7일 연속 출석 시 보너스 10코인</p>
        </div>

        {/* 캘린더 */}
        {attendanceData && (
          <div className="mt-8">
            <div className="text-sm text-zinc-400 mb-4">{attendanceData.year}년 {attendanceData.month}월</div>
            <div className="grid grid-cols-7">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="h-10 flex items-center justify-center text-xs text-zinc-600">{day}</div>
              ))}
              {renderCalendar()}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

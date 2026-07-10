'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, XCircle, Clock, Filter, Search, Eye, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import { reportsAPI } from '@/lib/api-axios';

interface Report {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  reporter: {
    id: string;
    username: string;
    nickname?: string;
    email: string;
  };
  comic?: { id: string; title: string };
  episode?: { id: string; title: string; episodeNumber: number };
  comment?: { id: string; content: string };
  targetUser?: { id: string; username: string; nickname?: string; email: string };
}

interface ReportStats {
  total: number;
  pending: number;
  processing: number;
  resolved: number;
  rejected: number;
  byType: { type: string; _count: number }[];
  byReason: { reason: string; _count: number }[];
}

const REPORT_TYPES: { [key: string]: string } = {
  COMIC: '웹툰',
  EPISODE: '에피소드',
  COMMENT: '댓글',
  USER: '사용자'
};

const REPORT_REASONS: { [key: string]: string } = {
  INAPPROPRIATE: '부적절한 콘텐츠',
  COPYRIGHT: '저작권 침해',
  SPAM: '스팸/광고',
  VIOLENCE: '폭력적인 콘텐츠',
  ADULT: '성인물 노출',
  HATE: '혐오 발언',
  PRIVACY: '개인정보 노출',
  ILLEGAL: '불법 콘텐츠',
  OTHER: '기타'
};

const STATUS_LABELS: { [key: string]: string } = {
  PENDING: '대기중',
  PROCESSING: '처리중',
  RESOLVED: '해결됨',
  REJECTED: '반려됨'
};

const STATUS_COLORS: { [key: string]: string } = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
};

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      router.push('/login');
      return;
    }
    fetchReports();
    fetchStats();
  }, [currentPage, filterStatus, filterType]);

  const fetchReports = async () => {
    try {
      const params = {
        page: currentPage,
        limit: 20,
        ...(filterStatus && { status: filterStatus }),
        ...(filterType && { type: filterType })
      };

      const data: any = await reportsAPI.getReports(params);
      if (data && data.success) {
        setReports(data.reports || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('신고 목록 조회 실패:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data: any = await reportsAPI.getReportStats();
      if (data && data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('통계 조회 실패:', error);
      // 통계는 실패해도 기본값 유지
    }
  };

  const handleProcessReport = async (reportId: string, status: string) => {
    try {
      const data: any = await reportsAPI.processReport(reportId, { status, resolution });
      
      if (data && data.success) {
        alert('신고가 처리되었습니다.');
        setSelectedReport(null);
        setResolution('');
        await fetchReports();
        await fetchStats();
      }
    } catch (error) {
      console.error('신고 처리 실패:', error);
      alert('신고 처리 중 오류가 발생했습니다.');
    }
  };

  const getTargetName = (report: Report) => {
    if (report.comic) return `웹툰: ${report.comic.title}`;
    if (report.episode) return `에피소드: ${report.episode.title} (${report.episode.episodeNumber}화)`;
    if (report.comment) return `댓글: ${report.comment.content.substring(0, 50)}...`;
    if (report.targetUser) return `사용자: ${report.targetUser.nickname || report.targetUser.username}`;
    return '알 수 없음';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">신고 관리</h1>
          <p className="text-gray-600 mt-1">사용자 신고를 검토하고 처리합니다</p>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 신고</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Shield className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700">대기중</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">처리중</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.processing}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">해결됨</p>
                  <p className="text-2xl font-bold text-green-900">{stats.resolved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">반려됨</p>
                  <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 유형</option>
              {Object.entries(REPORT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 신고 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">신고 대상</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">사유</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">신고자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">신고일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{getTargetName(report)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{REPORT_TYPES[report.type]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{REPORT_REASONS[report.reason]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {report.reporter.nickname || report.reporter.username}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              페이지 {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 신고 상세 모달 */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">신고 상세</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">신고 대상</label>
                    <p className="mt-1 text-gray-900">{getTargetName(selectedReport)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">유형</label>
                      <p className="mt-1">{REPORT_TYPES[selectedReport.type]}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">사유</label>
                      <p className="mt-1">{REPORT_REASONS[selectedReport.reason]}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">상세 설명</label>
                    <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedReport.description || '없음'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">신고자</label>
                      <p className="mt-1">
                        {selectedReport.reporter.nickname || selectedReport.reporter.username}
                        <span className="text-gray-500 text-sm ml-2">({selectedReport.reporter.email})</span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">신고일</label>
                      <p className="mt-1">{new Date(selectedReport.createdAt).toLocaleString('ko-KR')}</p>
                    </div>
                  </div>

                  {selectedReport.status !== 'PENDING' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">처리 결과</label>
                      <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded">
                        {selectedReport.resolution || '없음'}
                      </p>
                    </div>
                  )}

                  {selectedReport.status === 'PENDING' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">처리 메시지</label>
                      <textarea
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="처리 결과를 입력하세요..."
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      setResolution('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    닫기
                  </button>
                  
                  {selectedReport.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleProcessReport(selectedReport.id, 'PROCESSING')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        처리중으로 변경
                      </button>
                      <button
                        onClick={() => handleProcessReport(selectedReport.id, 'RESOLVED')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        해결 처리
                      </button>
                      <button
                        onClick={() => handleProcessReport(selectedReport.id, 'REJECTED')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        반려 처리
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
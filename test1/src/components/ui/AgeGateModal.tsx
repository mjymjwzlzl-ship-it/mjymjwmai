"use client";
import React from 'react';

export default function AgeGateModal({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="만 19세 확인" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">만 19세 이상입니까?</h2>
        <p className="mb-4 text-sm text-gray-600">성인 작품을 보시려면 만 19세 이상이어야 합니다.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="h-9 rounded-md border px-3 text-sm">아니오</button>
          <button onClick={onConfirm} className="h-9 rounded-md bg-[var(--arata-danger)] px-3 text-sm font-medium text-white">예, 19세 이상</button>
        </div>
      </div>
    </div>
  );
}



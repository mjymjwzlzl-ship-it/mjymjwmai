'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import PassVerificationPanel from './PassVerificationPanel';

export default function AgeGateModal({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
    return () => { if (element?.open) element.close(); };
  }, [open]);
  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onCancel(); }} aria-label="본인·성인 인증" className="m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/65 dark:border-white/10 dark:bg-[#161d22] dark:text-white">
      {open && <><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-black">본인·성인 인증</h2><button type="button" autoFocus aria-label="인증창 닫기" onClick={onCancel} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button></div><PassVerificationPanel onSuccess={onConfirm} /></>}
    </dialog>
  );
}



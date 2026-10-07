"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

interface PushPermissionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onEnabled?: () => void;
  reasonTitle?: string;
}

export function PushPermissionPrompt({ isOpen, onClose }: PushPermissionPromptProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (isOpen && !dialog.current?.open) dialog.current?.showModal();
    if (!isOpen) dialog.current?.close();
  }, [isOpen]);
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="push-unavailable-title" className="card p-6 max-w-md">
    <h2 id="push-unavailable-title">Browser alerts are not available yet</h2>
    <p className="mt-3">You can receive opportunity updates through email and your in-app inbox. Choose your preferences in Settings.</p>
    <div className="action-row mt-4">
      <Link href="/settings" onClick={onClose} className="btn btn-primary">Notification settings</Link>
      <button onClick={onClose} className="btn btn-secondary">Close</button>
    </div>
  </dialog>;
}

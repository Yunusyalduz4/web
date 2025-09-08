"use client";
import { useState } from 'react';
import SupportModal from './SupportModal';

interface SupportButtonProps {
  userType: 'user' | 'business';
  className?: string;
}

export default function SupportButton({ userType, className = '' }: SupportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 ${className}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="hidden sm:inline">Destek</span>
      </button>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userType={userType}
      />
    </>
  );
}

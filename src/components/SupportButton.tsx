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
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-gray-900 text-xs font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 touch-manipulation border-2 ${className}`}
        style={{
          borderImage: 'linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) 1',
          border: '2px solid transparent',
          background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #3b82f6, #ffffff) border-box'
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs">Destek</span>
      </button>

      <SupportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userType={userType}
      />
    </>
  );
}

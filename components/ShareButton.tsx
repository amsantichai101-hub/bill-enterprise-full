'use client';

import { useState } from 'react';

export default function ShareButton({ billId }: { billId: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // สร้างลิ้งค์ชี้ไปยัง Route /view
    const shareUrl = `${window.location.origin}/bill/${billId}/view`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="btn secondary"
    >
      {copied ? 'คัดลอกลิ้งค์แล้ว!' : 'คัดลอกลิ้งค์'}
    </button>
  );
}
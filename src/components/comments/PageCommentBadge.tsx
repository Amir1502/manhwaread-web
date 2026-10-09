'use client';

import React from 'react';

interface PageCommentBadgeProps {
  pageNumber: number;
  count: number;
  onClick: () => void;
}

export default function PageCommentBadge({ pageNumber, count, onClick }: PageCommentBadgeProps) {
  return (
    <button
      type="button"
      className="page-comment-badge"
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      title={`Комментарии к странице ${pageNumber}`}
    >
      <span className="page-comment-icon">💬</span>
      <span className="page-comment-count">{count > 0 ? count : '+'}</span>
    </button>
  );
}

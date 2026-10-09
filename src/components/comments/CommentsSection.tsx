'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/useAuth';
import AuthModal from '@/components/auth/AuthModal';
import { formatDate } from '@/lib/labels';

export interface CommentItem {
  id: string;
  mangaId: string;
  chapterId: string;
  pageNumber: number | null;
  userId: string;
  username: string;
  userAvatar: string;
  userLevel: number;
  text: string;
  createdAt: number;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  parentId: string | null;
  isSpoiler: boolean;
}

interface CommentsSectionProps {
  mangaId: string;
  chapterId: string;
  pageNumber?: number | null; // if set, shows comments for this page
  totalPages?: number;
  title?: string;
  onClose?: () => void;
}

export default function CommentsSection({
  mangaId,
  chapterId,
  pageNumber: initialPageNumber = null,
  totalPages = 0,
  title,
  onClose,
}: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Filters & Sorting
  const [pageFilter, setPageFilter] = useState<number | 'all' | 'chapter'>(
    initialPageNumber !== null ? initialPageNumber : 'all'
  );
  const [sortMode, setSortMode] = useState<'top' | 'new'>('new');

  // New Comment input
  const [newText, setNewText] = useState('');
  const [selectedPage, setSelectedPage] = useState<number | 0>(
    typeof initialPageNumber === 'number' ? initialPageNumber : 0
  );
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reply input
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);

  // Revealed spoilers
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/comments?mangaId=${encodeURIComponent(mangaId)}&chapterId=${encodeURIComponent(chapterId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [mangaId, chapterId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (initialPageNumber !== null) {
      setPageFilter(initialPageNumber);
      setSelectedPage(initialPageNumber);
    }
  }, [initialPageNumber]);

  const handleVote = async (commentId: string, type: 'like' | 'dislike') => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      const res = await fetch('/api/comments/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, type }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? {
                  ...c,
                  likes: updated.likes,
                  dislikes: updated.dislikes,
                  likedBy: updated.likedBy,
                  dislikedBy: updated.dislikedBy,
                }
              : c
          )
        );
      }
    } catch {
      // ignore
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!newText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mangaId,
          chapterId,
          pageNumber: selectedPage > 0 ? selectedPage : null,
          text: newText,
          isSpoiler,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        setNewText('');
        setIsSpoiler(false);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReply = async (parentId: string, replyPageNumber: number | null) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!replyText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mangaId,
          chapterId,
          pageNumber: replyPageNumber,
          parentId,
          text: replyText,
          isSpoiler: replySpoiler,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setReplyingToId(null);
        setReplyText('');
        setReplySpoiler(false);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;
    try {
      const res = await fetch(`/api/comments?id=${encodeURIComponent(commentId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
      }
    } catch {
      // ignore
    }
  };

  // Filter root comments and build threads
  const rootComments = useMemo(() => {
    return comments.filter(c => !c.parentId);
  }, [comments]);

  const repliesMap = useMemo(() => {
    const map: Record<string, CommentItem[]> = {};
    for (const c of comments) {
      if (c.parentId) {
        if (!map[c.parentId]) map[c.parentId] = [];
        map[c.parentId].push(c);
      }
    }
    return map;
  }, [comments]);

  const filteredRoots = useMemo(() => {
    let list = rootComments.filter(c => {
      if (pageFilter === 'all') return true;
      if (pageFilter === 'chapter') return c.pageNumber === null;
      return c.pageNumber === pageFilter;
    });

    if (sortMode === 'top') {
      list.sort((a, b) => b.likes - b.dislikes - (a.likes - a.dislikes));
    } else {
      list.sort((a, b) => b.createdAt - a.createdAt);
    }

    return list;
  }, [rootComments, pageFilter, sortMode]);

  return (
    <section className="comments-section">
      <div className="comments-header-row">
        <div className="comments-title">
          <h3>{title || 'Комментарии к главе'}</h3>
          <span className="comments-count-chip">{comments.length}</span>
        </div>

        {onClose && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs & Sort */}
      <div className="comments-controls">
        <div className="comments-tabs">
          <button
            type="button"
            className={`chip ${pageFilter === 'all' ? 'active' : ''}`}
            onClick={() => setPageFilter('all')}
          >
            Все ({comments.length})
          </button>
          <button
            type="button"
            className={`chip ${pageFilter === 'chapter' ? 'active' : ''}`}
            onClick={() => setPageFilter('chapter')}
          >
            К главе ({comments.filter(c => c.pageNumber === null).length})
          </button>
          {initialPageNumber !== null && (
            <button
              type="button"
              className={`chip ${pageFilter === initialPageNumber ? 'active' : ''}`}
              onClick={() => setPageFilter(initialPageNumber)}
            >
              К стр. {initialPageNumber} ({comments.filter(c => c.pageNumber === initialPageNumber).length})
            </button>
          )}
        </div>

        <div className="comments-sort">
          <button
            type="button"
            className={`sort-btn ${sortMode === 'new' ? 'active' : ''}`}
            onClick={() => setSortMode('new')}
          >
            Новые
          </button>
          <button
            type="button"
            className={`sort-btn ${sortMode === 'top' ? 'active' : ''}`}
            onClick={() => setSortMode('top')}
          >
            Популярные
          </button>
        </div>
      </div>

      {/* Write Comment Form */}
      <div className="comment-create-box">
        {user ? (
          <form onSubmit={handleCreateComment}>
            <div className="comment-create-header">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={user.avatar} alt={user.username} className="comment-author-avatar-sm" />
              <span className="comment-create-author">{user.username}</span>
              <span className="user-level-badge-inline">{user.level} ур.</span>
            </div>

            <textarea
              className="comment-textarea"
              placeholder="Напишите комментарий... Делитесь впечатлениями от главы!"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              rows={3}
              required
            />

            <div className="comment-create-footer">
              <div className="comment-options">
                <label className="comment-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={e => setIsSpoiler(e.target.checked)}
                  />
                  <span>Содержит спойлеры</span>
                </label>

                {totalPages > 0 && (
                  <select
                    className="comment-page-select"
                    value={selectedPage}
                    onChange={e => setSelectedPage(Number(e.target.value))}
                  >
                    <option value={0}>Вся глава</option>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <option key={p} value={p}>
                        Страница {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !newText.trim()}>
                {submitting ? 'Отправка...' : 'Отправить (+10 EXP)'}
              </button>
            </div>
          </form>
        ) : (
          <div className="comment-auth-prompt">
            <span>Войдите в аккаунт, чтобы комментировать страницы и главы</span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setAuthModalOpen(true)}
            >
              Войти
            </button>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="comments-list">
        {loading ? (
          <div className="center-state" style={{ minHeight: 120 }}>
            <div className="spinner" />
          </div>
        ) : filteredRoots.length === 0 ? (
          <div className="comments-empty">
            <p>Здесь пока нет комментариев. Будьте первым, кто поделится мнением!</p>
          </div>
        ) : (
          filteredRoots.map(c => {
            const replies = repliesMap[c.id] || [];
            const isLiked = user && c.likedBy.includes(user.id);
            const isDisliked = user && c.dislikedBy.includes(user.id);
            const score = c.likes - c.dislikes;
            const isRevealed = revealedSpoilers[c.id];

            return (
              <div key={c.id} className="comment-item">
                <div className="comment-avatar-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.userAvatar} alt={c.username} className="comment-avatar" />
                  <span className="comment-avatar-level">{c.userLevel}</span>
                </div>

                <div className="comment-body">
                  <div className="comment-author-row">
                    <span className="comment-author-name">{c.username}</span>
                    <span className="comment-level-chip">{c.userLevel} ур.</span>
                    {c.pageNumber && (
                      <button
                        type="button"
                        className="comment-page-chip"
                        onClick={() => setPageFilter(c.pageNumber!)}
                      >
                        Стр. {c.pageNumber}
                      </button>
                    )}
                    <span className="comment-date">{formatDate(c.createdAt)}</span>
                  </div>

                  {c.isSpoiler && !isRevealed ? (
                    <div
                      className="comment-spoiler-blur"
                      onClick={() => setRevealedSpoilers(prev => ({ ...prev, [c.id]: true }))}
                    >
                      ⚠️ Спойлер! Нажмите, чтобы прочитать.
                    </div>
                  ) : (
                    <div className="comment-text">{c.text}</div>
                  )}

                  <div className="comment-actions">
                    <div className="comment-votes">
                      <button
                        type="button"
                        className={`vote-btn ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleVote(c.id, 'like')}
                        title="Нравится"
                      >
                        ▲
                      </button>
                      <span className={`vote-score ${score > 0 ? 'pos' : score < 0 ? 'neg' : ''}`}>
                        {score > 0 ? `+${score}` : score}
                      </span>
                      <button
                        type="button"
                        className={`vote-btn ${isDisliked ? 'disliked' : ''}`}
                        onClick={() => handleVote(c.id, 'dislike')}
                        title="Не нравится"
                      >
                        ▼
                      </button>
                    </div>

                    <button
                      type="button"
                      className="comment-reply-btn"
                      onClick={() => {
                        if (!user) {
                          setAuthModalOpen(true);
                          return;
                        }
                        setReplyingToId(replyingToId === c.id ? null : c.id);
                      }}
                    >
                      Ответить
                    </button>

                    {user && user.id === c.userId && (
                      <button
                        type="button"
                        className="comment-delete-btn"
                        onClick={() => handleDelete(c.id)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                  {/* Reply Form */}
                  {replyingToId === c.id && (
                    <div className="comment-reply-box">
                      <textarea
                        className="comment-textarea"
                        placeholder={`Ответ пользователю @${c.username}...`}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={2}
                      />
                      <div className="comment-create-footer">
                        <label className="comment-checkbox-label">
                          <input
                            type="checkbox"
                            checked={replySpoiler}
                            onChange={e => setReplySpoiler(e.target.checked)}
                          />
                          <span>Спойлер</span>
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setReplyingToId(null)}
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={submitting || !replyText.trim()}
                            onClick={() => handleCreateReply(c.id, c.pageNumber)}
                          >
                            Ответить
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nested Replies */}
                  {replies.length > 0 && (
                    <div className="comment-replies">
                      {replies.map(r => {
                        const rScore = r.likes - r.dislikes;
                        const rRevealed = revealedSpoilers[r.id];
                        const rLiked = user && r.likedBy.includes(user.id);
                        const rDisliked = user && r.dislikedBy.includes(user.id);

                        return (
                          <div key={r.id} className="comment-reply-item">
                            <div className="comment-avatar-col">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={r.userAvatar} alt={r.username} className="comment-avatar-sm" />
                            </div>
                            <div className="comment-body">
                              <div className="comment-author-row">
                                <span className="comment-author-name">{r.username}</span>
                                <span className="comment-level-chip">{r.userLevel} ур.</span>
                                <span className="comment-date">{formatDate(r.createdAt)}</span>
                              </div>
                              {r.isSpoiler && !rRevealed ? (
                                <div
                                  className="comment-spoiler-blur"
                                  onClick={() => setRevealedSpoilers(prev => ({ ...prev, [r.id]: true }))}
                                >
                                  ⚠️ Спойлер! Нажмите для показа.
                                </div>
                              ) : (
                                <div className="comment-text">{r.text}</div>
                              )}
                              <div className="comment-actions">
                                <div className="comment-votes">
                                  <button
                                    type="button"
                                    className={`vote-btn ${rLiked ? 'liked' : ''}`}
                                    onClick={() => handleVote(r.id, 'like')}
                                  >
                                    ▲
                                  </button>
                                  <span className={`vote-score ${rScore > 0 ? 'pos' : rScore < 0 ? 'neg' : ''}`}>
                                    {rScore > 0 ? `+${rScore}` : rScore}
                                  </span>
                                  <button
                                    type="button"
                                    className={`vote-btn ${rDisliked ? 'disliked' : ''}`}
                                    onClick={() => handleVote(r.id, 'dislike')}
                                  >
                                    ▼
                                  </button>
                                </div>
                                {user && user.id === r.userId && (
                                  <button
                                    type="button"
                                    className="comment-delete-btn"
                                    onClick={() => handleDelete(r.id)}
                                  >
                                    Удалить
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}

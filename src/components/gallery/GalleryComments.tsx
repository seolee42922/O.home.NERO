
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  useLocalList,
  newId,
  fmtDate,
  CommentRow,
  COMMENT_KEY,
  COMMENT_SEED,
  commentsFor,
} from '@/lib/postStore';
import { useMenuSettings } from '@/lib/menuStore';
import { KInput } from '@/components/ui/Kit';
import { useConfirmDelete } from '@/components/ui/Modal';
import { GuestIdBar } from '@/components/ui/GuestId';
import { useToast } from '@/components/ui/Toast';
import { pushNotif } from '@/lib/notifStore';

interface GalleryCommentsProps {
  postId: string;
  postTitle: string;
  authorId: string;
}

export function GalleryComments({
  postId,
  postTitle,
  authorId,
}: GalleryCommentsProps) {
  const { user, isAdmin } = useAuth();
  const [menuSet] = useMenuSettings();

  const [rows, setRows, loaded] = useLocalList<CommentRow>(
    COMMENT_KEY,
    COMMENT_SEED
  );

  const toast = useToast();
  const del = useConfirmDelete();

  const [text, setText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // 우선 기존 로드비의 댓글 작성 권한을 공유
  const permission = menuSet.roadComment;

  const canComment =
    isAdmin ||
    permission === 'guest' ||
    (permission === 'member' && !!user);

  const guestMode = !user && permission === 'guest';

  const comments = commentsFor(rows, 'gallery', postId);

  const roots = comments.filter(c => !c.parentId);

  const childrenOf = (parentId: string) =>
    comments.filter(c => c.parentId === parentId);

  const submit = () => {
    const value = text.trim();

    if (!loaded || !value || !canComment) return;

    if (guestMode && !guestName.trim()) {
      toast('닉네임을 입력해 주세요');
      return;
    }

    const comment: CommentRow = {
      id: newId(),
      target: 'gallery',
      targetId: postId,
      parentId: replyTo ?? undefined,
      author: user?.nickname ?? guestName.trim(),
      authorId: user?.id ?? '',
      text: value,
      date: new Date().toISOString(),
    };

    setRows([...rows, comment]);

    // 그림 작성자에게 댓글 알림
    if (authorId && authorId !== user?.id) {
      pushNotif({
        type: 'comment',
        toUserId: authorId,
        href: `/gallery/${postId}`,
        title: `${postTitle}에 새 댓글`,
        body: `${comment.author} — ${value.slice(0, 50)}`,
      });
    }

    // 답글 대상에게 알림
    if (replyTo) {
      const parent = comments.find(c => c.id === replyTo);

      if (
        parent?.authorId &&
        parent.authorId !== user?.id &&
        parent.authorId !== authorId
      ) {
        pushNotif({
          type: 'comment',
          toUserId: parent.authorId,
          href: `/gallery/${postId}`,
          title: '내 댓글에 답글이 달렸습니다',
          body: `${comment.author} — ${value.slice(0, 50)}`,
        });
      }
    }

    setText('');
    setReplyTo(null);
  };

  const saveEdit = () => {
    if (!editId || !editText.trim() || !user) return;

    setRows(rows.map(c =>
      c.id === editId && c.authorId === user.id
        ? { ...c, text: editText.trim() }
        : c
    ));

    setEditId(null);
    setEditText('');
  };

  const deleteComment = (id: string) => {
    const target = rows.find(c =>
      c.id === id &&
      c.target === 'gallery' &&
      c.targetId === postId
    );

    if (
      !target ||
      !(isAdmin || (!!user && target.authorId === user.id))
    ) return;

    del.ask(
      '댓글을 삭제하시겠습니까?',
      () => {
        setRows(rows.filter(c =>
          c.id !== id && c.parentId !== id
        ));
      },
      '답글이 있다면 함께 삭제됩니다.'
    );
  };

  return (
    <aside className="gallery-comments panel">
      <h4>
        COMMENTS
        <span>{comments.length}</span>
      </h4>

      <div className="gallery-comment-list">
        {!loaded && <p className="hint">댓글을 불러오는 중...</p>}

        {loaded && comments.length === 0 && (
          <p className="hint">첫 댓글을 남겨보세요.</p>
        )}

        {roots.flatMap(root => [
          root,
          ...childrenOf(root.id),
        ]).map(c => {
          const mine =
            !!user &&
            !!c.authorId &&
            c.authorId === user.id;

          const canDelete = mine || isAdmin;

          return (
            <div
              key={c.id}
              className={`cmt ${c.parentId ? 'reply-depth' : ''}`}
            >
              <b>{c.author}</b>
              <small>{fmtDate(c.date)}</small>

              {editId === c.id ? (
                <div className="gallery-comment-edit">
                  <KInput
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit();
                    }}
                  />
                  <button
                    className="btn btn-dark"
                    onClick={saveEdit}
                  >
                    SAVE
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setEditId(null)}
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <>
                  <p>{c.text}</p>

                  <div className="gallery-comment-actions">
                    {canComment && !c.parentId && (
                      <button
                        onClick={() =>
                          setReplyTo(
                            replyTo === c.id ? null : c.id
                          )
                        }
                      >
                        {replyTo === c.id ? '답글 취소' : '답글'}
                      </button>
                    )}

                    {mine && (
                      <button onClick={() => {
                        setEditId(c.id);
                        setEditText(c.text);
                      }}>
                        수정
                      </button>
                    )}

                    {canDelete && (
                      <button onClick={() => deleteComment(c.id)}>
                        삭제
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="gallery-comment-form">
        {replyTo && (
          <button
            className="gallery-reply-notice"
            onClick={() => setReplyTo(null)}
          >
            답글 작성 중 · 취소 ✕
          </button>
        )}

        {guestMode && (
          <GuestIdBar
            name={guestName}
            onName={setGuestName}
          />
        )}

        <div className="gallery-comment-input">
          <KInput
            placeholder={
              canComment
                ? '댓글 남기기...'
                : '댓글 작성 권한이 없습니다'
            }
            value={text}
            disabled={!canComment || !loaded}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button
            className="btn btn-dark"
            disabled={!canComment || !loaded || !text.trim()}
            onClick={submit}
          >
            POST
          </button>
        </div>
      </div>

      {del.element}
    </aside>
  );
}

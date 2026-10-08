
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHrefBlock } from '@/components/shell/MenuGuard';
import { sectionHref, MAIN_SEC, useSectionTitle } from '@/lib/sectionStore';
import { useAuth } from '@/lib/auth';
import { useLocalList, fmtDate } from '@/lib/postStore';
import { BackupPost, BACKUP_SEED } from '@/lib/galleryStore';
import { ConfirmModal } from '@/components/ui/Modal';
import { useBlobUrl } from '@/lib/blobStore';
import { sanitizeHtml } from '@/lib/sanitize';
import { PageTitle } from '@/components/ui/PageText';
import { Lightbox } from '@/components/ui/Lightbox';
import { useBoardSettings, boardBadgeStyle } from '@/lib/boardStore';
import { GalleryComments } from '@/components/gallery/GalleryComments';

export default function BackupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [posts, setPosts, loaded] = useLocalList<BackupPost>(
    'ohome.backup.v1',
    BACKUP_SEED
  );

  const [cur, setCur] = useState(0);
  const [delAsk, setDelAsk] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);

  const { st: boardSet } = useBoardSettings();

  const p = posts.find(x => x.id === id);

  // 비공개 갤러리 상세 페이지 접근 방지
  const blocked = useHrefBlock(
    p && sectionHref('gallery', p.secId ?? MAIN_SEC)
  );

  const tt = useSectionTitle(
    'gallery',
    p?.secId,
    'GALLERY'
  );

  if (blocked) return blocked;

  if (!loaded) {
    return <section className="page" />;
  }

  if (
    !p ||
    (p.visibility === 'private' && !isAdmin) ||
    (p.visibility === 'member' && !user)
  ) {
    return (
      <section className="page">
        <div className="page-head">
          <PageTitle href={tt.href}>{tt.title}</PageTitle>
          <p>게시물을 찾을 수 없거나 열람 권한이 없습니다.</p>
        </div>
      </section>
    );
  }

  const imgs: { url?: string; ph?: string }[] =
    p.images.length
      ? p.images.map(u => ({ url: u }))
      : p.phList.map(c => ({ ph: c }));

  const canManage =
    isAdmin ||
    (!!p.authorId && p.authorId === user?.id);

  // 기존 이미지 표시 기능 유지
  const Img = ({
    im,
    ratio,
    natural,
  }: {
    im: { url?: string; ph?: string };
    ratio?: string;
    natural?: boolean;
  }) => {
    const u = useBlobUrl(im.url);

    if (u) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={u}
          alt=""
          style={
            natural
              ? {
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'block',
                }
              : {
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                }
          }
        />
      );
    }

    return (
      <div
        className={`ph ${im.ph ?? ''}`}
        style={
          natural
            ? { width: '100%', height: '100%' }
            : { aspectRatio: ratio ?? '16/10' }
        }
      >
        <span>IMAGE</span>
      </div>
    );
  };

  return (
    <section className="page">
      {/* 상단 제목 및 관리 버튼 */}
      <div className="page-head">
        <PageTitle href={tt.href}>
          {tt.title}
        </PageTitle>

        <p>
          {p.category} · {p.author} · {fmtDate(p.date)}
          {p.madeDate ? ` · 제작 ${p.madeDate}` : ''}

          {(p.tags ?? []).map(t => (
            <i key={t} className="tag-in">
              #{t}
            </i>
          ))}
        </p>

        <div className="head-actions">
          {canManage && (
            <button
              className="btn btn-dark"
              onClick={() =>
                router.push(`/gallery/${p.id}/edit`)
              }
            >
              EDIT
            </button>
          )}

          {canManage && (
            <button
              className="btn btn-dark"
              onClick={() => setDelAsk(true)}
            >
              DELETE
            </button>
          )}
        </div>
      </div>

      {/* 왼쪽 이미지 / 오른쪽 댓글 */}
      <div className="gallery-detail-layout">

        {/* 왼쪽: 기존 갤러리 이미지 */}
        <div className="panel gallery-detail-art">

          <h2
            style={{
              fontSize: 18,
              marginBottom: p.desc ? 8 : 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {p.title}

            <span
              style={boardBadgeStyle(
                boardSet.gallery.find(
                  b => b.id === p.type
                )
              )}
            >
              {
                boardSet.gallery.find(
                  b => b.id === p.type
                )?.label
              }
            </span>
          </h2>

          {/* 게시물 설명 */}
          {p.desc && (
            <div
              className="post-body"
              style={{
                fontSize: 12.5,
                margin: '0 0 16px',
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(p.desc),
              }}
            />
          )}

          {/* 이미지 유형별 렌더링 */}
          {p.type === 'log' ? (

            /* 로그형: 이미지 세로 이어붙이기 */
            <div
              style={{
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {imgs.map((im, i) => (
                <Img key={i} im={im} />
              ))}
            </div>

          ) : p.type === 'vlist' ? (

            /* 세로 정렬형: 이미지 사이 간격 */
            <div
              style={{
                display: 'grid',
                gap: 14,
              }}
            >
              {imgs.map((im, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    cursor: im.url
                      ? 'zoom-in'
                      : undefined,
                  }}
                  onClick={() => {
                    if (im.url) {
                      setCur(i);
                      setLbOpen(true);
                    }
                  }}
                >
                  <Img im={im} />
                </div>
              ))}
            </div>

          ) : (

            /* 단일형: 큰 이미지와 좌우 넘김 */
            <>
              <div className="single-viewer">
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: imgs[cur]?.url
                      ? 'zoom-in'
                      : undefined,
                  }}
                  onClick={() => {
                    if (imgs[cur]?.url) {
                      setLbOpen(true);
                    }
                  }}
                >
                  {imgs[cur] && (
                    <Img im={imgs[cur]} natural />
                  )}
                </div>

                {imgs.length > 1 && (
                  <>
                    <button
                      className="nav"
                      style={{ left: 10 }}
                      onClick={() =>
                        setCur(
                          c =>
                            (c - 1 + imgs.length) %
                            imgs.length
                        )
                      }
                    >
                      ◁
                    </button>

                    <button
                      className="nav"
                      style={{ right: 10 }}
                      onClick={() =>
                        setCur(
                          c =>
                            (c + 1) % imgs.length
                        )
                      }
                    >
                      ▷
                    </button>
                  </>
                )}
              </div>

              {/* 하단 이미지 썸네일 */}
              {imgs.length > 1 && (
                <div className="thumb-strip">
                  {imgs.map((im, i) => (
                    <div
                      key={i}
                      className={`t ${
                        i === cur ? 'on' : ''
                      }`}
                      onClick={() => setCur(i)}
                    >
                      <Img im={im} ratio="4/3" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 오른쪽: 새 갤러리 댓글 */}
        <GalleryComments
          postId={p.id}
          postTitle={p.title}
          authorId={p.authorId}
        />

      </div>

      {/* 기존 이미지 확대 기능 */}
      {lbOpen &&
        (p.type === 'single' || p.type === 'vlist') &&
        p.images.length > 0 && (
          <Lightbox
            srcs={p.images}
            index={cur}
            onClose={() => setLbOpen(false)}
          />
        )}

      {/* 기존 게시물 삭제 기능 */}
      <ConfirmModal
        open={delAsk}
        title="게시물을 삭제하시겠습니까?"
        body="삭제한 게시물은 복구할 수 없습니다."
        onClose={() => setDelAsk(false)}
        buttons={[
          {
            label: 'DELETE',
            kind: 'accent',
            onClick: () => {
              setPosts(
                posts.filter(x => x.id !== p.id)
              );
              router.push(tt.href);
            },
          },
          {
            label: 'CANCEL',
            kind: 'ghost',
            onClick: () => setDelAsk(false),
          },
        ]}
      />
    </section>
  );
}

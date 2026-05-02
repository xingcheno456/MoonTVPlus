'use client';
 

import { useEffect, useState } from 'react';
import { parseApiResponse } from '@/lib/api-response';

import { logger } from '../lib/logger';

interface Song {
  id: string;
  name: string;
  artist: string;
  album?: string;
  pic?: string;
  platform: 'wy' | 'tx' | 'kw' | 'kg' | 'mg';
  duration?: number;
}

interface MusicPlaylist {
  id: string;
  username: string;
  name: string;
  description?: string;
  cover?: string;
  created_at: number;
  updated_at: number;
}

interface AddToPlaylistModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export default function AddToPlaylistModal({
  song,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(
    null,
  ); // 正在添加的歌单ID

  // 加载用户的歌单列表
  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/music/v2/playlists');
      if (response.ok) {
        const data = await parseApiResponse<any>(response);
        setPlaylists(data.data?.playlists || []);
      }
    } catch (error) {
      logger.error('加载歌单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      onError?.('请输入歌单名称');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/music/v2/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim(),
        }),
      });

      if (response.ok) {
        setNewPlaylistName('');
        setNewPlaylistDescription('');
        setShowCreateForm(false);
        await loadPlaylists();
      } else {
        const data = await parseApiResponse<any>(response);
        onError?.(data.error || '创建歌单失败');
      }
    } catch (error) {
      logger.error('创建歌单失败:', error);
      onError?.('创建歌单失败');
    } finally {
      setCreating(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!song) return;

    try {
      setAddingToPlaylistId(playlistId);
      const response = await fetch(
        `/api/music/v2/playlists/${playlistId}/songs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            song: {
              source: song.platform,
              songId: song.id,
              name: song.name,
              artist: song.artist,
              album: song.album,
              cover: song.pic,
              durationSec: song.duration || 0,
            },
          }),
        },
      );

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const data = await parseApiResponse<any>(response);
        onError?.(data.error || '添加失败');
      }
    } catch (error) {
      logger.error('添加到歌单失败:', error);
      onError?.('添加到歌单失败');
    } finally {
      setAddingToPlaylistId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-zinc-900'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='border-b border-white/10 p-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-bold text-white'>添加到歌单</h3>
            <button
              onClick={onClose}
              className='text-zinc-400 transition-colors hover:text-white'
            >
              <svg
                className='h-6 w-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
          {song && (
            <div className='mt-2 text-sm text-zinc-400'>
              {song.name} - {song.artist}
            </div>
          )}
        </div>

        {/* Content */}
        <div className='max-h-[calc(80vh-120px)] overflow-y-auto p-4'>
          {/* Create New Playlist Button */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className='mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-white transition-colors hover:bg-green-700'
            >
              <svg
                className='h-5 w-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 4v16m8-8H4'
                />
              </svg>
              创建新歌单
            </button>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div className='mb-4 rounded-lg border border-white/10 bg-white/5 p-4'>
              <input
                type='text'
                placeholder='歌单名称'
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className='mb-2 w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-green-500 focus:outline-none'
              />
              <textarea
                placeholder='歌单描述（可选）'
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                className='w-full resize-none rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-white focus:border-green-500 focus:outline-none'
                rows={2}
              />
              <div className='mt-2 flex gap-2'>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={creating}
                  className='flex-1 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:bg-zinc-700'
                >
                  {creating ? '创建中...' : '确定'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPlaylistName('');
                    setNewPlaylistDescription('');
                  }}
                  className='flex-1 rounded-lg bg-zinc-700 px-4 py-2 text-white transition-colors hover:bg-zinc-600'
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Playlists List */}
          {loading ? (
            <div className='py-8 text-center text-zinc-400'>加载中...</div>
          ) : playlists.length === 0 ? (
            <div className='py-8 text-center text-zinc-400'>
              还没有歌单，创建一个吧
            </div>
          ) : (
            <div className='space-y-2'>
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  disabled={addingToPlaylistId !== null}
                  className='flex w-full items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:bg-white/5'
                >
                  {playlist.cover ? (
                    <img
                      src={playlist.cover}
                      alt={playlist.name}
                      className='h-12 w-12 rounded object-cover'
                    />
                  ) : (
                    <div className='flex h-12 w-12 items-center justify-center rounded bg-zinc-800'>
                      <svg
                        className='h-6 w-6 text-zinc-600'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                        />
                      </svg>
                    </div>
                  )}
                  <div className='min-w-0 flex-1'>
                    <div className='truncate font-medium text-white'>
                      {playlist.name}
                    </div>
                    {playlist.description && (
                      <div className='truncate text-xs text-zinc-500'>
                        {playlist.description}
                      </div>
                    )}
                  </div>
                  {addingToPlaylistId === playlist.id ? (
                    <svg
                      className='h-5 w-5 animate-spin text-green-500'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      className='h-5 w-5 text-zinc-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 5l7 7-7 7'
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

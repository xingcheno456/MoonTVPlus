'use client';
 


import { Bell, Check, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { Notification } from '@/lib/types';

import { logger } from '../lib/logger';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载通知
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const _apiRes_data = await response.json(); const data = _apiRes_data.success === true ? _apiRes_data.data : _apiRes_data;
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      logger.error('加载通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 标记为已读
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          notificationId,
        }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        );
        // 触发事件通知 UserMenu 更新未读计数
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch (error) {
      logger.error('标记已读失败:', error);
    }
  };

  // 删除通知
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationId,
        }),
      });

      if (response.ok) {
        const deletedNotification = notifications.find(
          (n) => n.id === notificationId,
        );
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        // 如果删除的是未读通知，触发事件更新 UserMenu
        if (deletedNotification && !deletedNotification.read) {
          window.dispatchEvent(new Event('notificationsUpdated'));
        }
      }
    } catch (error) {
      logger.error('删除通知失败:', error);
    }
  };

  // 清空所有通知
  const clearAll = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_all',
        }),
      });

      if (response.ok) {
        setNotifications([]);
        // 触发事件通知 UserMenu 更新未读计数
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch (error) {
      logger.error('清空通知失败:', error);
    }
  };

  // 处理通知点击
  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // 根据通知类型跳转
    if (notification.type === 'favorite_update' && notification.metadata) {
      const { source, id, title } = notification.metadata;
      router.push(
        `/play?source=${source}&id=${id}&title=${encodeURIComponent(title)}`,
      );
      onClose();
    } else if (notification.type === 'manga_update' && notification.metadata) {
      const { sourceId, mangaId, title, cover, sourceName } =
        notification.metadata;
      const params = new URLSearchParams({
        sourceId,
        mangaId,
        title: title || '',
        cover: cover || '',
        sourceName: sourceName || '',
      });
      router.push(`/manga/detail?${params.toString()}`);
      onClose();
    } else if (notification.type === 'movie_request') {
      // 获取用户角色
      const authInfo = getAuthInfoFromBrowserCookie();
      const isAdmin = authInfo?.role === 'owner' || authInfo?.role === 'admin';

      // 管理员跳转到管理面板，普通用户跳转到我的求片
      router.push(isAdmin ? '/admin' : '/movie-request');
      onClose();
    }
  };

  // 打开面板时加载通知
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* 通知面板 */}
      <div className='fixed left-1/2 top-1/2 z-[1001] flex max-h-[80vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'>
        {/* 标题栏 */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700'>
          <div className='flex items-center gap-2'>
            <Bell className='h-5 w-5 text-gray-600 dark:text-gray-400' />
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-200'>
              通知中心
            </h3>
            {notifications.length > 0 && (
              <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'>
                {notifications.filter((n) => !n.read).length} 条未读
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className='text-xs text-red-500 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
              >
                清空全部
              </button>
            )}
            <button
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
              aria-label='Close'
            >
              <X className='h-full w-full' />
            </button>
          </div>
        </div>

        {/* 通知列表 */}
        <div className='flex-1 overflow-y-auto p-4'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent'></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400'>
              <Bell className='mb-3 h-12 w-12 opacity-30' />
              <p className='text-sm'>暂无通知</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative cursor-pointer rounded-lg border p-4 transition-all ${
                    notification.read
                      ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                      : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  } hover:shadow-md`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* 未读标识 */}
                  {!notification.read && (
                    <div className='absolute right-4 top-4 h-2 w-2 rounded-full bg-green-500'></div>
                  )}

                  {/* 通知内容 */}
                  <div className='pr-8'>
                    <div className='mb-1 flex items-start justify-between'>
                      <h4 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                        {notification.title}
                      </h4>
                    </div>
                    <p className='mb-2 text-sm text-gray-600 dark:text-gray-400'>
                      {notification.message}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-500'>
                      {new Date(notification.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className='absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className='rounded-full bg-white p-1.5 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                        title='标记为已读'
                      >
                        <Check className='h-3.5 w-3.5 text-green-600 dark:text-green-400' />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className='rounded-full bg-white p-1.5 transition-colors hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/20'
                      title='删除'
                    >
                      <Trash2 className='h-3.5 w-3.5 text-red-600 dark:text-red-400' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

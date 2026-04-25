'use client';

import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface EmailSettingsPanelProps {
  isOpen: boolean;
  mounted: boolean;
  onClose: () => void;
  userEmail: string;
  onUserEmailChange: (value: string) => void;
  emailNotifications: boolean;
  onEmailNotificationsChange: (value: boolean) => void;
  emailSettingsLoading: boolean;
  emailSettingsSaving: boolean;
  onSave: () => void;
  statusMessage?: string;
  statusType?: 'success' | 'error' | null;
}

export function EmailSettingsPanel({
  isOpen,
  mounted,
  onClose,
  userEmail,
  onUserEmailChange,
  emailNotifications,
  onEmailNotificationsChange,
  emailSettingsLoading,
  emailSettingsSaving,
  onSave,
  statusMessage,
  statusType,
}: EmailSettingsPanelProps) {
  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      <div
        className='fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm'
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
      />

      <div className='fixed left-1/2 top-1/2 z-[1001] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'>
        <div
          className='h-full p-6'
          data-panel-content
          onTouchMove={(e) => e.stopPropagation()}
          style={{ touchAction: 'auto' }}
        >
          <div className='mb-6 flex items-center justify-between'>
            <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              邮件通知设置
            </h3>
            <button
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
              aria-label='Close'
            >
              <X className='h-full w-full' />
            </button>
          </div>

          {emailSettingsLoading ? (
            <div className='space-y-4'>
              <div className='animate-pulse'>
                <div className='mb-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700'></div>
                <div className='h-10 rounded bg-gray-200 dark:bg-gray-700'></div>
              </div>
              <div className='animate-pulse'>
                <div className='h-20 rounded bg-gray-200 dark:bg-gray-700'></div>
              </div>
              <div className='animate-pulse'>
                <div className='h-10 rounded bg-gray-200 dark:bg-gray-700'></div>
              </div>
              <div className='text-center text-sm text-gray-500 dark:text-gray-400'>
                加载中...
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <div>
                <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  邮箱地址
                </label>
                <input
                  type='email'
                  value={userEmail}
                  onChange={(e) => onUserEmailChange(e.target.value)}
                  placeholder='输入您的邮箱地址'
                  disabled={emailSettingsSaving}
                  className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                />
              </div>

              <div className='flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800'>
                <div>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    接收收藏更新通知
                  </h4>
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    当收藏的影片有更新时发送邮件通知
                  </p>
                </div>
                <button
                  onClick={() =>
                    onEmailNotificationsChange(!emailNotifications)
                  }
                  disabled={emailSettingsSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    emailNotifications
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={onSave}
                disabled={emailSettingsSaving}
                className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 dark:disabled:bg-blue-500'
              >
                {emailSettingsSaving ? (
                  <>
                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent'></div>
                    <span>保存中...</span>
                  </>
                ) : (
                  '保存设置'
                )}
              </button>

              {statusMessage ? (
                <p
                  className={`text-center text-xs ${
                    statusType === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}
            </div>
          )}

          <div className='mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20'>
            <p className='text-xs text-blue-800 dark:text-blue-200'>
              💡 提示：需要管理员先在管理面板中配置邮件服务
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

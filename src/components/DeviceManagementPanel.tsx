'use client';

import { LucideIcon, Monitor, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DeviceItem {
  tokenId: string;
  deviceInfo: string;
  isCurrent: boolean;
  createdAt: string;
  lastUsed: string;
}

interface DeviceManagementPanelProps {
  isOpen: boolean;
  mounted: boolean;
  onClose: () => void;
  devices: DeviceItem[];
  devicesLoading: boolean;
  revoking: string | null;
  onRevokeDevice: (tokenId: string) => void;
  onRevokeAllDevices: () => void;
  getDeviceIcon: (deviceInfo: string) => LucideIcon;
}

export function DeviceManagementPanel({
  isOpen,
  mounted,
  onClose,
  devices,
  devicesLoading,
  revoking,
  onRevokeDevice,
  onRevokeAllDevices,
  getDeviceIcon,
}: DeviceManagementPanelProps) {
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

      <div className='fixed left-1/2 top-1/2 z-[1001] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'>
        <div
          className='flex h-full max-h-[80vh] flex-col'
          data-panel-content
          onTouchMove={(e) => e.stopPropagation()}
          style={{ touchAction: 'auto' }}
        >
          <div className='flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700'>
            <h3 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
              设备管理
            </h3>
            <button
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'
              aria-label='Close'
            >
              <X className='h-full w-full' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto p-6'>
            {devicesLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <div key={i} className='animate-pulse'>
                    <div className='h-20 rounded-lg bg-gray-200 dark:bg-gray-700'></div>
                  </div>
                ))}
                <div className='mt-4 text-center text-sm text-gray-500 dark:text-gray-400'>
                  加载中...
                </div>
              </div>
            ) : devices.length === 0 ? (
              <div className='py-8 text-center'>
                <Monitor className='mx-auto mb-3 h-12 w-12 text-gray-400 dark:text-gray-500' />
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  暂无登录设备
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {devices
                  .slice()
                  .sort((a, b) => {
                    if (a.isCurrent && !b.isCurrent) return -1;
                    if (!a.isCurrent && b.isCurrent) return 1;
                    return 0;
                  })
                  .map((device) => {
                    const DeviceIcon = getDeviceIcon(device.deviceInfo);
                    return (
                      <div
                        key={device.tokenId}
                        className={`rounded-lg border bg-gray-50 p-4 dark:bg-gray-800 ${
                          device.isCurrent
                            ? 'border-yellow-400 dark:border-yellow-500'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className='flex items-start justify-between'>
                          <div className='flex-1'>
                            <div className='mb-2 flex items-center gap-2'>
                              <DeviceIcon className='h-4 w-4 text-gray-600 dark:text-gray-400' />
                              <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                                {device.deviceInfo}
                              </span>
                              {device.isCurrent && (
                                <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'>
                                  当前设备
                                </span>
                              )}
                            </div>
                            <div className='space-y-1 text-xs text-gray-500 dark:text-gray-400'>
                              <div>
                                登录时间:{' '}
                                {new Date(device.createdAt).toLocaleString(
                                  'zh-CN',
                                )}
                              </div>
                              <div>
                                最后活跃:{' '}
                                {new Date(device.lastUsed).toLocaleString(
                                  'zh-CN',
                                )}
                              </div>
                            </div>
                          </div>
                          {!device.isCurrent && (
                            <button
                              onClick={() => onRevokeDevice(device.tokenId)}
                              disabled={revoking === device.tokenId}
                              className='ml-3 rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:border-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300'
                            >
                              {revoking === device.tokenId
                                ? '撤销中...'
                                : '撤销'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className='space-y-3 border-t border-gray-200 p-6 dark:border-gray-700'>
            <button
              onClick={onRevokeAllDevices}
              disabled={devices.length === 0}
              className='w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400 dark:bg-red-600 dark:hover:bg-red-700 dark:disabled:bg-red-500'
            >
              登出所有设备
            </button>
            <p className='text-center text-xs text-gray-500 dark:text-gray-400'>
              登出所有设备后需要重新登录
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

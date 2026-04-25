'use client';
/* eslint-disable no-console,react-hooks/exhaustive-deps */


import {
  Bug,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { changelog, ChangelogEntry } from '@/lib/changelog';
import { CURRENT_VERSION } from '@/lib/version';
import { compareVersions, UpdateStatus } from '@/lib/version_check';

interface VersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RemoteChangelogEntry {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
}

export const VersionPanel: React.FC<VersionPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);
  const [remoteChangelog, setRemoteChangelog] = useState<ChangelogEntry[]>([]);
  const [hasUpdate, setIsHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [showRemoteContent, setShowRemoteContent] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Body 滚动锁定 - 使用 overflow 方式避免布局问题
  useEffect(() => {
    if (isOpen) {
      const body = document.body;
      const html = document.documentElement;

      // 保存原始样式
      const originalBodyOverflow = body.style.overflow;
      const originalHtmlOverflow = html.style.overflow;

      // 只设置 overflow 来阻止滚动
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';

      return () => {
        // 恢复所有原始样式
        body.style.overflow = originalBodyOverflow;
        html.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);

  // 获取远程变更日志
  useEffect(() => {
    if (isOpen) {
      fetchRemoteChangelog();
    }
  }, [isOpen]);

  // 获取远程变更日志
  const fetchRemoteChangelog = async () => {
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/mtvpls/MoonTVPlus/main/CHANGELOG',
      );
      if (response.ok) {
        const content = await response.text();
        const parsed = parseChangelog(content);
        setRemoteChangelog(parsed);

        // 检查是否有更新
        if (parsed.length > 0) {
          const latest = parsed[0];
          setLatestVersion(latest.version);
          setIsHasUpdate(
            compareVersions(latest.version) === UpdateStatus.HAS_UPDATE,
          );
        }
      } else {
        console.error(
          '获取远程变更日志失败:',
          response.status,
          response.statusText,
        );
      }
    } catch (error) {
      console.error('获取远程变更日志失败:', error);
    }
  };

  // 解析变更日志格式
  const parseChangelog = (content: string): RemoteChangelogEntry[] => {
    const lines = content.split('\n');
    const versions: RemoteChangelogEntry[] = [];
    let currentVersion: RemoteChangelogEntry | null = null;
    let currentSection: string | null = null;
    let inVersionContent = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 匹配版本行: ## [X.Y.Z] - YYYY-MM-DD
      const versionMatch = trimmedLine.match(
        /^## \[([\d.]+)\] - (\d{4}-\d{2}-\d{2})$/,
      );
      if (versionMatch) {
        if (currentVersion) {
          versions.push(currentVersion);
        }

        currentVersion = {
          version: versionMatch[1],
          date: versionMatch[2],
          added: [],
          changed: [],
          fixed: [],
        };
        currentSection = null;
        inVersionContent = true;
        continue;
      }

      // 如果遇到下一个版本或到达文件末尾，停止处理当前版本
      if (inVersionContent && currentVersion) {
        // 匹配章节标题
        if (trimmedLine === '### Added') {
          currentSection = 'added';
          continue;
        } else if (trimmedLine === '### Changed') {
          currentSection = 'changed';
          continue;
        } else if (trimmedLine === '### Fixed') {
          currentSection = 'fixed';
          continue;
        }

        // 匹配条目: - 内容
        if (trimmedLine.startsWith('- ') && currentSection) {
          const entry = trimmedLine.substring(2);
          if (currentSection === 'added') {
            currentVersion.added.push(entry);
          } else if (currentSection === 'changed') {
            currentVersion.changed.push(entry);
          } else if (currentSection === 'fixed') {
            currentVersion.fixed.push(entry);
          }
        }
      }
    }

    // 添加最后一个版本
    if (currentVersion) {
      versions.push(currentVersion);
    }

    return versions;
  };

  // 渲染变更日志条目
  const renderChangelogEntry = (
    entry: ChangelogEntry | RemoteChangelogEntry,
    isCurrentVersion = false,
    isRemote = false,
  ) => {
    const isUpdate = isRemote && hasUpdate && entry.version === latestVersion;

    return (
      <div
        key={entry.version}
        className={`rounded-lg border p-4 ${
          isCurrentVersion
            ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
            : isUpdate
              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'
        }`}
      >
        {/* 版本标题 */}
        <div className='mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center'>
          <div className='flex flex-wrap items-center gap-2'>
            <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              v{entry.version}
            </h4>
            {isCurrentVersion && (
              <span className='rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'>
                当前版本
              </span>
            )}
            {isUpdate && (
              <span className='flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'>
                <Download className='h-3 w-3' />
                可更新
              </span>
            )}
          </div>
          <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
            {entry.date}
          </div>
        </div>

        {/* 变更内容 */}
        <div className='space-y-3'>
          {entry.added.length > 0 && (
            <div>
              <h5 className='mb-2 flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400'>
                <Plus className='h-4 w-4' />
                新增功能
              </h5>
              <ul className='space-y-1'>
                {entry.added.map((item, index) => (
                  <li
                    key={index}
                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                  >
                    <span className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500'></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.changed.length > 0 && (
            <div>
              <h5 className='mb-2 flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-400'>
                <RefreshCw className='h-4 w-4' />
                功能改进
              </h5>
              <ul className='space-y-1'>
                {entry.changed.map((item, index) => (
                  <li
                    key={index}
                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                  >
                    <span className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500'></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {entry.fixed.length > 0 && (
            <div>
              <h5 className='mb-2 flex items-center gap-1 text-sm font-medium text-purple-700 dark:text-purple-400'>
                <Bug className='h-4 w-4' />
                问题修复
              </h5>
              <ul className='space-y-1'>
                {entry.fixed.map((item, index) => (
                  <li
                    key={index}
                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                  >
                    <span className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500'></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 版本面板内容
  const versionPanelContent = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm'
        onClick={onClose}
        onTouchMove={(e) => {
          // 只阻止滚动，允许其他触摸事件
          e.preventDefault();
        }}
        onWheel={(e) => {
          // 阻止滚轮滚动
          e.preventDefault();
        }}
        style={{
          touchAction: 'none',
        }}
      />

      {/* 版本面板 */}
      <div
        className='fixed left-1/2 top-1/2 z-[1001] max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'
        onTouchMove={(e) => {
          // 允许版本面板内部滚动，阻止事件冒泡到外层
          e.stopPropagation();
        }}
        style={{
          touchAction: 'auto', // 允许面板内的正常触摸操作
        }}
      >
        {/* 标题栏 */}
        <div className='flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700 sm:p-6'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-200 sm:text-xl'>
              版本信息
            </h3>
            <div className='flex flex-wrap items-center gap-1 sm:gap-2'>
              <span className='rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300 sm:px-3 sm:text-sm'>
                v{CURRENT_VERSION}
              </span>
              {hasUpdate && (
                <span className='flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 sm:px-3 sm:text-sm'>
                  <Download className='h-3 w-3 sm:h-4 sm:w-4' />
                  <span className='hidden sm:inline'>有新版本可用</span>
                  <span className='sm:hidden'>可更新</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className='flex h-6 w-6 items-center justify-center rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:h-8 sm:w-8'
            aria-label='关闭'
          >
            <X className='h-full w-full' />
          </button>
        </div>

        {/* 内容区域 */}
        <div className='max-h-[calc(95vh-140px)] overflow-y-auto p-3 sm:max-h-[calc(90vh-120px)] sm:p-6'>
          <div className='space-y-3 sm:space-y-6'>
            {/* 远程更新信息 */}
            {hasUpdate && (
              <div className='rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-3 dark:border-yellow-800 dark:from-yellow-900/20 dark:to-amber-900/20 sm:p-4'>
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2 sm:gap-3'>
                    <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-800/40 sm:h-10 sm:w-10'>
                      <Download className='h-4 w-4 text-yellow-600 dark:text-yellow-400 sm:h-5 sm:w-5' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <h4 className='text-sm font-semibold text-yellow-800 dark:text-yellow-200 sm:text-base'>
                        发现新版本
                      </h4>
                      <p className='break-all text-xs text-yellow-700 dark:text-yellow-300 sm:text-sm'>
                        v{CURRENT_VERSION} → v{latestVersion}
                      </p>
                    </div>
                  </div>
                  <a
                    href='https://github.com/mtvpls/MoonTVPlus.git'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-600 px-3 py-2 text-xs text-white shadow-sm transition-colors hover:bg-yellow-700 sm:text-sm'
                  >
                    <Download className='h-3 w-3 sm:h-4 sm:w-4' />
                    前往仓库
                  </a>
                </div>
              </div>
            )}

            {/* 当前为最新版本信息 */}
            {!hasUpdate && (
              <div className='rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20 sm:p-4'>
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2 sm:gap-3'>
                    <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/40 sm:h-10 sm:w-10'>
                      <CheckCircle className='h-4 w-4 text-green-600 dark:text-green-400 sm:h-5 sm:w-5' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <h4 className='text-sm font-semibold text-green-800 dark:text-green-200 sm:text-base'>
                        当前为最新版本
                      </h4>
                      <p className='break-all text-xs text-green-700 dark:text-green-300 sm:text-sm'>
                        已是最新版本 v{CURRENT_VERSION}
                      </p>
                    </div>
                  </div>
                  <a
                    href='https://github.com/mtvpls/MoonTVPlus.git'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs text-white shadow-sm transition-colors hover:bg-green-700 sm:text-sm'
                  >
                    <CheckCircle className='h-3 w-3 sm:h-4 sm:w-4' />
                    前往仓库
                  </a>
                </div>
              </div>
            )}

            {/* 远程可更新内容 */}
            {hasUpdate && (
              <div className='space-y-4'>
                <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
                  <h4 className='flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200'>
                    <Download className='h-5 w-5 text-yellow-500' />
                    远程更新内容
                  </h4>
                  <button
                    onClick={() => setShowRemoteContent(!showRemoteContent)}
                    className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-100 px-3 py-1.5 text-sm text-yellow-800 transition-colors hover:bg-yellow-200 dark:bg-yellow-800/30 dark:text-yellow-200 dark:hover:bg-yellow-800/50 sm:w-auto'
                  >
                    {showRemoteContent ? (
                      <>
                        <ChevronUp className='h-4 w-4' />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className='h-4 w-4' />
                        查看更新内容
                      </>
                    )}
                  </button>
                </div>

                {showRemoteContent && remoteChangelog.length > 0 && (
                  <div className='space-y-4'>
                    {remoteChangelog
                      .filter((entry) => {
                        // 找到第一个本地版本，过滤掉本地已有的版本
                        const localVersions = changelog.map(
                          (local) => local.version,
                        );
                        return !localVersions.includes(entry.version);
                      })
                      .map((entry, index) => (
                        <div
                          key={index}
                          className={`rounded-lg border p-4 ${
                            entry.version === latestVersion
                              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'
                          }`}
                        >
                          <div className='mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <h4 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                                v{entry.version}
                              </h4>
                              {entry.version === latestVersion && (
                                <span className='flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'>
                                  远程最新
                                </span>
                              )}
                            </div>
                            <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                              {entry.date}
                            </div>
                          </div>

                          {entry.added && entry.added.length > 0 && (
                            <div className='mb-3'>
                              <h5 className='mb-2 flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400'>
                                <Plus className='h-4 w-4' />
                                新增功能
                              </h5>
                              <ul className='space-y-1'>
                                {entry.added.map((item, itemIndex) => (
                                  <li
                                    key={itemIndex}
                                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                                  >
                                    <span className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400'></span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.changed && entry.changed.length > 0 && (
                            <div className='mb-3'>
                              <h5 className='mb-2 flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400'>
                                <RefreshCw className='h-4 w-4' />
                                功能改进
                              </h5>
                              <ul className='space-y-1'>
                                {entry.changed.map((item, itemIndex) => (
                                  <li
                                    key={itemIndex}
                                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                                  >
                                    <span className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400'></span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.fixed && entry.fixed.length > 0 && (
                            <div>
                              <h5 className='mb-2 flex items-center gap-1 text-sm font-medium text-purple-700 dark:text-purple-400'>
                                <Bug className='h-4 w-4' />
                                问题修复
                              </h5>
                              <ul className='space-y-1'>
                                {entry.fixed.map((item, itemIndex) => (
                                  <li
                                    key={itemIndex}
                                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                                  >
                                    <span className='mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-500'></span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 变更日志标题 */}
            <div className='border-b border-gray-200 pb-4 dark:border-gray-700'>
              <h4 className='pb-3 text-lg font-semibold text-gray-800 dark:text-gray-200 sm:pb-4'>
                变更日志
              </h4>

              <div className='space-y-4'>
                {/* 本地变更日志 */}
                {changelog.map((entry) =>
                  renderChangelogEntry(
                    entry,
                    entry.version === CURRENT_VERSION,
                    false,
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // 使用 Portal 渲染到 document.body
  if (!mounted || !isOpen) return null;

  return createPortal(versionPanelContent, document.body);
};

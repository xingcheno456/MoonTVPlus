import { Logger, logger } from '../logger';

describe('Logger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('默认 logger 实例', () => {
    it('应导出 logger 实例', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('应支持 info 日志', () => {
      logger.info('test message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('应支持 warn 日志', () => {
      logger.warn('test warning');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('应支持 error 日志', () => {
      logger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('withLabel', () => {
    it('应创建带标签的新 Logger 实例', () => {
      const labeled = logger.withLabel('TestModule');
      expect(labeled).toBeInstanceOf(Logger);
      expect(labeled).not.toBe(logger);
    });

    it('带标签的 logger 应输出标签信息', () => {
      const labeled = logger.withLabel('TestModule');
      labeled.info('labeled message');
      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0];
      const joined = callArgs.join(' ');
      expect(joined).toContain('[TestModule]');
      expect(joined).toContain('labeled message');
    });
  });

  describe('日志级别', () => {
    it('应支持 debug 日志', () => {
      logger.debug('debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('应输出时间戳格式', () => {
      logger.info('timestamp test');
      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0];
      const joined = callArgs.join(' ');
      expect(joined).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('应输出日志级别标记', () => {
      logger.error('level test');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0];
      const joined = callArgs.join(' ');
      expect(joined).toContain('[ERROR]');
    });
  });

  describe('多参数日志', () => {
    it('应支持多个参数', () => {
      logger.info('message', { key: 'value' }, 123);
      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs).toContain('message');
      expect(callArgs).toContainEqual({ key: 'value' });
      expect(callArgs).toContain(123);
    });
  });
});

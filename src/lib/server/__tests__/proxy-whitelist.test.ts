import { isDomainAllowed } from '@/lib/server/proxy-whitelist';

describe('proxy-whitelist', () => {
  describe('isDomainAllowed', () => {
    it('should allow tmdb.org domains', () => {
      expect(isDomainAllowed('https://image.tmdb.org/t/p/w500/poster.jpg')).toBe(true);
      expect(isDomainAllowed('https://api.tmdb.org/3/movie/123')).toBe(true);
    });

    it('should allow douban domains', () => {
      expect(
        isDomainAllowed('https://img3.doubanio.com/view/photo/s_ratio_poster/public/p123.jpg'),
      ).toBe(true);
      expect(isDomainAllowed('https://douban.com')).toBe(true);
    });

    it('should allow bilibili domains', () => {
      expect(isDomainAllowed('https://pili-qn.hdslb.com/test.m3u8')).toBe(true);
      expect(isDomainAllowed('https://api.bilivideo.com/video.mp4')).toBe(true);
    });

    it('should allow douyin domains', () => {
      expect(isDomainAllowed('https://douyinvod.com/test.mp4')).toBe(true);
      expect(isDomainAllowed('https://douyinpic.com/img.jpg')).toBe(true);
    });

    it('should reject unknown domains', () => {
      expect(isDomainAllowed('https://evil.com/malware.js')).toBe(false);
      expect(isDomainAllowed('https://localhost:8080/api')).toBe(false);
      expect(isDomainAllowed('https://192.168.1.1/admin')).toBe(false);
    });

    it('should reject invalid URLs gracefully', () => {
      expect(isDomainAllowed('not-a-url')).toBe(false);
      expect(isDomainAllowed('')).toBe(false);
    });
  });
});

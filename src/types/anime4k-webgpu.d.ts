/**
 * anime4k-webgpu 类型声明
 * 该库未提供 TypeScript 类型，此处补充核心接口
 */
declare module 'anime4k-webgpu' {
  export interface Anime4KMode {
    bindGroup: unknown;
    pass: unknown;
  }

  export interface Anime4KRenderConfig {
    video: HTMLVideoElement | HTMLCanvasElement;
    canvas: HTMLCanvasElement;
    pipelineBuilder: (
      device: GPUDevice,
      inputTexture: GPUTexture,
    ) => Anime4KMode[];
    frameRenderer?: (cmdEncoder: GPUCommandEncoder) => void;
  }

  export interface Anime4KController {
    stop?: () => void;
  }

  export interface Anime4KModeConstructor {
    new (options: {
      device: GPUDevice;
      inputTexture: GPUTexture;
      nativeDimensions: { width: number; height: number };
      targetDimensions: { width: number; height: number };
    }): Anime4KMode;
  }

  export const ModeA: Anime4KModeConstructor;
  export const ModeB: Anime4KModeConstructor;
  export const ModeC: Anime4KModeConstructor;
  export const ModeAA: Anime4KModeConstructor;
  export const ModeBB: Anime4KModeConstructor;
  export const ModeCA: Anime4KModeConstructor;

  export function render(
    config: Anime4KRenderConfig,
  ): Promise<Anime4KController>;
}

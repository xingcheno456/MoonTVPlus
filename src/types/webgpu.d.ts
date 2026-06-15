/**
 * WebGPU 类型增强声明
 * 补充 GPUAdapter.limits 和 Navigator.gpu 的完整类型
 */
declare global {
  interface NavigatorGPU {
    requestAdapter(
      options?: GPURequestAdapterOptions,
    ): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): GPUTextureFormat;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Navigator {
    readonly gpu?: NavigatorGPU;
  }

  interface GPUAdapterLimits {
    readonly maxBufferSize: number;
    readonly maxStorageBufferBindingSize: number;
    readonly maxTextureDimension1D: number;
    readonly maxTextureDimension2D: number;
    readonly maxTextureDimension3D: number;
    readonly maxTextureArrayLayers: number;
    readonly maxBindGroups: number;
    readonly maxDynamicUniformBuffersPerPipelineLayout: number;
    readonly maxDynamicStorageBuffersPerPipelineLayout: number;
    readonly maxSampledTexturesPerShaderStage: number;
    readonly maxSamplersPerShaderStage: number;
    readonly maxStorageBuffersPerShaderStage: number;
    readonly maxStorageTexturesPerShaderStage: number;
    readonly maxUniformBuffersPerShaderStage: number;
    readonly maxUniformBufferBindingSize: number;
    readonly maxVertexBuffers: number;
    readonly maxVertexAttributes: number;
    readonly maxVertexBufferArrayStride: number;
    readonly maxInterStageShaderComponents: number;
    readonly maxComputeWorkgroupStorageSize: number;
    readonly maxComputeInvocationsPerWorkgroup: number;
    readonly maxComputeWorkgroupSizeX: number;
    readonly maxComputeWorkgroupSizeY: number;
    readonly maxComputeWorkgroupSizeZ: number;
    readonly maxComputeWorkgroupsPerDimension: number;
  }

  interface GPUAdapter {
    readonly limits: GPUAdapterLimits;
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
  }

  interface GPUDeviceDescriptor {
    requiredFeatures?: GPUFeatureName[];
    requiredLimits?: Record<string, number>;
    defaultQueue?: GPUQueueDescriptor;
  }
}

export {};

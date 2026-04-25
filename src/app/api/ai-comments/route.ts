import { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api-response';

import { generateAIComments, AIComment } from '@/lib/ai-comment-generator';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

interface AICommentsResponse {
  comments: AIComment[];
  total: number;
  movieName: string;
  isAiGenerated: true;
  generatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const movieName = searchParams.get('name');
    const movieInfo = searchParams.get('info');
    const count = parseInt(searchParams.get('count') || '10');

    // 参数验证
    if (!movieName) {
      return apiError('缺少影片名称参数', 400);
    }

    if (count < 1 || count > 50) {
      return apiError('评论数量必须在1-50之间', 400);
    }

    // 读取AI配置
    const config = await getConfig();
    const aiConfig = config.AIConfig;

    // 检查AI功能是否启用
    if (!aiConfig?.Enabled) {
      return apiError('AI功能未启用', 403);
    }

    // 检查AI评论功能是否启用
    if (!aiConfig?.EnableAIComments) {
      return apiError('AI评论功能未启用', 403);
    }

    // 检查必要的配置
    if (
      !aiConfig.CustomApiKey ||
      !aiConfig.CustomBaseURL ||
      !aiConfig.CustomModel
    ) {
      return apiError('AI配置不完整，请在管理面板配置', 500);
    }

    // 生成AI评论
    const comments = await generateAIComments({
      movieName,
      movieInfo: movieInfo || undefined,
      count,
      aiConfig: {
        CustomApiKey: aiConfig.CustomApiKey,
        CustomBaseURL: aiConfig.CustomBaseURL,
        CustomModel: aiConfig.CustomModel,
        Temperature: aiConfig.Temperature,
        MaxTokens: aiConfig.MaxTokens,
        EnableWebSearch: aiConfig.EnableWebSearch,
        WebSearchProvider: aiConfig.WebSearchProvider,
        TavilyApiKey: aiConfig.TavilyApiKey,
        SerperApiKey: aiConfig.SerperApiKey,
        SerpApiKey: aiConfig.SerpApiKey,
      },
    });

    // 返回结果
    const response: AICommentsResponse = {
      comments,
      total: comments.length,
      movieName,
      isAiGenerated: true,
      generatedAt: new Date().toISOString(),
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('AI评论生成失败:', error);

    // 返回友好的错误信息
    const errorMessage =
      error instanceof Error ? error.message : 'AI评论生成失败';

    return apiSuccess({
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? String(error) : undefined,
      }, { status: 500 });
  }
}

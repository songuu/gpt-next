import { createClient } from "@/utils/supabase/server";
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// 提取重定向函数，以便复用和测试
function getRedirectUrl(origin: string, path: string, message?: string) {
  let url = `${origin}${path}`;
  if (message) {
    // 使用encodeURIComponent来避免潜在的安全风险
    url += `?message=${encodeURIComponent(message)}`;
  }
  return url;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    // 如果没有code参数，直接重定向到聊天页面
    return NextResponse.redirect(getRedirectUrl(requestUrl.origin, '/chat'));
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // 如果交换code失败，重定向到登录页面并带上错误信息
      return NextResponse.redirect(getRedirectUrl(requestUrl.origin, '/login', error.name));
    }

    // 如果交换code成功，但用户未登录，可以重定向到其他页面，例如账户页面
    // 这里为了简单起见，我们仍然重定向到聊天页面
    // 你可以根据业务需求进行更改
    return NextResponse.redirect(getRedirectUrl(requestUrl.origin, '/chat'));
  } catch (err) {
    // 捕获并处理其他可能的异常
    console.error('An error occurred:', err);
    return NextResponse.redirect(getRedirectUrl(requestUrl.origin, '/error', 'An unexpected error occurred.'));
  }
}
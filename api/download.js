// api/proxy.js
export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // 브라우저 및 CDN 캐싱 강제 무력화 (고유 파일명 정상 작동 보장)
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'X_video.mp4';

  if (!videoUrl) {
    return new Response('동영상 URL이 누락되었습니다.', { status: 400, headers });
  }

  try {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      return new Response('동영상 파일을 가져오지 못했습니다.', { status: response.status, headers });
    }

    headers.set('Content-Type', response.headers.get('content-type') || 'video/mp4');
    headers.set('Content-Length', response.headers.get('content-length') || '');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new Response(response.body, {
      status: 200,
      headers: headers
    });

  } catch (error) {
    return new Response('프록시 연결 오류: ' + error.message, { status: 500, headers });
  }
}

// api/proxy.js
export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get('url');
  
  // [안전 장치 추가] 만약 어떤 이유로든 파일명이 누락되면 고유 난수를 즉석 생성하여 파일명 중복을 원천 차단합니다.
  let filename = searchParams.get('filename');
  if (!filename) {
    const randomId = Math.random().toString(36).substring(2, 7); // 랜덤 5자리 난수 생성
    filename = `X_video_${randomId}.mp4`;
  }

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

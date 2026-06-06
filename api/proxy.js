// api/proxy.js
export const config = {
  runtime: 'edge', // 파일 크기 제한(4.5MB)을 해제하기 위해 Edge 런타임 사용
};

export default async function handler(req) {
  // CORS 허용 설정
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const { searchParams } = new URL(req.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return new Response('동영상 URL이 누락되었습니다.', { status: 400, headers });
  }

  try {
    // X 서버에 동영상 파일 요청
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      return new Response('동영상 파일을 가져오지 못했습니다.', { status: response.status, headers });
    }

    // 기존 헤더에 다운로드 강제 지정 헤더 추가
    headers.set('Content-Type', response.headers.get('content-type') || 'video/mp4');
    headers.set('Content-Length', response.headers.get('content-length') || '');
    
    // 브라우저가 재생하지 않고 즉시 다운로드 창을 띄우도록 강제하는 헤더 설정
    headers.set('Content-Disposition', 'attachment; filename="X_video.mp4"');

    // 파일을 실시간 스트림 형태로 브라우저에 바로 전달
    return new Response(response.body, {
      status: 200,
      headers: headers
    });

  } catch (error) {
    return new Response('프록시 연결 오류: ' + error.message, { status: 500, headers });
  }
}

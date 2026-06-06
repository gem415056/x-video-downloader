// api/download.js
export const config = {
  runtime: 'edge', // 100% 작동을 보장하는 초고속 Edge 엔진으로 구동
};

export default async function handler(req) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: "URL이 누락되었습니다." }), { status: 400, headers });
  }

  try {
    const tweetIdMatch = url.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return new Response(JSON.stringify({ error: "올바른 트위터/X 링크가 아닙니다." }), { status: 400, headers });
    }
    const tweetId = tweetIdMatch[1];

    let data = null;
    let primaryError = "";

    // [1차 시도] 가장 안정적인 FixTweet API 호출
    try {
      const fxUrl = `https://api.fxtwitter.com/i/status/${tweetId}`;
      const response = await fetch(fxUrl);
      if (response.ok) {
        data = await response.json();
      } else {
        primaryError = `FxTwitter 응답코드 ${response.status}`;
      }
    } catch (e) {
      primaryError = e.message;
    }

    // [2차 시도] 실패 시 백업 서버로 자동 전환
    if (!data) {
      try {
        const vxUrl = `https://api.vxtwitter.com/i/status/${tweetId}`;
        const response = await fetch(vxUrl);
        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error(`vxTwitter 응답코드 ${response.status}`);
        }
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: `우회 서버 점검 중. (1차원인: ${primaryError}, 2차원인: ${e.message})` 
        }), { status: 502, headers });
      }
    }

    const tweetData = data.tweet || data;
    let mediaList = [];
    
    if (tweetData.media && Array.isArray(tweetData.media.all)) {
      mediaList = tweetData.media.all;
    } else if (Array.isArray(tweetData.media_extended)) {
      mediaList = tweetData.media_extended;
    } else if (Array.isArray(tweetData.mediaExtended)) {
      mediaList = tweetData.mediaExtended;
    }

    const videoMediaList = mediaList.filter(m => m.type === 'video' || m.type === 'gif');

    if (videoMediaList.length === 0) {
      return new Response(JSON.stringify({ error: "트윗에 저장 가능한 동영상이 없습니다." }), { status: 400, headers });
    }

    const videos = videoMediaList.map(videoMedia => {
      const thumbnail = videoMedia.thumbnail_url || videoMedia.thumbnail || "";
      const videoUrl = videoMedia.url;
      
      let resolution = "최고 화질";
      if (videoMedia.size && videoMedia.size.width && videoMedia.size.height) {
        resolution = `${videoMedia.size.width}x${videoMedia.size.height}`;
      } else if (videoMedia.width && videoMedia.height) {
        resolution = `${videoMedia.width}x${videoMedia.height}`;
      } else {
        const resMatch = videoUrl.match(/\/vid\/(\d+x\d+)\//);
        if (resMatch) resolution = resMatch[1];
      }

      return {
        thumbnail,
        videoUrl,
        resolution
      };
    });

    return new Response(JSON.stringify({ videos }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: "분석 실패: " + error.message }), { status: 500, headers });
  }
        }

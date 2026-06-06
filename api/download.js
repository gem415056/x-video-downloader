// api/download.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "URL이 누락되었습니다." });
  }

  try {
    const tweetIdMatch = url.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return res.status(400).json({ error: "올바른 트위터/X 링크가 아닙니다." });
    }
    const tweetId = tweetIdMatch[1];

    let data = null;
    let primaryError = "";

    // [1차 시도] 가장 빠르고 안정적인 FixTweet (api.fxtwitter.com) API 호출
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

    // [2차 시도 (백업)] 실패 시 vxTwitter API로 자동 백업 전환
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
        return res.status(502).json({ 
          error: `우회 서버 일시적 장애. (1차원인: ${primaryError}, 2차원인: ${e.message})` 
        });
      }
    }

    // 데이터가 무사히 받아졌다면 분석 시작
    const tweetData = data.tweet || data;
    
    // 두 서버의 미디어 데이터 추출 이중화 (Cope with both API formats)
    let mediaList = [];
    
    // 1. FixTweet 양식 감지 (media.all 구조)
    if (tweetData.media && Array.isArray(tweetData.media.all)) {
      mediaList = tweetData.media.all;
    } 
    // 2. vxTwitter 양식 감지 (media_extended 구조)
    else if (Array.isArray(tweetData.media_extended)) {
      mediaList = tweetData.media_extended;
    } 
    else if (Array.isArray(tweetData.mediaExtended)) {
      mediaList = tweetData.mediaExtended;
    }

    // 동영상 및 GIF 필터링
    const videoMediaList = mediaList.filter(m => m.type === 'video' || m.type === 'gif');

    if (videoMediaList.length === 0) {
      return res.status(400).json({ error: "트윗에 저장 가능한 동영상이 없습니다." });
    }

    const videos = videoMediaList.map(videoMedia => {
      // 두 API의 썸네일 키 값 매핑
      const thumbnail = videoMedia.thumbnail_url || videoMedia.thumbnail || "";
      const videoUrl = videoMedia.url;
      
      // 두 API의 화질 해상도(Resolution) 매핑
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

    return res.status(200).json({ videos });

  } catch (error) {
    return res.status(500).json({ error: "분석 실패: " + error.message });
  }
    }

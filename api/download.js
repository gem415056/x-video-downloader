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

    const twitterApiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=ko`;
    const response = await fetch(twitterApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: "트윗 데이터를 가져오지 못했습니다. 삭제되었거나 비공개 트윗일 수 있습니다." });
    }

    const data = await response.json();
    
    // 민감한 콘텐츠(Tombstone)로 제한된 트윗인지 확인
    if (data.tombstone) {
      return res.status(400).json({ 
        error: "이 트윗은 민감한 콘텐츠(성인물/폭력성 등)로 제한되어 비로그인 상태에서 정보를 가져올 수 없습니다." 
      });
    }

    const mediaList = data.mediaDetails || [];
    
    // 모든 미디어 리스트를 돌며 일반 비디오('video') 또는 움짤('animated_gif')을 찾음
    const videoMedia = mediaList.find(m => m.type === 'video' || m.type === 'animated_gif');
    
    if (!videoMedia) {
      // 디버깅을 위해 발견된 다른 미디어 타입 정보를 에러 메시지에 포함시킵니다.
      const foundTypes = mediaList.map(m => m.type).join(', ') || '없음';
      return res.status(400).json({ 
        error: `이 트윗에서 동영상을 찾을 수 없습니다. (감지된 미디어 종류: ${foundTypes})` 
      });
    }

    const thumbnail = videoMedia.media_url_https;
    const variants = videoMedia.video_info?.variants || [];
    
    // MP4 포맷 추출 및 고화질 정렬
    const mp4Variants = variants
      .filter(v => v.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    if (mp4Variants.length === 0) {
      return res.status(400).json({ error: "다운로드 가능한 MP4 포맷 동영상이 없습니다." });
    }

    const highestQuality = mp4Variants[0];
    const resMatch = highestQuality.url.match(/\/vid\/(\d+x\d+)\//);
    const resolution = resMatch ? resMatch[1] : "최고 화질";

    return res.status(200).json({
      thumbnail,
      videoUrl: highestQuality.url,
      resolution
    });

  } catch (error) {
    return res.status(500).json({ error: "서버 오류: " + error.message });
  }
            }

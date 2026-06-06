// api/download.js
export default async function handler(req, res) {
  // CORS 허용 설정 (모바일 브라우저 대응)
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
    // 트위터/X URL에서 Tweet ID 추출
    const tweetIdMatch = url.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return res.status(400).json({ error: "올바른 트위터/X 링크가 아닙니다." });
    }
    const tweetId = tweetIdMatch[1];

    // X 자체의 신디케이션 API 호출 (API 키 필요 없음, 안정적)
    const twitterApiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=ko`;
    const response = await fetch(twitterApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: "트윗 데이터를 가져오지 못했습니다. (비공개 계정이거나 삭제된 트윗일 수 있습니다.)" });
    }

    const data = await response.json();
    
    // 미디어 정보 추출
    const media = data.mediaDetails?.[0];
    if (!media || media.type !== 'video') {
      return res.status(400).json({ error: "이 트윗에는 동영상이 포함되어 있지 않습니다." });
    }

    const thumbnail = media.media_url_https;
    const variants = media.video_info?.variants || [];
    
    // MP4 포맷만 필터링 후, 화질(bitrate) 기준 내림차순 정렬 (가장 고화질이 0번째로 옴)
    const mp4Variants = variants
      .filter(v => v.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    if (mp4Variants.length === 0) {
      return res.status(400).json({ error: "다운로드 가능한 MP4 포맷 동영상이 없습니다." });
    }

    const highestQuality = mp4Variants[0];
    
    // 주소에서 대략적인 화질 정보(예: 720x1280) 추출
    const resMatch = highestQuality.url.match(/\/vid\/(\d+x\d+)\//);
    const resolution = resMatch ? resMatch[1] : "최고 화질";

    return res.status(200).json({
      thumbnail,
      videoUrl: highestQuality.url,
      resolution
    });

  } catch (error) {
    return res.status(500).json({ error: "서버 내부 오류: " + error.message });
  }
      }

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
    // 1. 트위터/X URL에서 Tweet ID 추출
    const tweetIdMatch = url.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return res.status(400).json({ error: "올바른 트위터/X 링크가 아닙니다." });
    }
    const tweetId = tweetIdMatch[1];

    // 2. 오픈소스 트위터 우회 프록시인 vxTwitter API 호출 (IP 차단 우회용)
    const vxApiUrl = `https://api.vxtwitter.com/status/${tweetId}`;
    const response = await fetch(vxApiUrl);

    if (!response.ok) {
      return res.status(404).json({ error: "트윗 정보를 가져오는 데 실패했습니다. (vxTwitter 서버 통신 오류)" });
    }

    const data = await response.json();
    
    // 3. 미디어 데이터 추출
    const mediaList = data.media_extended || [];
    const videoMedia = mediaList.find(m => m.type === 'video' || m.type === 'gif');

    if (!videoMedia) {
      return res.status(400).json({ 
        error: "트윗 분석은 성공했으나, 동영상 파일을 찾을 수 없습니다. (사진이나 텍스트만 있는 트윗일 수 있습니다.)" 
      });
    }

    const thumbnail = videoMedia.thumbnail_url || "";
    const videoUrl = videoMedia.url;
    
    // 4. 화질 정보 추출
    let resolution = "최고 화질";
    if (videoMedia.size && videoMedia.size.width && videoMedia.size.height) {
      resolution = `${videoMedia.size.width}x${videoMedia.size.height}`;
    } else {
      const resMatch = videoUrl.match(/\/vid\/(\d+x\d+)\//);
      if (resMatch) resolution = resMatch[1];
    }

    return res.status(200).json({
      thumbnail,
      videoUrl,
      resolution
    });

  } catch (error) {
    return res.status(500).json({ error: "서버 오류가 발생했습니다: " + error.message });
  }
}

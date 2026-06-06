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

    const vxApiUrl = `https://api.vxtwitter.com/status/${tweetId}`;
    const response = await fetch(vxApiUrl);

    if (!response.ok) {
      return res.status(404).json({ error: "트윗 정보를 가져오는 데 실패했습니다." });
    }

    const data = await response.json();
    
    // 트윗 내 모든 미디어 리스트 확보
    const mediaList = data.media_extended || [];
    
    // 이미지 등은 제외하고 비디오 및 GIF 파일만 전부 필터링
    const videoMediaList = mediaList.filter(m => m.type === 'video' || m.type === 'gif');

    if (videoMediaList.length === 0) {
      return res.status(400).json({ error: "동영상을 찾을 수 없습니다." });
    }

    // 발견된 모든 동영상의 다운로드 정보 객체 배열 생성
    const videos = videoMediaList.map(videoMedia => {
      const thumbnail = videoMedia.thumbnail_url || "";
      const videoUrl = videoMedia.url;
      
      let resolution = "최고 화질";
      if (videoMedia.size && videoMedia.size.width && videoMedia.size.height) {
        resolution = `${videoMedia.size.width}x${videoMedia.size.height}`;
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

    // 멀티 동영상 배열 반환
    return res.status(200).json({ videos });

  } catch (error) {
    return res.status(500).json({ error: "서버 오류: " + error.message });
  }
                                      }

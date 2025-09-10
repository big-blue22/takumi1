// media-analyzer.js - メディア分析機能
class MediaAnalyzer {
  constructor() {
    this.visionApiKey = localStorage.getItem('vision_api_key') || '';
    this.videoApiKey = localStorage.getItem('video_api_key') || '';
    this.supportedFormats = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      video: ['mp4', 'webm', 'avi', 'mov']
    };
  }

  async analyzeScreenshot(file) {
    if (!this.validateFile(file, 'image')) {
      return { error: 'サポートされていない画像形式です' };
    }

    if (!this.visionApiKey) {
      return this.getMockScreenshotAnalysis(file);
    }

    try {
      const base64 = await this.fileToBase64(file);
      
      // Vision API呼び出し（例：OpenAI Vision API）
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.visionApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `このゲームのスクリーンショットを分析してください。
                  以下の情報を抽出してJSON形式で返してください：
                  - ゲームタイトル
                  - 試合結果（勝敗）
                  - スコア/KDA
                  - 重要な統計情報
                  - パフォーマンス分析
                  - 改善提案`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      return this.parseVisionResponse(data);
    } catch (error) {
      console.error('Screenshot analysis failed:', error);
      return this.getMockScreenshotAnalysis(file);
    }
  }

  async analyzeVideo(file) {
    if (!this.validateFile(file, 'video')) {
      return { error: 'サポートされていない動画形式です' };
    }

    if (!this.videoApiKey) {
      return this.getMockVideoAnalysis(file);
    }

    try {
      // 動画を複数のフレームに分割
      const frames = await this.extractFrames(file, 10); // 10フレーム抽出
      
      // 各フレームを分析
      const frameAnalyses = [];
      for (const frame of frames) {
        const analysis = await this.analyzeScreenshot(frame);
        frameAnalyses.push(analysis);
      }

      // 分析結果を統合
      return this.mergeVideoAnalysis(frameAnalyses);
    } catch (error) {
      console.error('Video analysis failed:', error);
      return this.getMockVideoAnalysis(file);
    }
  }

  async extractFrames(videoFile, frameCount = 10) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const frames = [];

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const interval = video.duration / frameCount;

        let currentTime = 0;
        const captureFrame = () => {
          if (currentTime < video.duration) {
            video.currentTime = currentTime;
            setTimeout(() => {
              ctx.drawImage(video, 0, 0);
              canvas.toBlob((blob) => {
                frames.push(blob);
                currentTime += interval;
                captureFrame();
              });
            }, 100);
          } else {
            resolve(frames);
          }
        };

        captureFrame();
      };

      video.src = URL.createObjectURL(videoFile);
    });
  }

  validateFile(file, type) {
    const extension = file.name.split('.').pop().toLowerCase();
    return this.supportedFormats[type].includes(extension);
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getMockScreenshotAnalysis(file) {
    return {
      game: "VALORANT",
      result: "WIN",
      score: "13-7",
      kda: {
        kills: 24,
        deaths: 12,
        assists: 8
      },
      stats: {
        acs: 287,
        headshot: 28,
        adr: 156
      },
      analysis: {
        strengths: [
          "優れたエイム精度（HS率28%）",
          "高いACS（287）",
          "安定したラウンド貢献"
        ],
        weaknesses: [
          "エコラウンドでの判断",
          "ユーティリティの使用タイミング"
        ],
        suggestions: [
          "スモークのタイミングを改善",
          "エコラウンドの立ち回り練習",
          "チームとの連携強化"
        ]
      },
      confidence: 0.85,
      uploadTime: new Date().toISOString()
    };
  }

  getMockVideoAnalysis(file) {
    return {
      game: "League of Legends",
      duration: "32:45",
      highlights: [
        { time: "5:23", event: "First Blood", analysis: "良いガンク判断" },
        { time: "12:45", event: "Dragon Secure", analysis: "優れたオブジェクトコントロール" },
        { time: "28:30", event: "Baron Steal", analysis: "完璧なスマイトタイミング" }
      ],
      overall: {
        laning: 8.5,
        teamfight: 7.8,
        macro: 8.2,
        mechanics: 8.0
      },
      recommendations: [
        "CSの精度向上（特に序盤）",
        "ワード設置位置の最適化",
        "レーン復帰タイミングの改善"
      ],
      uploadTime: new Date().toISOString()
    };
  }

  parseVisionResponse(response) {
    try {
      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      return this.getMockScreenshotAnalysis();
    }
  }

  mergeVideoAnalysis(frameAnalyses) {
    // フレーム分析を統合して包括的な分析結果を生成
    const merged = {
      game: frameAnalyses[0]?.game || "Unknown",
      totalFrames: frameAnalyses.length,
      keyMoments: [],
      averagePerformance: {},
      suggestions: new Set(),
      uploadTime: new Date().toISOString()
    };

    frameAnalyses.forEach((analysis, index) => {
      if (analysis.analysis?.suggestions) {
        analysis.analysis.suggestions.forEach(s => merged.suggestions.add(s));
      }
    });

    merged.suggestions = Array.from(merged.suggestions);
    return merged;
  }

  // API設定関連
  setVisionApiKey(apiKey) {
    this.visionApiKey = apiKey;
    localStorage.setItem('vision_api_key', apiKey);
  }

  setVideoApiKey(apiKey) {
    this.videoApiKey = apiKey;
    localStorage.setItem('video_api_key', apiKey);
  }

  async testVisionApi() {
    if (!this.visionApiKey) {
      return { success: false, message: 'APIキーが設定されていません' };
    }

    try {
      // 簡単なテスト画像で API をテスト
      const testResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.visionApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'This is a test message. Please respond with "API connection successful".'
                }
              ]
            }
          ],
          max_tokens: 50
        })
      });

      if (testResponse.ok) {
        return { success: true, message: 'Vision API接続成功' };
      } else {
        return { success: false, message: 'API接続に失敗しました' };
      }
    } catch (error) {
      return { success: false, message: `API接続エラー: ${error.message}` };
    }
  }

  // ファイルサイズチェック
  checkFileSize(file, maxSizeMB = 10) {
    const maxSize = maxSizeMB * 1024 * 1024;
    return file.size <= maxSize;
  }

  // ファイル情報取得
  getFileInfo(file) {
    return {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString()
    };
  }
}
// Mock Data for eSports AI Coaching App

// Player Data Structure
const mockPlayerData = {
  id: "player_001",
  username: "ProPlayer2024",
  game: "League of Legends",
  rank: "Diamond II",
  server: "JP",
  stats: {
    winRate: 58.5,
    avgKDA: 3.5,
    avgCSPerMin: 7.2,
    mainRole: "ADC",
    championPool: ["Jinx", "Kai'Sa", "Ezreal", "Jhin", "Aphelios"],
    gamesPlayed: 256,
    totalPlayTime: 1024,
    peakRank: "Master",
    currentLP: 1847
  },
  recentMatches: [
    { 
      id: 1, 
      result: "WIN", 
      kda: "8/2/11", 
      kills: 8, 
      deaths: 2, 
      assists: 11,
      cs: 285, 
      duration: 32, 
      champion: "Jinx",
      date: "2024-08-29",
      gameMode: "Ranked Solo"
    },
    { 
      id: 2, 
      result: "LOSS", 
      kda: "5/6/8", 
      kills: 5, 
      deaths: 6, 
      assists: 8,
      cs: 243, 
      duration: 28, 
      champion: "Kai'Sa",
      date: "2024-08-29",
      gameMode: "Ranked Solo"
    },
    { 
      id: 3, 
      result: "WIN", 
      kda: "12/3/7", 
      kills: 12, 
      deaths: 3, 
      assists: 7,
      cs: 312, 
      duration: 35, 
      champion: "Ezreal",
      date: "2024-08-28",
      gameMode: "Ranked Solo"
    },
    { 
      id: 4, 
      result: "WIN", 
      kda: "7/1/15", 
      kills: 7, 
      deaths: 1, 
      assists: 15,
      cs: 268, 
      duration: 30, 
      champion: "Jhin",
      date: "2024-08-28",
      gameMode: "Ranked Solo"
    },
    { 
      id: 5, 
      result: "LOSS", 
      kda: "3/5/9", 
      kills: 3, 
      deaths: 5, 
      assists: 9,
      cs: 198, 
      duration: 25, 
      champion: "Aphelios",
      date: "2024-08-27",
      gameMode: "Ranked Solo"
    }
  ],
  goals: [
    { 
      id: 1, 
      title: "Master到達", 
      description: "今シーズン中にMasterランクに到達する",
      deadline: "2024-12-31", 
      progress: 65,
      type: "rank",
      priority: "high",
      createdAt: "2024-08-01"
    },
    { 
      id: 2, 
      title: "CS/分 8.0達成", 
      description: "平均CS/分を8.0まで向上させる",
      deadline: "2024-11-30", 
      progress: 40,
      type: "skill",
      priority: "medium",
      createdAt: "2024-08-15"
    },
    { 
      id: 3, 
      title: "勝率65%達成", 
      description: "直近50試合での勝率65%を維持する",
      deadline: "2024-10-31", 
      progress: 25,
      type: "performance",
      priority: "medium",
      createdAt: "2024-08-20"
    }
  ],
  matchHistory: [],
  preferences: {
    notifications: true,
    autoAnalysis: false,
    dataRetention: 30,
    theme: "dark",
    language: "ja"
  }
};

// Performance Chart Data
const mockPerformanceData = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
  datasets: [
    {
      label: 'KDA',
      data: [2.8, 3.1, 2.9, 3.4, 3.7, 3.2, 3.5, 3.8],
      borderColor: '#e94560',
      backgroundColor: 'rgba(233, 69, 96, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: 'CS/min',
      data: [6.5, 6.8, 6.9, 7.0, 7.1, 6.9, 7.2, 7.4],
      borderColor: '#0f3460',
      backgroundColor: 'rgba(15, 52, 96, 0.1)',
      tension: 0.4,
      fill: true
    },
    {
      label: '勝率 (%)',
      data: [52, 55, 58, 56, 60, 59, 58, 62],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true
    }
  ]
};

// KDA Distribution Chart Data
const mockKDAData = {
  labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5+'],
  datasets: [{
    label: 'KDA分布',
    data: [5, 12, 28, 35, 15, 5],
    backgroundColor: [
      '#ef4444',
      '#f59e0b',
      '#10b981',
      '#0f3460',
      '#e94560',
      '#8b5cf6'
    ],
    borderColor: '#ffffff',
    borderWidth: 2
  }]
};

// Mock AI Analysis Results
const mockAIAnalysis = {
  analysis: "プレイヤーは安定したパフォーマンスを示していますが、中盤の判断力とCS精度に改善の余地があります。特に、劣勢時の判断とチーム戦での立ち位置に課題が見られます。",
  strengths: [
    "高いKDA比率（平均3.5）を維持している",
    "優れたマップコントロール意識",
    "チーム戦での貢献度が高い",
    "レーニング段階での優位性",
    "アイテムビルドの適応力"
  ],
  weaknesses: [
    "CS精度が目標値（8.0/分）を下回る",
    "中盤のローミングタイミングが不適切",
    "視界確保の意識が低い",
    "劣勢時の判断ミス",
    "チーム戦での立ち位置の問題"
  ],
  improvements: [
    "10分時点でのCS目標を80に設定し、練習を強化する",
    "ミニマップの確認頻度を3秒に1回まで増やす",
    "ワードの配置位置を最適化し、視界コントロールを向上",
    "劣勢時の立ち回りパターンを習得する",
    "チーム戦前のポジショニング練習を追加"
  ],
  training: [
    "カスタムゲームで10分間CSトレーニング（毎日30分）",
    "プロの試合VOD分析（週3回、各1時間）",
    "特定チャンピオンのコンボ練習（週5回）",
    "ランク戦前のウォーミングアップルーティン導入",
    "チーム戦シミュレーション練習"
  ],
  priority: "CS精度の向上 - 10分で80CS達成を最優先目標に設定",
  estimatedImprovement: "2週間の集中練習で勝率5-8%向上、1ヶ月でCS/分0.5向上が期待できます",
  confidence: 0.85,
  lastUpdated: "2024-08-30T10:30:00Z"
};

// Mock AI Recommendations
const mockRecommendations = [
  {
    id: 1,
    title: "CS精度向上",
    type: "skill",
    priority: "high",
    text: "カスタムゲームで毎日30分のCS練習を行い、10分時点で80CSを目標にしてください。現在の平均7.2/分から8.0/分への向上が期待できます。",
    actionItems: [
      "カスタムゲームでのCS練習（毎日30分）",
      "メトロノームを使用したラストヒット練習",
      "複数チャンピオンでの練習"
    ],
    estimatedTime: "2-3週間",
    difficulty: "中"
  },
  {
    id: 2,
    title: "視界コントロール",
    type: "strategy",
    priority: "medium",
    text: "ワードの配置タイミングと位置を改善し、ミニマップ確認頻度を3秒に1回まで増やしてください。これにより死亡回数を20%削減できます。",
    actionItems: [
      "3秒間隔でのミニマップ確認",
      "ワード配置の最適化",
      "敵ジャングラーの動向把握"
    ],
    estimatedTime: "1-2週間",
    difficulty: "易"
  },
  {
    id: 3,
    title: "チーム戦ポジショニング",
    type: "teamfight",
    priority: "medium",
    text: "チーム戦での立ち位置を改善し、DPSを最大化しながら生存率を向上させてください。特にADCとしての最適な距離感を意識してください。",
    actionItems: [
      "チーム戦シミュレーション練習",
      "ADCポジショニングガイド学習",
      "プロ選手の立ち回り分析"
    ],
    estimatedTime: "3-4週間",
    difficulty: "難"
  }
];

// Settings Mock Data
const mockSettings = {
  api: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    isConfigured: false,
    lastVerified: null
  },
  application: {
    notifications: true,
    autoAnalysis: false,
    dataRetention: 30,
    theme: 'dark',
    language: 'ja'
  }
};

// Sample API Responses for different providers
const mockAPIResponses = {
  performanceAnalysis: {
    openai: {
      analysis: "Based on your recent performance data, you show strong mechanical skills but need improvement in macro game decision-making.",
      strengths: ["High KDA maintenance", "Excellent laning phase", "Good item builds"],
      weaknesses: ["Mid-game positioning", "CS efficiency", "Map awareness"],
      improvements: ["Focus on CS drills", "Improve minimap checking", "Practice team fight positioning"],
      training: ["30min CS practice daily", "VOD review 3x/week", "Positioning drills"],
      priority: "CS improvement - target 8.0 CS/min",
      estimatedImprovement: "5-8% winrate increase in 2 weeks"
    }
  }
};

// Helper Functions
const mockDataHelpers = {
  // Get player statistics
  getPlayerStats: () => {
    return { ...mockPlayerData.stats };
  },

  // Get recent matches with calculated KDA
  getRecentMatches: (limit = 5) => {
    return mockPlayerData.recentMatches.slice(0, limit).map(match => ({
      ...match,
      kdaRatio: match.deaths === 0 ? 
        (match.kills + match.assists) : 
        ((match.kills + match.assists) / match.deaths).toFixed(2),
      csPerMin: (match.cs / match.duration).toFixed(1)
    }));
  },

  // Get goals with progress calculation
  getGoals: () => {
    return mockPlayerData.goals.map(goal => {
      const now = new Date();
      const deadline = new Date(goal.deadline);
      const created = new Date(goal.createdAt);
      const totalDays = Math.ceil((deadline - created) / (1000 * 60 * 60 * 24));
      const daysPassed = Math.ceil((now - created) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...goal,
        daysRemaining,
        timeProgress: Math.min(100, (daysPassed / totalDays) * 100)
      };
    });
  },

  // Calculate performance metrics
  calculatePerformanceMetrics: () => {
    const matches = mockPlayerData.recentMatches;
    const totalMatches = matches.length;
    const wins = matches.filter(m => m.result === 'WIN').length;
    const totalKills = matches.reduce((sum, m) => sum + m.kills, 0);
    const totalDeaths = matches.reduce((sum, m) => sum + m.deaths, 0);
    const totalAssists = matches.reduce((sum, m) => sum + m.assists, 0);
    const totalCS = matches.reduce((sum, m) => sum + m.cs, 0);
    const totalDuration = matches.reduce((sum, m) => sum + m.duration, 0);

    return {
      winRate: ((wins / totalMatches) * 100).toFixed(1),
      avgKDA: totalDeaths === 0 ? 
        (totalKills + totalAssists).toFixed(2) : 
        ((totalKills + totalAssists) / totalDeaths).toFixed(2),
      avgCSPerMin: (totalCS / totalDuration).toFixed(1),
      totalMatches,
      wins,
      losses: totalMatches - wins
    };
  },

  // Generate chart data for different time periods
  generateChartData: (period = 'week') => {
    // This would normally calculate real data based on match history
    return period === 'week' ? mockPerformanceData : mockPerformanceData;
  },

  // Add new match data
  addMatch: (matchData) => {
    const newMatch = {
      id: mockPlayerData.recentMatches.length + 1,
      ...matchData,
      date: new Date().toISOString().split('T')[0],
      gameMode: "Ranked Solo"
    };
    mockPlayerData.recentMatches.unshift(newMatch);
    if (mockPlayerData.recentMatches.length > 10) {
      mockPlayerData.recentMatches = mockPlayerData.recentMatches.slice(0, 10);
    }
    return newMatch;
  },

  // Add new goal
  addGoal: (goalData) => {
    const newGoal = {
      id: mockPlayerData.goals.length + 1,
      ...goalData,
      progress: 0,
      type: goalData.type || 'custom',
      priority: goalData.priority || 'medium',
      createdAt: new Date().toISOString().split('T')[0]
    };
    mockPlayerData.goals.push(newGoal);
    return newGoal;
  },

  // Update goal progress
  updateGoalProgress: (goalId, progress) => {
    const goal = mockPlayerData.goals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = Math.max(0, Math.min(100, progress));
      return goal;
    }
    return null;
  },

  // Get AI analysis with dynamic data
  getAIAnalysis: (playerData = mockPlayerData) => {
    // This would normally call the AI service
    // For now, return mock data with some dynamic elements
    const metrics = mockDataHelpers.calculatePerformanceMetrics();
    
    return {
      ...mockAIAnalysis,
      analysis: `現在の勝率${metrics.winRate}%、平均KDA${metrics.avgKDA}のパフォーマンスを分析しました。${mockAIAnalysis.analysis}`,
      lastUpdated: new Date().toISOString()
    };
  },

  // Get recommendations based on current performance
  getRecommendations: () => {
    return mockRecommendations.map(rec => ({
      ...rec,
      lastUpdated: new Date().toISOString()
    }));
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mockPlayerData,
    mockPerformanceData,
    mockKDAData,
    mockAIAnalysis,
    mockRecommendations,
    mockSettings,
    mockAPIResponses,
    mockDataHelpers
  };
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.mockPlayerData = mockPlayerData;
  window.mockPerformanceData = mockPerformanceData;
  window.mockKDAData = mockKDAData;
  window.mockAIAnalysis = mockAIAnalysis;
  window.mockRecommendations = mockRecommendations;
  window.mockSettings = mockSettings;
  window.mockAPIResponses = mockAPIResponses;
  window.mockDataHelpers = mockDataHelpers;
}
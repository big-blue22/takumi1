// game-categories.js - ゲームカテゴリシステム
const ESPORTS_GAMES = {
  fps: {
    name: "FPS",
    games: [
      { id: "valorant", name: "VALORANT", icon: "🎯" },
      { id: "cs2", name: "Counter-Strike 2", icon: "🔫" },
      { id: "apex", name: "Apex Legends", icon: "⚡" },
      { id: "overwatch2", name: "Overwatch 2", icon: "🛡️" },
      { id: "rainbow6", name: "Rainbow Six Siege", icon: "🌈" },
      { id: "pubg", name: "PUBG", icon: "🪂" },
      { id: "fortnite", name: "Fortnite", icon: "🏗️" },
      { id: "cod", name: "Call of Duty", icon: "💀" }
    ]
  },
  moba: {
    name: "MOBA",
    games: [
      { id: "lol", name: "League of Legends", icon: "⚔️" },
      { id: "dota2", name: "Dota 2", icon: "🏰" },
      { id: "wildrift", name: "Wild Rift", icon: "📱" },
      { id: "hots", name: "Heroes of the Storm", icon: "🌪️" },
      { id: "smite", name: "SMITE", icon: "⚡" },
      { id: "mobile_legends", name: "Mobile Legends", icon: "📱" }
    ]
  },
  fighting: {
    name: "格闘ゲーム",
    games: [
      { id: "sf6", name: "Street Fighter 6", icon: "👊" },
      { id: "tekken8", name: "Tekken 8", icon: "🥋" },
      { id: "mk1", name: "Mortal Kombat 1", icon: "💀" },
      { id: "ggst", name: "Guilty Gear Strive", icon: "⚔️" },
      { id: "dbfz", name: "Dragon Ball FighterZ", icon: "🐉" },
      { id: "kof15", name: "The King of Fighters XV", icon: "👑" },
      { id: "blazblue", name: "BlazBlue", icon: "🔥" },
      { id: "melty", name: "Melty Blood", icon: "🌙" }
    ]
  },
  sports: {
    name: "スポーツ",
    games: [
      { id: "fifa", name: "EA FC 24", icon: "⚽" },
      { id: "nba2k", name: "NBA 2K24", icon: "🏀" },
      { id: "rl", name: "Rocket League", icon: "🚗" },
      { id: "gran_turismo", name: "Gran Turismo 7", icon: "🏎️" },
      { id: "f1", name: "F1 23", icon: "🏁" }
    ]
  },
  card: {
    name: "カードゲーム",
    games: [
      { id: "hearthstone", name: "Hearthstone", icon: "🃏" },
      { id: "mtga", name: "Magic: The Gathering Arena", icon: "🎴" },
      { id: "lor", name: "Legends of Runeterra", icon: "🗡️" },
      { id: "shadowverse", name: "Shadowverse", icon: "🌟" },
      { id: "pokemon_tcg", name: "Pokemon TCG", icon: "🎮" },
      { id: "yugioh_md", name: "Yu-Gi-Oh! Master Duel", icon: "🎲" }
    ]
  },
  strategy: {
    name: "ストラテジー",
    games: [
      { id: "sc2", name: "StarCraft II", icon: "🌌" },
      { id: "aoe4", name: "Age of Empires IV", icon: "🏰" },
      { id: "chess", name: "Chess.com", icon: "♟️" },
      { id: "tft", name: "Teamfight Tactics", icon: "🎯" },
      { id: "auto_chess", name: "Auto Chess", icon: "♜" }
    ]
  },
  other: {
    name: "その他",
    games: [
      { id: "custom", name: "カスタムゲーム追加", icon: "➕", isCustom: true }
    ]
  }
};

class GameManager {
  constructor() {
    this.games = ESPORTS_GAMES;
    this.customGames = JSON.parse(localStorage.getItem('customGames')) || [];
    this.selectedGame = null;
  }

  getAllGames() {
    const allGames = [];
    Object.values(this.games).forEach(category => {
      allGames.push(...category.games);
    });
    allGames.push(...this.customGames);
    return allGames;
  }

  addCustomGame(name, category = 'other') {
    const customGame = {
      id: 'custom_' + Date.now(),
      name: name,
      icon: '🎮',
      category: category,
      isCustom: true
    };
    
    this.customGames.push(customGame);
    localStorage.setItem('customGames', JSON.stringify(this.customGames));
    return customGame;
  }

  selectGame(gameId) {
    this.selectedGame = this.getAllGames().find(g => g.id === gameId);
    localStorage.setItem('selectedGame', gameId);
    return this.selectedGame;
  }

  getSelectedGame() {
    if (!this.selectedGame) {
      const savedId = localStorage.getItem('selectedGame');
      if (savedId) {
        this.selectedGame = this.getAllGames().find(g => g.id === savedId);
      }
    }
    return this.selectedGame || this.games.moba.games[0]; // デフォルトはLoL
  }

  getGameSpecificPrompt(gameId) {
    // ゲーム固有のプロンプトテンプレート
    const gamePrompts = {
      valorant: {
        stats: ['ACS', 'K/D', 'HS%', 'ADR', 'KAST'],
        roles: ['デュエリスト', 'イニシエーター', 'コントローラー', 'センチネル'],
        tips: 'エイム精度、エージェント選択、チーム連携を重視'
      },
      lol: {
        stats: ['CS/分', 'KDA', 'Vision Score', 'Damage/分', 'Gold/分'],
        roles: ['TOP', 'JG', 'MID', 'ADC', 'SUP'],
        tips: 'ファーム効率、マップコントロール、オブジェクト管理を重視'
      },
      sf6: {
        stats: ['勝率', 'コンボ成功率', 'ガード成功率', '投げ抜け率', 'CA使用効率'],
        characters: ['リュウ', 'ケン', '春麗', 'ルーク', 'ジェイミー'],
        tips: 'フレーム知識、確定反撃、起き攻めセットプレイを重視'
      },
      cs2: {
        stats: ['K/D', 'ADR', 'HS%', 'Rating', 'Impact'],
        roles: ['エントリー', 'サポート', 'AWP', 'IGL', 'ラーカー'],
        tips: 'マップコントロール、経済管理、チーム連携を重視'
      },
      apex: {
        stats: ['K/D', 'Damage', 'Placement', 'Survival Time', 'Revives'],
        roles: ['アサルト', 'ディフェンシブ', 'サポート', 'リーコン'],
        tips: 'ポジショニング、チームワーク、第三者対策を重視'
      },
      dota2: {
        stats: ['K/D/A', 'GPM', 'XPM', 'Last Hits', 'Damage'],
        roles: ['Carry', 'Mid', 'Offlane', 'Support', 'Hard Support'],
        tips: 'ファーム効率、アイテムビルド、チーム戦を重視'
      }
    };
    
    return gamePrompts[gameId] || null;
  }

  getGameCategories() {
    return this.games;
  }

  getGamesByCategory(categoryId) {
    return this.games[categoryId]?.games || [];
  }
}
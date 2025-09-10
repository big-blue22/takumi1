// 統計データ管理のための新しいファイル
class PlayerStatsManager {
    constructor() {
        this.storageKey = 'playerStats';
    }

    // プレイヤー統計データを取得
    getPlayerStats() {
        return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    }

    // プレイヤー統計データを保存
    savePlayerStats(stats) {
        localStorage.setItem(this.storageKey, JSON.stringify(stats));
    }

    // 統計値が存在するかチェック
    hasValidStats() {
        const stats = this.getPlayerStats();
        return stats.winRate !== undefined && 
               stats.avgKDA !== undefined && 
               stats.csPerMin !== undefined && 
               stats.gamesPlayed !== undefined;
    }

    // 統計データをダッシュボードに表示
    loadStatsToUI() {
        const stats = this.getPlayerStats();
        
        // 統計値の更新（データがある場合のみ）
        if (stats.winRate !== undefined) {
            const element = document.getElementById('win-rate');
            if (element) element.textContent = stats.winRate + '%';
        }
        
        if (stats.avgKDA !== undefined) {
            const element = document.getElementById('avg-kda');
            if (element) element.textContent = stats.avgKDA;
        }
        
        if (stats.csPerMin !== undefined) {
            const element = document.getElementById('cs-per-min');
            if (element) element.textContent = stats.csPerMin;
        }
        
        if (stats.gamesPlayed !== undefined) {
            const element = document.getElementById('games-played');
            if (element) element.textContent = stats.gamesPlayed;
        }
        
        // チャートの初期化（データがある場合のみ）
        this.initChartsIfDataExists(stats);
    }

    // データが存在する場合のみチャートを初期化
    initChartsIfDataExists(stats) {
        if (stats.performanceData && stats.performanceData.length > 0) {
            this.initPerformanceChart(stats.performanceData);
        }
        
        if (stats.kdaData) {
            this.initKDAChart(stats.kdaData);
        }
    }

    // パフォーマンスチャート初期化
    initPerformanceChart(data) {
        const perfCanvas = document.getElementById('performance-chart');
        if (perfCanvas && typeof Chart !== 'undefined') {
            const ctx = perfCanvas.getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: '勝率',
                        data: data.values,
                        borderColor: '#e94560',
                        backgroundColor: 'rgba(233, 69, 96, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        }
    }

    // KDAチャート初期化
    initKDAChart(data) {
        const kdaCanvas = document.getElementById('kda-chart');
        if (kdaCanvas && typeof Chart !== 'undefined') {
            const ctx = kdaCanvas.getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['キル', 'デス', 'アシスト'],
                    datasets: [{
                        label: '平均',
                        data: [data.kills, data.deaths, data.assists],
                        backgroundColor: ['#4caf50', '#f44336', '#2196f3']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
    }

    // 最近の試合履歴をロード
    loadRecentMatches() {
        const container = document.getElementById('recent-matches');
        if (!container) return;
        
        const matches = JSON.parse(localStorage.getItem('recentMatches') || '[]');
        
        if (matches.length === 0) {
            container.innerHTML = '<p class="no-data">試合記録がまだありません</p>';
            return;
        }
        
        container.innerHTML = matches.map(match => `
            <div class="match-item ${match.result.toLowerCase()}">
                <span class="match-result">${match.result}</span>
                <span class="match-kda">KDA: ${match.kda}</span>
                <span class="match-cs">CS: ${match.cs}</span>
            </div>
        `).join('');
    }
}

// グローバルに使用できるようにする
window.PlayerStatsManager = PlayerStatsManager;
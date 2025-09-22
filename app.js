// app.js - 完全修復版
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.isGuest = false;
        this.currentUser = null;
        
        // エラー追跡
        this.apiErrorCount = 0;
        this.lastSuccessfulAPICall = Date.now();
        this.consecutiveErrors = 0;
        
        // サービスの初期化
        this.initializeServices();
        
        // DOMContentLoadedで初期化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    initializeServices() {
        // APIサービスが存在する場合のみ初期化
        if (typeof AICoachingService !== 'undefined') {
            this.aiService = new AICoachingService();
        }
        
        // 認証サービス
        if (typeof AuthService !== 'undefined') {
            this.authService = new AuthService();
        }
        
        // ゲームマネージャー
        if (typeof GameManager !== 'undefined') {
            this.gameManager = new GameManager();
        }
        
        // Geminiサービス
        if (typeof GeminiService !== 'undefined') {
            this.geminiService = new GeminiService();
        }
        
        // プレイヤー統計マネージャー
        if (typeof PlayerStatsManager !== 'undefined') {
            this.playerStatsManager = new PlayerStatsManager();
        }

        // コーチングプランサービス
        if (typeof CoachingPlanService !== 'undefined') {
            this.coachingPlanService = new CoachingPlanService();
        }

        // メディア解析用のファイル配列
        this.uploadedFiles = [];
        this.chatMessages = [];
    }
    
    async init() {
        console.log('App initializing...');
        
        // テーマの初期化
        this.initTheme();
        
        // すべてのモーダルを非表示にする
        this.hideAllModals();
        
        // 統一APIマネージャーの初期化完了を待つ
        await this.waitForUnifiedAPIManager();
        
        // API設定チェックと初期化（非同期）- この結果によって画面遷移が決まる
        const apiCheckResult = await this.performBackgroundAPICheck();

        if (apiCheckResult.success) {
            console.log('バックグラウンドAPI接続成功');

            // API接続成功時のみ初回設定チェック
            if (this.needsInitialSetup()) {
                console.log('初回設定が必要です。初期設定画面を表示します。');
                this.showInitialSetupModal();
                return; // 初期設定完了まで他の処理をスキップ
            } else {
                console.log('初期設定は完了済みです。初期設定モーダルを非表示にします。');
                // 初期設定完了済みの場合は、モーダルが表示されていても強制的に非表示にする
                this.closeInitialSetupModal();
            }

            // メイン画面へ遷移
            console.log('メイン画面へ遷移');
            await this.initializeMainApp();

            // 過負荷状態の場合は追加メッセージを表示
            if (apiCheckResult.overloaded) {
                this.showToast('⚠️ Gemini APIが過負荷状態です。時間をおいて再度お試しください。', 'warning');
            }
        } else {
            console.log('API未設定または接続失敗');

            // 503エラーの場合は特別なメッセージ
            if (apiCheckResult.error && (
                apiCheckResult.error.message.includes('503') ||
                apiCheckResult.error.message.includes('過負荷') ||
                apiCheckResult.error.message.includes('overloaded')
            )) {
                this.showToast('⚠️ Gemini APIが一時的に過負荷中です。APIキーは保存されているので、後ほど自動的に利用可能になります。', 'warning');
                // 過負荷の場合でもアプリは起動する
                await this.initializeMainApp();
            } else {
                // API未設定または接続失敗時はAPI設定画面を表示
                this.showInitialAPISetupModal();
                this.setupInitialAPIModalListeners();
            }
        }
        
        console.log('App initialized successfully');
    }
    
    // テーマ管理
    initTheme() {
        this.applyTheme(this.currentTheme);
        
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
                this.applyTheme(this.currentTheme);
                localStorage.setItem('theme', this.currentTheme);
            });
        }
    }
    
    applyTheme(theme) {
        const root = document.documentElement;
        const themeBtn = document.getElementById('theme-toggle-btn');
        
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
            if (themeBtn) themeBtn.textContent = '☀️';
            
            // ライトモードのスタイル
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f5f5f5');
            root.style.setProperty('--bg-card', '#ffffff');
            root.style.setProperty('--text-primary', '#1a1a1a');
            root.style.setProperty('--text-secondary', '#666666');
            root.style.setProperty('--border-color', '#e0e0e0');
            root.style.setProperty('--accent-primary', '#0066cc');
            root.style.setProperty('--accent-secondary', '#0052a3');
        } else {
            root.setAttribute('data-theme', 'dark');
            if (themeBtn) themeBtn.textContent = '🌙';
            
            // ダークモードのスタイル
            root.style.setProperty('--bg-primary', '#1a1a2e');
            root.style.setProperty('--bg-secondary', '#16213e');
            root.style.setProperty('--bg-card', '#0f1924');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#b0b0b0');
            root.style.setProperty('--border-color', '#2a3f5f');
            root.style.setProperty('--accent-primary', '#e94560');
            root.style.setProperty('--accent-secondary', '#c13651');
        }
    }
    
    // 認証チェック
    checkAuthentication() {
        const storedUser = sessionStorage.getItem('currentUser');
        const isGuest = sessionStorage.getItem('isGuest');
        
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            this.updateUserDisplay(this.currentUser.username);
        } else if (isGuest === 'true') {
            this.isGuest = true;
            this.updateUserDisplay('ゲストユーザー', true);
        } else {
            // ログインモーダルを表示
            this.showLoginModal();
        }
    }
    
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    hideLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    updateUserDisplay(username, isGuest = false) {
        const headerUserName = document.getElementById('header-user-name');
        const userTypeIndicator = document.getElementById('user-type-indicator');
        
        if (headerUserName) {
            headerUserName.textContent = username;
        }
        
        if (userTypeIndicator) {
            userTypeIndicator.textContent = isGuest ? 'ゲスト' : 'ユーザー';
            userTypeIndicator.className = isGuest ? 'user-type guest' : 'user-type registered';
        }
    }
    
    // すべてのモーダルを非表示
    hideAllModals() {
        const modals = [
            'login-modal',
            'api-initial-setup-modal',
            'api-setup-modal',
            'initial-setup-modal'
        ];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        });
    }

    // 統一APIマネージャーの初期化完了を待つ
    async waitForUnifiedAPIManager() {
        let attempts = 0;
        const maxAttempts = 50; // 5秒待機
        
        while (!window.unifiedApiManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.unifiedApiManager) {
            console.error('統一APIマネージャーの初期化に失敗');
            throw new Error('統一APIマネージャーが利用できません');
        }
        
        console.log('統一APIマネージャー初期化完了');
    }

    // バックグラウンドでAPI設定をチェック
    async performBackgroundAPICheck() {
        try {
            if (!window.unifiedApiManager) {
                return { success: false, reason: 'manager_unavailable' };
            }
            
            // 保存済みAPIキーがあるかチェック
            const hasStoredKey = window.unifiedApiManager.isConfigured();
            
            if (!hasStoredKey) {
                console.log('APIキーが保存されていません');
                return { success: false, reason: 'no_api_key' };
            }
            
            console.log('保存済みAPIキーを発見、バックグラウンドで接続テスト中...');
            
            // バックグラウンドで接続テストを実行
            const result = await window.unifiedApiManager.validateAPIKey();
            
            console.log('バックグラウンド接続テスト成功:', result);
            this.syncAPIKeyInputs();
            
            return { success: true, result: result };
            
        } catch (error) {
            console.warn('バックグラウンド接続テストに失敗:', error);
            
            // 503エラー（サーバー過負荷）の場合は、初期設定モーダルを表示せずに
            // APIキーが設定済みとしてアプリを起動する
            if (error.message && (error.message.includes('overloaded') || error.message.includes('503'))) {
                console.log('Gemini APIサーバーが過負荷中ですが、APIキーは設定済みのためアプリを起動します');
                this.showToast('⚠️ Gemini APIが一時的に過負荷中です。AI機能は後ほど利用可能になります。', 'warning');
                this.syncAPIKeyInputs();
                return { success: true, overloaded: true };
            }
            
            return { 
                success: false, 
                reason: 'connection_failed',
                error: error 
            };
        }
    }

    // メインアプリを初期化（API接続成功時）
    async initializeMainApp() {
        // 統一APIマネージャーからGeminiServiceへのAPIキー同期を確保
        if (window.unifiedApiManager && window.unifiedApiManager.isConfigured()) {
            window.unifiedApiManager.updateLegacyAPIKeys();
        }
        
        // ログインチェック
        this.checkAuthentication();
        
        // 残りの初期化を実行
        this.continueInitialization();
        
        // ゲーム選択とダッシュボード機能の初期化
        this.initGameSelection();
        this.initializeSkillLevel();
        this.initDailyCoaching();
        this.initDashboardGoals();

        // その他のナビゲーション機能
        this.initNavigationHelpers();
        
        
        // 初期ページの表示
        this.showPage(this.currentPage);
        
        // チャートの初期化
        this.initCharts();
        
        // データのロード
        this.loadUserData();
        
        // ログイン画面を表示
        setTimeout(() => {
            this.showLoginModal();
        }, 100);
    }

    // API設定チェックと初期化（従来のメソッド、互換性のため残す）
    async checkAndInitializeAPI() {
        // 新しいフローに置き換えられたため、何もしない
        console.log('checkAndInitializeAPIは新しいフローに置き換えられました');
    }
    
    // 初期化の続行（APIキー設定後）
    continueInitialization() {
        // APIキー初期設定が必要な場合はスキップ
        if (window.unifiedApiManager?.needsInitialSetup()) {
            return;
        }
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // ナビゲーションの初期化
        this.initNavigation();
        
        // チャット機能の初期化
        this.initChat();
        
        // メディア解析機能の初期化
        this.initMediaAnalysis();

        // コーチング機能のフィードバックボタンを設定
        this.setupCoachingFeedbackListeners();
    }
    
    // 初期APIセットアップモーダルを表示
    showInitialAPISetupModal() {
        const modal = document.getElementById('api-initial-setup-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // 確実に表示
            
            console.log('初期API設定モーダルを表示');
            
            // 入力フィールドの初期状態をチェック
            setTimeout(() => {
                const apiKeyInput = document.getElementById('initial-api-key');
                if (apiKeyInput) {
                    this.validateInitialAPIKeyInput(apiKeyInput.value.trim());
                }
            }, 400);
        }
    }
    
    // 初期APIセットアップモーダルのイベントリスナー設定
    setupInitialAPIModalListeners() {
        // 重複登録を防ぐ
        if (window.apiModalListenersSet) {
            console.log('APIモーダルリスナーは既に設定済み');
            return;
        }
        
        console.log('APIモーダルリスナーを設定中...');
        
        // イベント委譲を使用してdocumentレベルでイベントをキャッチ
        document.addEventListener('click', (e) => {
            if (e.target.id === 'test-initial-api') {
                e.preventDefault();
                this.testInitialAPIConnection();
            } else if (e.target.id === 'save-initial-api') {
                e.preventDefault();
                this.saveInitialAPIKeyFromModal();
            } else if (e.target.id === 'skip-api-setup') {
                e.preventDefault();
                this.skipInitialAPISetup();
            } else if (e.target.id === 'toggle-initial-key') {
                e.preventDefault();
                this.toggleInitialAPIKeyVisibility();
            }
        });
        
        // 入力フィールドのイベントも設定
        const apiKeyInput = document.getElementById('initial-api-key');
        if (apiKeyInput && !apiKeyInput.hasAttribute('data-listeners-added')) {
            apiKeyInput.addEventListener('input', (e) => {
                this.validateInitialAPIKeyInput(e.target.value.trim());
            });
            apiKeyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const saveBtn = document.getElementById('save-initial-api');
                    if (saveBtn && !saveBtn.disabled) {
                        this.saveInitialAPIKeyFromModal();
                    }
                }
            });
            apiKeyInput.setAttribute('data-listeners-added', 'true');
        }
        
        // 重複設定防止フラグを設定
        window.apiModalListenersSet = true;
        console.log('APIモーダルリスナー設定完了');
    }
    
    // APIキー表示/非表示切り替え
    toggleInitialAPIKeyVisibility() {
        const apiKeyInput = document.getElementById('initial-api-key');
        const toggleBtn = document.getElementById('toggle-initial-key');
        
        if (apiKeyInput && toggleBtn) {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            toggleBtn.textContent = isPassword ? '🙈' : '👁️';
        }
    }
    
    // 初期APIキー入力の検証
    validateInitialAPIKeyInput(apiKey) {
        const testBtn = document.getElementById('test-initial-api');
        const saveBtn = document.getElementById('save-initial-api');
        
        if (!window.unifiedApiManager) return;
        
        const validation = window.unifiedApiManager.validateAPIKeyStrength(apiKey);
        const isValid = validation.valid;
        
        // ボタンの有効化/無効化
        if (testBtn) testBtn.disabled = !isValid;
        if (saveBtn) saveBtn.disabled = !isValid;
        
        // 視覚的フィードバック
        const inputWrapper = document.querySelector('#initial-api-key').parentNode;
        if (inputWrapper) {
            inputWrapper.classList.remove('input-valid', 'input-invalid');
            if (apiKey.length > 0) {
                if (isValid) {
                    inputWrapper.classList.add('input-valid');
                } else {
                    inputWrapper.classList.add('input-invalid');
                }
            }
        }
    }
    
    
    
    // 初期API接続テスト
    async testInitialAPIConnection() {
        const apiKeyInput = document.getElementById('initial-api-key');
        const testBtn = document.getElementById('test-initial-api');
        
        if (!apiKeyInput) {
            console.error('APIキー入力フィールドが見つかりません');
            return;
        }
        
        if (!window.unifiedApiManager) {
            console.error('統一APIマネージャが利用できません');
            this.showToast('APIマネージャが利用できません', 'error');
            return;
        }
        
        const apiKey = apiKeyInput.value;
        if (!apiKey) {
            this.showToast('APIキーを入力してください', 'warning');
            return;
        }
        
        // APIキーの強度チェック
        const validation = window.unifiedApiManager.validateAPIKeyStrength(apiKey);
        if (!validation.valid) {
            this.showToast(`APIキーエラー: ${validation.issues[0]}`, 'error');
            return;
        }
        
        const originalText = testBtn.textContent;
        testBtn.disabled = true;
        testBtn.textContent = 'テスト中...';
        
        try {
            // 一時的にAPIキーを設定
            const originalApiKey = window.unifiedApiManager.getAPIKey();
            await window.unifiedApiManager.setAPIKey(apiKey);
            
            // 接続テストを実行
            await window.unifiedApiManager.validateAPIKey();
            
            this.showToast('接続テストに成功しました！', 'success');
            
            // テスト成功時に入力欄を緑色に
            const inputWrapper = apiKeyInput.parentNode;
            if (inputWrapper) {
                inputWrapper.classList.remove('input-invalid');
                inputWrapper.classList.add('input-valid');
            }
            
            // 元のAPIキーを復元（テストだけなので）
            if (originalApiKey) {
                await window.unifiedApiManager.setAPIKey(originalApiKey);
            } else {
                window.unifiedApiManager.clearAPIKey();
            }
            
        } catch (error) {
            console.error('API接続テストに失敗:', error);
            this.showToast(`接続テストに失敗しました: ${error.message}`, 'error');
            
            // テスト失敗時に入力欄を赤色に
            const inputWrapper = apiKeyInput.parentNode;
            if (inputWrapper) {
                inputWrapper.classList.remove('input-valid');
                inputWrapper.classList.add('input-invalid');
            }
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = originalText;
        }
    }
    
    // 初期モーダルからAPIキーを保存
    async saveInitialAPIKeyFromModal() {
        const apiKeyInput = document.getElementById('initial-api-key');
        const saveBtn = document.getElementById('save-initial-api');
        
        if (!apiKeyInput) {
            console.error('APIキー入力フィールドが見つかりません');
            return;
        }
        
        if (!window.unifiedApiManager) {
            console.error('統合APIマネージャーが利用できません');
            this.showToast('APIマネージャーが利用できません', 'error');
            return;
        }
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            this.showToast('APIキーを入力してください', 'warning');
            return;
        }
        
        // APIキーの形式チェック
        const validation = window.unifiedApiManager.validateAPIKeyStrength(apiKey);
        if (!validation.valid) {
            this.showToast(`APIキーが無効です: ${validation.issues.join(', ')}`, 'error');
            return;
        }
        
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';
        
        try {
            // APIキーを統合マネージャーに保存
            window.unifiedApiManager.setAPIKey(apiKey);
            
            // 既存の入力フィールドも同期
            this.syncAPIKeyInputs();
            
            this.showToast('APIキーを保存しました', 'success');
            this.closeInitialAPISetupModal();
            
            // APIキー設定完了後、メインアプリを初期化
            setTimeout(async () => {
                await this.initializeMainApp();
            }, 500);
            
        } catch (error) {
            console.error('APIキー保存に失敗:', error);
            this.showToast(`保存に失敗しました: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }
    
    // 自動接続テスト実行
    async performAutoConnectionTest() {
        if (!window.unifiedApiManager) {
            throw new Error('統一APIマネージャーが利用できません');
        }

        if (!window.unifiedApiManager.isConfigured()) {
            throw new Error('APIキーが設定されていません');
        }

        try {
            // ローディング状態を表示（APIモーダルが非表示の場合はトースト表示）
            const apiModal = document.getElementById('api-initial-setup-modal');
            if (!apiModal || apiModal.classList.contains('hidden')) {
                this.showToast('保存済みAPIキーで接続テスト中...', 'info');
            }

            // 統一APIマネージャーを使って接続テスト
            const result = await window.unifiedApiManager.validateAPIKey();
            
            console.log('自動接続テスト成功:', result);
            return result;
            
        } catch (error) {
            console.error('自動接続テスト失敗:', error);
            throw error;
        }
    }

    // 自動接続テスト失敗時のハンドリング
    handleAutoConnectionTestFailure(error) {
        let errorMessage = '';
        let shouldShowModal = true;
        
        // エラータイプ別のメッセージ設定
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = '保存されたAPIキーが無効です。新しいAPIキーを設定してください。';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'APIキーの権限が不足しています。Gemini API の有効なキーを使用してください。';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'APIエンドポイントが見つかりません。しばらく後に再試行してください。';
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
            errorMessage = 'APIの利用制限に達しました。しばらく後に再試行してください。';
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
            errorMessage = 'Gemini APIサーバーに問題が発生しています。しばらく後に再試行してください。';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
        } else {
            errorMessage = `保存されたAPIキーでの接続に失敗しました: ${error.message}`;
        }
        
        // エラートーストを表示
        this.showToast(errorMessage, 'warning');
        
        // 初期設定画面を表示
        setTimeout(() => {
            this.showInitialAPISetupModal();
            
            // 初期設定画面内でエラーメッセージをハイライト
            const errorHelp = document.querySelector('#api-initial-setup-modal .error-help');
            if (errorHelp) {
                errorHelp.textContent = errorMessage;
                errorHelp.style.display = 'block';
            }
        }, 1000);
    }

    // 初期APIセットアップをスキップ
    skipInitialAPISetup() {
        this.showToast('API設定をスキップしました。一部機能が制限されます。', 'info');
        this.closeInitialAPISetupModal();
        
        // スキップ後もメインアプリを初期化
        setTimeout(async () => {
            await this.initializeMainApp();
        }, 500);
    }
    
    // 初期APIセットアップモーダルを閉じる
    closeInitialAPISetupModal() {
        const modal = document.getElementById('api-initial-setup-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none'; // 確実に非表示にする
        }
    }
    
    // APIセットアップモーダルを閉じる
    closeAPISetupModal() {
        const modal = document.getElementById('api-setup-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // APIキー入力フィールドの同期
    syncAPIKeyInputs() {
        if (!window.unifiedApiManager) return;
        
        const apiKey = window.unifiedApiManager.getAPIKey();
        const inputs = [
            document.getElementById('gemini-api-key'),
            document.getElementById('gemini-vision-api-key'),
            document.getElementById('initial-api-key')
        ];
        
        inputs.forEach(input => {
            if (input && apiKey) {
                input.value = apiKey;
            }
        });
    }
    
    // ナビゲーション
    initNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = btn.dataset.page;
                if (page) {
                    this.showPage(page);
                    
                    // アクティブクラスの更新
                    navBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
        });
    }
    
    showPage(pageId) {
        console.log('Showing page:', pageId);
        
        // すべてのページを非表示
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });
        
        // 指定されたページを表示
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
            
            // ページ固有の初期化
            this.initPageContent(pageId);
        }
    }
    
    initPageContent(pageId) {
        switch(pageId) {
            case 'coaching-plans':
                this.initCoachingPlansPage();
                break;
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'analysis':
                this.loadAnalysis();
                break;
            case 'goals':
                this.loadGoals();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }
    
    // イベントリスナー設定
    setupEventListeners() {
        // ログイン/登録タブ切り替え
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // ログインフォーム
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // 登録フォーム
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        // ゲストボタン
        const guestBtn = document.getElementById('guest-btn');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                this.handleGuestAccess();
            });
        }
        
        // ログアウトボタン
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // 試合データフォーム
        const matchForm = document.getElementById('match-form');
        if (matchForm) {
            matchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleMatchSubmit();
            });
        }
        
        // 目標フォーム
        const goalForm = document.getElementById('goal-form');
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGoalSubmit();
            });
        }

        // プラン付き目標作成ボタン
        const createWithPlanBtn = document.getElementById('create-with-plan-btn');
        if (createWithPlanBtn) {
            createWithPlanBtn.addEventListener('click', () => {
                this.handleCreateGoalWithPlan();
            });
        }

        // コーチングプランモーダルイベント
        this.initCoachingPlanModal();
        
        // API設定フォーム
        const apiForm = document.getElementById('api-form');
        if (apiForm) {
            apiForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleApiSave();
            });
        }
        
        // APIキー表示トグル
        const toggleApiKey = document.getElementById('toggle-api-key');
        if (toggleApiKey) {
            toggleApiKey.addEventListener('click', () => {
                const apiKeyInput = document.getElementById('api-key');
                if (apiKeyInput) {
                    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
                    toggleApiKey.textContent = apiKeyInput.type === 'password' ? '👁️' : '👁️‍🗨️';
                }
            });
        }
        
        // APIテストボタン
        const testApiBtn = document.getElementById('test-api-btn');
        if (testApiBtn) {
            testApiBtn.addEventListener('click', () => {
                this.testApiConnection();
            });
        }
        
        // APIクリアボタン
        const clearApiBtn = document.getElementById('clear-api-btn');
        if (clearApiBtn) {
            clearApiBtn.addEventListener('click', () => {
                this.clearApiSettings();
            });
        }
        
        // AI更新ボタン
        const refreshAiBtn = document.getElementById('refresh-ai-btn');
        if (refreshAiBtn) {
            refreshAiBtn.addEventListener('click', () => {
                this.refreshAiRecommendations();
            });
        }
        
        // ゲーム変更ボタン
        const changeGameBtn = document.getElementById('change-game-btn');
        if (changeGameBtn) {
            changeGameBtn.addEventListener('click', () => {
                this.showGameSelector();
            });
        }
        
        // ゲーム選択確定ボタン
        const confirmGameBtn = document.getElementById('confirm-game-btn');
        if (confirmGameBtn) {
            confirmGameBtn.addEventListener('click', () => {
                this.confirmGameSelection();
            });
        }
        
        // ゲーム選択キャンセルボタン
        const cancelGameBtn = document.getElementById('cancel-game-btn');
        if (cancelGameBtn) {
            cancelGameBtn.addEventListener('click', () => {
                this.hideGameSelector();
            });
        }

        // スキルレベル変更ボタン
        const changeSkillBtn = document.getElementById('change-skill-btn');
        if (changeSkillBtn) {
            changeSkillBtn.addEventListener('click', () => {
                this.showSkillSelector();
            });
        }

        // スキルレベル選択確定ボタン
        const confirmSkillBtn = document.getElementById('confirm-skill-btn');
        if (confirmSkillBtn) {
            confirmSkillBtn.addEventListener('click', () => {
                this.confirmSkillSelection();
            });
        }

        // スキルレベル選択キャンセルボタン
        const cancelSkillBtn = document.getElementById('cancel-skill-btn');
        if (cancelSkillBtn) {
            cancelSkillBtn.addEventListener('click', () => {
                this.hideSkillSelector();
            });
        }

        // アプリ初期化ボタン
        const resetBtn = document.getElementById('reset-app-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetAppData();
            });
        }
    }
    
    // タブ切り替え
    switchTab(tabName) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }
    
    // ログイン処理
    handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (this.authService) {
            const result = this.authService.login(username, password);
            if (result.success) {
                this.currentUser = result.user;
                this.updateUserDisplay(username);
                this.hideLoginModal();
                this.loadUserData();
                this.showToast('ログインしました', 'success');
            } else {
                this.showToast(result.message, 'error');
            }
        } else {
            // モックログイン
            this.currentUser = { username: username };
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.updateUserDisplay(username);
            this.hideLoginModal();
            this.showToast('ログインしました', 'success');
        }
    }
    
    // 登録処理
    handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        
        if (password !== passwordConfirm) {
            this.showToast('パスワードが一致しません', 'error');
            return;
        }
        
        if (this.authService) {
            const result = this.authService.register(username, password, email);
            if (result.success) {
                this.showToast('登録が完了しました。ログインしてください。', 'success');
                this.switchTab('login');
            } else {
                this.showToast(result.message, 'error');
            }
        } else {
            // モック登録
            this.showToast('登録が完了しました', 'success');
            this.switchTab('login');
        }
    }
    
    // ゲストアクセス
    handleGuestAccess() {
        this.isGuest = true;
        sessionStorage.setItem('isGuest', 'true');
        this.updateUserDisplay('ゲストユーザー', true);
        this.hideLoginModal();
        this.showToast('ゲストとしてログインしました', 'info');
    }
    
    // ログアウト
    handleLogout() {
        this.currentUser = null;
        this.isGuest = false;
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isGuest');
        this.showLoginModal();
        this.showToast('ログアウトしました', 'info');
    }
    
    // 試合データ送信
    handleMatchSubmit() {
        const matchData = {
            result: document.getElementById('match-result').value,
            kills: parseInt(document.getElementById('kills').value),
            deaths: parseInt(document.getElementById('deaths').value),
            assists: parseInt(document.getElementById('assists').value),
            cs: parseInt(document.getElementById('cs').value),
            duration: parseInt(document.getElementById('match-duration').value)
        };
        
        // 1) 分析結果の表示
        this.analyzeMatch(matchData);

        // 2) 試合を保存し、ダッシュボード統計を更新（連動）
        this.storeMatchAndRefresh(matchData);
        document.getElementById('match-form').reset();
        this.showToast('分析を実行しています...', 'info');
    }

    // 分析ページの入力をローカルに保存し、ダッシュボードを更新
    storeMatchAndRefresh(matchData) {
        try {
            // 保存フォーマットへ整形
            const newMatch = {
                id: Date.now(),
                result: matchData.result || 'WIN',
                kills: matchData.kills || 0,
                deaths: matchData.deaths || 0,
                assists: matchData.assists || 0,
                cs: matchData.cs || 0,
                duration: matchData.duration || 1,
                kda: `${matchData.kills || 0}/${matchData.deaths || 0}/${matchData.assists || 0}`,
                date: new Date().toISOString().split('T')[0],
                gameMode: 'Custom'
            };

            // 直近試合へ追加（最大50件）
            const matches = JSON.parse(localStorage.getItem('recentMatches') || '[]');
            matches.unshift(newMatch);
            if (matches.length > 50) matches.length = 50;
            localStorage.setItem('recentMatches', JSON.stringify(matches));

            // 集計してプレイヤー統計を更新
            const totalMatches = matches.length;
            const wins = matches.filter(m => (m.result || '').toUpperCase() === 'WIN').length;
            const totals = matches.reduce((acc, m) => {
                acc.k += (m.kills || 0);
                acc.d += (m.deaths || 0);
                acc.a += (m.assists || 0);
                acc.cs += (m.cs || 0);
                acc.t += (m.duration || 0);
                return acc;
            }, { k:0, d:0, a:0, cs:0, t:0 });

            const winRate = totalMatches ? +(((wins / totalMatches) * 100).toFixed(1)) : 0;
            const avgKDA = totals.d === 0 ? +(totals.k + totals.a).toFixed(2) : +(((totals.k + totals.a) / Math.max(totals.d, 1)).toFixed(2));
            const csPerMin = totals.t ? +((totals.cs / totals.t).toFixed(1)) : 0;

            const updatedStats = {
                winRate,
                avgKDA,
                csPerMin,
                gamesPlayed: totalMatches
            };

            if (this.playerStatsManager) {
                this.playerStatsManager.savePlayerStats(updatedStats);
                // UIを即時更新
                this.playerStatsManager.loadStatsToUI();
                this.playerStatsManager.loadRecentMatches();
            } else {
                localStorage.setItem('playerStats', JSON.stringify(updatedStats));
                this.loadRecentMatches();
                // 手動でUIへ反映
                const mapping = {
                    'win-rate': `${winRate}%`,
                    'avg-kda': `${avgKDA}`,
                    'cs-per-min': `${csPerMin}`,
                    'games-played': `${totalMatches}`
                };
                Object.entries(mapping).forEach(([id, value]) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                });
            }
        } catch (e) {
            console.warn('Failed to store match and refresh stats:', e);
        }
    }
    
    // 目標追加
    handleGoalSubmit() {
        const now = new Date();
        const goalData = {
            title: document.getElementById('goal-title').value,
            deadline: document.getElementById('goal-deadline').value,
            description: document.getElementById('goal-description').value,
            id: Date.now(),
            createdAt: now.toISOString(),
            progress: 0
        };

        this.addGoal(goalData);
        document.getElementById('goal-form').reset();
        this.showToast('目標を追加しました', 'success');
    }
    
    // API設定保存
    handleApiSave() {
        const provider = document.getElementById('api-provider').value;
        const apiKey = document.getElementById('api-key').value;
        const model = document.getElementById('api-model').value;
        
        if (this.aiService) {
            this.aiService.saveConfiguration(provider, apiKey, model);
        } else {
            localStorage.setItem('ai_provider', provider);
            localStorage.setItem('ai_api_key', apiKey);
            localStorage.setItem('ai_model', model);
        }
        
        this.updateApiStatus(true);
        this.showToast('API設定を保存しました', 'success');
    }
    
    // API接続テスト
    async testApiConnection() {
        this.showLoading();
        
        setTimeout(() => {
            this.hideLoading();
            if (Math.random() > 0.5) {
                this.showToast('API接続成功', 'success');
            } else {
                this.showToast('API接続失敗: キーを確認してください', 'error');
            }
        }, 1000);
    }
    
    // API設定クリア
    clearApiSettings() {
        if (this.aiService) {
            this.aiService.clearConfiguration();
        } else {
            localStorage.removeItem('ai_provider');
            localStorage.removeItem('ai_api_key');
            localStorage.removeItem('ai_model');
        }
        
        document.getElementById('api-key').value = '';
        this.updateApiStatus(false);
        this.showToast('API設定をクリアしました', 'info');
    }
    
    // API状態更新
    updateApiStatus(isConfigured) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (statusIndicator && statusText) {
            if (isConfigured) {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusText.textContent = 'API設定済み';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusText.textContent = 'API未設定';
            }
        }
    }
    
    // チャート初期化
    initCharts() {
        // チャートは実際のデータが入力された時のみ初期化する
        // 初期状態では何も表示しない
    }
    
    // トースト表示
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // ローディング表示（任意メッセージ対応）
    showLoading(message = 'ロード中...') {
        // テキストを更新（重複IDに対応して全て更新）
        try {
            const msgNodes = document.querySelectorAll('#loading .loading-content p');
            if (msgNodes && msgNodes.length > 0) {
                msgNodes.forEach(p => p.textContent = message);
            }
        } catch (e) {
            console.debug('loading message update skipped:', e);
        }

        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }
    
    // 各ページのロード処理
    loadDashboard() {
        // 新しい統計システムを使用
        if (this.playerStatsManager) {
            this.playerStatsManager.loadRecentMatches();
        } else {
            this.loadRecentMatches();
        }
        // 新しい統計システムを使用
        if (this.playerStatsManager) {
            this.playerStatsManager.loadStatsToUI();
        }

        // ダッシュボード目標を読み込み
        this.loadDashboardGoals();
    }
    
    loadAnalysis() {
        // 分析ページの初期化
    }
    
    loadGoals() {
        this.loadGoalsList();
    }
    
    loadSettings() {
        this.loadGameCategories();
        this.loadApiSettings();
    }
    
    // データロード処理
    loadUserData() {
        // ユーザーデータのロード
        if (!this.isGuest && this.currentUser) {
            // 保存されたデータをロード
        }
    }
    
    loadRecentMatches() {
        const container = document.getElementById('recent-matches');
        if (!container) return;
        
        // 実際の試合データをローカルストレージから取得
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
    
    loadAiRecommendations() {
        // この関数は削除されました - AIコーチング機能は無効化されています
        console.log('🚨 loadAiRecommendations called but AI coaching feature has been removed');
    }
    
    refreshAiRecommendations() {
        // この関数は削除されました - AIコーチング機能は無効化されています
        console.log('🚨 refreshAiRecommendations called but AI coaching feature has been removed');
    }
    
    loadGoalsList() {
        const container = document.getElementById('goals-list');
        if (!container) return;

        const goals = JSON.parse(localStorage.getItem('goals') || '[]');

        if (goals.length === 0) {
            container.innerHTML = '<p class="no-data">目標がまだ設定されていません</p>';
            return;
        }

        container.innerHTML = goals.map(goal => {
            const calculatedProgress = this.calculateProgressByDays(goal);
            return `
            <div class="goal-item">
                <div class="goal-header">
                    <h4>${goal.title}</h4>
                    <span class="goal-deadline">${goal.deadline}</span>
                </div>
                <p class="goal-description">${goal.description}</p>
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${calculatedProgress}%"></div>
                    </div>
                    <span class="progress-text">${calculatedProgress}% (日数ベース)</span>
                </div>
                <div class="goal-actions">
                    <div class="progress-update">
                        <label for="progress-input-${goal.id}">手動進捗:</label>
                        <input type="range"
                               id="progress-input-${goal.id}"
                               min="0"
                               max="100"
                               value="${goal.progress || 0}"
                               class="progress-slider"
                               oninput="document.getElementById('progress-value-${goal.id}').textContent = this.value + '%'"
                               onchange="app.updateGoalProgress(${goal.id}, parseInt(this.value))">
                        <span id="progress-value-${goal.id}" class="progress-value">${goal.progress || 0}%</span>
                    </div>
                    <button class="btn-danger btn-sm" onclick="app.deleteGoal(${goal.id})">削除</button>
                </div>
            </div>
        `;
        }).join('');
    }
    
    addGoal(goalData) {
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        goals.push(goalData);
        localStorage.setItem('goals', JSON.stringify(goals));
        this.loadGoalsList();
    }

    updateGoalProgress(goalId, newProgress) {
        try {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const goalIndex = goals.findIndex(goal => goal.id === goalId);

            console.log('🎯 Updating goal progress:', { goalId, newProgress, goalIndex, currentGoals: goals });

            if (goalIndex !== -1) {
                // 進捗を0-100の範囲に制限
                const clampedProgress = Math.max(0, Math.min(100, newProgress));
                const oldProgress = goals[goalIndex].progress;
                goals[goalIndex].progress = clampedProgress;

                console.log(`🎯 Goal "${goals[goalIndex].title}" progress: ${oldProgress}% → ${clampedProgress}%`);

                localStorage.setItem('goals', JSON.stringify(goals));

                // ダッシュボードの目標リストを更新
                this.loadGoalsList();

                // 現在のページがダッシュボードの場合のみ更新
                if (this.currentPage === 'dashboard') {
                    this.loadDashboardGoals();
                }

                this.showToast(`目標の進捗を${clampedProgress}%に更新しました`, 'success');
                return true;
            }

            this.showToast('目標が見つかりませんでした', 'error');
            return false;
        } catch (error) {
            console.error('Failed to update goal progress:', error);
            this.showToast('進捗の更新に失敗しました', 'error');
            return false;
        }
    }

    // デバッグ用: 特定の目標の進捗を強制的に更新する関数
    forceUpdateGoalByTitle(title, progress) {
        try {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const goalIndex = goals.findIndex(goal => goal.title === title);

            if (goalIndex !== -1) {
                goals[goalIndex].progress = progress;
                localStorage.setItem('goals', JSON.stringify(goals));
                this.loadDashboardGoals();
                console.log(`🎯 Force updated "${title}" to ${progress}%`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Force update failed:', error);
            return false;
        }
    }


    deleteGoal(goalId) {
        try {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const filteredGoals = goals.filter(goal => goal.id !== goalId);

            localStorage.setItem('goals', JSON.stringify(filteredGoals));

            // リストを更新
            this.loadGoalsList();

            // 現在のページがダッシュボードの場合のみ更新
            if (this.currentPage === 'dashboard') {
                this.loadDashboardGoals();
            }

            this.showToast('目標を削除しました', 'success');
        } catch (error) {
            console.error('Failed to delete goal:', error);
            this.showToast('目標の削除に失敗しました', 'error');
        }
    }

    analyzeMatch(matchData) {
        const kda = ((matchData.kills + matchData.assists) / Math.max(matchData.deaths, 1)).toFixed(2);
        const csPerMin = (matchData.cs / matchData.duration).toFixed(1);
        
        const resultsContainer = document.getElementById('analysis-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="card">
                    <h3>分析結果</h3>
                    <div class="analysis-stats">
                        <div class="stat-box">
                            <span class="stat-label">KDA</span>
                            <span class="stat-value">${kda}</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">CS/分</span>
                            <span class="stat-value">${csPerMin}</span>
                        </div>
                    </div>
                    <div class="analysis-feedback">
                        <h4>パフォーマンス評価</h4>
                        <p>${kda >= 3 ? '優れたKDAです！' : 'KDAの改善余地があります。'}</p>
                        <p>${csPerMin >= 7 ? 'CS精度は良好です。' : 'CSの精度を向上させましょう。'}</p>
                    </div>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
        }
    }
    
    loadGameCategories() {
        const container = document.getElementById('game-categories');
        if (!container || typeof ESPORTS_GAMES === 'undefined') return;
        
        let html = '';
        for (const [categoryKey, category] of Object.entries(ESPORTS_GAMES)) {
            html += `<div class="game-category-section">
                <h4 class="category-title">${category.name}</h4>
                <div class="games-grid">`;
            
            category.games.forEach(game => {
                html += `
                    <div class="game-option" 
                         data-game-id="${game.id}" 
                         data-game-name="${game.name}" 
                         data-game-icon="${game.icon}" 
                         data-category="${category.name}"
                         role="button"
                         tabindex="0">
                        <span class="game-option-icon">${game.icon}</span>
                        <span class="game-option-name">${game.name}</span>
                    </div>`;
            });
            
            html += '</div></div>';
        }
        
        container.innerHTML = html;
        
        // ゲーム選択カードのクリックイベントを設定
        this.setupGameCards();
    }
    
    showGameSelector() {
        const selector = document.getElementById('game-selector');
        if (selector) {
            selector.classList.remove('hidden');
        }
    }
    
    hideGameSelector() {
        const selector = document.getElementById('game-selector');
        if (selector) {
            selector.classList.add('hidden');
        }
    }
    
    confirmGameSelection() {
        const selected = document.querySelector('.game-card.selected');
        if (selected) {
            const gameId = selected.dataset.gameId;
            const gameName = selected.querySelector('.game-name').textContent;
            const gameIcon = selected.querySelector('.game-icon').textContent;
            
            const currentGameName = document.getElementById('current-game-name');
            const currentGameIcon = document.getElementById('current-game-icon');
            const playerGame = document.getElementById('player-game');
            
            if (currentGameName) currentGameName.textContent = gameName;
            if (currentGameIcon) currentGameIcon.textContent = gameIcon;
            if (playerGame) playerGame.textContent = gameName;
            
            localStorage.setItem('selectedGame', gameId);
            this.hideGameSelector();
            this.showToast(`ゲームを${gameName}に変更しました`, 'success');
        }
    }
    
    loadApiSettings() {
        const provider = localStorage.getItem('ai_provider');
        const model = localStorage.getItem('ai_model');
        const hasKey = localStorage.getItem('ai_api_key');
        
        if (provider) {
            const providerSelect = document.getElementById('api-provider');
            if (providerSelect) providerSelect.value = provider;
        }
        if (model) {
            const modelSelect = document.getElementById('api-model');
            if (modelSelect) modelSelect.value = model;
        }
        
        this.updateApiStatus(!!hasKey);
    }

    // === チャット機能 ===
    initChat() {
        console.log('Initializing chat...');
        
        // API設定関連
        this.setupChatApiSettings();
        
        // チャット入力関連
        this.setupChatInput();
        
        // メッセージ履歴を復元
        this.loadChatHistory();
    }
    
    setupChatApiSettings() {
        // APIキー設定
        const saveKeyBtn = document.getElementById('save-gemini-key');
        const testConnectionBtn = document.getElementById('test-gemini-connection');
        const toggleKeyBtn = document.getElementById('toggle-gemini-key');
        const apiKeyInput = document.getElementById('gemini-api-key');
        
        if (saveKeyBtn) {
            saveKeyBtn.addEventListener('click', () => this.saveGeminiApiKey());
        }
        
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testGeminiConnection());
        }
        
        if (toggleKeyBtn && apiKeyInput) {
            toggleKeyBtn.addEventListener('click', () => {
                const isPassword = apiKeyInput.type === 'password';
                apiKeyInput.type = isPassword ? 'text' : 'password';
                toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
            });
        }
        
        // 既存のAPIキーを読み込み
        if (apiKeyInput && this.geminiService) {
            apiKeyInput.value = this.geminiService.getApiKey();
        }
    }
    
    setupChatInput() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-message');
        const clearBtn = document.getElementById('clear-chat');
        
        if (chatInput) {
            // 自動リサイズ
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
                
                // 送信ボタンの有効/無効
                if (sendBtn) {
                    sendBtn.disabled = !chatInput.value.trim();
                }
            });
            
            // Enter キーで送信
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearChat());
        }
    }
    
    async saveGeminiApiKey() {
        const apiKeyInput = document.getElementById('gemini-api-key');
        if (!apiKeyInput) return;
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            this.showToast('APIキーを入力してください', 'warning');
            return;
        }
        
        try {
            // 統一APIマネージャーを使用
            if (window.unifiedApiManager) {
                await window.unifiedApiManager.setAPIKey(apiKey);
                // 他の入力フィールドも同期
                this.syncAPIKeyInputs();
                this.showToast('APIキーを保存しました', 'success');
            } else if (this.geminiService) {
                // フォールバック
                this.geminiService.setApiKey(apiKey);
                this.showToast('Gemini APIキーを保存しました', 'success');
            } else {
                this.showToast('APIサービスが初期化されていません', 'error');
            }
        } catch (error) {
            this.showToast(`APIキー保存に失敗しました: ${error.message}`, 'error');
        }
    }
    
    async testGeminiConnection() {
        if (!window.unifiedApiManager || !window.unifiedApiManager.isConfigured()) {
            this.showToast('Gemini APIキーが設定されていません', 'error');
            return;
        }
        
        const testBtn = document.getElementById('test-gemini-connection');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'テスト中...';
        }
        
        try {
            await window.unifiedApiManager.validateAPIKey();
            this.showToast('接続テストに成功しました', 'success');
        } catch (error) {
            this.showToast(`接続テストに失敗: ${error.message}`, 'error');
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = '接続テスト';
            }
        }
    }
    
    async sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-message');
        
        if (!chatInput) return;
        
        // APIが設定されているか確認
        if (!window.unifiedApiManager || !window.unifiedApiManager.isConfigured()) {
            this.showToast('Gemini APIキーが設定されていません', 'warning');
            return;
        }
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // UIを無効化
        chatInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        
        try {
            // ユーザーメッセージを表示
            this.addChatMessage(message, 'user');
            
            // 入力フィールドをクリア
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            // タイピングインジケーター表示
            this.showTypingIndicator();
            
            // APIに送信
            const response = await this.geminiService.sendChatMessage(message);
            
            // タイピングインジケーター非表示
            this.hideTypingIndicator();
            
            // AIの応答を表示
            this.addChatMessage(response.response, 'ai');
            
            // 履歴を保存
            this.saveChatHistory();
            
        } catch (error) {
            this.hideTypingIndicator();
            this.showToast(`メッセージ送信エラー: ${error.message}`, 'error');
        } finally {
            // UIを再有効化
            chatInput.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }
    
    addChatMessage(text, type) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? '👤' : '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = text;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-time';
        timestamp.textContent = new Date().toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        content.appendChild(messageText);
        content.appendChild(timestamp);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        messagesContainer.appendChild(messageDiv);
        
        // スクロール
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // メッセージを配列に追加
        this.chatMessages.push({
            text: text,
            type: type,
            timestamp: new Date().toISOString()
        });
    }
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'chat-message ai-message typing-indicator';
        indicator.id = 'typing-indicator';
        
        indicator.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-text">
                    <span>AI が入力中</span>
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    clearChat() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        // 最初のAIメッセージ以外を削除
        const messages = messagesContainer.querySelectorAll('.chat-message');
        messages.forEach((msg, index) => {
            if (index > 0) msg.remove();
        });
        
        // データをクリア
        this.chatMessages = [];
        if (this.geminiService) {
            this.geminiService.clearChatHistory();
        }
        
        this.saveChatHistory();
        this.showToast('チャット履歴をクリアしました', 'success');
    }
    
    saveChatHistory() {
        localStorage.setItem('chat-history', JSON.stringify(this.chatMessages));
    }
    
    loadChatHistory() {
        try {
            const history = localStorage.getItem('chat-history');
            if (history) {
                this.chatMessages = JSON.parse(history);
                // UIは復元しない（新しいセッションとして開始）
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
            this.chatMessages = [];
        }
    }

    // === メディア解析機能 ===
    initMediaAnalysis() {
        console.log('Initializing media analysis...');
        
        // API設定
        this.setupMediaApiSettings();
        
        // ファイルアップロード
        this.setupFileUpload();
        
        // 既存のファイルプレビューをクリア
        this.uploadedFiles = [];
    }
    
    setupMediaApiSettings() {
        const saveKeyBtn = document.getElementById('save-vision-key');
        const testConnectionBtn = document.getElementById('test-vision-connection');
        const toggleKeyBtn = document.getElementById('toggle-vision-key');
        const apiKeyInput = document.getElementById('gemini-vision-api-key');
        
        if (saveKeyBtn) {
            saveKeyBtn.addEventListener('click', () => this.saveVisionApiKey());
        }
        
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testVisionConnection());
        }
        
        if (toggleKeyBtn && apiKeyInput) {
            toggleKeyBtn.addEventListener('click', () => {
                const isPassword = apiKeyInput.type === 'password';
                apiKeyInput.type = isPassword ? 'text' : 'password';
                toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
            });
        }
        
        // 既存のAPIキーを読み込み（チャットと同じキーを使用）
        if (apiKeyInput && this.geminiService) {
            apiKeyInput.value = this.geminiService.getApiKey();
        }
    }
    
    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const fileSelectBtn = document.getElementById('file-select-btn');
        
        if (uploadArea) {
            // ドラッグ&ドロップ
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = Array.from(e.dataTransfer.files);
                this.handleFileSelection(files);
            });
        }
        
        if (fileSelectBtn && fileInput) {
            fileSelectBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleFileSelection(files);
            });
        }
    }
    
    handleFileSelection(files) {
        files.forEach(file => {
            if (this.validateFile(file)) {
                this.addFileToPreview(file);
            }
        });
    }
    
    validateFile(file) {
        // ファイルサイズチェック（20MB）
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showToast(`ファイルサイズが大きすぎます: ${file.name}`, 'error');
            return false;
        }
        
        // ファイルタイプチェック
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast(`サポートされていないファイル形式: ${file.name}`, 'error');
            return false;
        }
        
        return true;
    }
    
    addFileToPreview(file) {
        this.uploadedFiles.push(file);
        
        const preview = document.getElementById('file-preview');
        const fileList = document.getElementById('file-list');
        
        if (!preview || !fileList) return;
        
        preview.classList.remove('hidden');
        
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.dataset.fileName = file.name;
        
        // ファイルプレビュー作成
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            fileCard.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = false;
            video.muted = true;
            fileCard.appendChild(video);
        }
        
        // ファイル情報
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        fileCard.appendChild(fileName);
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = this.formatFileSize(file.size);
        fileCard.appendChild(fileSize);
        
        // 操作ボタン
        const actions = document.createElement('div');
        actions.className = 'file-actions';
        
        const analyzeBtn = document.createElement('button');
        analyzeBtn.className = 'btn-analyze';
        analyzeBtn.textContent = '分析';
        analyzeBtn.onclick = () => this.analyzeFile(file);
        actions.appendChild(analyzeBtn);
        
        // 削除ボタン
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => this.removeFile(file.name);
        fileCard.appendChild(removeBtn);
        
        fileCard.appendChild(actions);
        fileList.appendChild(fileCard);
    }
    
    async analyzeFile(file) {
        if (!window.unifiedApiManager || !window.unifiedApiManager.isConfigured()) {
            this.showToast('Gemini APIキーが設定されていません', 'warning');
            return;
        }
        
        try {
            this.showLoading();
            
            let result;
            if (file.type.startsWith('image/')) {
                const imageData = await this.fileToBase64(file);
                result = await this.geminiService.analyzeImage(imageData, file.name);
            } else if (file.type.startsWith('video/')) {
                result = await this.geminiService.analyzeVideo(file);
            }
            
            this.displayAnalysisResult(result);
            this.showToast('解析が完了しました', 'success');
            
        } catch (error) {
            this.showToast(`解析エラー: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    displayAnalysisResult(result) {
        const resultsContainer = document.getElementById('media-analysis-results');
        const cardsContainer = document.getElementById('analysis-cards-container');
        
        if (!resultsContainer || !cardsContainer) return;
        
        resultsContainer.classList.remove('hidden');
        
        const card = document.createElement('div');
        card.className = 'analysis-card';
        
        let cardHTML = `
            <div class="analysis-header">
                <div class="analysis-game">${result.gameTitle || 'ゲーム解析'}</div>
                <div class="analysis-confidence">${result.timestamp || ''}</div>
            </div>
        `;
        
        if (result.overallScore) {
            cardHTML += `
                <div class="analysis-stats">
                    <div class="stat-box">
                        <div class="stat-label">総合評価</div>
                        <div class="stat-value">${result.overallScore}</div>
                    </div>
                </div>
            `;
        }
        
        if (result.strengths && result.strengths.length > 0) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>✅ 良いポイント</h4>
                    <ul class="analysis-list strengths">
                        ${result.strengths.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.weaknesses && result.weaknesses.length > 0) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>⚠️ 改善ポイント</h4>
                    <ul class="analysis-list weaknesses">
                        ${result.weaknesses.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.suggestions && result.suggestions.length > 0) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>💡 改善提案</h4>
                    <ul class="analysis-list suggestions">
                        ${result.suggestions.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.summary) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>📝 総合評価</h4>
                    <p>${result.summary}</p>
                </div>
            `;
        }
        
        card.innerHTML = cardHTML;
        cardsContainer.appendChild(card);
    }
    
    removeFile(fileName) {
        // 配列から削除
        this.uploadedFiles = this.uploadedFiles.filter(file => file.name !== fileName);
        
        // UIから削除
        const fileCard = document.querySelector(`.file-card[data-file-name="${fileName}"]`);
        if (fileCard) {
            fileCard.remove();
        }
        
        // プレビューエリアを非表示にする（ファイルがない場合）
        if (this.uploadedFiles.length === 0) {
            const preview = document.getElementById('file-preview');
            if (preview) preview.classList.add('hidden');
        }
    }
    
    async saveVisionApiKey() {
        const apiKeyInput = document.getElementById('gemini-vision-api-key');
        if (!apiKeyInput) return;
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            this.showToast('APIキーを入力してください', 'warning');
            return;
        }
        
        if (this.geminiService) {
            this.geminiService.setApiKey(apiKey);
            this.showToast('APIキーを保存しました', 'success');
            
            // チャット側のキーも同期
            const chatKeyInput = document.getElementById('gemini-api-key');
            if (chatKeyInput) {
                chatKeyInput.value = apiKey;
            }
        }
    }
    
    async testVisionConnection() {
        return this.testGeminiConnection(); // チャット機能と同じテストを使用
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // === ゲーム選択とダッシュボード機能 ===
    initGameSelection() {
        console.log('Initializing game selection...');
        
        // ゲーム選択誘導ボタン
        const gotoGameSelectionBtn = document.getElementById('goto-game-selection');
        if (gotoGameSelectionBtn) {
            gotoGameSelectionBtn.addEventListener('click', () => {
                this.goToGameSelection();
            });
        }
        
        // ゲームカードのクリックイベントを設定
        this.setupGameActionButtons();
        
        // 初期状態のチェック
        this.checkGameSelection();
    }
    
    setupGameCardEvents() {
        // ゲームカードの初回設定
        this.setupGameCards();
        
        // ゲームカードが動的生成される場合のための再試行機構
        setTimeout(() => this.setupGameCards(), 500);
        setTimeout(() => this.setupGameCards(), 1500);
        
        // 確認・キャンセルボタンの設定
        this.setupGameActionButtons();
    }
    
    setupGameCards() {
        const gameCards = document.querySelectorAll('.game-option');
        console.log(`Found ${gameCards.length} game cards`);
        
        gameCards.forEach((card) => {
            // クリックイベントリスナー追加
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Game card clicked:', card.dataset.gameName);
                this.selectGame(card);
            });
            
            // キーボードアクセシビリティ
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectGame(card);
                }
            });
            
            // マウスオーバー効果
            card.addEventListener('mouseenter', () => {
                if (!card.classList.contains('selected')) {
                    card.style.transform = 'scale(1.02)';
                }
            });
            
            card.addEventListener('mouseleave', () => {
                if (!card.classList.contains('selected')) {
                    card.style.transform = 'scale(1)';
                }
            });
            
            // クリック可能であることを明示するスタイル
            card.style.cursor = 'pointer';
        });
        
        // 現在選択されているゲームがあれば表示
        this.restoreGameSelection();
    }
    
    setupGameActionButtons() {
        const confirmBtn = document.getElementById('confirm-game-btn');
        const cancelBtn = document.getElementById('cancel-game-btn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmGameSelection());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideGameSelector());
        }
    }
    
    generateGameId(gameName) {
        // 日本語ゲーム名を英語IDに変換
        const gameIdMap = {
            'League of Legends': 'lol',
            'Valorant': 'valorant',
            'Overwatch 2': 'overwatch2',
            'Counter-Strike 2': 'cs2',
            'Apex Legends': 'apex',
            'Fortnite': 'fortnite',
            'Call of Duty': 'cod',
            'Rainbow Six Siege': 'r6',
            'Rocket League': 'rocketleague',
            'FIFA 24': 'fifa24',
            'NBA 2K24': 'nba2k24',
            'Gran Turismo 7': 'gt7'
        };
        
        return gameIdMap[gameName] || gameName.toLowerCase().replace(/\s+/g, '_');
    }
    
    restoreGameSelection() {
        const selectedGameId = localStorage.getItem('selectedGame');
        if (selectedGameId) {
            const selectedCard = document.querySelector(`.game-option[data-game-id="${selectedGameId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
        }
    }
    
    goToGameSelection() {
        // 設定タブに移動
        this.showPage('settings');
        
        // ナビゲーションのアクティブ状態を更新
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === 'settings') {
                btn.classList.add('active');
            }
        });
        
        // ゲーム選択エリアまでスクロール
        setTimeout(() => {
            const gameSelection = document.getElementById('current-game-display');
            if (gameSelection) {
                gameSelection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
            
            // ゲーム選択を開く
            this.showGameSelector();
            
            // ハイライトアニメーション
            const gameSelector = document.getElementById('game-selector');
            if (gameSelector) {
                gameSelector.classList.add('highlight');
                setTimeout(() => {
                    gameSelector.classList.remove('highlight');
                }, 1500);
            }
        }, 300);
    }
    
    checkGameSelection() {
        const selectedGame = localStorage.getItem('selectedGame');
        const selectedGameData = localStorage.getItem('selectedGameData');
        
        if (selectedGame && selectedGameData) {
            // ゲームが選択済み
            this.updateUIWithGameData(JSON.parse(selectedGameData));
            this.hideGameSelectionGuidance();
        } else {
            // ゲーム未選択
            this.showGameSelectionGuidance();
            this.clearGameData();
        }
    }
    
    selectGame(gameCard) {
        // 他のカードの選択を解除
        const allCards = document.querySelectorAll('.game-option');
        allCards.forEach(card => card.classList.remove('selected'));
        
        // 選択したカードをハイライト
        gameCard.classList.add('selected');
    }
    
    confirmGameSelection() {
        const selectedCard = document.querySelector('.game-option.selected');
        if (!selectedCard) {
            this.showToast('ゲームを選択してください', 'warning');
            return;
        }
        
        // ゲーム情報を取得
        const gameId = selectedCard.dataset.gameId;
        const gameName = selectedCard.dataset.gameName || selectedCard.querySelector('.game-option-name').textContent;
        const gameIcon = selectedCard.dataset.gameIcon || selectedCard.querySelector('.game-option-icon').textContent;
        const categoryName = selectedCard.dataset.category || selectedCard.closest('.game-category-section')?.querySelector('.category-title')?.textContent || 'その他';
        
        const gameData = {
            id: gameId,
            name: gameName,
            icon: gameIcon,
            category: categoryName
        };
        
        // LocalStorageに保存
        localStorage.setItem('selectedGame', gameId);
        localStorage.setItem('selectedGameData', JSON.stringify(gameData));
        
        // UIを更新
        this.updateUIWithGameData(gameData);
        this.hideGameSelector();
        this.hideGameSelectionGuidance();
        
        this.showToast(`${gameName} を選択しました`, 'success');

        // コーチングを更新
        this.refreshDailyCoaching();

        // ダッシュボードに戻る
        setTimeout(() => {
            this.showPage('dashboard');
            const navBtns = document.querySelectorAll('.nav-btn');
            navBtns.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.page === 'dashboard') {
                    btn.classList.add('active');
                }
            });
        }, 1000);
    }
    
    updateUIWithGameData(gameData) {
        // ダッシュボード更新
        const playerGame = document.getElementById('player-game');
        const currentGameName = document.getElementById('current-game-name');
        const currentGameIcon = document.getElementById('current-game-icon');
        const currentGameCategory = document.getElementById('current-game-category');
        
        if (playerGame) playerGame.textContent = gameData.name;
        if (currentGameName) currentGameName.textContent = gameData.name;
        if (currentGameIcon) currentGameIcon.textContent = gameData.icon;
        if (currentGameCategory) currentGameCategory.textContent = gameData.category;
        
        // サンプルデータを表示
        this.loadSampleGameData(gameData);
    }
    
    loadSampleGameData(gameData) {
        // プレイヤー名をカスタマイズ
        const playerName = document.getElementById('player-name');
        if (playerName) {
            playerName.textContent = `${gameData.name} プレイヤー`;
        }

        // ランクを設定（固定の例。ここはランダムではないため従来通り）
        const playerRank = document.getElementById('player-rank');
        if (playerRank) {
            const ranks = {
                'League of Legends': 'Gold II',
                'Valorant': 'Diamond I',
                'Overwatch 2': 'Platinum III',
                'Counter-Strike 2': 'Global Elite',
                'Apex Legends': 'Diamond IV'
            };
            playerRank.textContent = ranks[gameData.name] || 'Platinum II';
        }

        // 1) まずは保存済みの統計があればそれを使用（安定表示）
        let stableStats = null;
        if (this.playerStatsManager && this.playerStatsManager.hasValidStats()) {
            stableStats = this.playerStatsManager.getPlayerStats();
        }

        // 2) 保存済みの統計がない場合は何もしない（初期状態は「-」のまま）

        // 3) UI へ反映（存在しなければハイフンのまま）
        if (stableStats) {
            const mapping = {
                'win-rate': `${Number(stableStats.winRate).toFixed(0)}%`,
                'avg-kda': `${Number(stableStats.avgKDA)}`,
                'cs-per-min': `${Number(stableStats.csPerMin).toFixed(1)}`,
                'games-played': `${parseInt(stableStats.gamesPlayed, 10)}`
            };
            Object.entries(mapping).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            });
            // チャート初期化（保存している場合のみ）
            if (this.playerStatsManager) {
                this.playerStatsManager.loadStatsToUI();
            }
        }
    }
    
    generateRandomStat(min, max, suffix = '', decimals = 0) {
        const value = Math.random() * (max - min) + min;
        return decimals > 0 ? value.toFixed(decimals) + suffix : Math.floor(value) + suffix;
    }
    
    clearGameData() {
        const playerGame = document.getElementById('player-game');
        const currentGameName = document.getElementById('current-game-name');
        
        if (playerGame) playerGame.textContent = 'ゲーム未選択';
        if (currentGameName) currentGameName.textContent = 'ゲームを選択してください';
        
        // 統計を「-」に戻す
        ['win-rate', 'avg-kda', 'cs-per-min', 'games-played'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '-';
        });
    }
    
    showGameSelectionGuidance() {
        const guidance = document.getElementById('game-selection-guidance');
        if (guidance) {
            guidance.classList.remove('hidden');
        }
    }
    
    hideGameSelectionGuidance() {
        const guidance = document.getElementById('game-selection-guidance');
        if (guidance) {
            guidance.classList.add('hidden');
        }
    }

    // スキルレベル選択関連のメソッド
    showSkillSelector() {
        const selector = document.getElementById('skill-selector');
        if (selector) {
            selector.classList.remove('hidden');
            // スキルレベルオプションのクリックイベントを設定
            this.setupSkillOptions();
        }
    }

    hideSkillSelector() {
        const selector = document.getElementById('skill-selector');
        if (selector) {
            selector.classList.add('hidden');
            // 選択状態をクリア
            const skillOptions = document.querySelectorAll('.skill-option');
            skillOptions.forEach(option => option.classList.remove('selected'));
        }
    }

    setupSkillOptions() {
        const skillOptions = document.querySelectorAll('.skill-option');
        skillOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectSkillLevel(option);
            });
        });
    }

    selectSkillLevel(skillOption) {
        // 他のオプションの選択を解除
        const allOptions = document.querySelectorAll('.skill-option');
        allOptions.forEach(option => option.classList.remove('selected'));

        // 選択したオプションをハイライト
        skillOption.classList.add('selected');
    }

    confirmSkillSelection() {
        const selectedOption = document.querySelector('.skill-option.selected');
        if (!selectedOption) {
            this.showToast('スキルレベルを選択してください', 'warning');
            return;
        }

        const skillLevel = selectedOption.dataset.skill;
        const skillInfo = this.getSkillLevelInfo(skillLevel);

        // LocalStorageに保存
        localStorage.setItem('playerSkillLevel', skillLevel);
        localStorage.setItem('playerSkillLevelData', JSON.stringify(skillInfo));

        // UIを更新
        this.updateSkillLevelUI(skillInfo);
        this.hideSkillSelector();

        this.showToast(`スキルレベルを${skillInfo.name}に設定しました`, 'success');

        // コーチングを更新
        this.refreshDailyCoaching();
    }

    getSkillLevelInfo(skillLevel) {
        const skillLevels = {
            beginner: {
                name: '初心者',
                description: '基本的なゲームメカニクスを学習中',
                icon: '🌱'
            },
            intermediate: {
                name: '中級者',
                description: 'ゲームの基本は理解し、上達を目指している',
                icon: '📊'
            },
            advanced: {
                name: '上級者',
                description: '高度な戦略と技術を身につけている',
                icon: '🏆'
            }
        };
        return skillLevels[skillLevel] || skillLevels.intermediate;
    }

    updateSkillLevelUI(skillInfo) {
        const currentSkillLevel = document.getElementById('current-skill-level');
        const currentSkillDescription = document.getElementById('current-skill-description');
        const currentSkillIcon = document.getElementById('current-skill-icon');

        if (currentSkillLevel) currentSkillLevel.textContent = skillInfo.name;
        if (currentSkillDescription) currentSkillDescription.textContent = skillInfo.description;
        if (currentSkillIcon) currentSkillIcon.textContent = skillInfo.icon;
    }

    initializeSkillLevel() {
        // 保存済みのスキルレベルがあれば復元
        const savedSkillLevel = localStorage.getItem('playerSkillLevel');
        const savedSkillData = localStorage.getItem('playerSkillLevelData');

        if (savedSkillLevel && savedSkillData) {
            const skillInfo = JSON.parse(savedSkillData);
            this.updateSkillLevelUI(skillInfo);
        } else {
            // デフォルトで中級者を設定
            const defaultSkill = this.getSkillLevelInfo('intermediate');
            this.updateSkillLevelUI(defaultSkill);
            localStorage.setItem('playerSkillLevel', 'intermediate');
            localStorage.setItem('playerSkillLevelData', JSON.stringify(defaultSkill));
        }
    }

    // 日替わりコーチング機能の初期化
    initDailyCoaching() {
        // CoachingServiceを初期化
        if (typeof CoachingService !== 'undefined') {
            this.coachingService = new CoachingService();
        } else {
            console.warn('CoachingService not found');
            return;
        }

        // 日替わりコーチングを表示
        this.loadDailyCoaching();

        // 進捗統計を更新
        this.updateCoachingProgress();
    }

    async loadDailyCoaching() {
        if (!this.coachingService) return;

        try {
            // ユーザープロファイルを取得
            const userProfile = this.getUserProfile();

            if (!userProfile.gameGenre || !userProfile.skillLevel) {
                // プロファイルが設定されていない場合はプレースホルダーを表示
                this.showCoachingPlaceholder();
                return;
            }

            // ローディング状態を表示
            this.showCoachingLoading();

            // 本日のコーチングアドバイスを取得（非同期）
            const dailyAdvice = await this.coachingService.getDailyCoaching(userProfile);

            if (dailyAdvice) {
                this.displayCoachingAdvice(dailyAdvice);

                // ソース表示（デバッグ用）
                if (dailyAdvice.source === 'gemini') {
                    console.log('CoachingService: Using AI-generated advice');
                } else if (dailyAdvice.source === 'cached_fallback') {
                    this.showToast('レート制限のため、最近のアドバイスを表示しています', 'info');
                } else if (dailyAdvice.source === 'fallback') {
                    console.log('CoachingService: Using fallback static advice');
                }
            } else {
                this.showCoachingPlaceholder();
            }
        } catch (error) {
            console.error('Failed to load daily coaching:', error);
            this.showCoachingError(error);
        }
    }

    getUserProfile() {
        // ゲーム情報を取得
        const selectedGame = localStorage.getItem('selectedGame');
        const gameData = localStorage.getItem('selectedGameData');

        // スキルレベル情報を取得
        const skillLevel = localStorage.getItem('playerSkillLevel');

        // 目標情報を取得
        const currentGoals = this.getCurrentGoalsFromStorage();
        const weeklyGoals = this.getWeeklyGoalsFromStorage();

        let gameGenre = null;

        if (selectedGame && gameData) {
            const game = JSON.parse(gameData);
            // ゲームカテゴリをジャンルにマッピング
            const categoryToGenre = {
                'FPS': 'fps',
                'MOBA': 'moba',
                '格闘ゲーム': 'fighting',
                'ストラテジー': 'strategy'
            };
            gameGenre = categoryToGenre[game.category] || 'universal';
        }

        return {
            gameGenre,
            skillLevel: skillLevel || 'intermediate',
            currentGoals: currentGoals || [],
            weeklyGoals: weeklyGoals || []
        };
    }

    displayCoachingAdvice(advice) {
        // HTMLエレメントを取得
        const headlineEl = document.getElementById('coaching-headline');
        const coreContentEl = document.getElementById('coaching-core-content');
        const practicalStepEl = document.getElementById('coaching-practical-step');
        const dateEl = document.getElementById('coaching-date');
        const goalConnectionEl = document.getElementById('coaching-goal-connection');
        const goalConnectionContainer = document.getElementById('coaching-goal-connection-container');

        // コンテンツを更新
        if (headlineEl) headlineEl.textContent = advice.headline;
        if (coreContentEl) coreContentEl.textContent = advice.coreContent;
        if (practicalStepEl) practicalStepEl.textContent = advice.practicalStep;
        if (dateEl) {
            const today = new Date();
            dateEl.textContent = `${today.getMonth() + 1}/${today.getDate()}`;
        }

        // 目標との関連性を表示
        if (goalConnectionEl && goalConnectionContainer && advice.goalConnection) {
            goalConnectionEl.textContent = advice.goalConnection;
            goalConnectionContainer.style.display = 'block';
        } else if (goalConnectionContainer) {
            goalConnectionContainer.style.display = 'none';
        }

        // 今日のアドバイスIDを保存（フィードバック用）
        this.currentAdviceId = advice.id;

        // フィードバックボタンの状態を復元
        this.restoreFeedbackState();
    }

    showCoachingPlaceholder() {
        const headlineEl = document.getElementById('coaching-headline');
        const coreContentEl = document.getElementById('coaching-core-content');
        const practicalStepEl = document.getElementById('coaching-practical-step');

        if (headlineEl) headlineEl.textContent = 'コーチングを準備中...';
        if (coreContentEl) {
            coreContentEl.textContent = 'ゲームを選択してスキルレベルを設定すると、パーソナライズされたコーチングアドバイスが表示されます。';
        }
        if (practicalStepEl) {
            practicalStepEl.textContent = '設定を完了して、今日のアドバイスを受け取りましょう！';
        }

        this.currentAdviceId = null;
    }

    showCoachingLoading() {
        const headlineEl = document.getElementById('coaching-headline');
        const coreContentEl = document.getElementById('coaching-core-content');
        const practicalStepEl = document.getElementById('coaching-practical-step');

        if (headlineEl) headlineEl.textContent = 'AIが今日のアドバイスを生成中...';
        if (coreContentEl) {
            coreContentEl.textContent = 'あなたのプロフィールとフィードバック履歴を分析して、最適なコーチングアドバイスを作成しています。少々お待ちください。';
        }
        if (practicalStepEl) {
            practicalStepEl.textContent = '⏳ 生成中...';
        }

        this.currentAdviceId = null;
    }

    showCoachingError(error) {
        const headlineEl = document.getElementById('coaching-headline');
        const coreContentEl = document.getElementById('coaching-core-content');
        const practicalStepEl = document.getElementById('coaching-practical-step');

        if (headlineEl) headlineEl.textContent = 'コーチング取得中にエラーが発生しました';
        if (coreContentEl) {
            if (error.message && error.message.includes('Rate limit')) {
                coreContentEl.textContent = 'APIの利用制限に達しました。しばらく時間をおいてから再度お試しください。設定画面から手動でリフレッシュすることも可能です。';
            } else {
                coreContentEl.textContent = 'アドバイスの取得中に問題が発生しました。ネットワーク接続とAPI設定を確認してください。';
            }
        }
        if (practicalStepEl) {
            practicalStepEl.textContent = 'しばらくしてからページを再読み込みしてみてください。';
        }

        this.currentAdviceId = null;
    }

    // 初期設定モーダル関連のメソッド
    showInitialSetupModal() {
        const modal = document.getElementById('initial-setup-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            this.currentSetupStep = 1;
            this.selectedGameData = null;
            this.selectedSkillLevel = null;

            // ゲームリストを生成
            this.generateGameOptions();

            // 初期設定リスナーを設定
            this.setupInitialSetupListeners();

            // ボタンの初期状態を確認
            this.debugButtonStates();
        }
    }

    closeInitialSetupModal() {
        const modal = document.getElementById('initial-setup-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    generateGameOptions() {
        console.log('generateGameOptions called');
        const gameGrid = document.getElementById('setup-game-grid');
        if (!gameGrid) {
            console.error('Game grid element not found');
            return;
        }
        if (!this.gameManager) {
            console.error('Game manager not initialized');
            return;
        }

        gameGrid.innerHTML = '';

        const gameCategories = this.gameManager.getGameCategories();
        console.log('Game categories:', gameCategories);

        let gameCount = 0;
        Object.keys(gameCategories).forEach(categoryId => {
            const category = gameCategories[categoryId];

            if (categoryId === 'other') return; // カスタムゲームは除外

            category.games.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'game-option-card';
                gameCard.dataset.gameId = game.id;
                gameCard.dataset.gameName = game.name;
                gameCard.dataset.gameIcon = game.icon;
                gameCard.dataset.gameCategory = category.name;

                gameCard.innerHTML = `
                    <div class="game-icon">${game.icon}</div>
                    <div class="game-name">${game.name}</div>
                    <div class="game-category">${category.name}</div>
                `;

                gameCard.addEventListener('click', () => {
                    console.log('Game card clicked:', game.name);
                    this.selectSetupGame(gameCard);
                });

                gameGrid.appendChild(gameCard);
                gameCount++;
            });
        });

        console.log(`Generated ${gameCount} game cards`);
    }

    selectSetupGame(gameCard) {
        console.log('selectSetupGame called, gameCard:', gameCard);

        // 他のカードの選択を解除
        const allCards = document.querySelectorAll('.game-option-card');
        allCards.forEach(card => card.classList.remove('selected'));

        // 選択したカードをハイライト
        gameCard.classList.add('selected');

        // ゲームデータを保存
        this.selectedGameData = {
            id: gameCard.dataset.gameId,
            name: gameCard.dataset.gameName,
            icon: gameCard.dataset.gameIcon,
            category: gameCard.dataset.gameCategory
        };

        console.log('Selected game data:', this.selectedGameData);

        // 次へボタンを有効化
        const nextBtn = document.getElementById('setup-game-next');
        if (nextBtn) {
            nextBtn.disabled = false;
            console.log('Next button enabled');
        } else {
            console.error('Next button not found');
        }
    }

    selectSetupSkill(skillCard) {
        // 他のカードの選択を解除
        const allCards = document.querySelectorAll('.skill-card');
        allCards.forEach(card => card.classList.remove('selected'));

        // 選択したカードをハイライト
        skillCard.classList.add('selected');

        // スキルレベルを保存
        this.selectedSkillLevel = skillCard.dataset.skill;

        // 完了ボタンを有効化
        const completeBtn = document.getElementById('setup-skill-complete');
        if (completeBtn) {
            completeBtn.disabled = false;
        }
    }

    nextToSkillSelection() {
        console.log('nextToSkillSelection called, selectedGameData:', this.selectedGameData);

        if (!this.selectedGameData) {
            console.error('No game selected, cannot proceed to skill selection');
            this.showToast('ゲームを選択してください', 'warning');
            return;
        }

        // ステップ1を非表示、ステップ2を表示
        document.getElementById('setup-step-1').classList.add('hidden');
        document.getElementById('setup-step-2').classList.remove('hidden');

        // プログレスバーを更新
        this.updateSetupProgress(2);

        this.currentSetupStep = 2;
        console.log('Moved to step 2');
    }

    backToGameSelection() {
        // ステップ2を非表示、ステップ1を表示
        document.getElementById('setup-step-2').classList.add('hidden');
        document.getElementById('setup-step-1').classList.remove('hidden');

        // プログレスバーを更新
        this.updateSetupProgress(1);

        this.currentSetupStep = 1;
    }

    completeInitialSetup() {
        if (!this.selectedGameData || !this.selectedSkillLevel) return;

        // 設定を保存
        localStorage.setItem('selectedGame', this.selectedGameData.id);
        localStorage.setItem('selectedGameData', JSON.stringify(this.selectedGameData));
        localStorage.setItem('playerSkillLevel', this.selectedSkillLevel);

        const skillInfo = this.getSkillLevelInfo(this.selectedSkillLevel);
        localStorage.setItem('playerSkillLevelData', JSON.stringify(skillInfo));

        // 初回設定完了フラグを設定
        localStorage.setItem('initialSetupCompleted', 'true');

        // ゲーム選択ガイダンスを非表示に
        this.hideGameSelectionGuidance();

        // 完了画面を表示
        this.showSetupCompletion();
    }

    showSetupCompletion() {
        // すべてのステップを非表示にして完了画面を表示
        document.getElementById('setup-step-1').classList.add('hidden');
        document.getElementById('setup-step-2').classList.add('hidden');
        document.getElementById('setup-step-complete').classList.remove('hidden');

        // プログレスバーを完了状態に
        this.updateSetupProgress(3);

        // サマリーを更新
        const summaryGame = document.getElementById('summary-game');
        const summarySkill = document.getElementById('summary-skill');

        if (summaryGame) summaryGame.textContent = this.selectedGameData.name;
        if (summarySkill) {
            const skillInfo = this.getSkillLevelInfo(this.selectedSkillLevel);
            summarySkill.textContent = skillInfo.name;
        }
    }

    updateSetupProgress(step) {
        const progressFill = document.getElementById('setup-progress-fill');
        const progressText = document.getElementById('setup-progress-text');

        if (progressFill && progressText) {
            switch (step) {
                case 1:
                    progressFill.style.width = '33%';
                    progressText.textContent = 'ステップ 1 / 3';
                    break;
                case 2:
                    progressFill.style.width = '66%';
                    progressText.textContent = 'ステップ 2 / 3';
                    break;
                case 3:
                    progressFill.style.width = '100%';
                    progressText.textContent = '完了';
                    break;
            }
        }
    }

    async startApp() {
        // 初期設定モーダルを閉じる
        this.closeInitialSetupModal();

        // メインアプリを初期化
        await this.initializeMainApp();

        // 完了メッセージ
        this.showToast('e-Bridgeへようこそ！設定が完了しました', 'success');
    }

    setupInitialSetupListeners() {
        console.log('Setting up initial setup listeners...');

        // 既存のリスナーをクリア（重複防止）
        this.clearInitialSetupListeners();

        // ゲーム次へボタン
        const gameNextBtn = document.getElementById('setup-game-next');
        if (gameNextBtn) {
            console.log('Found game next button');
            this.gameNextHandler = () => {
                console.log('Game next button clicked');
                this.nextToSkillSelection();
            };
            gameNextBtn.addEventListener('click', this.gameNextHandler);
        } else {
            console.error('Game next button not found');
        }

        // スキル戻るボタン
        const skillBackBtn = document.getElementById('setup-skill-back');
        if (skillBackBtn) {
            this.skillBackHandler = () => {
                this.backToGameSelection();
            };
            skillBackBtn.addEventListener('click', this.skillBackHandler);
        }

        // スキル完了ボタン
        const skillCompleteBtn = document.getElementById('setup-skill-complete');
        if (skillCompleteBtn) {
            this.skillCompleteHandler = () => {
                this.completeInitialSetup();
            };
            skillCompleteBtn.addEventListener('click', this.skillCompleteHandler);
        }

        // アプリ開始ボタン
        const startAppBtn = document.getElementById('setup-start-app');
        if (startAppBtn) {
            this.startAppHandler = async () => {
                await this.startApp();
            };
            startAppBtn.addEventListener('click', this.startAppHandler);
        }

        // スキルカードのクリックイベント
        const skillCards = document.querySelectorAll('.skill-card');
        skillCards.forEach(card => {
            const skillHandler = () => {
                this.selectSetupSkill(card);
            };
            card.addEventListener('click', skillHandler);
            // ハンドラーを保存（後でクリーンアップ用）
            card._skillHandler = skillHandler;
        });
    }

    clearInitialSetupListeners() {
        // ゲーム次へボタンのリスナーを削除
        const gameNextBtn = document.getElementById('setup-game-next');
        if (gameNextBtn && this.gameNextHandler) {
            gameNextBtn.removeEventListener('click', this.gameNextHandler);
        }

        // スキル戻るボタンのリスナーを削除
        const skillBackBtn = document.getElementById('setup-skill-back');
        if (skillBackBtn && this.skillBackHandler) {
            skillBackBtn.removeEventListener('click', this.skillBackHandler);
        }

        // スキル完了ボタンのリスナーを削除
        const skillCompleteBtn = document.getElementById('setup-skill-complete');
        if (skillCompleteBtn && this.skillCompleteHandler) {
            skillCompleteBtn.removeEventListener('click', this.skillCompleteHandler);
        }

        // アプリ開始ボタンのリスナーを削除
        const startAppBtn = document.getElementById('setup-start-app');
        if (startAppBtn && this.startAppHandler) {
            startAppBtn.removeEventListener('click', this.startAppHandler);
        }

        // スキルカードのリスナーを削除
        const skillCards = document.querySelectorAll('.skill-card');
        skillCards.forEach(card => {
            if (card._skillHandler) {
                card.removeEventListener('click', card._skillHandler);
                delete card._skillHandler;
            }
        });
    }

    debugButtonStates() {
        console.log('=== Button States Debug ===');
        const gameNextBtn = document.getElementById('setup-game-next');
        if (gameNextBtn) {
            console.log('Game next button found');
            console.log('- disabled:', gameNextBtn.disabled);
            console.log('- textContent:', gameNextBtn.textContent);
            console.log('- classList:', gameNextBtn.classList.toString());
        } else {
            console.error('Game next button not found');
        }

        const skillBackBtn = document.getElementById('setup-skill-back');
        const skillCompleteBtn = document.getElementById('setup-skill-complete');
        console.log('Skill back button found:', !!skillBackBtn);
        console.log('Skill complete button found:', !!skillCompleteBtn);
        console.log('=== End Button Debug ===');
    }

    // 初回設定が必要かチェック
    needsInitialSetup() {
        const setupCompleted = localStorage.getItem('initialSetupCompleted');
        console.log('Setup check - setupCompleted:', setupCompleted);

        // 明示的に初期設定完了フラグがtrueの場合は不要
        if (setupCompleted === 'true') {
            return false;
        }

        // 初期設定フラグがない場合は、ゲームと スキルレベルの存在を確認
        const hasGame = localStorage.getItem('selectedGame');
        const hasSkill = localStorage.getItem('playerSkillLevel');

        console.log('Setup check - hasGame:', hasGame, 'hasSkill:', hasSkill);

        // いずれかが不足している場合のみ初期設定が必要
        return !hasGame || !hasSkill;
    }

    setupCoachingFeedbackListeners() {
        const feedbackButtons = document.querySelectorAll('.feedback-btn');

        feedbackButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const feedbackType = button.dataset.feedback;
                this.handleCoachingFeedback(feedbackType, button);
            });
        });

        // コメント機能のリスナー
        this.setupCommentFeedbackListeners();
    }

    setupCommentFeedbackListeners() {
        const commentTextarea = document.getElementById('feedback-comment');
        const submitBtn = document.getElementById('submit-feedback-btn');
        const cancelBtn = document.getElementById('cancel-feedback-btn');
        const charCountSpan = document.getElementById('comment-char-count');

        // テキストエリアの文字数カウント
        if (commentTextarea && charCountSpan) {
            commentTextarea.addEventListener('input', (e) => {
                const count = e.target.value.length;
                charCountSpan.textContent = count;

                // ボタン状態の更新
                if (submitBtn) {
                    submitBtn.disabled = count === 0 || count > 500;
                }

                // 文字数警告の色変更
                const counter = document.querySelector('.comment-counter');
                if (counter) {
                    counter.classList.remove('warning', 'error');
                    if (count > 450) {
                        counter.classList.add('warning');
                    }
                    if (count > 500) {
                        counter.classList.add('error');
                    }
                }
            });
        }

        // フィードバック送信ボタン
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitFeedbackWithComment();
            });
        }

        // キャンセルボタン
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelFeedbackComment();
            });
        }
    }

    handleCoachingFeedback(feedbackType, buttonEl) {
        if (!this.coachingService || !this.currentAdviceId) {
            this.showToast('フィードバックを送信できませんでした', 'error');
            return;
        }

        // 選択されたフィードバックタイプを保存
        this.selectedFeedbackType = feedbackType;
        this.selectedFeedbackButton = buttonEl;

        // ボタンの状態を更新
        this.updateFeedbackButtonState(buttonEl);

        // コメントセクションを表示
        this.showCommentSection();
    }

    showCommentSection() {
        const commentSection = document.getElementById('feedback-comment-section');
        const commentTextarea = document.getElementById('feedback-comment');

        if (commentSection) {
            commentSection.style.display = 'block';
            commentSection.classList.add('show');

            // フォーカスをテキストエリアに
            if (commentTextarea) {
                setTimeout(() => {
                    commentTextarea.focus();
                }, 200);
            }
        }
    }

    hideCommentSection() {
        const commentSection = document.getElementById('feedback-comment-section');
        if (commentSection) {
            commentSection.classList.remove('show');
            setTimeout(() => {
                commentSection.style.display = 'none';
            }, 300);
        }
    }

    submitFeedbackWithComment() {
        if (!this.coachingService || !this.currentAdviceId || !this.selectedFeedbackType) {
            this.showToast('フィードバックを送信できませんでした', 'error');
            return;
        }

        const commentTextarea = document.getElementById('feedback-comment');
        const comment = commentTextarea ? commentTextarea.value.trim() : '';

        // フィードバックを記録（コメント付き）
        this.coachingService.recordFeedback(this.currentAdviceId, this.selectedFeedbackType, comment);

        // 進捗統計を更新
        setTimeout(() => {
            this.updateCoachingProgress();
        }, 150);

        // UIをリセット
        this.hideCommentSection();
        this.resetCommentForm();

        // トーストメッセージを表示
        const feedbackMessages = {
            helpful: 'フィードバックありがとうございます！',
            too_easy: '次回はより挑戦的なアドバイスを提供します',
            too_hard: '次回はより基本的なアドバイスを提供します'
        };

        let message = feedbackMessages[this.selectedFeedbackType];
        if (comment.length > 0) {
            message += '\nコメントは明日のコーチングに反映されます！';
        }

        this.showToast(message, 'success');

        // 変数をクリア
        this.selectedFeedbackType = null;
        this.selectedFeedbackButton = null;
    }

    cancelFeedbackComment() {
        // フィードバックボタンの選択状態をリセット
        if (this.selectedFeedbackButton) {
            this.resetFeedbackButtons();
        }

        // コメントセクションを隠す
        this.hideCommentSection();
        this.resetCommentForm();

        // 変数をクリア
        this.selectedFeedbackType = null;
        this.selectedFeedbackButton = null;
    }

    resetCommentForm() {
        const commentTextarea = document.getElementById('feedback-comment');
        const charCountSpan = document.getElementById('comment-char-count');
        const submitBtn = document.getElementById('submit-feedback-btn');
        const counter = document.querySelector('.comment-counter');

        if (commentTextarea) {
            commentTextarea.value = '';
        }

        if (charCountSpan) {
            charCountSpan.textContent = '0';
        }

        if (submitBtn) {
            submitBtn.disabled = true;
        }

        if (counter) {
            counter.classList.remove('warning', 'error');
        }
    }

    updateFeedbackButtonState(selectedButton) {
        // すべてのフィードバックボタンから選択状態を削除
        const allButtons = document.querySelectorAll('.feedback-btn');
        allButtons.forEach(btn => {
            btn.classList.remove('selected');
            this.updateFeedbackButtonText(btn, false); // テキストもリセット
        });

        // 選択されたボタンに選択状態を追加
        selectedButton.classList.add('selected');
        this.updateFeedbackButtonText(selectedButton, true); // 選択状態のテキストに変更
    }

    resetFeedbackButtons() {
        const allButtons = document.querySelectorAll('.feedback-btn');
        allButtons.forEach(btn => {
            btn.classList.remove('selected');
            this.updateFeedbackButtonText(btn, false); // テキストもリセット
        });
    }

    // 今日のフィードバック状態を復元
    restoreFeedbackState() {
        if (!this.coachingService) return;

        const feedbackStatus = this.coachingService.getTodaysFeedbackStatus();

        if (feedbackStatus.hasFeedback) {
            // 該当するフィードバックボタンを選択状態にする
            const targetButton = document.querySelector(`.feedback-btn[data-feedback="${feedbackStatus.feedbackType}"]`);
            if (targetButton) {
                this.resetFeedbackButtons(); // まず全てリセット
                targetButton.classList.add('selected'); // 今日のフィードバックを選択状態に
                this.updateFeedbackButtonText(targetButton, true); // 選択状態のテキストに更新
            }
        } else {
            // フィードバックがない場合は全てリセット
            this.resetFeedbackButtons();
        }
    }

    // フィードバックボタンのテキストを更新
    updateFeedbackButtonText(button, isSelected) {
        const feedbackType = button.dataset.feedback;
        const originalTexts = {
            helpful: '👍 役に立った',
            too_easy: '😊 簡単すぎた',
            too_hard: '😰 難しすぎた'
        };
        const selectedTexts = {
            helpful: '✅ 役に立った',
            too_easy: '✅ 簡単すぎた',
            too_hard: '✅ 難しすぎた'
        };

        if (isSelected) {
            button.textContent = selectedTexts[feedbackType] || button.textContent;
        } else {
            button.textContent = originalTexts[feedbackType] || button.textContent;
        }
    }

    updateCoachingProgress() {
        if (!this.coachingService) return;

        const stats = this.coachingService.getProgressStats();

        const continuousDaysEl = document.getElementById('continuous-days');
        const totalLessonsEl = document.getElementById('total-lessons');

        if (continuousDaysEl) continuousDaysEl.textContent = stats.continuousLearningDays;
        if (totalLessonsEl) totalLessonsEl.textContent = stats.totalLessons;
    }

    // ゲームやスキルレベル変更時にコーチングを更新
    async refreshDailyCoaching() {
        if (this.coachingService) {
            await this.loadDailyCoaching();
        }
    }

    // アプリ全体の初期化（データ消去）
    resetAppData() {
        // 確認ダイアログ
        const ok = confirm('アプリを初期化します。保存された試合・目標・APIキーなどのデータが削除されます。よろしいですか？');
        if (!ok) return;

        try {
            // localStorage の主なキーを削除
            const localKeys = [
                'playerStats',
                'recentMatches',
                'goals',
                'selectedGame',
                'selectedGameData',
                'theme',
                'theme-manual',
                'ai_provider',
                'ai_api_key',
                'ai_model',
                'gemini_unified_api_key',
                'api_key_timestamp',
                'gemini-api-key',
                'vision_api_key',
                'video_api_key'
            ];
            localKeys.forEach(k => localStorage.removeItem(k));

            // sessionStorage の主なキーを削除
            const sessionKeys = ['currentUser', 'isGuest'];
            sessionKeys.forEach(k => sessionStorage.removeItem(k));

            // 内部サービスのクリーンアップ
            if (this.geminiService && typeof this.geminiService.clearApiKey === 'function') {
                try { this.geminiService.clearApiKey(); } catch (e) { console.debug(e); }
            }
            if (window.unifiedApiManager && typeof window.unifiedApiManager.clearAPIKey === 'function') {
                try { window.unifiedApiManager.clearAPIKey(); } catch (e) { console.debug(e); }
            }

            // UI リセット
            this.clearGameData();
            const statsIds = ['win-rate', 'avg-kda', 'cs-per-min', 'games-played'];
            statsIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '-'; });
            const matchesContainer = document.getElementById('recent-matches');
            if (matchesContainer) matchesContainer.innerHTML = '<p class="no-data">試合記録がまだありません</p>';
            const goalsList = document.getElementById('goals-list');
            if (goalsList) goalsList.innerHTML = '<p class="no-data">目標がまだ設定されていません</p>';
            // コーチング関連のキャッシュを削除
            localStorage.removeItem('cached-coaching-advice');
            localStorage.removeItem('coaching-advice-update-time');

            // スキルレベル関連のデータを削除
            localStorage.removeItem('playerSkillLevel');
            localStorage.removeItem('playerSkillLevelData');

            // コーチング関連のデータを削除
            localStorage.removeItem('coaching_user_progress');
            localStorage.removeItem('coaching_feedback_history');

            // 初期設定フラグを削除
            localStorage.removeItem('initialSetupCompleted');

            // コーチングキャッシュを削除
            const coachingKeys = Object.keys(localStorage).filter(key => key.startsWith('coaching_advice_'));
            coachingKeys.forEach(key => localStorage.removeItem(key));

            // コーチングAPI制限データを削除
            localStorage.removeItem('coaching_cache_metadata');
            localStorage.removeItem('coaching_last_api_call');
            localStorage.removeItem('coaching_api_call_count');
            localStorage.removeItem('coaching_api_call_times');

            // テーマをデフォルトに戻す
            this.currentTheme = 'dark';
            this.applyTheme(this.currentTheme);

            this.showToast('アプリを初期化しました。ページを再読み込みします…', 'success');
            setTimeout(() => window.location.reload(), 600);
        } catch (e) {
            console.warn('Failed to reset app:', e);
            this.showToast('初期化に失敗しました', 'error');
        }
    }

    // === ダッシュボード目標表示機能 ===
    initDashboardGoals() {
        console.log('🎯 Initializing dashboard goals...');

        // 既存の目標データをチェック・修正
        this.checkAndFixGoalsData();

        // イベントリスナー設定
        const viewAllGoalsBtn = document.getElementById('view-all-goals');
        const addFirstGoalBtn = document.getElementById('add-first-goal');

        if (viewAllGoalsBtn) {
            viewAllGoalsBtn.addEventListener('click', () => {
                this.showPage('goals');
                this.updateNavigation('goals');
            });
        }

        if (addFirstGoalBtn) {
            addFirstGoalBtn.addEventListener('click', () => {
                this.showPage('goals');
                this.updateNavigation('goals');
            });
        }

        // 目標データを読み込み
        this.loadDashboardGoals();

        // LocalStorageの変更を監視
        this.setupGoalsStorageListener();
    }

    // 目標データの整合性をチェック・修正
    checkAndFixGoalsData() {
        try {
            const goalsData = localStorage.getItem('goals');
            if (!goalsData) return;

            const goals = JSON.parse(goalsData);
            let dataFixed = false;

            console.log('🔧 Checking goals data integrity...');

            const fixedGoals = goals.map(goal => {
                // 進捗値が不正な場合の修正
                if (typeof goal.progress !== 'number' || isNaN(goal.progress) || goal.progress < 0 || goal.progress > 100) {
                    console.log(`🔧 Fixing invalid progress for goal "${goal.title}": ${goal.progress} → 0`);
                    goal.progress = 0;
                    dataFixed = true;
                }

                // IDが存在しない場合の修正
                if (!goal.id) {
                    goal.id = Date.now() + Math.random();
                    dataFixed = true;
                }

                // createdAtが存在しない場合、現在の日付から推定して設定
                if (!goal.createdAt) {
                    const deadline = new Date(goal.deadline);
                    const now = new Date();

                    // 期限から遡って適切な作成日を推定
                    // 期限が未来の場合：今日から2週間前を作成日とする
                    // 期限が過去の場合：期限の1ヶ月前を作成日とする
                    let estimatedCreatedAt;
                    if (deadline > now) {
                        estimatedCreatedAt = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 2週間前
                    } else {
                        estimatedCreatedAt = new Date(deadline.getTime() - (30 * 24 * 60 * 60 * 1000)); // 1ヶ月前
                    }

                    goal.createdAt = estimatedCreatedAt.toISOString();
                    console.log(`🔧 Setting estimated createdAt for goal "${goal.title}": ${goal.createdAt.split('T')[0]}`);
                    dataFixed = true;
                }

                return goal;
            });

            if (dataFixed) {
                localStorage.setItem('goals', JSON.stringify(fixedGoals));
                console.log('🎯 Goals data has been fixed and saved');
            }
        } catch (error) {
            console.error('Error checking goals data:', error);
        }
    }
    
    loadDashboardGoals() {
        try {
            const goalsData = localStorage.getItem('goals');
            let goals = goalsData ? JSON.parse(goalsData) : [];

            console.log('🎯 Loading dashboard goals:', goals.length, 'goals found');

            // データのクリーンアップは初期化時のみ実行（無限ループ防止）
            this.renderDashboardGoals(goals);
        } catch (error) {
            console.warn('Failed to load goals:', error);
            this.renderDashboardGoals([]);
        }
    }
    
    renderDashboardGoals(goals) {
        const goalsList = document.getElementById('dashboard-goals-list');
        if (!goalsList) {
            console.error('🎯 dashboard-goals-list element not found');
            return;
        }

        if (goals.length === 0) {
            // 目標なし
            goalsList.innerHTML = `
                <div class="no-goals-message">
                    <h4>目標が設定されていません</h4>
                    <p>パフォーマンス向上のための目標を設定しましょう</p>
                    <button class="add-goal-btn" id="add-first-goal">最初の目標を追加</button>
                </div>
            `;

            // イベントリスナー再設定
            const addFirstGoalBtn = document.getElementById('add-first-goal');
            if (addFirstGoalBtn) {
                addFirstGoalBtn.addEventListener('click', () => {
                    this.showPage('goals');
                    this.updateNavigation('goals');
                });
            }

            return;
        }

        // 目標をソート（期限が近い順、進捗が低い順）
        const sortedGoals = goals.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            const progressA = a.progress || 0;
            const progressB = b.progress || 0;

            // 期限が近い順
            if (dateA !== dateB) {
                return dateA - dateB;
            }

            // 進捗が低い順
            return progressA - progressB;
        });

        // 最大3件表示
        const displayGoals = sortedGoals.slice(0, 3);

        // HTMLを生成して挿入
        const html = displayGoals.map(goal => this.renderGoalItem(goal)).join('');
        goalsList.innerHTML = html;
    }
    
    renderGoalItem(goal) {
        // 日数ベースで進捗を計算
        const progress = this.calculateProgressByDays(goal);
        const deadline = new Date(goal.deadline).toLocaleDateString('ja-JP');
        const isUrgent = this.isDeadlineUrgent(goal.deadline);
        const urgentClass = isUrgent ? 'urgent' : '';

        // デバッグ時のみログ出力
        if (window.DEBUG_GOALS) {
            console.log(`🎯 Rendering "${goal.title}": ${progress}%`);
        }

        return `
            <div class="dashboard-goal-item ${urgentClass}">
                <div class="goal-item-header">
                    <h5 class="goal-item-title">${goal.title}</h5>
                    <span class="goal-item-deadline">〜 ${deadline}</span>
                </div>
                <div class="goal-progress-container">
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <div class="goal-progress-text">${progress}%</div>
                </div>
            </div>
        `;
    }
    
    isDeadlineUrgent(deadline) {
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffDays = (deadlineDate - now) / (1000 * 60 * 60 * 24);
        return diffDays <= 7; // 7日以内は緊急
    }

    // 日数ベースの進捗計算
    calculateProgressByDays(goal) {
        try {
            const now = new Date();
            const createdAt = goal.createdAt ? new Date(goal.createdAt) : null;
            const deadline = new Date(goal.deadline);

            // 作成日が設定されていない場合は手動進捗を使用
            if (!createdAt) {
                return goal.progress || 0;
            }

            // 期限が過去の場合は100%
            if (deadline <= now) {
                return 100;
            }

            // 作成日が未来の場合（データエラー）は作成日を今日に修正
            if (createdAt > now) {
                console.warn(`⚠️ Goal "${goal.title}" has future createdAt, fixing to today`);
                createdAt = now;
            }

            // 総日数と経過日数を計算
            const totalDays = (deadline - createdAt) / (1000 * 60 * 60 * 24);
            const elapsedDays = (now - createdAt) / (1000 * 60 * 60 * 24);

            // 進捗率を計算（0-100%の範囲に制限）
            const progress = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));

            // デバッグ時のみ詳細ログ
            if (window.DEBUG_GOALS) {
                console.log(`📅 Progress: "${goal.title}" = ${Math.round(progress)}% (${elapsedDays.toFixed(1)}/${totalDays.toFixed(1)} days)`);
            }

            return Math.round(progress);
        } catch (error) {
            console.error('Error calculating progress:', error);
            return goal.progress || 0;
        }
    }
    
    setupGoalsStorageListener() {
        // 重複リスナー防止のフラグ
        if (this.goalsListenerSetup) {
            return;
        }
        this.goalsListenerSetup = true;

        // LocalStorageの変更を監視（他のタブからの変更のみ）
        window.addEventListener('storage', (e) => {
            if (e.key === 'goals') {
                console.log('🎯 Storage event detected from another tab');
                this.loadDashboardGoals();
            }
        });

        console.log('🎯 Goals storage listener setup completed');
    }
    
    updateNavigation(pageId) {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageId) {
                btn.classList.add('active');
            }
        });
    }

    // === ナビゲーション支援機能 ===
    initNavigationHelpers() {
        // 分析タブへのナビゲーションボタン
        const gotoAnalysisBtn = document.getElementById('goto-analysis');
        if (gotoAnalysisBtn) {
            gotoAnalysisBtn.addEventListener('click', () => {
                this.showPage('analysis');
                this.updateNavigation('analysis');
            });
        }
        
        // AI用目標設定ボタン
    }

    // === 目標管理支援機能（コーチング用） ===

    // 現在の目標をストレージから取得（コーチング用）
    getCurrentGoalsFromStorage() {
        try {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            // 今日以降の期限の目標を返す（現在進行中の目標）
            const today = new Date().toISOString().split('T')[0];
            return goals.filter(goal => {
                if (!goal.deadline) return true; // 期限なしは現在目標として扱う
                return goal.deadline >= today;
            });
        } catch (error) {
            console.warn('Failed to get current goals:', error);
            return [];
        }
    }

    // 今週の目標をストレージから取得（コーチング用）
    getWeeklyGoalsFromStorage() {
        try {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            // 今週内（今日から7日以内）の期限の目標を返す
            const today = new Date();
            const weekFromNow = new Date();
            weekFromNow.setDate(today.getDate() + 7);

            const todayStr = today.toISOString().split('T')[0];
            const weekFromNowStr = weekFromNow.toISOString().split('T')[0];

            return goals.filter(goal => {
                if (!goal.deadline) return false; // 期限なしは週間目標から除外
                return goal.deadline >= todayStr && goal.deadline <= weekFromNowStr;
            });
        } catch (error) {
            console.warn('Failed to get weekly goals:', error);
            return [];
        }
    }

    // === コーチングプラン機能 ===

    // プラン付き目標作成を開始
    handleCreateGoalWithPlan() {
        // フォームデータを取得
        const goalData = this.getGoalFormData();

        if (!goalData.title || !goalData.deadline) {
            this.showToast('目標タイトルと期限を入力してください', 'warning');
            return;
        }

        // プランモーダルを開く
        this.openCoachingPlanModal(goalData);
    }

    // 目標フォームデータを取得
    getGoalFormData() {
        return {
            title: document.getElementById('goal-title').value,
            deadline: document.getElementById('goal-deadline').value,
            description: document.getElementById('goal-description').value,
            gameGenre: this.getCurrentGameGenre(),
            skillLevel: this.getCurrentSkillLevel()
        };
    }

    // 現在のゲームジャンルを取得
    getCurrentGameGenre() {
        const gameData = localStorage.getItem('selectedGameData');
        if (gameData) {
            const game = JSON.parse(gameData);
            const categoryToGenre = {
                'FPS': 'fps',
                'MOBA': 'moba',
                '格闘ゲーム': 'fighting',
                'ストラテジー': 'strategy'
            };
            return categoryToGenre[game.category] || 'universal';
        }
        return 'universal';
    }

    // 現在のスキルレベルを取得
    getCurrentSkillLevel() {
        return localStorage.getItem('playerSkillLevel') || 'intermediate';
    }

    // コーチングプランモーダルの初期化
    initCoachingPlanModal() {
        // モーダルクローズ
        const closeModal = document.getElementById('close-plan-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeCoachingPlanModal();
            });
        }

        // AI生成ボタン
        const generateBtn = document.getElementById('generate-plan-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generatePlanWithAI();
            });
        }

        // 手動作成ボタン
        const manualBtn = document.getElementById('manual-plan-btn');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => {
                this.createManualPlan();
            });
        }

        // プラン編集ボタン
        const editBtn = document.getElementById('edit-plan-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.editPlan();
            });
        }

        // プラン承認ボタン
        const approveBtn = document.getElementById('approve-plan-btn');
        if (approveBtn) {
            approveBtn.addEventListener('click', () => {
                this.approvePlan();
            });
        }

        // 再生成ボタン
        const regenerateBtn = document.getElementById('regenerate-plan-btn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => {
                this.regeneratePlan();
            });
        }

        // プラン保存ボタン
        const saveBtn = document.getElementById('save-plan-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.savePlanEdits();
            });
        }

        // 編集キャンセルボタン
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.cancelPlanEdit();
            });
        }
    }

    // コーチングプランモーダルを開く
    openCoachingPlanModal(goalData) {
        this.currentGoalData = goalData;

        // 目標情報を表示
        this.displayGoalSummary(goalData);

        // モーダルを表示
        const modal = document.getElementById('coaching-plan-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.showPlanStep('plan-generation-step');
        }
    }

    // コーチングプランモーダルを閉じる
    closeCoachingPlanModal() {
        const modal = document.getElementById('coaching-plan-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.currentGoalData = null;
        this.currentPlan = null;
    }

    // 目標概要を表示
    displayGoalSummary(goalData) {
        const titleEl = document.getElementById('modal-goal-title');
        const deadlineEl = document.getElementById('modal-goal-deadline');
        const durationEl = document.getElementById('modal-goal-duration');
        const descriptionEl = document.getElementById('modal-goal-description');

        if (titleEl) titleEl.textContent = goalData.title;
        if (deadlineEl) deadlineEl.textContent = `期限: ${goalData.deadline}`;
        if (descriptionEl) descriptionEl.textContent = goalData.description || '詳細説明なし';

        // 期間計算
        if (durationEl && goalData.deadline) {
            const today = new Date();
            const deadline = new Date(goalData.deadline);
            const diffTime = deadline - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                durationEl.textContent = `期間: ${diffDays}日間`;
            } else {
                durationEl.textContent = '期限: 本日または過去';
            }
        }
    }

    // プランステップを表示
    showPlanStep(stepId) {
        console.log('🔄 Switching to plan step:', stepId);

        // 全ステップを非表示
        document.querySelectorAll('.plan-step').forEach(step => {
            step.classList.remove('active');
            console.log('🔄 Removed active from step:', step.id);
        });

        // 指定ステップを表示
        const targetStep = document.getElementById(stepId);
        if (targetStep) {
            targetStep.classList.add('active');
            targetStep.classList.remove('hidden'); // hiddenクラスも削除
            console.log('✅ Activated step:', stepId);
        } else {
            console.error('❌ Target step not found:', stepId);
        }
    }

    // AIでプラン生成
    async generatePlanWithAI() {
        if (!this.coachingPlanService) {
            this.showToast('コーチングプランサービスが利用できません', 'error');
            return;
        }

        this.showPlanGenerationLoading(true);

        try {
            const plan = await this.coachingPlanService.generateCoachingPlan(this.currentGoalData);
            this.currentPlan = plan;

            this.showToast('AIによるカスタムプランを生成しました！', 'success');
            this.displayGeneratedPlan(plan);
            this.showPlanStep('plan-review-step');
        } catch (error) {
            console.error('Failed to generate coaching plan:', error);

            let errorMessage = 'プラン生成に失敗しました: ';
            if (error.message.includes('APIキー')) {
                errorMessage += 'Gemini APIキーを設定してください。';
            } else if (error.message.includes('API')) {
                errorMessage += 'API接続に問題があります。';
            } else {
                errorMessage += error.message;
            }

            this.showToast(errorMessage, 'error');
        } finally {
            this.showPlanGenerationLoading(false);
        }
    }

    // プラン生成ローディング表示
    showPlanGenerationLoading(show) {
        const status = document.getElementById('generation-status');
        const buttons = document.getElementById('generation-buttons');

        if (status) {
            status.style.display = show ? 'block' : 'none';
        }
        if (buttons) {
            buttons.style.display = show ? 'none' : 'flex';
        }
    }

    // 生成されたプランを表示
    displayGeneratedPlan(plan) {
        console.log('🎯 Displaying generated plan:', plan);

        // プラン統計を表示
        const weeksEl = document.getElementById('plan-total-weeks');
        const daysEl = document.getElementById('plan-total-days');

        if (weeksEl) {
            weeksEl.textContent = plan.weeks.length;
            console.log('📊 Set weeks count:', plan.weeks.length);
        } else {
            console.error('❌ plan-total-weeks element not found');
        }

        if (daysEl) {
            daysEl.textContent = plan.metadata.totalWeeks * 7;
            console.log('📊 Set days count:', plan.metadata.totalWeeks * 7);
        } else {
            console.error('❌ plan-total-days element not found');
        }

        // 週別プランを表示
        console.log('📅 Rendering week cards...');
        this.renderWeekCards(plan.weeks);
    }

    // 週別カードをレンダリング
    renderWeekCards(weeks) {
        const container = document.getElementById('weeks-container');
        if (!container) {
            console.error('❌ weeks-container not found');
            return;
        }

        console.log('📅 Found weeks container, clearing content...');
        container.innerHTML = '';

        console.log('📅 Rendering', weeks.length, 'week cards...');
        weeks.forEach((week, index) => {
            console.log(`📅 Creating week card ${index + 1}:`, week);
            const weekCard = this.createWeekCard(week);
            container.appendChild(weekCard);
        });

        console.log('📅 Week cards rendered successfully');
    }

    // 週カードを作成
    createWeekCard(week) {
        const card = document.createElement('div');
        card.className = 'week-card';

        card.innerHTML = `
            <div class="week-header">
                <span class="week-number">第${week.weekNumber}週</span>
                <span class="week-dates">${week.startDate} - ${week.endDate}</span>
            </div>
            <div class="week-focus">${week.focus}</div>
            <div class="week-objectives">
                <h5>目標</h5>
                <ul class="objectives-list">
                    ${week.objectives.map(obj => `<li>${obj}</li>`).join('')}
                </ul>
            </div>
            <div class="week-milestones">
                <h5>マイルストーン</h5>
                <ul class="milestones-list">
                    ${week.milestones.map(milestone => `<li>${milestone}</li>`).join('')}
                </ul>
            </div>
        `;

        return card;
    }

    // プランを承認して目標を作成
    async approvePlan() {
        if (!this.currentPlan || !this.currentGoalData) return;

        try {
            // 目標を作成（プラン情報付き）
            const goalData = {
                ...this.currentGoalData,
                id: Date.now(),
                progress: 0,
                hasCoachingPlan: true,
                planId: this.currentPlan.id
            };

            // プランのステータスをアクティブに更新
            this.currentPlan.status = 'active';
            this.currentPlan.goalId = goalData.id;

            // 保存
            this.coachingPlanService.savePlan(this.currentPlan);
            this.addGoal(goalData);

            // フォームをリセット
            document.getElementById('goal-form').reset();

            // モーダルを閉じる
            this.closeCoachingPlanModal();

            this.showToast('コーチングプラン付きの目標を作成しました！', 'success');
        } catch (error) {
            console.error('Failed to approve plan:', error);
            this.showToast('プランの承認に失敗しました', 'error');
        }
    }

    // 手動プラン作成（簡易版）
    createManualPlan() {
        this.showToast('手動プラン作成機能は今後実装予定です', 'info');
    }

    // プラン編集
    editPlan() {
        this.showToast('プラン編集機能は今後実装予定です', 'info');
    }

    // プラン再生成
    regeneratePlan() {
        this.generatePlanWithAI();
    }

    // プラン編集保存
    savePlanEdits() {
        this.showToast('プラン編集保存機能は今後実装予定です', 'info');
    }

    // プラン編集キャンセル
    cancelPlanEdit() {
        this.showPlanStep('plan-review-step');
    }

    // コーチングプランページの初期化
    initCoachingPlansPage() {
        // 更新ボタンのイベントリスナー
        document.getElementById('refresh-plans-btn')?.addEventListener('click', () => {
            this.loadCoachingPlans();
        });

        // ステータスフィルターのイベントリスナー
        document.getElementById('plan-status-filter')?.addEventListener('change', (e) => {
            this.filterPlans(e.target.value);
        });

        // ページ表示時にプランを読み込み
        this.loadCoachingPlans();
    }

    // コーチングプランを読み込み
    loadCoachingPlans() {
        const activePlans = this.coachingPlanService.getActivePlans();
        const allPlans = this.coachingPlanService.getAllPlans();

        this.displayActivePlans(activePlans);
        this.displayAllPlans(allPlans);

        // アクティブなプランがある場合は今週の詳細を表示
        if (activePlans.length > 0) {
            this.displayCurrentWeek(activePlans[0]);
        }
    }

    // アクティブなプランを表示
    displayActivePlans(plans) {
        const container = document.getElementById('active-plans-container');
        if (!container) return;

        if (plans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>アクティブなプランがありません</h3>
                    <p>目標ページでプラン付きの目標を作成してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = plans.map(plan => this.createPlanCard(plan)).join('');
    }

    // すべてのプランを表示
    displayAllPlans(plans) {
        const container = document.getElementById('all-plans-container');
        if (!container) return;

        if (plans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>プランがありません</h3>
                    <p>目標ページでプランを作成してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = plans.map(plan => this.createPlanCard(plan)).join('');
    }

    // プランカードを作成
    createPlanCard(plan) {
        const progress = this.calculatePlanProgress(plan);
        const currentWeek = this.coachingPlanService.getCurrentWeekPlan(plan.id);

        return `
            <div class="plan-card" data-plan-id="${plan.id}">
                <div class="plan-card-header">
                    <h3 class="plan-title">${plan.goalTitle}</h3>
                    <span class="plan-status ${plan.status}">${this.getStatusLabel(plan.status)}</span>
                </div>

                <div class="plan-info">
                    <div class="plan-stat">
                        <span class="plan-stat-value">${plan.weeks.length}</span>
                        <span class="plan-stat-label">週</span>
                    </div>
                    <div class="plan-stat">
                        <span class="plan-stat-value">${currentWeek?.weekNumber || 1}</span>
                        <span class="plan-stat-label">現在週</span>
                    </div>
                    <div class="plan-stat">
                        <span class="plan-stat-value">${progress}%</span>
                        <span class="plan-stat-label">進捗</span>
                    </div>
                </div>

                <div class="plan-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>

                <div class="plan-actions">
                    <button class="btn-primary btn-sm" onclick="app.viewPlanDetails('${plan.id}')">詳細表示</button>
                    ${plan.status === 'active' ?
                        `<button class="btn-secondary btn-sm" onclick="app.pausePlan('${plan.id}')">一時停止</button>` :
                        plan.status === 'paused' ?
                        `<button class="btn-accent btn-sm" onclick="app.resumePlan('${plan.id}')">再開</button>` :
                        ''
                    }
                    ${plan.status !== 'completed' ?
                        `<button class="btn-secondary btn-sm" onclick="app.editPlan('${plan.id}')">編集</button>` : ''
                    }
                </div>
            </div>
        `;
    }

    // 今週の詳細を表示
    displayCurrentWeek(plan) {
        const currentWeek = this.coachingPlanService.getCurrentWeekPlan(plan.id);
        const card = document.getElementById('current-week-card');
        const content = document.getElementById('current-week-content');

        if (!currentWeek || !card || !content) {
            if (card) card.style.display = 'none';
            return;
        }

        card.style.display = 'block';

        const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

        content.innerHTML = `
            <div class="week-focus">
                第${currentWeek.weekNumber}週: ${currentWeek.focus}
            </div>

            <div class="week-objectives">
                <h4>今週の目標</h4>
                <ul class="objectives-list">
                    ${(currentWeek.objectives || []).map(obj => `<li>${obj}</li>`).join('')}
                </ul>
            </div>


            <div class="week-objectives">
                <h4>達成指標</h4>
                <ul class="objectives-list">
                    ${(currentWeek.milestones || []).map(milestone => `<li>${milestone}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // プランの進捗を計算
    calculatePlanProgress(plan) {
        const currentWeek = this.coachingPlanService.getCurrentWeekPlan(plan.id);
        if (!currentWeek) return 0;

        const totalWeeks = plan.weeks.length;
        const currentWeekNumber = currentWeek.weekNumber;

        return Math.round((currentWeekNumber / totalWeeks) * 100);
    }

    // ステータスラベルを取得
    getStatusLabel(status) {
        const labels = {
            'active': 'アクティブ',
            'completed': '完了',
            'paused': '一時停止',
            'draft': '下書き'
        };
        return labels[status] || status;
    }

    // プランをフィルター
    filterPlans(status) {
        const allPlans = this.coachingPlanService.getAllPlans();
        const filteredPlans = status === 'all' ? allPlans : allPlans.filter(plan => plan.status === status);
        this.displayAllPlans(filteredPlans);
    }

    // プラン詳細を表示
    viewPlanDetails(planId) {
        const plan = this.coachingPlanService.getPlan(planId);
        if (!plan) {
            this.showToast('プランが見つかりません', 'error');
            return;
        }

        this.currentDetailPlanId = planId;
        this.displayPlanDetailModal(plan);
        this.showPlanDetailModal();
    }

    // プラン詳細モーダルを表示
    showPlanDetailModal() {
        const modal = document.getElementById('plan-detail-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    // プラン詳細モーダルを閉じる
    closePlanDetailModal() {
        const modal = document.getElementById('plan-detail-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.currentDetailPlanId = null;
    }

    // プラン詳細データを表示
    displayPlanDetailModal(plan) {
        // プラン基本情報
        document.getElementById('detail-goal-title').textContent = plan.goalTitle;
        document.getElementById('detail-plan-status').textContent = this.getStatusLabel(plan.status);
        document.getElementById('detail-total-weeks').textContent = `${plan.weeks.length}週`;

        // 進捗計算と表示
        const progress = this.calculatePlanProgress(plan);
        document.getElementById('detail-progress').textContent = `${progress}%`;
        document.getElementById('detail-progress-bar').style.width = `${progress}%`;

        // 現在週の詳細表示
        this.displayCurrentWeekDetail(plan);

        // 週別タイムライン表示
        this.displayWeeksTimeline(plan);

        // アクションボタンの状態更新
        this.updatePlanDetailActions(plan);
    }

    // 現在週の詳細を表示
    displayCurrentWeekDetail(plan) {
        const currentWeek = this.coachingPlanService.getCurrentWeekPlan(plan.id);
        const container = document.getElementById('detail-current-week');

        if (!currentWeek) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>現在アクティブな週がありません</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="week-header">
                <div class="week-title">第${currentWeek.weekNumber}週</div>
                <div class="week-period">${currentWeek.startDate} ～ ${currentWeek.endDate}</div>
                <div class="week-focus">${currentWeek.focus}</div>
            </div>
            <div class="week-content">
                <div class="objectives-section">
                    <h4>📋 今週の目標</h4>
                    <ul class="objectives-list">
                        ${currentWeek.objectives.map(obj => `<li>${obj}</li>`).join('')}
                    </ul>
                </div>
                <div class="milestones-section">
                    <h4>🎯 達成指標</h4>
                    <ul class="milestones-list">
                        ${currentWeek.milestones.map(milestone => `<li>${milestone}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // 週別タイムライン表示
    displayWeeksTimeline(plan) {
        const container = document.getElementById('detail-weeks-timeline');
        const currentWeek = this.coachingPlanService.getCurrentWeekPlan(plan.id);
        const currentWeekNumber = currentWeek?.weekNumber || 1;

        container.innerHTML = plan.weeks.map(week => {
            const isCompleted = week.weekNumber < currentWeekNumber;
            const isCurrent = week.weekNumber === currentWeekNumber;
            const statusClass = isCompleted ? 'completed' : isCurrent ? 'current' : '';

            return `
                <div class="timeline-week ${statusClass}">
                    <div class="week-number">${week.weekNumber}</div>
                    <div class="week-info">
                        <div class="week-info-title">第${week.weekNumber}週: ${week.focus}</div>
                        <div class="week-info-focus">${week.objectives.join(', ')}</div>
                        <div class="week-info-period">${week.startDate} ～ ${week.endDate}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // プラン詳細アクションボタンの状態更新
    updatePlanDetailActions(plan) {
        const editBtn = document.getElementById('detail-edit-plan-btn');
        const pauseBtn = document.getElementById('detail-pause-plan-btn');
        const resumeBtn = document.getElementById('detail-resume-plan-btn');
        const completeBtn = document.getElementById('detail-complete-plan-btn');

        // ボタンの表示/非表示を制御
        if (editBtn) editBtn.style.display = plan.status === 'completed' ? 'none' : 'inline-block';
        if (pauseBtn) pauseBtn.style.display = plan.status === 'active' ? 'inline-block' : 'none';
        if (resumeBtn) resumeBtn.style.display = plan.status === 'paused' ? 'inline-block' : 'none';
        if (completeBtn) completeBtn.style.display = plan.status === 'completed' ? 'none' : 'inline-block';
    }

    // 詳細モーダルからプラン編集
    editPlanFromDetail() {
        if (this.currentDetailPlanId) {
            this.closePlanDetailModal();
            this.editPlan(this.currentDetailPlanId);
        }
    }

    // 詳細モーダルからプラン一時停止
    pausePlanFromDetail() {
        if (this.currentDetailPlanId) {
            this.pausePlan(this.currentDetailPlanId);
            // モーダルを更新
            const plan = this.coachingPlanService.getPlan(this.currentDetailPlanId);
            if (plan) {
                this.displayPlanDetailModal(plan);
            }
        }
    }

    // 詳細モーダルからプラン再開
    resumePlanFromDetail() {
        if (this.currentDetailPlanId) {
            this.resumePlan(this.currentDetailPlanId);
            // モーダルを更新
            const plan = this.coachingPlanService.getPlan(this.currentDetailPlanId);
            if (plan) {
                this.displayPlanDetailModal(plan);
            }
        }
    }

    // 詳細モーダルからプラン完了
    completePlanFromDetail() {
        if (this.currentDetailPlanId) {
            if (this.coachingPlanService.updatePlanStatus(this.currentDetailPlanId, 'completed')) {
                this.showToast('プランを完了しました🎉', 'success');
                this.loadCoachingPlans();
                // モーダルを更新
                const plan = this.coachingPlanService.getPlan(this.currentDetailPlanId);
                if (plan) {
                    this.displayPlanDetailModal(plan);
                }
            }
        }
    }

    // プランを一時停止
    pausePlan(planId) {
        if (this.coachingPlanService.updatePlanStatus(planId, 'paused')) {
            this.showToast('プランを一時停止しました', 'success');
            this.loadCoachingPlans();
        }
    }

    // プランを再開
    resumePlan(planId) {
        if (this.coachingPlanService.updatePlanStatus(planId, 'active')) {
            this.showToast('プランを再開しました', 'success');
            this.loadCoachingPlans();
        }
    }

    // プランを編集
    editPlan(planId) {
        // プラン編集機能（今後実装）
        this.showToast('プラン編集機能は今後実装予定です', 'info');
    }

}

// アプリの起動
const app = new App();

// Export for global access
window.app = app;
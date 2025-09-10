// app.js - 完全修復版
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.isGuest = false;
        this.currentUser = null;
        
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
        
        // プレイヤー統計マネージャー\n        if (typeof PlayerStatsManager !== 'undefined') {\n            this.playerStatsManager = new PlayerStatsManager();\n        }\n        \n        // メディア解析用のファイル配列
        this.uploadedFiles = [];
        this.chatMessages = [];
    }
    
    init() {
        console.log('App initializing...');
        
        // テーマの初期化
        this.initTheme();
        
        // ログインチェック
        this.checkAuthentication();
        
        // API設定チェックと初期化
        this.checkAndInitializeAPI();
        
        // APIキー初期設定が完了している場合のみ他の機能を初期化
        this.continueInitialization();
        
        // APIモーダル用のイベントリスナーを確実に設定
        setTimeout(() => {
            if (!window.apiModalListenersSet) {
                this.setupInitialAPIModalListeners();
            }
        }, 500);
        
        // ゲーム選択とダッシュボード機能の初期化
        this.initGameSelection();
        this.initDashboardGoals();
        
        // その他のナビゲーション機能
        this.initNavigationHelpers();
        
        // AIコーチング機能の初期化
        this.initAICoaching();
        
        // 初期ページの表示
        this.showPage(this.currentPage);
        
        // チャートの初期化
        this.initCharts();
        
        // データのロード
        this.loadUserData();
        
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
    
    // API設定チェックと初期化
    checkAndInitializeAPI() {
        // 統一APIマネージャーの確認
        if (!window.unifiedApiManager) {
            console.error('統合APIマネージャーが利用できません');
            return;
        }
        
        // APIキー設定確認
        const needsSetup = window.unifiedApiManager.needsInitialSetup();
        
        if (needsSetup) {
            // モーダル表示前にログインモーダルを非表示
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.add('hidden');
            }
            
            // APIキー初期設定モーダルを表示
            setTimeout(() => {
                this.showInitialAPISetupModal();
            }, 100);
        } else {
            // 既存のAPIキー入力フィールドと統一APIマネージャーを同期
            this.syncAPIKeyInputs();
        }
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
    }
    
    // 初期APIセットアップモーダルを表示
    showInitialAPISetupModal() {
        const modal = document.getElementById('api-initial-setup-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // 確実に表示
            
            // イベントリスナーを一度だけ設定
            if (!window.apiModalListenersSet) {
                setTimeout(() => this.setupInitialAPIModalListeners(), 300);
            }
            
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
            return;
        }
        
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
            
            // APIキー設定完了後、残りの初期化を実行してからログイン画面を表示
            setTimeout(() => {
                this.continueInitialization();
                this.showLoginModal();
            }, 500);
            
        } catch (error) {
            console.error('APIキー保存に失敗:', error);
            this.showToast(`保存に失敗しました: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }
    
    // 初期APIセットアップをスキップ
    skipInitialAPISetup() {
        this.showToast('API設定をスキップしました。一部機能が制限されます。', 'info');
        this.closeInitialAPISetupModal();
        
        // スキップ後も残りの初期化を実行してからログイン画面を表示
        setTimeout(() => {
            this.continueInitialization();
            this.showLoginModal();
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
        
        this.analyzeMatch(matchData);
        document.getElementById('match-form').reset();
        this.showToast('分析を実行しています...', 'info');
    }
    
    // 目標追加
    handleGoalSubmit() {
        const goalData = {
            title: document.getElementById('goal-title').value,
            deadline: document.getElementById('goal-deadline').value,
            description: document.getElementById('goal-description').value,
            id: Date.now(),
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
    
    // ローディング表示
    showLoading() {
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
        // 新しい統計システムを使用\n        if (this.playerStatsManager) {\n            this.playerStatsManager.loadRecentMatches();\n        } else {\n            this.loadRecentMatches();\n        }
        this.loadAiRecommendations();
        // 新しい統計システムを使用\n        if (this.playerStatsManager) {\n            this.playerStatsManager.loadStatsToUI();\n        }
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
        const container = document.getElementById('ai-recommendations-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="recommendation-item">
                <h4>🎯 CS精度の向上</h4>
                <p>10分時点でのCS目標を80に設定し、カスタムゲームで練習しましょう。</p>
            </div>
            <div class="recommendation-item">
                <h4>📍 マップコントロール</h4>
                <p>ワードの配置位置を最適化し、視界確保を改善しましょう。</p>
            </div>
            <div class="recommendation-item">
                <h4>⚔️ チームファイト</h4>
                <p>ポジショニングを意識し、エンゲージのタイミングを改善しましょう。</p>
            </div>
        `;
    }
    
    refreshAiRecommendations() {
        this.showLoading();
        setTimeout(() => {
            this.loadAiRecommendations();
            this.hideLoading();
            this.showToast('推奨事項を更新しました', 'success');
        }, 1000);
    }
    
    loadGoalsList() {
        const container = document.getElementById('goals-list');
        if (!container) return;
        
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        
        if (goals.length === 0) {
            container.innerHTML = '<p class="no-data">目標がまだ設定されていません</p>';
            return;
        }
        
        container.innerHTML = goals.map(goal => `
            <div class="goal-item">
                <div class="goal-header">
                    <h4>${goal.title}</h4>
                    <span class="goal-deadline">${goal.deadline}</span>
                </div>
                <p class="goal-description">${goal.description}</p>
                <div class="goal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${goal.progress}%"></div>
                    </div>
                    <span class="progress-text">${goal.progress}%</span>
                </div>
            </div>
        `).join('');
    }
    
    addGoal(goalData) {
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        goals.push(goalData);
        localStorage.setItem('goals', JSON.stringify(goals));
        this.loadGoalsList();
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
        if (!this.geminiService) {
            this.showToast('Geminiサービスが利用できません', 'error');
            return;
        }
        
        const testBtn = document.getElementById('test-gemini-connection');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'テスト中...';
        }
        
        try {
            await this.geminiService.testConnection();
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
        
        if (!chatInput || !this.geminiService) return;
        
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
        if (!this.geminiService || !this.geminiService.isConfigured()) {
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
        
        // ランクを設定
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
        
        // 統計データをサンプル値で更新
        const stats = {
            'win-rate': this.generateRandomStat(45, 75, '%'),
            'avg-kda': this.generateRandomStat(1.2, 3.5, '', 1),
            'cs-per-min': this.generateRandomStat(5.5, 8.5, '', 1),
            'games-played': Math.floor(Math.random() * 300) + 50
        };
        
        Object.entries(stats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
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

    // === ダッシュボード目標表示機能 ===
    initDashboardGoals() {
        console.log('Initializing dashboard goals...');
        
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
    
    loadDashboardGoals() {
        try {
            const goalsData = localStorage.getItem('goals');
            const goals = goalsData ? JSON.parse(goalsData) : [];
            
            this.renderDashboardGoals(goals);
        } catch (error) {
            console.warn('Failed to load goals:', error);
            this.renderDashboardGoals([]);
        }
    }
    
    renderDashboardGoals(goals) {
        const goalsList = document.getElementById('dashboard-goals-list');
        if (!goalsList) return;
        
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
        
        goalsList.innerHTML = displayGoals.map(goal => this.renderGoalItem(goal)).join('');
    }
    
    renderGoalItem(goal) {
        const progress = goal.progress || 0;
        const deadline = new Date(goal.deadline).toLocaleDateString('ja-JP');
        const isUrgent = this.isDeadlineUrgent(goal.deadline);
        const urgentClass = isUrgent ? 'urgent' : '';
        
        return `
            <div class="dashboard-goal-item ${urgentClass}">
                <div class="goal-item-header">
                    <h5 class="goal-item-title">${goal.title}</h5>
                    <span class="goal-item-deadline">〜 ${deadline}</span>
                </div>
                <div class="goal-progress-container">
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${progress}%"></div>
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
    
    setupGoalsStorageListener() {
        // LocalStorageの変更を監視
        window.addEventListener('storage', (e) => {
            if (e.key === 'goals') {
                this.loadDashboardGoals();
            }
        });
        
        // 同一タブ内での変更も監視
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            originalSetItem.call(localStorage, key, value);
            if (key === 'goals') {
                setTimeout(() => this.loadDashboardGoals(), 100);
            }
        };
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
        const gotoGoalsForAIBtn = document.getElementById('goto-goals-for-ai');
        if (gotoGoalsForAIBtn) {
            gotoGoalsForAIBtn.addEventListener('click', () => {
                this.showPage('goals');
                this.updateNavigation('goals');
            });
        }
    }

    // === AIコーチング機能 ===
    initAICoaching() {
        console.log('Initializing AI coaching...');
        
        // リフレッシュボタンのイベントリスナー
        const refreshCoachingBtn = document.getElementById('refresh-coaching');
        if (refreshCoachingBtn) {
            refreshCoachingBtn.addEventListener('click', () => {
                this.generateAIRecommendations();
            });
        }
        
        // 初期のAI推奨事項をロード
        this.loadAIRecommendations();
        
        // 目標の変更を監視してAI推奨事項を更新
        this.setupAICoachingGoalsListener();
    }
    
    loadAIRecommendations() {
        try {
            const goalsData = localStorage.getItem('goals');
            const goals = goalsData ? JSON.parse(goalsData) : [];
            
            if (goals.length === 0) {
                this.showNoRecommendationsMessage();
            } else {
                this.generateAIRecommendations();
            }
        } catch (error) {
            console.warn('Failed to load AI recommendations:', error);
            this.showNoRecommendationsMessage();
        }
    }
    
    showNoRecommendationsMessage() {
        const recommendationsContent = document.getElementById('ai-recommendations-content');
        if (recommendationsContent) {
            recommendationsContent.innerHTML = `
                <div class="no-recommendations-message">
                    <p class="message-text">目標を設定してパーソナライズされたアドバイスを受け取りましょう</p>
                    <button class="btn-secondary" id="goto-goals-for-ai">
                        目標を設定する
                    </button>
                </div>
            `;
            
            // ボタンのイベントリスナー再設定
            const gotoGoalsBtn = document.getElementById('goto-goals-for-ai');
            if (gotoGoalsBtn) {
                gotoGoalsBtn.addEventListener('click', () => {
                    this.showPage('goals');
                    this.updateNavigation('goals');
                });
            }
        }
    }
    
    async generateAIRecommendations() {
        const refreshBtn = document.getElementById('refresh-coaching');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '⏳';
        }
        
        try {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const selectedGameData = JSON.parse(localStorage.getItem('selectedGameData') || '{}');
            
            if (goals.length === 0) {
                this.showNoRecommendationsMessage();
                return;
            }
            
            // Gemini APIが利用可能かチェック
            if (!this.geminiService || !this.geminiService.isConfigured()) {
                this.showOfflineRecommendations(goals, selectedGameData);
                return;
            }
            
            // 最も優先度の高い目標を選択（期限が近い、進捗が低い）
            const priorityGoal = this.selectPriorityGoal(goals);
            
            // Gemini AIからアドバイスを取得
            const prompt = this.generateCoachingPrompt(priorityGoal, selectedGameData);
            const response = await this.geminiService.sendChatMessage(prompt, false);
            
            this.renderAIRecommendations(response.response, priorityGoal);
            
        } catch (error) {
            console.warn('AI recommendations generation failed:', error);
            
            // フォールバック: オフライン推奨事項
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const selectedGameData = JSON.parse(localStorage.getItem('selectedGameData') || '{}');
            this.showOfflineRecommendations(goals, selectedGameData);
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '🔄';
            }
        }
    }
    
    selectPriorityGoal(goals) {
        // 期限が近い順、進捗が低い順でソート
        return goals.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            const progressA = a.progress || 0;
            const progressB = b.progress || 0;
            
            // 期限が近い順
            if (Math.abs(dateA - dateB) > 24 * 60 * 60 * 1000) {
                return dateA - dateB;
            }
            
            // 進捗が低い順
            return progressA - progressB;
        })[0];
    }
    
    generateCoachingPrompt(goal, gameData) {
        const gameName = gameData.name || 'eSports';
        const progress = goal.progress || 0;
        const deadline = new Date(goal.deadline).toLocaleDateString('ja-JP');
        
        return `あなたはeSportsコーチングの専門家です。
以下の目標に対して、具体的で実践的なアドバイスを提供してください。

ゲーム: ${gameName}
目標: ${goal.title}
期限: ${deadline}
現在の進捗: ${progress}%

以下の形式で日本語で簡潔に回答してください：
1. 具体的な行動指針（50文字以内）
2. なぜそれが効果的か（100文字以内）
3. 今日実践できること（50文字以内）`;
    }
    
    renderAIRecommendations(aiResponse, goal) {
        const recommendationsContent = document.getElementById('ai-recommendations-content');
        if (!recommendationsContent) return;
        
        // AIレスポンスを解析
        const lines = aiResponse.split('\n').filter(line => line.trim());
        let actionPlan = '';
        let effectiveness = '';
        let todayAction = '';
        
        lines.forEach(line => {
            if (line.includes('1.') || line.includes('行動指針')) {
                actionPlan = line.replace(/^[1.]?\s*/, '').replace(/行動指針[：:]?\s*/, '');
            } else if (line.includes('2.') || line.includes('効果的')) {
                effectiveness = line.replace(/^[2.]?\s*/, '').replace(/効果的.*?[：:]?\s*/, '');
            } else if (line.includes('3.') || line.includes('今日')) {
                todayAction = line.replace(/^[3.]?\s*/, '').replace(/今日.*?[：:]?\s*/, '');
            }
        });
        
        // デフォルト値を設定
        if (!actionPlan) actionPlan = aiResponse.substring(0, 100) + '...';
        if (!effectiveness) effectiveness = 'コーチング理論に基づく効果的なアプローチです';
        if (!todayAction) todayAction = '練習を始めてみましょう';
        
        recommendationsContent.innerHTML = `
            <div class="coaching-advice-card">
                <div class="advice-header">
                    <div class="goal-focus">
                        <span class="goal-icon">🎯</span>
                        <span class="goal-title">目標: ${goal.title}</span>
                    </div>
                    <div class="goal-deadline">期限: ${new Date(goal.deadline).toLocaleDateString('ja-JP')}</div>
                </div>
                
                <div class="advice-content">
                    <div class="advice-item">
                        <h4>💡 行動指針</h4>
                        <p>${actionPlan}</p>
                    </div>
                    
                    <div class="advice-item">
                        <h4>🔍 効果の理由</h4>
                        <p>${effectiveness}</p>
                    </div>
                    
                    <div class="advice-item today-action">
                        <h4>⚡ 今日やること</h4>
                        <p>${todayAction}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    showOfflineRecommendations(goals, gameData) {
        if (goals.length === 0) {
            this.showNoRecommendationsMessage();
            return;
        }
        
        const priorityGoal = this.selectPriorityGoal(goals);
        const gameName = gameData.name || 'eSports';
        
        // ゲーム固有のオフライン推奨事項
        const offlineAdvice = this.getOfflineAdvice(priorityGoal, gameName);
        
        const recommendationsContent = document.getElementById('ai-recommendations-content');
        if (recommendationsContent) {
            recommendationsContent.innerHTML = `
                <div class="coaching-advice-card offline">
                    <div class="advice-header">
                        <div class="goal-focus">
                            <span class="goal-icon">🎯</span>
                            <span class="goal-title">目標: ${priorityGoal.title}</span>
                        </div>
                        <div class="offline-indicator">オフラインモード</div>
                    </div>
                    
                    <div class="advice-content">
                        <div class="advice-item">
                            <h4>💡 行動指針</h4>
                            <p>${offlineAdvice.actionPlan}</p>
                        </div>
                        
                        <div class="advice-item">
                            <h4>🔍 効果の理由</h4>
                            <p>${offlineAdvice.effectiveness}</p>
                        </div>
                        
                        <div class="advice-item today-action">
                            <h4>⚡ 今日やること</h4>
                            <p>${offlineAdvice.todayAction}</p>
                        </div>
                    </div>
                    
                    <div class="api-setup-suggestion">
                        <p>さらに詳細なアドバイスを受けるにはGemini APIを設定してください</p>
                        <button class="btn-secondary" id="goto-api-setup">API設定</button>
                    </div>
                </div>
            `;
        }
    }
    
    getOfflineAdvice(goal, gameName) {
        // ゲーム固有の基本的なアドバイスを提供
        const gameSpecificAdvice = {
            'League of Legends': {
                actionPlan: 'CSを意識してファームを安定させ、ワードで視界をコントロールしましょう',
                effectiveness: 'ゲームの基礎であるファームと視界は勝率向上に直結します',
                todayAction: 'カスタムゲームで10分間のCSハードキャップ練習'
            },
            'Valorant': {
                actionPlan: 'クロスヘア配置とプリエイムを意識して正確性を向上させましょう',
                effectiveness: '正確なエイムは直接的にキル数と勝率の向上につながります',
                todayAction: 'エイム練習場で15分間フリックとトラッキング練習'
            },
            'Overwatch 2': {
                actionPlan: 'ロール理解を深め、チーム連携とポジショニングを改善しましょう',
                effectiveness: 'チーム戦が重要なゲームでは個人技より連携が勝敗を決めます',
                todayAction: '自分のロールの責任を整理し、コミュニケーションを意識した試合を3戦'
            }
        };
        
        return gameSpecificAdvice[gameName] || {
            actionPlan: '基礎練習を継続し、試合の振り返りを定期的に行いましょう',
            effectiveness: '継続的な改善サイクルがスキル向上の鍵です',
            todayAction: '今日の試合を1回録画して後で見返す準備'
        };
    }
    
    setupAICoachingGoalsListener() {
        // LocalStorageの目標変更を監視してAI推奨事項を更新
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            originalSetItem.call(localStorage, key, value);
            if (key === 'goals') {
                setTimeout(() => {
                    if (window.app && window.app.loadAIRecommendations) {
                        window.app.loadAIRecommendations();
                    }
                }, 200);
            }
        };
    }
}

// アプリの起動
const app = new App();

// Export for global access
window.app = app;
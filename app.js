// app.js - 螳悟・菫ｮ蠕ｩ迚・
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.isGuest = false;
        this.currentUser = null;
        
        // 繧ｨ繝ｩ繝ｼ霑ｽ霍｡
        this.apiErrorCount = 0;
        this.lastSuccessfulAPICall = Date.now();
        this.consecutiveErrors = 0;
        
        // 繧ｵ繝ｼ繝薙せ縺ｮ蛻晄悄蛹・
        this.initializeServices();
        
        // DOMContentLoaded縺ｧ蛻晄悄蛹・
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    initializeServices() {
        // API繧ｵ繝ｼ繝薙せ縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・縺ｿ蛻晄悄蛹・
        if (typeof AICoachingService !== 'undefined') {
            this.aiService = new AICoachingService();
        }
        
        // 隱崎ｨｼ繧ｵ繝ｼ繝薙せ
        if (typeof AuthService !== 'undefined') {
            this.authService = new AuthService();
        }
        
        // 繧ｲ繝ｼ繝繝槭ロ繝ｼ繧ｸ繝｣繝ｼ
        if (typeof GameManager !== 'undefined') {
            this.gameManager = new GameManager();
        }
        
        // Gemini繧ｵ繝ｼ繝薙せ
        if (typeof GeminiService !== 'undefined') {
            this.geminiService = new GeminiService();
        }
        
        // 繝励Ξ繧､繝､繝ｼ邨ｱ險医・繝阪・繧ｸ繝｣繝ｼ
        if (typeof PlayerStatsManager !== 'undefined') {
            this.playerStatsManager = new PlayerStatsManager();
        }
        
        // 繝｡繝・ぅ繧｢隗｣譫千畑縺ｮ繝輔ぃ繧､繝ｫ驟榊・
        this.uploadedFiles = [];
        this.chatMessages = [];
    }
    
    async init() {
        console.log('App initializing...');
        
        // 繝・・繝槭・蛻晄悄蛹・
        this.initTheme();
        
        // 縺吶∋縺ｦ縺ｮ繝｢繝ｼ繝繝ｫ繧帝撼陦ｨ遉ｺ縺ｫ縺吶ｋ
        this.hideAllModals();
        
        // 邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺ｮ蛻晄悄蛹門ｮ御ｺ・ｒ蠕・▽
        await this.waitForUnifiedAPIManager();
        
        // API險ｭ螳壹メ繧ｧ繝・け縺ｨ蛻晄悄蛹厄ｼ磯撼蜷梧悄・・ 縺薙・邨先棡縺ｫ繧医▲縺ｦ逕ｻ髱｢驕ｷ遘ｻ縺梧ｱｺ縺ｾ繧・
        const apiCheckResult = await this.performBackgroundAPICheck();
        
        if (apiCheckResult.success) {
            console.log('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝陰PI謗･邯壽・蜉溘√Γ繧､繝ｳ逕ｻ髱｢縺ｸ驕ｷ遘ｻ');
            // API謗･邯壽・蜉滓凾縺ｯ逶ｴ謗･繝｡繧､繝ｳ蛻晄悄蛹・
            await this.initializeMainApp();
            
            // 驕手ｲ闕ｷ迥ｶ諷九・蝣ｴ蜷医・霑ｽ蜉繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
            if (apiCheckResult.overloaded) {
                // 5蛻・ｾ後↓蜀榊ｺｦ繝√ぉ繝・け縺吶ｋ繧ｿ繧､繝槭・繧定ｨｭ螳・
                setTimeout(() => {
                    this.showToast('庁 Gemini API縺ｮ迥ｶ諷九ｒ蜀阪メ繧ｧ繝・け荳ｭ...', 'info');
                    this.recheckGeminiAPI();
                }, 5 * 60 * 1000); // 5蛻・ｾ・
            }
        } else {
            console.log('API譛ｪ險ｭ螳壹∪縺溘・謗･邯壼､ｱ謨励∝・譛溯ｨｭ螳夂判髱｢繧定｡ｨ遉ｺ');
            
            // 503繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・迚ｹ蛻･縺ｪ繝｡繝・そ繝ｼ繧ｸ
            if (apiCheckResult.error && (
                apiCheckResult.error.message.includes('503') || 
                apiCheckResult.error.message.includes('驕手ｲ闕ｷ') ||
                apiCheckResult.error.message.includes('overloaded')
            )) {
                this.showToast('笞・・Gemini API縺御ｸ譎ら噪縺ｫ驕手ｲ闕ｷ荳ｭ縺ｧ縺吶・PI繧ｭ繝ｼ縺ｯ菫晏ｭ倥＆繧後※縺・ｋ縺ｮ縺ｧ縲∝ｾ後⊇縺ｩ閾ｪ蜍慕噪縺ｫ蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｫ縺ｪ繧翫∪縺吶・, 'warning');
                // 驕手ｲ闕ｷ縺ｮ蝣ｴ蜷医〒繧ゅい繝励Μ縺ｯ襍ｷ蜍輔☆繧・
                await this.initializeMainApp();
            } else {
                // API譛ｪ險ｭ螳壹∪縺溘・謗･邯壼､ｱ謨玲凾縺ｯ蛻晄悄險ｭ螳夂判髱｢繧定｡ｨ遉ｺ
                this.showInitialAPISetupModal();
                this.setupInitialAPIModalListeners();
            }
        }
        
        console.log('App initialized successfully');
    }
    
    // 繝・・繝樒ｮ｡逅・
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
            if (themeBtn) themeBtn.textContent = '笘・・;
            
            // 繝ｩ繧､繝医Δ繝ｼ繝峨・繧ｹ繧ｿ繧､繝ｫ
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
            if (themeBtn) themeBtn.textContent = '嫌';
            
            // 繝繝ｼ繧ｯ繝｢繝ｼ繝峨・繧ｹ繧ｿ繧､繝ｫ
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
    
    // 隱崎ｨｼ繝√ぉ繝・け
    checkAuthentication() {
        const storedUser = sessionStorage.getItem('currentUser');
        const isGuest = sessionStorage.getItem('isGuest');
        
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            this.updateUserDisplay(this.currentUser.username);
        } else if (isGuest === 'true') {
            this.isGuest = true;
            this.updateUserDisplay('繧ｲ繧ｹ繝医Θ繝ｼ繧ｶ繝ｼ', true);
        } else {
            // 繝ｭ繧ｰ繧､繝ｳ繝｢繝ｼ繝繝ｫ繧定｡ｨ遉ｺ
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
            userTypeIndicator.textContent = isGuest ? '繧ｲ繧ｹ繝・ : '繝ｦ繝ｼ繧ｶ繝ｼ';
            userTypeIndicator.className = isGuest ? 'user-type guest' : 'user-type registered';
        }
    }
    
    // 縺吶∋縺ｦ縺ｮ繝｢繝ｼ繝繝ｫ繧帝撼陦ｨ遉ｺ
    hideAllModals() {
        const modals = [
            'login-modal',
            'api-initial-setup-modal',
            'api-setup-modal'
        ];
        
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
        });
    }

    // 邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺ｮ蛻晄悄蛹門ｮ御ｺ・ｒ蠕・▽
    async waitForUnifiedAPIManager() {
        let attempts = 0;
        const maxAttempts = 50; // 5遘貞ｾ・ｩ・
        
        while (!window.unifiedApiManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.unifiedApiManager) {
            console.error('邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺ｮ蛻晄悄蛹悶↓螟ｱ謨・);
            throw new Error('邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ');
        }
        
        console.log('邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ蛻晄悄蛹門ｮ御ｺ・);
    }

    // 繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝峨〒API險ｭ螳壹ｒ繝√ぉ繝・け
    async performBackgroundAPICheck() {
        try {
            if (!window.unifiedApiManager) {
                return { success: false, reason: 'manager_unavailable' };
            }
            
            // 菫晏ｭ俶ｸ医∩API繧ｭ繝ｼ縺後≠繧九°繝√ぉ繝・け
            const hasStoredKey = window.unifiedApiManager.isConfigured();
            
            if (!hasStoredKey) {
                console.log('API繧ｭ繝ｼ縺御ｿ晏ｭ倥＆繧後※縺・∪縺帙ｓ');
                return { success: false, reason: 'no_api_key' };
            }
            
            console.log('菫晏ｭ俶ｸ医∩API繧ｭ繝ｼ繧堤匱隕九√ヰ繝・け繧ｰ繝ｩ繧ｦ繝ｳ繝峨〒謗･邯壹ユ繧ｹ繝井ｸｭ...');
            
            // 繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝峨〒謗･邯壹ユ繧ｹ繝医ｒ螳溯｡・
            const result = await window.unifiedApiManager.validateAPIKey();
            
            console.log('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝画磁邯壹ユ繧ｹ繝域・蜉・', result);
            this.syncAPIKeyInputs();
            
            return { success: true, result: result };
            
        } catch (error) {
            console.warn('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝画磁邯壹ユ繧ｹ繝医↓螟ｱ謨・', error);
            
            // 503繧ｨ繝ｩ繝ｼ・医し繝ｼ繝舌・驕手ｲ闕ｷ・峨・蝣ｴ蜷医・縲∝・譛溯ｨｭ螳壹Δ繝ｼ繝繝ｫ繧定｡ｨ遉ｺ縺帙★縺ｫ
            // API繧ｭ繝ｼ縺瑚ｨｭ螳壽ｸ医∩縺ｨ縺励※繧｢繝励Μ繧定ｵｷ蜍輔☆繧・
            if (error.message && (error.message.includes('overloaded') || error.message.includes('503'))) {
                console.log('Gemini API繧ｵ繝ｼ繝舌・縺碁℃雋闕ｷ荳ｭ縺ｧ縺吶′縲、PI繧ｭ繝ｼ縺ｯ險ｭ螳壽ｸ医∩縺ｮ縺溘ａ繧｢繝励Μ繧定ｵｷ蜍輔＠縺ｾ縺・);
                this.showToast('笞・・Gemini API縺御ｸ譎ら噪縺ｫ驕手ｲ闕ｷ荳ｭ縺ｧ縺吶・I讖溯・縺ｯ蠕後⊇縺ｩ蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｫ縺ｪ繧翫∪縺吶・, 'warning');
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

    // 繝｡繧､繝ｳ繧｢繝励Μ繧貞・譛溷喧・・PI謗･邯壽・蜉滓凾・・
    async initializeMainApp() {
        // 邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺九ｉGeminiService縺ｸ縺ｮAPI繧ｭ繝ｼ蜷梧悄繧堤｢ｺ菫・
        if (window.unifiedApiManager && window.unifiedApiManager.isConfigured()) {
            window.unifiedApiManager.updateLegacyAPIKeys();
        }
        
        // 繝ｭ繧ｰ繧､繝ｳ繝√ぉ繝・け
        this.checkAuthentication();
        
        // 谿九ｊ縺ｮ蛻晄悄蛹悶ｒ螳溯｡・
        this.continueInitialization();
        
        // 繧ｲ繝ｼ繝驕ｸ謚槭→繝繝・す繝･繝懊・繝画ｩ溯・縺ｮ蛻晄悄蛹・
        this.initGameSelection();
        this.initDashboardGoals();
        
        // 縺昴・莉悶・繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ讖溯・
        this.initNavigationHelpers();
        
        // AI繧ｳ繝ｼ繝√Φ繧ｰ讖溯・縺ｮ蛻晄悄蛹厄ｼ亥ｰ代＠驕・ｻｶ縺輔○縺ｦAPI險ｭ螳壹′遒ｺ螳溘↓螳御ｺ・☆繧九・繧貞ｾ・▽・・
        setTimeout(() => {
            this.initAICoaching();
        }, 500);
        
        // 蛻晄悄繝壹・繧ｸ縺ｮ陦ｨ遉ｺ
        this.showPage(this.currentPage);
        
        // 繝√Ε繝ｼ繝医・蛻晄悄蛹・
        this.initCharts();
        
        // 繝・・繧ｿ縺ｮ繝ｭ繝ｼ繝・
        this.loadUserData();
        
        // 繝ｭ繧ｰ繧､繝ｳ逕ｻ髱｢繧定｡ｨ遉ｺ
        setTimeout(() => {
            this.showLoginModal();
        }, 100);
    }

    // API險ｭ螳壹メ繧ｧ繝・け縺ｨ蛻晄悄蛹厄ｼ亥ｾ捺擂縺ｮ繝｡繧ｽ繝・ラ縲∽ｺ呈鋤諤ｧ縺ｮ縺溘ａ谿九☆・・
    async checkAndInitializeAPI() {
        // 譁ｰ縺励＞繝輔Ο繝ｼ縺ｫ鄂ｮ縺肴鋤縺医ｉ繧後◆縺溘ａ縲∽ｽ輔ｂ縺励↑縺・
        console.log('checkAndInitializeAPI縺ｯ譁ｰ縺励＞繝輔Ο繝ｼ縺ｫ鄂ｮ縺肴鋤縺医ｉ繧後∪縺励◆');
    }
    
    // 蛻晄悄蛹悶・邯夊｡鯉ｼ・PI繧ｭ繝ｼ險ｭ螳壼ｾ鯉ｼ・
    continueInitialization() {
        // API繧ｭ繝ｼ蛻晄悄險ｭ螳壹′蠢・ｦ√↑蝣ｴ蜷医・繧ｹ繧ｭ繝・・
        if (window.unifiedApiManager?.needsInitialSetup()) {
            return;
        }
        
        // 繧､繝吶Φ繝医Μ繧ｹ繝翫・縺ｮ險ｭ螳・
        this.setupEventListeners();
        
        // 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ蛻晄悄蛹・
        this.initNavigation();
        
        // 繝√Ε繝・ヨ讖溯・縺ｮ蛻晄悄蛹・
        this.initChat();
        
        // 繝｡繝・ぅ繧｢隗｣譫先ｩ溯・縺ｮ蛻晄悄蛹・
        this.initMediaAnalysis();
    }
    
    // 蛻晄悄API繧ｻ繝・ヨ繧｢繝・・繝｢繝ｼ繝繝ｫ繧定｡ｨ遉ｺ
    showInitialAPISetupModal() {
        const modal = document.getElementById('api-initial-setup-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // 遒ｺ螳溘↓陦ｨ遉ｺ
            
            console.log('蛻晄悄API險ｭ螳壹Δ繝ｼ繝繝ｫ繧定｡ｨ遉ｺ');
            
            // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・蛻晄悄迥ｶ諷九ｒ繝√ぉ繝・け
            setTimeout(() => {
                const apiKeyInput = document.getElementById('initial-api-key');
                if (apiKeyInput) {
                    this.validateInitialAPIKeyInput(apiKeyInput.value.trim());
                }
            }, 400);
        }
    }
    
    // 蛻晄悄API繧ｻ繝・ヨ繧｢繝・・繝｢繝ｼ繝繝ｫ縺ｮ繧､繝吶Φ繝医Μ繧ｹ繝翫・險ｭ螳・
    setupInitialAPIModalListeners() {
        // 驥崎､・匳骭ｲ繧帝亟縺・
        if (window.apiModalListenersSet) {
            console.log('API繝｢繝ｼ繝繝ｫ繝ｪ繧ｹ繝翫・縺ｯ譌｢縺ｫ險ｭ螳壽ｸ医∩');
            return;
        }
        
        console.log('API繝｢繝ｼ繝繝ｫ繝ｪ繧ｹ繝翫・繧定ｨｭ螳壻ｸｭ...');
        
        // 繧､繝吶Φ繝亥ｧ碑ｭｲ繧剃ｽｿ逕ｨ縺励※document繝ｬ繝吶Ν縺ｧ繧､繝吶Φ繝医ｒ繧ｭ繝｣繝・メ
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
        
        // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・繧､繝吶Φ繝医ｂ險ｭ螳・
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
        
        // 驥崎､・ｨｭ螳夐亟豁｢繝輔Λ繧ｰ繧定ｨｭ螳・
        window.apiModalListenersSet = true;
        console.log('API繝｢繝ｼ繝繝ｫ繝ｪ繧ｹ繝翫・險ｭ螳壼ｮ御ｺ・);
    }
    
    // API繧ｭ繝ｼ陦ｨ遉ｺ/髱櫁｡ｨ遉ｺ蛻・ｊ譖ｿ縺・
    toggleInitialAPIKeyVisibility() {
        const apiKeyInput = document.getElementById('initial-api-key');
        const toggleBtn = document.getElementById('toggle-initial-key');
        
        if (apiKeyInput && toggleBtn) {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            toggleBtn.textContent = isPassword ? '刪' : '早・・;
        }
    }
    
    // 蛻晄悄API繧ｭ繝ｼ蜈･蜉帙・讀懆ｨｼ
    validateInitialAPIKeyInput(apiKey) {
        const testBtn = document.getElementById('test-initial-api');
        const saveBtn = document.getElementById('save-initial-api');
        
        if (!window.unifiedApiManager) return;
        
        const validation = window.unifiedApiManager.validateAPIKeyStrength(apiKey);
        const isValid = validation.valid;
        
        // 繝懊ち繝ｳ縺ｮ譛牙柑蛹・辟｡蜉ｹ蛹・
        if (testBtn) testBtn.disabled = !isValid;
        if (saveBtn) saveBtn.disabled = !isValid;
        
        // 隕冶ｦ夂噪繝輔ぅ繝ｼ繝峨ヰ繝・け
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
    
    
    
    // 蛻晄悄API謗･邯壹ユ繧ｹ繝・
    async testInitialAPIConnection() {
        const apiKeyInput = document.getElementById('initial-api-key');
        const testBtn = document.getElementById('test-initial-api');
        
        if (!apiKeyInput) {
            console.error('API繧ｭ繝ｼ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ');
            return;
        }
        
        if (!window.unifiedApiManager) {
            console.error('邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ');
            this.showToast('API繝槭ロ繝ｼ繧ｸ繝｣縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ', 'error');
            return;
        }
        
        const apiKey = apiKeyInput.value;
        if (!apiKey) {
            this.showToast('API繧ｭ繝ｼ繧貞・蜉帙＠縺ｦ縺上□縺輔＞', 'warning');
            return;
        }
        
        // API繧ｭ繝ｼ縺ｮ蠑ｷ蠎ｦ繝√ぉ繝・け
        const validation = window.unifiedApiManager.validateAPIKeyStrength(apiKey);
        if (!validation.valid) {
            this.showToast(`API繧ｭ繝ｼ繧ｨ繝ｩ繝ｼ: ${validation.issues[0]}`, 'error');
            return;
        }
        
        const originalText = testBtn.textContent;
        testBtn.disabled = true;
        testBtn.textContent = '繝・せ繝井ｸｭ...';
        
        try {
            // 荳譎ら噪縺ｫAPI繧ｭ繝ｼ繧定ｨｭ螳・
            const originalApiKey = window.unifiedApiManager.getAPIKey();
            await window.unifiedApiManager.setAPIKey(apiKey);
            
            // 謗･邯壹ユ繧ｹ繝医ｒ螳溯｡・
            await window.unifiedApiManager.validateAPIKey();
            
            this.showToast('謗･邯壹ユ繧ｹ繝医↓謌仙粥縺励∪縺励◆・・, 'success');
            
            // 繝・せ繝域・蜉滓凾縺ｫ蜈･蜉帶ｬ・ｒ邱題牡縺ｫ
            const inputWrapper = apiKeyInput.parentNode;
            if (inputWrapper) {
                inputWrapper.classList.remove('input-invalid');
                inputWrapper.classList.add('input-valid');
            }
            
            // 蜈・・API繧ｭ繝ｼ繧貞ｾｩ蜈・ｼ医ユ繧ｹ繝医□縺代↑縺ｮ縺ｧ・・
            if (originalApiKey) {
                await window.unifiedApiManager.setAPIKey(originalApiKey);
            } else {
                window.unifiedApiManager.clearAPIKey();
            }
            
        } catch (error) {
            console.error('API謗･邯壹ユ繧ｹ繝医↓螟ｱ謨・', error);
            this.showToast(`謗･邯壹ユ繧ｹ繝医↓螟ｱ謨励＠縺ｾ縺励◆: ${error.message}`, 'error');
            
            // 繝・せ繝亥､ｱ謨玲凾縺ｫ蜈･蜉帶ｬ・ｒ襍､濶ｲ縺ｫ
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
    
    // 蛻晄悄繝｢繝ｼ繝繝ｫ縺九ｉAPI繧ｭ繝ｼ繧剃ｿ晏ｭ・
    async saveInitialAPIKeyFromModal() {
        const apiKeyInput = document.getElementById('initial-api-key');
        const saveBtn = document.getElementById('save-initial-api');
        
        if (!apiKeyInput) {
            console.error('API繧ｭ繝ｼ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ');
            return;
        }
        
        if (!window.unifiedApiManager) {
            console.error('邨ｱ蜷・PI繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ');
            this.showToast('API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ', 'error');
            return;
        }
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            this.showToast('API繧ｭ繝ｼ繧貞・蜉帙＠縺ｦ縺上□縺輔＞', 'warning');
            return;
        }
        
        // API繧ｭ繝ｼ縺ｮ蠖｢蠑上メ繧ｧ繝・け
        const validation = window.unifiedApiManager.validateAPIKeyStrength(apiKey);
        if (!validation.valid) {
            this.showToast(`API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺・ ${validation.issues.join(', ')}`, 'error');
            return;
        }
        
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = '菫晏ｭ倅ｸｭ...';
        
        try {
            // API繧ｭ繝ｼ繧堤ｵｱ蜷医・繝阪・繧ｸ繝｣繝ｼ縺ｫ菫晏ｭ・
            window.unifiedApiManager.setAPIKey(apiKey);
            
            // 譌｢蟄倥・蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｂ蜷梧悄
            this.syncAPIKeyInputs();
            
            this.showToast('API繧ｭ繝ｼ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆', 'success');
            this.closeInitialAPISetupModal();
            
            // API繧ｭ繝ｼ險ｭ螳壼ｮ御ｺ・ｾ後√Γ繧､繝ｳ繧｢繝励Μ繧貞・譛溷喧
            setTimeout(async () => {
                await this.initializeMainApp();
            }, 500);
            
        } catch (error) {
            console.error('API繧ｭ繝ｼ菫晏ｭ倥↓螟ｱ謨・', error);
            this.showToast(`菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }
    
    // 閾ｪ蜍墓磁邯壹ユ繧ｹ繝亥ｮ溯｡・
    async performAutoConnectionTest() {
        if (!window.unifiedApiManager) {
            throw new Error('邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ');
        }

        if (!window.unifiedApiManager.isConfigured()) {
            throw new Error('API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ');
        }

        try {
            // 繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ迥ｶ諷九ｒ陦ｨ遉ｺ・・PI繝｢繝ｼ繝繝ｫ縺碁撼陦ｨ遉ｺ縺ｮ蝣ｴ蜷医・繝医・繧ｹ繝郁｡ｨ遉ｺ・・
            const apiModal = document.getElementById('api-initial-setup-modal');
            if (!apiModal || apiModal.classList.contains('hidden')) {
                this.showToast('菫晏ｭ俶ｸ医∩API繧ｭ繝ｼ縺ｧ謗･邯壹ユ繧ｹ繝井ｸｭ...', 'info');
            }

            // 邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ繧剃ｽｿ縺｣縺ｦ謗･邯壹ユ繧ｹ繝・
            const result = await window.unifiedApiManager.validateAPIKey();
            
            console.log('閾ｪ蜍墓磁邯壹ユ繧ｹ繝域・蜉・', result);
            return result;
            
        } catch (error) {
            console.error('閾ｪ蜍墓磁邯壹ユ繧ｹ繝亥､ｱ謨・', error);
            throw error;
        }
    }

    // 閾ｪ蜍墓磁邯壹ユ繧ｹ繝亥､ｱ謨玲凾縺ｮ繝上Φ繝峨Μ繝ｳ繧ｰ
    handleAutoConnectionTestFailure(error) {
        let errorMessage = '';
        let shouldShowModal = true;
        
        // 繧ｨ繝ｩ繝ｼ繧ｿ繧､繝怜挨縺ｮ繝｡繝・そ繝ｼ繧ｸ險ｭ螳・
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = '菫晏ｭ倥＆繧後◆API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺吶よ眠縺励＞API繧ｭ繝ｼ繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞縲・;
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API繧ｭ繝ｼ縺ｮ讓ｩ髯舌′荳崎ｶｳ縺励※縺・∪縺吶・emini API 縺ｮ譛牙柑縺ｪ繧ｭ繝ｼ繧剃ｽｿ逕ｨ縺励※縺上□縺輔＞縲・;
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ縲ゅ＠縺ｰ繧峨￥蠕後↓蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞縲・;
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
            errorMessage = 'API縺ｮ蛻ｩ逕ｨ蛻ｶ髯舌↓驕斐＠縺ｾ縺励◆縲ゅ＠縺ｰ繧峨￥蠕後↓蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞縲・;
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
            errorMessage = 'Gemini API繧ｵ繝ｼ繝舌・縺ｫ蝠城｡後′逋ｺ逕溘＠縺ｦ縺・∪縺吶ゅ＠縺ｰ繧峨￥蠕後↓蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞縲・;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = '繝阪ャ繝医Ρ繝ｼ繧ｯ謗･邯壹↓蝠城｡後′縺ゅｊ縺ｾ縺吶ゅう繝ｳ繧ｿ繝ｼ繝阪ャ繝域磁邯壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・;
        } else {
            errorMessage = `菫晏ｭ倥＆繧後◆API繧ｭ繝ｼ縺ｧ縺ｮ謗･邯壹↓螟ｱ謨励＠縺ｾ縺励◆: ${error.message}`;
        }
        
        // 繧ｨ繝ｩ繝ｼ繝医・繧ｹ繝医ｒ陦ｨ遉ｺ
        this.showToast(errorMessage, 'warning');
        
        // 蛻晄悄險ｭ螳夂判髱｢繧定｡ｨ遉ｺ
        setTimeout(() => {
            this.showInitialAPISetupModal();
            
            // 蛻晄悄險ｭ螳夂判髱｢蜀・〒繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧偵ワ繧､繝ｩ繧､繝・
            const errorHelp = document.querySelector('#api-initial-setup-modal .error-help');
            if (errorHelp) {
                errorHelp.textContent = errorMessage;
                errorHelp.style.display = 'block';
            }
        }, 1000);
    }

    // 蛻晄悄API繧ｻ繝・ヨ繧｢繝・・繧偵せ繧ｭ繝・・
    skipInitialAPISetup() {
        this.showToast('API險ｭ螳壹ｒ繧ｹ繧ｭ繝・・縺励∪縺励◆縲ゆｸ驛ｨ讖溯・縺悟宛髯舌＆繧後∪縺吶・, 'info');
        this.closeInitialAPISetupModal();
        
        // 繧ｹ繧ｭ繝・・蠕後ｂ繝｡繧､繝ｳ繧｢繝励Μ繧貞・譛溷喧
        setTimeout(async () => {
            await this.initializeMainApp();
        }, 500);
    }
    
    // 蛻晄悄API繧ｻ繝・ヨ繧｢繝・・繝｢繝ｼ繝繝ｫ繧帝哩縺倥ｋ
    closeInitialAPISetupModal() {
        const modal = document.getElementById('api-initial-setup-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none'; // 遒ｺ螳溘↓髱櫁｡ｨ遉ｺ縺ｫ縺吶ｋ
        }
    }
    
    // API繧ｻ繝・ヨ繧｢繝・・繝｢繝ｼ繝繝ｫ繧帝哩縺倥ｋ
    closeAPISetupModal() {
        const modal = document.getElementById('api-setup-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // API繧ｭ繝ｼ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・蜷梧悄
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
    
    // 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ
    initNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = btn.dataset.page;
                if (page) {
                    this.showPage(page);
                    
                    // 繧｢繧ｯ繝・ぅ繝悶け繝ｩ繧ｹ縺ｮ譖ｴ譁ｰ
                    navBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
        });
    }
    
    showPage(pageId) {
        console.log('Showing page:', pageId);
        
        // 縺吶∋縺ｦ縺ｮ繝壹・繧ｸ繧帝撼陦ｨ遉ｺ
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });
        
        // 謖・ｮ壹＆繧後◆繝壹・繧ｸ繧定｡ｨ遉ｺ
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
            
            // 繝壹・繧ｸ蝗ｺ譛峨・蛻晄悄蛹・
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
    
    // 繧､繝吶Φ繝医Μ繧ｹ繝翫・險ｭ螳・
    setupEventListeners() {
        // 繝ｭ繧ｰ繧､繝ｳ/逋ｻ骭ｲ繧ｿ繝門・繧頑崛縺・
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // 逋ｻ骭ｲ繝輔か繝ｼ繝
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        // 繧ｲ繧ｹ繝医・繧ｿ繝ｳ
        const guestBtn = document.getElementById('guest-btn');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                this.handleGuestAccess();
            });
        }
        
        // 繝ｭ繧ｰ繧｢繧ｦ繝医・繧ｿ繝ｳ
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // 隧ｦ蜷医ョ繝ｼ繧ｿ繝輔か繝ｼ繝
        const matchForm = document.getElementById('match-form');
        if (matchForm) {
            matchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleMatchSubmit();
            });
        }
        
        // 逶ｮ讓吶ヵ繧ｩ繝ｼ繝
        const goalForm = document.getElementById('goal-form');
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleGoalSubmit();
            });
        }
        
        // API險ｭ螳壹ヵ繧ｩ繝ｼ繝
        const apiForm = document.getElementById('api-form');
        if (apiForm) {
            apiForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleApiSave();
            });
        }
        
        // API繧ｭ繝ｼ陦ｨ遉ｺ繝医げ繝ｫ
        const toggleApiKey = document.getElementById('toggle-api-key');
        if (toggleApiKey) {
            toggleApiKey.addEventListener('click', () => {
                const apiKeyInput = document.getElementById('api-key');
                if (apiKeyInput) {
                    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
                    toggleApiKey.textContent = apiKeyInput.type === 'password' ? '早・・ : '早・鞘昨泓ｨ・・;
                }
            });
        }
        
        // API繝・せ繝医・繧ｿ繝ｳ
        const testApiBtn = document.getElementById('test-api-btn');
        if (testApiBtn) {
            testApiBtn.addEventListener('click', () => {
                this.testApiConnection();
            });
        }
        
        // API繧ｯ繝ｪ繧｢繝懊ち繝ｳ
        const clearApiBtn = document.getElementById('clear-api-btn');
        if (clearApiBtn) {
            clearApiBtn.addEventListener('click', () => {
                this.clearApiSettings();
            });
        }
        
        // AI譖ｴ譁ｰ繝懊ち繝ｳ
        const refreshAiBtn = document.getElementById('refresh-ai-btn');
        if (refreshAiBtn) {
            refreshAiBtn.addEventListener('click', () => {
                this.refreshAiRecommendations();
            });
        }
        
        // 繧ｲ繝ｼ繝螟画峩繝懊ち繝ｳ
        const changeGameBtn = document.getElementById('change-game-btn');
        if (changeGameBtn) {
            changeGameBtn.addEventListener('click', () => {
                this.showGameSelector();
            });
        }
        
        // 繧ｲ繝ｼ繝驕ｸ謚樒｢ｺ螳壹・繧ｿ繝ｳ
        const confirmGameBtn = document.getElementById('confirm-game-btn');
        if (confirmGameBtn) {
            confirmGameBtn.addEventListener('click', () => {
                this.confirmGameSelection();
            });
        }
        
        // 繧ｲ繝ｼ繝驕ｸ謚槭く繝｣繝ｳ繧ｻ繝ｫ繝懊ち繝ｳ
        const cancelGameBtn = document.getElementById('cancel-game-btn');
        if (cancelGameBtn) {
            cancelGameBtn.addEventListener('click', () => {
                this.hideGameSelector();
            });
        }

        // 繧｢繝励Μ蛻晄悄蛹悶・繧ｿ繝ｳ
        const resetBtn = document.getElementById('reset-app-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetAppData();
            });
        }
    }
    
    // 繧ｿ繝門・繧頑崛縺・
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
    
    // 繝ｭ繧ｰ繧､繝ｳ蜃ｦ逅・
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
                this.showToast('繝ｭ繧ｰ繧､繝ｳ縺励∪縺励◆', 'success');
            } else {
                this.showToast(result.message, 'error');
            }
        } else {
            // 繝｢繝・け繝ｭ繧ｰ繧､繝ｳ
            this.currentUser = { username: username };
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.updateUserDisplay(username);
            this.hideLoginModal();
            this.showToast('繝ｭ繧ｰ繧､繝ｳ縺励∪縺励◆', 'success');
        }
    }
    
    // 逋ｻ骭ｲ蜃ｦ逅・
    handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        
        if (password !== passwordConfirm) {
            this.showToast('繝代せ繝ｯ繝ｼ繝峨′荳閾ｴ縺励∪縺帙ｓ', 'error');
            return;
        }
        
        if (this.authService) {
            const result = this.authService.register(username, password, email);
            if (result.success) {
                this.showToast('逋ｻ骭ｲ縺悟ｮ御ｺ・＠縺ｾ縺励◆縲ゅΟ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・, 'success');
                this.switchTab('login');
            } else {
                this.showToast(result.message, 'error');
            }
        } else {
            // 繝｢繝・け逋ｻ骭ｲ
            this.showToast('逋ｻ骭ｲ縺悟ｮ御ｺ・＠縺ｾ縺励◆', 'success');
            this.switchTab('login');
        }
    }
    
    // 繧ｲ繧ｹ繝医い繧ｯ繧ｻ繧ｹ
    handleGuestAccess() {
        this.isGuest = true;
        sessionStorage.setItem('isGuest', 'true');
        this.updateUserDisplay('繧ｲ繧ｹ繝医Θ繝ｼ繧ｶ繝ｼ', true);
        this.hideLoginModal();
        this.showToast('繧ｲ繧ｹ繝医→縺励※繝ｭ繧ｰ繧､繝ｳ縺励∪縺励◆', 'info');
    }
    
    // 繝ｭ繧ｰ繧｢繧ｦ繝・
    handleLogout() {
        this.currentUser = null;
        this.isGuest = false;
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isGuest');
        this.showLoginModal();
        this.showToast('繝ｭ繧ｰ繧｢繧ｦ繝医＠縺ｾ縺励◆', 'info');
    }
    
    // 隧ｦ蜷医ョ繝ｼ繧ｿ騾∽ｿ｡
    handleMatchSubmit() {
        const matchData = {
            result: document.getElementById('match-result').value,
            kills: parseInt(document.getElementById('kills').value),
            deaths: parseInt(document.getElementById('deaths').value),
            assists: parseInt(document.getElementById('assists').value),
            cs: parseInt(document.getElementById('cs').value),
            duration: parseInt(document.getElementById('match-duration').value)
        };
        
        // 1) 蛻・梵邨先棡縺ｮ陦ｨ遉ｺ
        this.analyzeMatch(matchData);

        // 2) 隧ｦ蜷医ｒ菫晏ｭ倥＠縲√ム繝・す繝･繝懊・繝臥ｵｱ險医ｒ譖ｴ譁ｰ・磯｣蜍包ｼ・
        this.storeMatchAndRefresh(matchData);
        document.getElementById('match-form').reset();
        this.showToast('蛻・梵繧貞ｮ溯｡後＠縺ｦ縺・∪縺・..', 'info');
    }

    // 蛻・梵繝壹・繧ｸ縺ｮ蜈･蜉帙ｒ繝ｭ繝ｼ繧ｫ繝ｫ縺ｫ菫晏ｭ倥＠縲√ム繝・す繝･繝懊・繝峨ｒ譖ｴ譁ｰ
    storeMatchAndRefresh(matchData) {
        try {
            // 菫晏ｭ倥ヵ繧ｩ繝ｼ繝槭ャ繝医∈謨ｴ蠖｢
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

            // 逶ｴ霑題ｩｦ蜷医∈霑ｽ蜉・域怙螟ｧ50莉ｶ・・
            const matches = JSON.parse(localStorage.getItem('recentMatches') || '[]');
            matches.unshift(newMatch);
            if (matches.length > 50) matches.length = 50;
            localStorage.setItem('recentMatches', JSON.stringify(matches));

            // 髮・ｨ医＠縺ｦ繝励Ξ繧､繝､繝ｼ邨ｱ險医ｒ譖ｴ譁ｰ
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
                // UI繧貞叉譎よ峩譁ｰ
                this.playerStatsManager.loadStatsToUI();
                this.playerStatsManager.loadRecentMatches();
            } else {
                localStorage.setItem('playerStats', JSON.stringify(updatedStats));
                this.loadRecentMatches();
                // 謇句虚縺ｧUI縺ｸ蜿肴丐
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
    
    // 逶ｮ讓呵ｿｽ蜉
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
        this.showToast('逶ｮ讓吶ｒ霑ｽ蜉縺励∪縺励◆', 'success');
    }
    
    // API險ｭ螳壻ｿ晏ｭ・
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
        this.showToast('API險ｭ螳壹ｒ菫晏ｭ倥＠縺ｾ縺励◆', 'success');
    }
    
    // API謗･邯壹ユ繧ｹ繝・
    async testApiConnection() {
        this.showLoading();
        
        setTimeout(() => {
            this.hideLoading();
            if (Math.random() > 0.5) {
                this.showToast('API謗･邯壽・蜉・, 'success');
            } else {
                this.showToast('API謗･邯壼､ｱ謨・ 繧ｭ繝ｼ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞', 'error');
            }
        }, 1000);
    }
    
    // API險ｭ螳壹け繝ｪ繧｢
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
        this.showToast('API險ｭ螳壹ｒ繧ｯ繝ｪ繧｢縺励∪縺励◆', 'info');
    }
    
    // API迥ｶ諷区峩譁ｰ
    updateApiStatus(isConfigured) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (statusIndicator && statusText) {
            if (isConfigured) {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusText.textContent = 'API險ｭ螳壽ｸ医∩';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusText.textContent = 'API譛ｪ險ｭ螳・;
            }
        }
    }
    
    // 繝√Ε繝ｼ繝亥・譛溷喧
    initCharts() {
        // 繝√Ε繝ｼ繝医・螳滄圀縺ｮ繝・・繧ｿ縺悟・蜉帙＆繧後◆譎ゅ・縺ｿ蛻晄悄蛹悶☆繧・
        // 蛻晄悄迥ｶ諷九〒縺ｯ菴輔ｂ陦ｨ遉ｺ縺励↑縺・
    }
    
    // 繝医・繧ｹ繝郁｡ｨ遉ｺ
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
    
    // 繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ陦ｨ遉ｺ・井ｻｻ諢上Γ繝・そ繝ｼ繧ｸ蟇ｾ蠢懶ｼ・
    showLoading(message = '繝ｭ繝ｼ繝我ｸｭ...') {
        // 繝・く繧ｹ繝医ｒ譖ｴ譁ｰ・磯㍾隍⑩D縺ｫ蟇ｾ蠢懊＠縺ｦ蜈ｨ縺ｦ譖ｴ譁ｰ・・
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
    
    // 蜷・・繝ｼ繧ｸ縺ｮ繝ｭ繝ｼ繝牙・逅・
    loadDashboard() {
        // 譁ｰ縺励＞邨ｱ險医す繧ｹ繝・Β繧剃ｽｿ逕ｨ
        if (this.playerStatsManager) {
            this.playerStatsManager.loadRecentMatches();
        } else {
            this.loadRecentMatches();
        }
        // 譁ｰ縺励＞AI繧ｳ繝ｼ繝√Φ繧ｰ讖溯・繧剃ｽｿ逕ｨ
        this.loadAIRecommendations();
        // 譁ｰ縺励＞邨ｱ險医す繧ｹ繝・Β繧剃ｽｿ逕ｨ
        if (this.playerStatsManager) {
            this.playerStatsManager.loadStatsToUI();
        }
    }
    
    loadAnalysis() {
        // 蛻・梵繝壹・繧ｸ縺ｮ蛻晄悄蛹・
    }
    
    loadGoals() {
        this.loadGoalsList();
    }
    
    loadSettings() {
        this.loadGameCategories();
        this.loadApiSettings();
    }
    
    // 繝・・繧ｿ繝ｭ繝ｼ繝牙・逅・
    loadUserData() {
        // 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繧ｿ縺ｮ繝ｭ繝ｼ繝・
        if (!this.isGuest && this.currentUser) {
            // 菫晏ｭ倥＆繧後◆繝・・繧ｿ繧偵Ο繝ｼ繝・
        }
    }
    
    loadRecentMatches() {
        const container = document.getElementById('recent-matches');
        if (!container) return;
        
        // 螳滄圀縺ｮ隧ｦ蜷医ョ繝ｼ繧ｿ繧偵Ο繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺九ｉ蜿門ｾ・
        const matches = JSON.parse(localStorage.getItem('recentMatches') || '[]');
        
        if (matches.length === 0) {
            container.innerHTML = '<p class="no-data">隧ｦ蜷郁ｨ倬鹸縺後∪縺縺ゅｊ縺ｾ縺帙ｓ</p>';
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
        // 縺薙・髢｢謨ｰ縺ｯ髱樊耳螂ｨ - 譁ｰ縺励＞AI繧ｳ繝ｼ繝√Φ繧ｰ讖溯・繧剃ｽｿ逕ｨ
        console.log('圷 Deprecated loadAiRecommendations called - redirecting to new AI coaching');
        this.loadAIRecommendations();
    }
    
    refreshAiRecommendations() {
        // 譁ｰ縺励＞AI繧ｳ繝ｼ繝√Φ繧ｰ讖溯・繧剃ｽｿ逕ｨ
        this.generateAIRecommendations();
        this.showToast('謗ｨ螂ｨ莠矩・ｒ譖ｴ譁ｰ縺励∪縺励◆', 'success');
    }
    
    loadGoalsList() {
        const container = document.getElementById('goals-list');
        if (!container) return;
        
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        
        if (goals.length === 0) {
            container.innerHTML = '<p class="no-data">逶ｮ讓吶′縺ｾ縺險ｭ螳壹＆繧後※縺・∪縺帙ｓ</p>';
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
                    <h3>蛻・梵邨先棡</h3>
                    <div class="analysis-stats">
                        <div class="stat-box">
                            <span class="stat-label">KDA</span>
                            <span class="stat-value">${kda}</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">CS/蛻・/span>
                            <span class="stat-value">${csPerMin}</span>
                        </div>
                    </div>
                    <div class="analysis-feedback">
                        <h4>繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ隧穂ｾ｡</h4>
                        <p>${kda >= 3 ? '蜆ｪ繧後◆KDA縺ｧ縺呻ｼ・ : 'KDA縺ｮ謾ｹ蝟・ｽ吝慍縺後≠繧翫∪縺吶・}</p>
                        <p>${csPerMin >= 7 ? 'CS邊ｾ蠎ｦ縺ｯ濶ｯ螂ｽ縺ｧ縺吶・ : 'CS縺ｮ邊ｾ蠎ｦ繧貞髄荳翫＆縺帙∪縺励ｇ縺・・}</p>
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
        
        // 繧ｲ繝ｼ繝驕ｸ謚槭き繝ｼ繝峨・繧ｯ繝ｪ繝・け繧､繝吶Φ繝医ｒ險ｭ螳・
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
            this.showToast(`繧ｲ繝ｼ繝繧・{gameName}縺ｫ螟画峩縺励∪縺励◆`, 'success');
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

    // === 繝√Ε繝・ヨ讖溯・ ===
    initChat() {
        console.log('Initializing chat...');
        
        // API險ｭ螳夐未騾｣
        this.setupChatApiSettings();
        
        // 繝√Ε繝・ヨ蜈･蜉幃未騾｣
        this.setupChatInput();
        
        // 繝｡繝・そ繝ｼ繧ｸ螻･豁ｴ繧貞ｾｩ蜈・
        this.loadChatHistory();
    }
    
    setupChatApiSettings() {
        // API繧ｭ繝ｼ險ｭ螳・
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
                toggleKeyBtn.textContent = isPassword ? '刪' : '早・・;
            });
        }
        
        // 譌｢蟄倥・API繧ｭ繝ｼ繧定ｪｭ縺ｿ霎ｼ縺ｿ
        if (apiKeyInput && this.geminiService) {
            apiKeyInput.value = this.geminiService.getApiKey();
        }
    }
    
    setupChatInput() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-message');
        const clearBtn = document.getElementById('clear-chat');
        
        if (chatInput) {
            // 閾ｪ蜍輔Μ繧ｵ繧､繧ｺ
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
                
                // 騾∽ｿ｡繝懊ち繝ｳ縺ｮ譛牙柑/辟｡蜉ｹ
                if (sendBtn) {
                    sendBtn.disabled = !chatInput.value.trim();
                }
            });
            
            // Enter 繧ｭ繝ｼ縺ｧ騾∽ｿ｡
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
            this.showToast('API繧ｭ繝ｼ繧貞・蜉帙＠縺ｦ縺上□縺輔＞', 'warning');
            return;
        }
        
        try {
            // 邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ繧剃ｽｿ逕ｨ
            if (window.unifiedApiManager) {
                await window.unifiedApiManager.setAPIKey(apiKey);
                // 莉悶・蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｂ蜷梧悄
                this.syncAPIKeyInputs();
                this.showToast('API繧ｭ繝ｼ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆', 'success');
                // 繧ｳ繝ｼ繝√Φ繧ｰ繧偵が繝ｳ繝ｩ繧､繝ｳ縺ｧ蜀咲函謌・
                try { this.generateAIRecommendations(); } catch {}
            } else if (this.geminiService) {
                // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
                this.geminiService.setApiKey(apiKey);
                this.showToast('Gemini API繧ｭ繝ｼ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆', 'success');
                try { this.generateAIRecommendations(); } catch {}
            } else {
                this.showToast('API繧ｵ繝ｼ繝薙せ縺悟・譛溷喧縺輔ｌ縺ｦ縺・∪縺帙ｓ', 'error');
            }
        } catch (error) {
            this.showToast(`API繧ｭ繝ｼ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ${error.message}`, 'error');
        }
    }
    
    async testGeminiConnection() {
        if (!window.unifiedApiManager || !window.unifiedApiManager.isConfigured()) {
            this.showToast('Gemini API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ', 'error');
            return;
        }
        
        const testBtn = document.getElementById('test-gemini-connection');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = '繝・せ繝井ｸｭ...';
        }
        
        try {
            await window.unifiedApiManager.validateAPIKey();
            this.showToast('謗･邯壹ユ繧ｹ繝医↓謌仙粥縺励∪縺励◆', 'success');
        } catch (error) {
            this.showToast(`謗･邯壹ユ繧ｹ繝医↓螟ｱ謨・ ${error.message}`, 'error');
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = '謗･邯壹ユ繧ｹ繝・;
            }
        }
    }
    
    async sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-message');
        
        if (!chatInput) return;
        
        // API縺瑚ｨｭ螳壹＆繧後※縺・ｋ縺狗｢ｺ隱・
        if (!window.unifiedApiManager || !window.unifiedApiManager.isConfigured()) {
            this.showToast('Gemini API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ', 'warning');
            return;
        }
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // UI繧堤┌蜉ｹ蛹・
        chatInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        
        try {
            // 繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
            this.addChatMessage(message, 'user');
            
            // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ繧ｯ繝ｪ繧｢
            chatInput.value = '';
            chatInput.style.height = 'auto';
            
            // 繧ｿ繧､繝斐Φ繧ｰ繧､繝ｳ繧ｸ繧ｱ繝ｼ繧ｿ繝ｼ陦ｨ遉ｺ
            this.showTypingIndicator();
            
            // API縺ｫ騾∽ｿ｡
            const response = await this.geminiService.sendChatMessage(message);
            
            // 繧ｿ繧､繝斐Φ繧ｰ繧､繝ｳ繧ｸ繧ｱ繝ｼ繧ｿ繝ｼ髱櫁｡ｨ遉ｺ
            this.hideTypingIndicator();
            
            // AI縺ｮ蠢懃ｭ斐ｒ陦ｨ遉ｺ
            this.addChatMessage(response.response, 'ai');
            
            // 螻･豁ｴ繧剃ｿ晏ｭ・
            this.saveChatHistory();
            
        } catch (error) {
            this.hideTypingIndicator();
            this.showToast(`繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡繧ｨ繝ｩ繝ｼ: ${error.message}`, 'error');
        } finally {
            // UI繧貞・譛牙柑蛹・
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
        avatar.textContent = type === 'user' ? '側' : '､・;
        
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
        
        // 繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 繝｡繝・そ繝ｼ繧ｸ繧帝・蛻励↓霑ｽ蜉
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
            <div class="message-avatar">､・/div>
            <div class="message-content">
                <div class="message-text">
                    <span>AI 縺悟・蜉帑ｸｭ</span>
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
        
        // 譛蛻昴・AI繝｡繝・そ繝ｼ繧ｸ莉･螟悶ｒ蜑企勁
        const messages = messagesContainer.querySelectorAll('.chat-message');
        messages.forEach((msg, index) => {
            if (index > 0) msg.remove();
        });
        
        // 繝・・繧ｿ繧偵け繝ｪ繧｢
        this.chatMessages = [];
        if (this.geminiService) {
            this.geminiService.clearChatHistory();
        }
        
        this.saveChatHistory();
        this.showToast('繝√Ε繝・ヨ螻･豁ｴ繧偵け繝ｪ繧｢縺励∪縺励◆', 'success');
    }
    
    saveChatHistory() {
        localStorage.setItem('chat-history', JSON.stringify(this.chatMessages));
    }
    
    loadChatHistory() {
        try {
            const history = localStorage.getItem('chat-history');
            if (history) {
                this.chatMessages = JSON.parse(history);
                // UI縺ｯ蠕ｩ蜈・＠縺ｪ縺・ｼ域眠縺励＞繧ｻ繝・す繝ｧ繝ｳ縺ｨ縺励※髢句ｧ具ｼ・
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
            this.chatMessages = [];
        }
    }

    // === 繝｡繝・ぅ繧｢隗｣譫先ｩ溯・ ===
    initMediaAnalysis() {
        console.log('Initializing media analysis...');
        
        // API險ｭ螳・
        this.setupMediaApiSettings();
        
        // 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝・
        this.setupFileUpload();
        
        // 譌｢蟄倥・繝輔ぃ繧､繝ｫ繝励Ξ繝薙Η繝ｼ繧偵け繝ｪ繧｢
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
                toggleKeyBtn.textContent = isPassword ? '刪' : '早・・;
            });
        }
        
        // 譌｢蟄倥・API繧ｭ繝ｼ繧定ｪｭ縺ｿ霎ｼ縺ｿ・医メ繝｣繝・ヨ縺ｨ蜷後§繧ｭ繝ｼ繧剃ｽｿ逕ｨ・・
        if (apiKeyInput && this.geminiService) {
            apiKeyInput.value = this.geminiService.getApiKey();
        }
    }
    
    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const fileSelectBtn = document.getElementById('file-select-btn');
        
        if (uploadArea) {
            // 繝峨Λ繝・げ&繝峨Ο繝・・
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
        // 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繝√ぉ繝・け・・0MB・・
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showToast(`繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ縺悟､ｧ縺阪☆縺弱∪縺・ ${file.name}`, 'error');
            return false;
        }
        
        // 繝輔ぃ繧､繝ｫ繧ｿ繧､繝励メ繧ｧ繝・け
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast(`繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑・ ${file.name}`, 'error');
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
        
        // 繝輔ぃ繧､繝ｫ繝励Ξ繝薙Η繝ｼ菴懈・
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
        
        // 繝輔ぃ繧､繝ｫ諠・ｱ
        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        fileCard.appendChild(fileName);
        
        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = this.formatFileSize(file.size);
        fileCard.appendChild(fileSize);
        
        // 謫堺ｽ懊・繧ｿ繝ｳ
        const actions = document.createElement('div');
        actions.className = 'file-actions';
        
        const analyzeBtn = document.createElement('button');
        analyzeBtn.className = 'btn-analyze';
        analyzeBtn.textContent = '蛻・梵';
        analyzeBtn.onclick = () => this.analyzeFile(file);
        actions.appendChild(analyzeBtn);
        
        // 蜑企勁繝懊ち繝ｳ
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'ﾃ・;
        removeBtn.onclick = () => this.removeFile(file.name);
        fileCard.appendChild(removeBtn);
        
        fileCard.appendChild(actions);
        fileList.appendChild(fileCard);
    }
    
    async analyzeFile(file) {
        if (!window.unifiedApiManager || !window.unifiedApiManager.isConfigured()) {
            this.showToast('Gemini API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ', 'warning');
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
            this.showToast('隗｣譫舌′螳御ｺ・＠縺ｾ縺励◆', 'success');
            
        } catch (error) {
            this.showToast(`隗｣譫舌お繝ｩ繝ｼ: ${error.message}`, 'error');
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
                <div class="analysis-game">${result.gameTitle || '繧ｲ繝ｼ繝隗｣譫・}</div>
                <div class="analysis-confidence">${result.timestamp || ''}</div>
            </div>
        `;
        
        if (result.overallScore) {
            cardHTML += `
                <div class="analysis-stats">
                    <div class="stat-box">
                        <div class="stat-label">邱丞粋隧穂ｾ｡</div>
                        <div class="stat-value">${result.overallScore}</div>
                    </div>
                </div>
            `;
        }
        
        if (result.strengths && result.strengths.length > 0) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>笨・濶ｯ縺・・繧､繝ｳ繝・/h4>
                    <ul class="analysis-list strengths">
                        ${result.strengths.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.weaknesses && result.weaknesses.length > 0) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>笞・・謾ｹ蝟・・繧､繝ｳ繝・/h4>
                    <ul class="analysis-list weaknesses">
                        ${result.weaknesses.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.suggestions && result.suggestions.length > 0) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>庁 謾ｹ蝟・署譯・/h4>
                    <ul class="analysis-list suggestions">
                        ${result.suggestions.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (result.summary) {
            cardHTML += `
                <div class="analysis-section">
                    <h4>統 邱丞粋隧穂ｾ｡</h4>
                    <p>${result.summary}</p>
                </div>
            `;
        }
        
        card.innerHTML = cardHTML;
        cardsContainer.appendChild(card);
    }
    
    removeFile(fileName) {
        // 驟榊・縺九ｉ蜑企勁
        this.uploadedFiles = this.uploadedFiles.filter(file => file.name !== fileName);
        
        // UI縺九ｉ蜑企勁
        const fileCard = document.querySelector(`.file-card[data-file-name="${fileName}"]`);
        if (fileCard) {
            fileCard.remove();
        }
        
        // 繝励Ξ繝薙Η繝ｼ繧ｨ繝ｪ繧｢繧帝撼陦ｨ遉ｺ縺ｫ縺吶ｋ・医ヵ繧｡繧､繝ｫ縺後↑縺・ｴ蜷茨ｼ・
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
            this.showToast('API繧ｭ繝ｼ繧貞・蜉帙＠縺ｦ縺上□縺輔＞', 'warning');
            return;
        }
        
        if (this.geminiService) {
            this.geminiService.setApiKey(apiKey);
            this.showToast('API繧ｭ繝ｼ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆', 'success');
            
            // 繝√Ε繝・ヨ蛛ｴ縺ｮ繧ｭ繝ｼ繧ょ酔譛・
            const chatKeyInput = document.getElementById('gemini-api-key');
            if (chatKeyInput) {
                chatKeyInput.value = apiKey;
            }
        }
    }
    
    async testVisionConnection() {
        return this.testGeminiConnection(); // 繝√Ε繝・ヨ讖溯・縺ｨ蜷後§繝・せ繝医ｒ菴ｿ逕ｨ
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

    // === 繧ｲ繝ｼ繝驕ｸ謚槭→繝繝・す繝･繝懊・繝画ｩ溯・ ===
    initGameSelection() {
        console.log('Initializing game selection...');
        
        // 繧ｲ繝ｼ繝驕ｸ謚櫁ｪ伜ｰ弱・繧ｿ繝ｳ
        const gotoGameSelectionBtn = document.getElementById('goto-game-selection');
        if (gotoGameSelectionBtn) {
            gotoGameSelectionBtn.addEventListener('click', () => {
                this.goToGameSelection();
            });
        }
        
        // 繧ｲ繝ｼ繝繧ｫ繝ｼ繝峨・繧ｯ繝ｪ繝・け繧､繝吶Φ繝医ｒ險ｭ螳・
        this.setupGameActionButtons();
        
        // 蛻晄悄迥ｶ諷九・繝√ぉ繝・け
        this.checkGameSelection();
    }
    
    setupGameCardEvents() {
        // 繧ｲ繝ｼ繝繧ｫ繝ｼ繝峨・蛻晏屓險ｭ螳・
        this.setupGameCards();
        
        // 繧ｲ繝ｼ繝繧ｫ繝ｼ繝峨′蜍慕噪逕滓・縺輔ｌ繧句ｴ蜷医・縺溘ａ縺ｮ蜀崎ｩｦ陦梧ｩ滓ｧ・
        setTimeout(() => this.setupGameCards(), 500);
        setTimeout(() => this.setupGameCards(), 1500);
        
        // 遒ｺ隱阪・繧ｭ繝｣繝ｳ繧ｻ繝ｫ繝懊ち繝ｳ縺ｮ險ｭ螳・
        this.setupGameActionButtons();
    }
    
    setupGameCards() {
        const gameCards = document.querySelectorAll('.game-option');
        console.log(`Found ${gameCards.length} game cards`);
        
        gameCards.forEach((card) => {
            // 繧ｯ繝ｪ繝・け繧､繝吶Φ繝医Μ繧ｹ繝翫・霑ｽ蜉
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Game card clicked:', card.dataset.gameName);
                this.selectGame(card);
            });
            
            // 繧ｭ繝ｼ繝懊・繝峨い繧ｯ繧ｻ繧ｷ繝薙Μ繝・ぅ
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectGame(card);
                }
            });
            
            // 繝槭え繧ｹ繧ｪ繝ｼ繝舌・蜉ｹ譫・
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
            
            // 繧ｯ繝ｪ繝・け蜿ｯ閭ｽ縺ｧ縺ゅｋ縺薙→繧呈・遉ｺ縺吶ｋ繧ｹ繧ｿ繧､繝ｫ
            card.style.cursor = 'pointer';
        });
        
        // 迴ｾ蝨ｨ驕ｸ謚槭＆繧後※縺・ｋ繧ｲ繝ｼ繝縺後≠繧後・陦ｨ遉ｺ
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
        // 譌･譛ｬ隱槭ご繝ｼ繝蜷阪ｒ闍ｱ隱曵D縺ｫ螟画鋤
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
        // 險ｭ螳壹ち繝悶↓遘ｻ蜍・
        this.showPage('settings');
        
        // 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ繧｢繧ｯ繝・ぅ繝也憾諷九ｒ譖ｴ譁ｰ
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === 'settings') {
                btn.classList.add('active');
            }
        });
        
        // 繧ｲ繝ｼ繝驕ｸ謚槭お繝ｪ繧｢縺ｾ縺ｧ繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ
        setTimeout(() => {
            const gameSelection = document.getElementById('current-game-display');
            if (gameSelection) {
                gameSelection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
            
            // 繧ｲ繝ｼ繝驕ｸ謚槭ｒ髢九￥
            this.showGameSelector();
            
            // 繝上う繝ｩ繧､繝医い繝九Γ繝ｼ繧ｷ繝ｧ繝ｳ
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
            // 繧ｲ繝ｼ繝縺碁∈謚樊ｸ医∩
            this.updateUIWithGameData(JSON.parse(selectedGameData));
            this.hideGameSelectionGuidance();
        } else {
            // 繧ｲ繝ｼ繝譛ｪ驕ｸ謚・
            this.showGameSelectionGuidance();
            this.clearGameData();
        }
    }
    
    selectGame(gameCard) {
        // 莉悶・繧ｫ繝ｼ繝峨・驕ｸ謚槭ｒ隗｣髯､
        const allCards = document.querySelectorAll('.game-option');
        allCards.forEach(card => card.classList.remove('selected'));
        
        // 驕ｸ謚槭＠縺溘き繝ｼ繝峨ｒ繝上う繝ｩ繧､繝・
        gameCard.classList.add('selected');
    }
    
    confirmGameSelection() {
        const selectedCard = document.querySelector('.game-option.selected');
        if (!selectedCard) {
            this.showToast('繧ｲ繝ｼ繝繧帝∈謚槭＠縺ｦ縺上□縺輔＞', 'warning');
            return;
        }
        
        // 繧ｲ繝ｼ繝諠・ｱ繧貞叙蠕・
        const gameId = selectedCard.dataset.gameId;
        const gameName = selectedCard.dataset.gameName || selectedCard.querySelector('.game-option-name').textContent;
        const gameIcon = selectedCard.dataset.gameIcon || selectedCard.querySelector('.game-option-icon').textContent;
        const categoryName = selectedCard.dataset.category || selectedCard.closest('.game-category-section')?.querySelector('.category-title')?.textContent || '縺昴・莉・;
        
        const gameData = {
            id: gameId,
            name: gameName,
            icon: gameIcon,
            category: categoryName
        };
        
        // LocalStorage縺ｫ菫晏ｭ・
        localStorage.setItem('selectedGame', gameId);
        localStorage.setItem('selectedGameData', JSON.stringify(gameData));
        
        // UI繧呈峩譁ｰ
        this.updateUIWithGameData(gameData);
        this.hideGameSelector();
        this.hideGameSelectionGuidance();
        
        this.showToast(`${gameName} 繧帝∈謚槭＠縺ｾ縺励◆`, 'success');
        
        // 繝繝・す繝･繝懊・繝峨↓謌ｻ繧・
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
        // 繝繝・す繝･繝懊・繝画峩譁ｰ
        const playerGame = document.getElementById('player-game');
        const currentGameName = document.getElementById('current-game-name');
        const currentGameIcon = document.getElementById('current-game-icon');
        const currentGameCategory = document.getElementById('current-game-category');
        
        if (playerGame) playerGame.textContent = gameData.name;
        if (currentGameName) currentGameName.textContent = gameData.name;
        if (currentGameIcon) currentGameIcon.textContent = gameData.icon;
        if (currentGameCategory) currentGameCategory.textContent = gameData.category;
        
        // 繧ｵ繝ｳ繝励Ν繝・・繧ｿ繧定｡ｨ遉ｺ
        this.loadSampleGameData(gameData);
    }
    
    loadSampleGameData(gameData) {
        // 繝励Ξ繧､繝､繝ｼ蜷阪ｒ繧ｫ繧ｹ繧ｿ繝槭う繧ｺ
        const playerName = document.getElementById('player-name');
        if (playerName) {
            playerName.textContent = `${gameData.name} 繝励Ξ繧､繝､繝ｼ`;
        }

        // 繝ｩ繝ｳ繧ｯ繧定ｨｭ螳夲ｼ亥崋螳壹・萓九ゅ％縺薙・繝ｩ繝ｳ繝繝縺ｧ縺ｯ縺ｪ縺・◆繧∝ｾ捺擂騾壹ｊ・・
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

        // 1) 縺ｾ縺壹・菫晏ｭ俶ｸ医∩縺ｮ邨ｱ險医′縺ゅｌ縺ｰ縺昴ｌ繧剃ｽｿ逕ｨ・亥ｮ牙ｮ夊｡ｨ遉ｺ・・
        let stableStats = null;
        if (this.playerStatsManager && this.playerStatsManager.hasValidStats()) {
            stableStats = this.playerStatsManager.getPlayerStats();
        }

        // 2) 菫晏ｭ俶ｸ医∩縺ｮ邨ｱ險医′縺ｪ縺・ｴ蜷医・菴輔ｂ縺励↑縺・ｼ亥・譛溽憾諷九・縲・縲阪・縺ｾ縺ｾ・・

        // 3) UI 縺ｸ蜿肴丐・亥ｭ伜惠縺励↑縺代ｌ縺ｰ繝上う繝輔Φ縺ｮ縺ｾ縺ｾ・・
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
            // 繝√Ε繝ｼ繝亥・譛溷喧・井ｿ晏ｭ倥＠縺ｦ縺・ｋ蝣ｴ蜷医・縺ｿ・・
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
        
        if (playerGame) playerGame.textContent = '繧ｲ繝ｼ繝譛ｪ驕ｸ謚・;
        if (currentGameName) currentGameName.textContent = '繧ｲ繝ｼ繝繧帝∈謚槭＠縺ｦ縺上□縺輔＞';
        
        // 邨ｱ險医ｒ縲・縲阪↓謌ｻ縺・
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

    // 繧｢繝励Μ蜈ｨ菴薙・蛻晄悄蛹厄ｼ医ョ繝ｼ繧ｿ豸亥悉・・
    resetAppData() {
        // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ
        const ok = confirm('繧｢繝励Μ繧貞・譛溷喧縺励∪縺吶ゆｿ晏ｭ倥＆繧後◆隧ｦ蜷医・逶ｮ讓吶・API繧ｭ繝ｼ縺ｪ縺ｩ縺ｮ繝・・繧ｿ縺悟炎髯､縺輔ｌ縺ｾ縺吶ゅｈ繧阪＠縺・〒縺吶°・・);
        if (!ok) return;

        try {
            // localStorage 縺ｮ荳ｻ縺ｪ繧ｭ繝ｼ繧貞炎髯､
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

            // sessionStorage 縺ｮ荳ｻ縺ｪ繧ｭ繝ｼ繧貞炎髯､
            const sessionKeys = ['currentUser', 'isGuest'];
            sessionKeys.forEach(k => sessionStorage.removeItem(k));

            // 蜀・Κ繧ｵ繝ｼ繝薙せ縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
            if (this.geminiService && typeof this.geminiService.clearApiKey === 'function') {
                try { this.geminiService.clearApiKey(); } catch (e) { console.debug(e); }
            }
            if (window.unifiedApiManager && typeof window.unifiedApiManager.clearAPIKey === 'function') {
                try { window.unifiedApiManager.clearAPIKey(); } catch (e) { console.debug(e); }
            }

            // UI 繝ｪ繧ｻ繝・ヨ
            this.clearGameData();
            const statsIds = ['win-rate', 'avg-kda', 'cs-per-min', 'games-played'];
            statsIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '-'; });
            const matchesContainer = document.getElementById('recent-matches');
            if (matchesContainer) matchesContainer.innerHTML = '<p class="no-data">隧ｦ蜷郁ｨ倬鹸縺後∪縺縺ゅｊ縺ｾ縺帙ｓ</p>';
            const goalsList = document.getElementById('goals-list');
            if (goalsList) goalsList.innerHTML = '<p class="no-data">逶ｮ讓吶′縺ｾ縺險ｭ螳壹＆繧後※縺・∪縺帙ｓ</p>';
            const advice = document.getElementById('ai-recommendations-content');
            if (advice) advice.innerHTML = '<div class="no-recommendations-message"><p class="message-text">逶ｮ讓吶ｒ險ｭ螳壹＠縺ｦ繝代・繧ｽ繝翫Λ繧､繧ｺ縺輔ｌ縺溘い繝峨ヰ繧､繧ｹ繧貞女縺大叙繧翫∪縺励ｇ縺・/p></div>';

            // AI繧ｳ繝ｼ繝√Φ繧ｰ縺ｮ繧ｭ繝｣繝・す繝･繧ょ炎髯､
            localStorage.removeItem('cached-coaching-advice');
            localStorage.removeItem('coaching-advice-update-time');

            // 繝・・繝槭ｒ繝・ヵ繧ｩ繝ｫ繝医↓謌ｻ縺・
            this.currentTheme = 'dark';
            this.applyTheme(this.currentTheme);

            this.showToast('繧｢繝励Μ繧貞・譛溷喧縺励∪縺励◆縲ゅ・繝ｼ繧ｸ繧貞・隱ｭ縺ｿ霎ｼ縺ｿ縺励∪縺吮ｦ', 'success');
            setTimeout(() => window.location.reload(), 600);
        } catch (e) {
            console.warn('Failed to reset app:', e);
            this.showToast('蛻晄悄蛹悶↓螟ｱ謨励＠縺ｾ縺励◆', 'error');
        }
    }

    // === 繝繝・す繝･繝懊・繝臥岼讓呵｡ｨ遉ｺ讖溯・ ===
    initDashboardGoals() {
        console.log('Initializing dashboard goals...');
        
        // 繧､繝吶Φ繝医Μ繧ｹ繝翫・險ｭ螳・
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
        
        // 逶ｮ讓吶ョ繝ｼ繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ
        this.loadDashboardGoals();
        
        // LocalStorage縺ｮ螟画峩繧堤屮隕・
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
            // 逶ｮ讓吶↑縺・
            goalsList.innerHTML = `
                <div class="no-goals-message">
                    <h4>逶ｮ讓吶′險ｭ螳壹＆繧後※縺・∪縺帙ｓ</h4>
                    <p>繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ蜷台ｸ翫・縺溘ａ縺ｮ逶ｮ讓吶ｒ險ｭ螳壹＠縺ｾ縺励ｇ縺・/p>
                    <button class="add-goal-btn" id="add-first-goal">譛蛻昴・逶ｮ讓吶ｒ霑ｽ蜉</button>
                </div>
            `;
            
            // 繧､繝吶Φ繝医Μ繧ｹ繝翫・蜀崎ｨｭ螳・
            const addFirstGoalBtn = document.getElementById('add-first-goal');
            if (addFirstGoalBtn) {
                addFirstGoalBtn.addEventListener('click', () => {
                    this.showPage('goals');
                    this.updateNavigation('goals');
                });
            }
            
            return;
        }
        
        // 逶ｮ讓吶ｒ繧ｽ繝ｼ繝茨ｼ域悄髯舌′霑代＞鬆・・ｲ謐励′菴弱＞鬆・ｼ・
        const sortedGoals = goals.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            const progressA = a.progress || 0;
            const progressB = b.progress || 0;
            
            // 譛滄剞縺瑚ｿ代＞鬆・
            if (dateA !== dateB) {
                return dateA - dateB;
            }
            
            // 騾ｲ謐励′菴弱＞鬆・
            return progressA - progressB;
        });
        
        // 譛螟ｧ3莉ｶ陦ｨ遉ｺ
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
                    <span class="goal-item-deadline">縲・${deadline}</span>
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
        return diffDays <= 7; // 7譌･莉･蜀・・邱頑･
    }
    
    setupGoalsStorageListener() {
        // LocalStorage縺ｮ螟画峩繧堤屮隕・
        window.addEventListener('storage', (e) => {
            if (e.key === 'goals') {
                this.loadDashboardGoals();
            }
        });
        
        // 蜷御ｸ繧ｿ繝門・縺ｧ縺ｮ螟画峩繧ら屮隕・
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

    // === 繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ謾ｯ謠ｴ讖溯・ ===
    initNavigationHelpers() {
        // 蛻・梵繧ｿ繝悶∈縺ｮ繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ
        const gotoAnalysisBtn = document.getElementById('goto-analysis');
        if (gotoAnalysisBtn) {
            gotoAnalysisBtn.addEventListener('click', () => {
                this.showPage('analysis');
                this.updateNavigation('analysis');
            });
        }
        
        // AI逕ｨ逶ｮ讓呵ｨｭ螳壹・繧ｿ繝ｳ
        const gotoGoalsForAIBtn = document.getElementById('goto-goals-for-ai');
        if (gotoGoalsForAIBtn) {
            gotoGoalsForAIBtn.addEventListener('click', () => {
                this.showPage('goals');
                this.updateNavigation('goals');
            });
        }
    }

    // === AI繧ｳ繝ｼ繝√Φ繧ｰ讖溯・ ===
    initAICoaching() {
        console.log('Initializing AI coaching...');
        
        // 繝ｪ繝輔Ξ繝・す繝･繝懊ち繝ｳ縺ｮ繧､繝吶Φ繝医Μ繧ｹ繝翫・
        const refreshCoachingBtn = document.getElementById('refresh-coaching');
        if (refreshCoachingBtn) {
            refreshCoachingBtn.addEventListener('click', () => {
                // 繝ｪ繝輔Ξ繝・す繝･繝懊ち繝ｳ縺梧款縺輔ｌ縺溷ｴ蜷医・繧ｭ繝｣繝・す繝･繧貞ｼｷ蛻ｶ蜑企勁
                localStorage.removeItem('cached-coaching-advice');
                localStorage.removeItem('coaching-advice-update-time');
                this.generateAIRecommendations();
            });
        }
        
        // 蛻晄悄縺ｮAI謗ｨ螂ｨ莠矩・ｒ繝ｭ繝ｼ繝会ｼ磯撼蜷梧悄・・
        this.loadAIRecommendations();
        
        // 逶ｮ讓吶・螟画峩繧堤屮隕悶＠縺ｦAI謗ｨ螂ｨ莠矩・ｒ譖ｴ譁ｰ
        this.setupAICoachingGoalsListener();
    }
    
    async loadAIRecommendations() {
        try {
            // 邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺ｮ貅門ｙ螳御ｺ・ｒ遒ｺ隱・
            await this.ensureUnifiedAPIManagerReady();
            
            const goalsData = localStorage.getItem('goals');
            const goals = goalsData ? JSON.parse(goalsData) : [];
            
            if (goals.length === 0) {
                this.showNoRecommendationsMessage();
            } else {
                // 縺ｾ縺壽里蟄倥・繧｢繝峨ヰ繧､繧ｹ縺後≠繧後・陦ｨ遉ｺ縲√↑縺代ｌ縺ｰ譁ｰ縺励￥逕滓・
                if (!this.loadExistingAdvice()) {
                    this.generateAIRecommendations();
                }
            }
        } catch (error) {
            console.warn('Failed to load AI recommendations:', error);
            this.showNoRecommendationsMessage();
        }
    }
    
    async ensureUnifiedAPIManagerReady() {
        // 邨ｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・蟆代＠蠕・▽
        let attempts = 0;
        const maxAttempts = 20;
        
        while (!window.unifiedApiManager && attempts < maxAttempts) {
            console.log(`竢ｳ Waiting for UnifiedAPIManager... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.unifiedApiManager) {
            console.warn('笞・・UnifiedAPIManager not available after waiting');
            return false;
        }
        
        // 縺輔ｉ縺ｫ蛻晄悄蛹悶′螳御ｺ・☆繧九∪縺ｧ蠕・▽
        attempts = 0;
        while ((!window.unifiedApiManager.isInitialized) && attempts < maxAttempts) {
            console.log(`竢ｳ Waiting for UnifiedAPIManager initialization... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.log('笨・UnifiedAPIManager is ready');
        return true;
    }

    loadExistingAdvice() {
        console.log('剥 loadExistingAdvice() called');
        const storedAdvice = localStorage.getItem('cached-coaching-advice');
        const updateTime = localStorage.getItem('coaching-advice-update-time');
        
        console.log('沈 Cached advice check:', {
            hasStoredAdvice: !!storedAdvice,
            hasUpdateTime: !!updateTime
        });
        
        if (!storedAdvice || !updateTime) {
            console.log('笶・No cached advice found, will generate new');
            return false;
        }

        try {
            const advice = JSON.parse(storedAdvice);
            const lastUpdate = new Date(updateTime);
            const now = new Date();
            
            // 24譎る俣莉･荳顔ｵ碁℃縺励※縺・ｋ蝣ｴ蜷医・繧ｭ繝｣繝・す繝･繧堤┌蜉ｹ蛹・
            const hoursElapsed = (now - lastUpdate) / (1000 * 60 * 60);
            console.log(`竢ｰ Cached advice age: ${hoursElapsed.toFixed(1)} hours`);
            
            if (hoursElapsed >= 24) {
                console.log('卵・・Cache expired (>24h), removing');
                localStorage.removeItem('cached-coaching-advice');
                localStorage.removeItem('coaching-advice-update-time');
                return false;
            }
            
            const recommendationsContent = document.getElementById('ai-recommendations-content');
            
            // API迥ｶ諷九′螟峨ｏ縺｣縺ｦ縺・ｋ蝣ｴ蜷茨ｼ医が繝輔Λ繧､繝ｳ竊偵が繝ｳ繝ｩ繧､繝ｳ縺ｾ縺溘・縺昴・騾・ｼ峨・繧ｭ繝｣繝・す繝･繧堤┌蜉ｹ蛹・
            const currentlyOnline = window.unifiedApiManager && window.unifiedApiManager.isConfigured();
            const cachedWasOffline = advice.html && advice.html.includes('offline');
            
            console.log('売 API state check:', {
                currentlyOnline: currentlyOnline,
                cachedWasOffline: cachedWasOffline
            });
            
            if (currentlyOnline && cachedWasOffline) {
                console.log('売 API is now online but cache was offline, regenerating');
                localStorage.removeItem('cached-coaching-advice');
                localStorage.removeItem('coaching-advice-update-time');
                return false;
            }
            
            if (recommendationsContent && advice.html) {
                // 譌｢蟄倥・HTML繧偵◎縺ｮ縺ｾ縺ｾ陦ｨ遉ｺ・域峩譁ｰ譌･譎ゅ・譌｢縺ｫ蜷ｫ縺ｾ繧後※縺・ｋ・・
                console.log('笨・Displaying cached advice');
                recommendationsContent.innerHTML = advice.html;
                return true;
            } else {
                console.log('笶・Missing recommendations content element or cached HTML');
            }
        } catch (error) {
            console.warn('Failed to load existing advice:', error);
            // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・繧ｭ繝｣繝・す繝･繧偵け繝ｪ繧｢
            localStorage.removeItem('cached-coaching-advice');
            localStorage.removeItem('coaching-advice-update-time');
        }
        
        return false;
    }
    
    showNoRecommendationsMessage() {
        const recommendationsContent = document.getElementById('ai-recommendations-content');
        if (recommendationsContent) {
            recommendationsContent.innerHTML = `
                <div class="no-recommendations-message">
                    <p class="message-text">逶ｮ讓吶ｒ險ｭ螳壹＠縺ｦ繝代・繧ｽ繝翫Λ繧､繧ｺ縺輔ｌ縺溘い繝峨ヰ繧､繧ｹ繧貞女縺大叙繧翫∪縺励ｇ縺・/p>
                    <button class="btn-secondary" id="goto-goals-for-ai">
                        逶ｮ讓吶ｒ險ｭ螳壹☆繧・
                    </button>
                </div>
            `;
            
            // 繝懊ち繝ｳ縺ｮ繧､繝吶Φ繝医Μ繧ｹ繝翫・蜀崎ｨｭ螳・
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
        console.log('売 generateAIRecommendations called');
        const refreshBtn = document.getElementById('refresh-coaching');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '竢ｳ';
        }
        
        try {
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const selectedGameData = JSON.parse(localStorage.getItem('selectedGameData') || '{}');
            
            console.log('投 Goals:', goals.length, 'Game:', selectedGameData.name);
            
            if (goals.length === 0) {
                console.log('笶・No goals found, showing no recommendations message');
                this.showNoRecommendationsMessage();
                return;
            }
            
            // Gemini API縺悟茜逕ｨ蜿ｯ閭ｽ縺九メ繧ｧ繝・け・育ｵｱ荳API繝槭ロ繝ｼ繧ｸ繝｣繝ｼ繧剃ｽｿ逕ｨ・・
            console.log('肌 API迥ｶ諷九メ繧ｧ繝・け:', {
                unifiedApiManagerExists: !!window.unifiedApiManager,
                isConfigured: window.unifiedApiManager ? window.unifiedApiManager.isConfigured() : false,
                apiKey: window.unifiedApiManager ? (window.unifiedApiManager.getAPIKey() ? '險ｭ螳壽ｸ医∩' : '譛ｪ險ｭ螳・) : '邂｡逅・す繧ｹ繝・Β辟｡縺・
            });
            
            if (!window.unifiedApiManager || !window.unifiedApiManager.isConfigured()) {
                console.log('肌 Using offline recommendations - API not configured');
                this.showOfflineRecommendations(goals, selectedGameData);
                return;
            }
            
            // 譛繧ょ━蜈亥ｺｦ縺ｮ鬮倥＞逶ｮ讓吶ｒ驕ｸ謚橸ｼ域悄髯舌′霑代＞縲・ｲ謐励′菴弱＞・・
            const priorityGoal = this.selectPriorityGoal(goals);
            
            // Gemini AI縺九ｉ繧｢繝峨ヰ繧､繧ｹ繧貞叙蠕・
            const prompt = this.generateCoachingPrompt(priorityGoal, selectedGameData);
            const response = await this.geminiService.sendChatMessage(prompt, false);
            
            this.renderAIRecommendations(response.response, priorityGoal);
            
            // 謌仙粥譎・ 繧ｨ繝ｩ繝ｼ繧ｫ繧ｦ繝ｳ繧ｿ繝ｼ繧偵Μ繧ｻ繝・ヨ
            this.consecutiveErrors = 0;
            this.lastSuccessfulAPICall = Date.now();
            
        } catch (error) {
            console.warn('AI recommendations generation failed:', error);
            
            // 繧ｨ繝ｩ繝ｼ譎・ 繧ｫ繧ｦ繝ｳ繧ｿ繝ｼ繧貞｢怜刈
            this.consecutiveErrors++;
            this.apiErrorCount++;
            
            // 騾｣邯壹お繝ｩ繝ｼ縺・蝗樔ｻ･荳翫・蝣ｴ蜷医・縺ｿ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
            if (this.consecutiveErrors >= 2) {
                this.showAIErrorMessage(error);
            } else {
                console.log(`売 First error (${this.consecutiveErrors}/2), retrying silently...`);
                // 譛蛻昴・繧ｨ繝ｩ繝ｼ縺ｯ髱吶°縺ｫ蜃ｦ逅・＠縲・遘貞ｾ後↓蜀崎ｩｦ陦・
                setTimeout(() => {
                    this.generateAIRecommendations();
                }, 3000);
                return; // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺ｯ陦ｨ遉ｺ縺帙★縲√が繝輔Λ繧､繝ｳ陦ｨ遉ｺ繧ゅせ繧ｭ繝・・
            }
            
            // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ: 繧ｪ繝輔Λ繧､繝ｳ謗ｨ螂ｨ莠矩・
            const goals = JSON.parse(localStorage.getItem('goals') || '[]');
            const selectedGameData = JSON.parse(localStorage.getItem('selectedGameData') || '{}');
            this.showOfflineRecommendations(goals, selectedGameData);
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '売';
            }
        }
    }

    // AI謗･邯壹お繝ｩ繝ｼ譎ゅ・繝ｦ繝ｼ繧ｶ繝ｼ蜷代￠繝｡繝・そ繝ｼ繧ｸ陦ｨ遉ｺ
    showAIErrorMessage(error) {
        const errorContainer = document.querySelector('#ai-coaching .card-content');
        if (!errorContainer) return;

        let userMessage = '';
        let retryMessage = '';
        let isRetryable = true;

        // 騾｣邯壹お繝ｩ繝ｼ蝗樊焚繧偵Γ繝・そ繝ｼ繧ｸ縺ｫ蜿肴丐
        const errorContext = this.consecutiveErrors > 2 ? '・育ｶ咏ｶ夂噪縺ｪ蝠城｡鯉ｼ・ : '';

        // 繧ｨ繝ｩ繝ｼ縺ｮ遞ｮ鬘槭↓繧医▲縺ｦ繝｡繝・そ繝ｼ繧ｸ繧貞､画峩
        if (error.message.includes('驕手ｲ闕ｷ') || error.message.includes('overloaded') || error.message.includes('503')) {
            userMessage = `売 Gemini AI繧ｵ繝ｼ繝薙せ縺御ｸ譎ら噪縺ｫ豺ｷ髮台ｸｭ${errorContext}`;
            retryMessage = `<span id="retry-countdown">60</span>遘貞ｾ後↓閾ｪ蜍慕噪縺ｫ蜀崎ｩｦ陦後＠縺ｾ縺・.. (繧ｨ繝ｩ繝ｼ蝗樊焚: ${this.consecutiveErrors})`;
            // 驕手ｲ闕ｷ繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・0遘貞ｾ後↓閾ｪ蜍輔Μ繝医Λ繧､・医き繧ｦ繝ｳ繝医ム繧ｦ繝ｳ莉倥″・・
            let countdown = 60;
            const countdownTimer = setInterval(() => {
                countdown--;
                const countdownElement = document.getElementById('retry-countdown');
                if (countdownElement) {
                    countdownElement.textContent = countdown;
                }
                if (countdown <= 0) {
                    clearInterval(countdownTimer);
                }
            }, 1000);

            setTimeout(() => {
                console.log('売 Auto-retry after 503 error (60s delay)...');
                clearInterval(countdownTimer);
                this.generateAIRecommendations();
            }, 60000);
        } else if (error.message.includes('繧ｯ繧ｩ繝ｼ繧ｿ') || error.message.includes('quota') || error.message.includes('429')) {
            userMessage = '笞・・API蛻ｩ逕ｨ蛻ｶ髯舌↓驕斐＠縺ｾ縺励◆';
            retryMessage = '1譎る俣蠕後↓蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞';
            isRetryable = false;
        } else if (error.message.includes('API繧ｭ繝ｼ') || error.message.includes('401') || error.message.includes('403')) {
            userMessage = '泊 API繧ｭ繝ｼ縺ｫ蝠城｡後′縺ゅｊ縺ｾ縺・;
            retryMessage = '險ｭ螳壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞';
            isRetryable = false;
        } else if (error.message.includes('繝阪ャ繝医Ρ繝ｼ繧ｯ')) {
            userMessage = '倹 繧､繝ｳ繧ｿ繝ｼ繝阪ャ繝域磁邯壹ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞';
            retryMessage = '謗･邯壼ｾｩ譌ｧ蠕後↓閾ｪ蜍慕噪縺ｫ蜀崎ｩｦ陦後＠縺ｾ縺・;
        } else {
            userMessage = '笶・AI謗･邯壹↓蝠城｡後′逋ｺ逕溘＠縺ｾ縺励◆';
            retryMessage = '縺励・繧峨￥蠕・▲縺ｦ縺九ｉ蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞';
        }

        // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
        const errorHTML = `
            <div class="ai-error-message" style="
                background: linear-gradient(135deg, #ff6b6b, #ffa500);
                color: white;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 15px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
            ">
                <h4 style="margin: 0 0 8px 0;">${userMessage}</h4>
                <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">${retryMessage}</p>
                ${isRetryable ? `
                    <button id="manual-retry-btn" style="
                        margin-top: 10px;
                        padding: 8px 16px;
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        border-radius: 20px;
                        cursor: pointer;
                        font-size: 0.8em;
                    " onclick="app.generateAIRecommendations()">
                        莉翫☆縺仙・隧ｦ陦・
                    </button>
                ` : ''}
            </div>
        `;

        // 譌｢蟄倥・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧貞炎髯､縺励※縺九ｉ譁ｰ縺励＞繧ゅ・繧定ｿｽ蜉
        const existingError = errorContainer.querySelector('.ai-error-message');
        if (existingError) {
            existingError.remove();
        }
        errorContainer.insertAdjacentHTML('afterbegin', errorHTML);
    }
    
    selectPriorityGoal(goals) {
        // 譛滄剞縺瑚ｿ代＞鬆・・ｲ謐励′菴弱＞鬆・〒繧ｽ繝ｼ繝・
        return goals.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            const progressA = a.progress || 0;
            const progressB = b.progress || 0;
            
            // 譛滄剞縺瑚ｿ代＞鬆・
            if (Math.abs(dateA - dateB) > 24 * 60 * 60 * 1000) {
                return dateA - dateB;
            }
            
            // 騾ｲ謐励′菴弱＞鬆・
            return progressA - progressB;
        })[0];
    }
    
    generateCoachingPrompt(goal, gameData) {
        const gameName = gameData.name || 'eSports';
        const progress = goal.progress || 0;
        const deadline = new Date(goal.deadline).toLocaleDateString('ja-JP');
        
        return `縺ゅ↑縺溘・eSports繧ｳ繝ｼ繝√Φ繧ｰ縺ｮ蟆る摩螳ｶ縺ｧ縺吶・
莉･荳九・逶ｮ讓吶↓蟇ｾ縺励※縲∝・菴鍋噪縺ｧ螳溯ｷｵ逧・↑繧｢繝峨ヰ繧､繧ｹ繧呈署萓帙＠縺ｦ縺上□縺輔＞縲・

繧ｲ繝ｼ繝: ${gameName}
逶ｮ讓・ ${goal.title}
譛滄剞: ${deadline}
迴ｾ蝨ｨ縺ｮ騾ｲ謐・ ${progress}%

莉･荳九・蠖｢蠑上〒譌･譛ｬ隱槭〒邁｡貎斐↓蝗樒ｭ斐＠縺ｦ縺上□縺輔＞・・
1. 蜈ｷ菴鍋噪縺ｪ陦悟虚謖・・・・0譁・ｭ嶺ｻ･蜀・ｼ・
2. 縺ｪ縺懊◎繧後′蜉ｹ譫懃噪縺具ｼ・00譁・ｭ嶺ｻ･蜀・ｼ・
3. 莉頑律螳溯ｷｵ縺ｧ縺阪ｋ縺薙→・・0譁・ｭ嶺ｻ･蜀・ｼ荏;
    }
    
    // AI蠢懃ｭ斐ｒ蝣・欧縺ｫ隗｣譫舌＠縺ｦ3隕∫ｴ縺ｫ蛻・ｧ｣・井ｸ崎ｶｳ譎ゅ・null繧定ｿ斐☆・・
    parseAIAdvice(aiResponse) {
        if (!aiResponse || typeof aiResponse !== 'string') {
            return { actionPlan: null, effectiveness: null, todayAction: null };
        }

        // 縺ｾ縺壹さ繝ｼ繝峨ヶ繝ｭ繝・け蜀・・JSON繧貞━蜈育噪縺ｫ謚ｽ蜃ｺ・・I縺繰SON縺ｧ霑斐☆繧ｱ繝ｼ繧ｹ縺ｫ蟇ｾ蠢懶ｼ・
        try {
            const jsonBlockMatch = aiResponse.match(/```(?:json)?\n([\s\S]*?)```/i);
            const raw = jsonBlockMatch ? jsonBlockMatch[1] : aiResponse;
            const possibleJson = raw.trim().startsWith('{') || raw.trim().startsWith('[');
            if (possibleJson) {
                const data = JSON.parse(raw);
                const obj = Array.isArray(data) ? data[0] : data;
                const ap = obj.actionPlan || obj.action || obj.action_plan || obj.plan;
                const eff = obj.effectiveness || obj.reason || obj.why;
                const ta = obj.todayAction || obj.nextAction || obj.today || obj.action_today;
                if (ap || eff || ta) {
                    return {
                        actionPlan: ap || null,
                        effectiveness: eff || null,
                        todayAction: ta || null
                    };
                }
            }
        } catch (_) {
            // JSON縺ｧ縺ｯ縺ｪ縺九▲縺溷ｴ蜷医・騾壼ｸｸ隗｣譫舌↓繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
        }

        const text = aiResponse
            // Markdown 逧・↑蠑ｷ隱ｿ縺ｪ縺ｩ繧帝勁蜴ｻ
            .replace(/\*\*|__|`|\*|>\s?/g, '')
            .replace(/\r/g, '')
            .trim();

        const lines = text.split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const pickByNumber = (n) => {
            try {
                // 1 / 1. / 1) / 1・・ 1- 縺ｪ縺ｩ繧定ｨｱ螳ｹ
                const re = new RegExp(`^${n}[\\s\\.縲・\)\\]縲・・喀\-]*(.+)$`);
                for (const l of lines) {
                    const m = l.match(re);
                    if (m && m[1]) return m[1].trim();
                }
                // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
                for (const l of lines) {
                    if (l.startsWith(n.toString())) {
                        const content = l.substring(1).replace(/^[\s\.縲・)\]縲・・喀-]+/, '').trim();
                        if (content) return content;
                    }
                }
            } catch (error) {
                console.warn('豁｣隕剰｡ｨ迴ｾ繧ｨ繝ｩ繝ｼ:', error);
            }
            return null;
        };

        const pickByLabel = (labels) => {
            // 繝ｩ繝吶Ν縺ｮ豁｣隕剰｡ｨ迴ｾ繧貞ｮ牙・縺ｫ讒狗ｯ峨＠縲∝・鬆ｭ/繧ｳ繝ｭ繝ｳ/繝繝・す繝･/遨ｺ逋ｽ繧定ｨｱ螳ｹ
            const re = new RegExp(`^(?:${labels.map(escapeRegExp).join('|')})[\\s:・喀-]+(.+)$`);
            for (const l of lines) {
                const m = l.match(re);
                if (m && m[1]) return m[1].trim();
            }
            // 陦後・騾比ｸｭ縺ｫ繝ｩ繝吶Ν縺後≠繧九こ繝ｼ繧ｹ・井ｾ・ 縲瑚｡悟虚謖・・: xxx縲搾ｼ・
            for (const l of lines) {
                for (const label of labels) {
                    const idx = l.indexOf(label);
                    if (idx >= 0) {
                        const tail = l.substring(idx + label.length).replace(/^[\s:・喀-]+/, '').trim();
                        if (tail) return tail;
                    }
                }
            }
            return null;
        };

        let actionPlan = pickByNumber(1) || pickByLabel(['陦悟虚謖・・', '陦悟虚險育判', '繧｢繧ｯ繧ｷ繝ｧ繝ｳ繝励Λ繝ｳ']);
        let effectiveness = pickByNumber(2) || pickByLabel(['蜉ｹ譫懊・逅・罰', '縺ｪ縺懊◎繧後′蜉ｹ譫懃噪縺・, '逅・罰']);
        let todayAction = pickByNumber(3) || pickByLabel(['莉頑律繧・ｋ縺薙→', '莉頑律螳溯ｷｵ縺ｧ縺阪ｋ縺薙→', '谺｡縺ｮ荳豁ｩ', 'Next Action']);

        // 蜈磯ｭ縺ｮ邂・擅譖ｸ縺崎ｨ伜捷縺ｪ縺ｩ繧帝勁蜴ｻ
        const clean = (s) => s && s
            .replace(/^[\-繝ｻ\u2022\u25CF\u30fb\s]+/, '')
            .replace(/^\.*\s*/, '')
            .trim();

        actionPlan = clean(actionPlan);
        effectiveness = clean(effectiveness);
        todayAction = clean(todayAction);

        // 譏弱ｉ縺九↑繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繝ｻ辟｡蜀・ｮｹ縺ｮ讀懷・
        const looksPlaceholder = (s) => !s || s.length < 5 || /(蜈ｷ菴鍋噪縺ｪ|縺ｪ縺懊◎繧後′|螳溯ｷｵ縺ｧ縺阪ｋ縺薙→)\s*$/.test(s);
        if (looksPlaceholder(actionPlan)) actionPlan = null;
        if (looksPlaceholder(effectiveness)) effectiveness = null;
        if (looksPlaceholder(todayAction)) todayAction = null;

        return { actionPlan, effectiveness, todayAction };
    }

    renderAIRecommendations(aiResponse, goal) {
        const recommendationsContent = document.getElementById('ai-recommendations-content');
        if (!recommendationsContent) return;

        // 謌仙粥譎・ 譌｢蟄倥・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧貞炎髯､
        const existingError = recommendationsContent.querySelector('.ai-error-message');
        if (existingError) {
            existingError.remove();
        }

        // 隗｣譫撰ｼ井ｸ崎ｶｳ譎ゅ・蠕後〒驛ｨ蛻・｣懷ｮ鯉ｼ・
        const parsed = this.parseAIAdvice(aiResponse);

        let actionPlan = parsed.actionPlan;
        let effectiveness = parsed.effectiveness;
        let todayAction = parsed.todayAction;

        // 驛ｨ蛻・が繝輔Λ繧､繝ｳ陬懷ｮ後・荳崎ｦ・ AI縺瑚ｿ斐＠縺溷・螳ｹ縺ｮ縺ｿ繧剃ｽｿ逕ｨ・域ｬ謳阪・謠冗判繧ｹ繧ｭ繝・・・・
        // 遨ｺ隕∫ｴ縺ｯ謠冗判縺励↑縺・婿驥晢ｼ亥ｮ壼梛譁・・謖ｿ蜈･縺励↑縺・ｼ・
        actionPlan = actionPlan && String(actionPlan).trim();
        effectiveness = effectiveness && String(effectiveness).trim();
        todayAction = todayAction && String(todayAction).trim();

        // 譖ｴ譁ｰ譌･譎ゅｒ菫晏ｭ・
        const updateTime = new Date().toLocaleString('ja-JP');
        localStorage.setItem('coaching-advice-update-time', updateTime);

        // 謠冗判逕ｨ縺ｮ鬆・岼繧貞虚逧・↓邨・∩遶九※・育ｩｺ縺ｯ謠冗判縺励↑縺・ｼ・
        const items = [];
        if (actionPlan) {
            items.push(`
                <div class="advice-item">
                    <h4>庁 陦悟虚謖・・</h4>
                    <p>${actionPlan}</p>
                </div>
            `);
        }
        if (effectiveness) {
            items.push(`
                <div class="advice-item">
                    <h4>剥 蜉ｹ譫懊・逅・罰</h4>
                    <p>${effectiveness}</p>
                </div>
            `);
        }
        if (todayAction) {
            items.push(`
                <div class="advice-item today-action">
                    <h4>笞｡ 莉頑律繧・ｋ縺薙→</h4>
                    <p>${todayAction}</p>
                </div>
            `);
        }

        // 縺吶∋縺ｦ遨ｺ縺ｪ繧画緒逕ｻ繧定｡後ｏ縺壹↓繝ｪ繧ｿ繝ｼ繝ｳ・域里蟄倩｡ｨ遉ｺ繧堤ｶｭ謖・ｼ・
        if (items.length === 0) {
            console.warn('No advice items to render (all empty). Skipping UI update.');
            return;
        }

        const adviceHTML = `
            <div class="coaching-advice-card">
                <div class="advice-header">
                    <div class="goal-focus">
                        <span class="goal-icon">識</span>
                        <span class="goal-title">逶ｮ讓・ ${goal.title}</span>
                    </div>
                    <div class="goal-deadline">譛滄剞: ${new Date(goal.deadline).toLocaleDateString('ja-JP')}</div>
                </div>
                <div class="advice-update-time">
                    <span class="update-label">譛邨よ峩譁ｰ:</span>
                    <span class="update-time">${updateTime}</span>
                </div>
                <div class="advice-content">
                    ${items.join('\n')}
                </div>
            </div>
        `;

        recommendationsContent.innerHTML = adviceHTML;
        
        // 繧｢繝峨ヰ繧､繧ｹ蜀・ｮｹ繧偵く繝｣繝・す繝･縺ｫ菫晏ｭ・
        localStorage.setItem('cached-coaching-advice', JSON.stringify({
            html: adviceHTML,
            timestamp: Date.now()
        }));
    }    showOfflineRecommendations(goals, gameData) {
        // 逶ｮ讓吶′繧ｼ繝ｭ縺ｮ蝣ｴ蜷医・蠕捺擂縺ｮ縲檎岼讓吶ｒ險ｭ螳壹＠縺ｦ窶ｦ縲阪ｒ陦ｨ遉ｺ
        if (!goals || goals.length === 0) {
            this.showNoRecommendationsMessage();
            return;
        }

        // 繧ｪ繝輔Λ繧､繝ｳ縺ｮ縺溘ａ繧｢繝峨ヰ繧､繧ｹ縺ｯ陦ｨ遉ｺ縺励↑縺・婿驥・
        const updateTime = new Date().toLocaleString('ja-JP');
        localStorage.setItem('coaching-advice-update-time', updateTime);

        const recommendationsContent = document.getElementById('ai-recommendations-content');
        if (recommendationsContent) {
            const adviceHTML = `
                <div class="coaching-advice-card offline">
                    <div class="advice-header">
                        <div class="goal-focus">
                            <span class="goal-icon">識</span>
                            <span class="goal-title">AI繧｢繝峨ヰ繧､繧ｹ繧定｡ｨ遉ｺ縺ｧ縺阪∪縺帙ｓ</span>
                        </div>
                        <div class="offline-indicator">繧ｪ繝輔Λ繧､繝ｳ縺ｾ縺溘・API譛ｪ險ｭ螳・/div>
                    </div>
                    <div class="advice-update-time">
                        <span class="update-label">譛邨ら｢ｺ隱・</span>
                        <span class="update-time">${updateTime}</span>
                    </div>
                    <div class="advice-content">
                        <div class="advice-item">
                            <h4>邃ｹ・・縺疲｡亥・</h4>
                            <p>迴ｾ蝨ｨ繧ｪ繝輔Λ繧､繝ｳ縲√∪縺溘・ Gemini API 繧ｭ繝ｼ縺梧悴險ｭ螳壹・縺溘ａ縲√さ繝ｼ繝√Φ繧ｰ繧｢繝峨ヰ繧､繧ｹ繧定｡ｨ遉ｺ縺ｧ縺阪∪縺帙ｓ縲・PI繧定ｨｭ螳壼ｾ後↓蜀榊ｺｦ縺願ｩｦ縺励￥縺縺輔＞縲・/p>
                        </div>
                    </div>
                    <div class="api-setup-suggestion">
                        <p>Gemini API繧定ｨｭ螳壹＠縺ｦ縲√ヱ繝ｼ繧ｽ繝翫Λ繧､繧ｺ縺輔ｌ縺溘い繝峨ヰ繧､繧ｹ繧貞女縺大叙繧翫∪縺励ｇ縺・・/p>
                        <button class="btn-secondary" id="goto-api-setup">API險ｭ螳・/button>
                    </div>
                </div>
            `;

            recommendationsContent.innerHTML = adviceHTML;

            // API險ｭ螳壹・繧ｿ繝ｳ縺ｮ繧､繝吶Φ繝医ｒ莉倅ｸ・
            const setupBtn = document.getElementById('goto-api-setup');
            if (setupBtn) {
                setupBtn.addEventListener('click', () => {
                    try {
                        this.showPage('settings');
                        this.updateNavigation('settings');
                        // 蛻晄悄險ｭ螳壹Δ繝ｼ繝繝ｫ縺悟ｿ・ｦ√↑繧芽｡ｨ遉ｺ
                        const needsSetup = !window.unifiedApiManager || !window.unifiedApiManager.isConfigured();
                        if (needsSetup) {
                            this.showInitialAPISetupModal();
                            this.setupInitialAPIModalListeners();
                        }
                    } catch (e) {
                        console.debug('Failed to open API setup:', e);
                    }
                });
            }

            // 陦ｨ遉ｺ繧偵く繝｣繝・す繝･縺ｫ菫晏ｭ・
            localStorage.setItem('cached-coaching-advice', JSON.stringify({
                html: adviceHTML,
                timestamp: Date.now()
            }));
        }
    }
    
    getOfflineAdvice(goal, gameName) {
        console.log('識 getOfflineAdvice called for game:', gameName);
        // 譌･莉倥・繝ｼ繧ｹ縺ｧ螟牙喧縺吶ｋ繧｢繝峨ヰ繧､繧ｹ縺ｮ逕滓・
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=譌･譖・ 1=譛域屆, ...
        const dateHash = today.getDate() + today.getMonth(); // 譌･莉倥・繝ｼ繧ｹ縺ｮ繝上ャ繧ｷ繝･
        console.log('套 Date hash:', dateHash, 'Day:', dayOfWeek);
        
        // 繧ｲ繝ｼ繝蝗ｺ譛峨・隍・焚縺ｮ繧｢繝峨ヰ繧､繧ｹ繝・Φ繝励Ξ繝ｼ繝・
        const gameAdvicePool = {
            'League of Legends': [
                {
                    actionPlan: 'CS縺ｮ邊ｾ蠎ｦ繧貞髄荳翫＠縲・0蛻・凾轤ｹ縺ｧ縺ｮ逶ｮ讓吶ｒ80縺ｫ險ｭ螳壹＠縺ｾ縺励ｇ縺・,
                    effectiveness: 'CS縺ｯ螳牙ｮ壹＠縺滄≡蜿主・縺ｮ蝓ｺ逶､縺ｧ縲√Ξ繝ｼ繝井ｸ頑・縺ｫ逶ｴ邨舌＠縺ｾ縺・,
                    todayAction: '繧ｫ繧ｹ繧ｿ繝繧ｲ繝ｼ繝縺ｧ15蛻・俣縺ｮ繝輔ぃ繝ｼ繝邱ｴ鄙偵ｒ2繧ｻ繝・ヨ'
                },
                {
                    actionPlan: '繝ｯ繝ｼ繝峨・驟咲ｽｮ菴咲ｽｮ繧呈怙驕ｩ蛹悶＠縲∬ｦ也阜遒ｺ菫昴ｒ謾ｹ蝟・＠縺ｾ縺励ｇ縺・,
                    effectiveness: '繝槭ャ繝励さ繝ｳ繝医Ο繝ｼ繝ｫ縺ｯ蛻､譁ｭ蜉帙→繝昴ず繧ｷ繝ｧ繝九Φ繧ｰ繧貞､ｧ蟷・↓謾ｹ蝟・＠縺ｾ縺・,
                    todayAction: '繝ｯ繝ｼ繝蛾・鄂ｮ縺ｮ繧ｻ繧ｪ繝ｪ繝ｼ繧・縺､隕壹∴縲・隧ｦ蜷医〒螳溯ｷｵ'
                },
                {
                    actionPlan: '繝√・繝繝輔ぃ繧､繝医〒縺ｮ繝昴ず繧ｷ繝ｧ繝九Φ繧ｰ繧呈э隴倥＠縺ｾ縺励ｇ縺・,
                    effectiveness: '豁｣縺励＞繝昴ず繧ｷ繝ｧ繝ｳ縺ｯ逕溷ｭ倡紫縺ｨ蠖ｱ髻ｿ蜉帙ｒ蜷梧凾縺ｫ蜷台ｸ翫＆縺帙∪縺・,
                todayAction: '骭ｲ逕ｻ繧定ｦ九↑縺後ｉ繝輔ぃ繧､繝医〒縺ｮ遶九■菴咲ｽｮ繧貞・譫・
                },
                {
                    actionPlan: '繝槭ャ繝励・繧ｿ繧､繝溘Φ繧ｰ繧呈э隴倥＠縲√お繝ｳ繧ｲ繝ｼ繧ｸ縺ｮ繧ｿ繧､繝溘Φ繧ｰ繧呈隼蝟・＠縺ｾ縺励ｇ縺・,
                    effectiveness: '繧ｲ繝ｼ繝逅・ｧ｣縺ｮ豺ｱ蛹悶・蛟倶ｺｺ謚莉･荳翫↓蜍晏茜縺ｫ雋｢迪ｮ縺励∪縺・,
                    todayAction: '繝溘ル繝槭ャ繝励ｒ3遘偵♀縺阪↓繝√ぉ繝・け縺吶ｋ鄙呈・繧・隧ｦ蜷医〒螳溯ｷｵ'
                }
            ],
            'Valorant': [
                {
                    actionPlan: '繧ｯ繝ｭ繧ｹ繝倥い驟咲ｽｮ縺ｮ蝓ｺ譛ｬ繧貞ｾｹ蠎輔＠縲√・繝ｪ繧ｨ繧､繝繧堤ｿ呈・蛹悶＠縺ｾ縺励ｇ縺・,
                    effectiveness: '豁｣遒ｺ縺ｪ繧ｯ繝ｭ繧ｹ繝倥い驟咲ｽｮ縺ｯ蜿榊ｿ憺溷ｺｦ縺ｨ邊ｾ蠎ｦ繧貞酔譎ゅ↓蜷台ｸ翫＆縺帙∪縺・,
                    todayAction: '繝ｬ繝ｳ繧ｸ縺ｧ隗貞ｺｦ繧呈э隴倥＠縺溘け繝ｭ繧ｹ繝倥い邱ｴ鄙・5蛻・
                },
                {
                    actionPlan: '繝槭ャ繝励・螳夂浹繝昴ず繧ｷ繝ｧ繝ｳ縺ｨ隗貞ｺｦ繧定ｦ壹∴縺ｦ豢ｻ逕ｨ縺励∪縺励ｇ縺・,
                    effectiveness: '繝槭ャ繝礼衍隴倥・謌ｦ陦鍋噪蜆ｪ菴肴ｧ繧堤函縺ｿ縲∝享邇・髄荳翫↓逶ｴ邨舌＠縺ｾ縺・,
                    todayAction: '莉頑律縺ｮ繝槭ャ繝励ｒ1縺､驕ｸ繧薙〒縲∵眠縺励＞繝昴ず繧ｷ繝ｧ繝ｳ繧・縺､邱ｴ鄙・
                },
                {
                    actionPlan: '繝√・繝繧ｳ繝溘Η繝九こ繝ｼ繧ｷ繝ｧ繝ｳ縺ｨ繧ｳ繝ｼ繝ｫ邊ｾ蠎ｦ繧貞髄荳翫＆縺帙∪縺励ｇ縺・,
                    effectiveness: '繝√・繝謌ｦ縺ｧ縺ｯ諠・ｱ蜈ｱ譛峨′蛟倶ｺｺ謚莉･荳翫↓驥崎ｦ√↑隕∫ｴ縺ｧ縺・,
                    todayAction: '邁｡貎斐〒豁｣遒ｺ縺ｪ繧ｳ繝ｼ繝ｫ繧貞ｿ・′縺代◆隧ｦ蜷医ｒ3謌ｦ繝励Ξ繧､'
                }
            ],
            'Overwatch 2': [
                {
                    actionPlan: '繝ｭ繝ｼ繝ｫ逅・ｧ｣繧呈ｷｱ繧√√メ繝ｼ繝騾｣謳ｺ縺ｨ繝昴ず繧ｷ繝ｧ繝九Φ繧ｰ繧呈隼蝟・＠縺ｾ縺励ｇ縺・,
                    effectiveness: '繝√・繝謌ｦ縺碁㍾隕√↑繧ｲ繝ｼ繝縺ｧ縺ｯ蛟倶ｺｺ謚繧医ｊ騾｣謳ｺ縺悟享謨励ｒ豎ｺ繧√∪縺・,
                    todayAction: '閾ｪ蛻・・繝ｭ繝ｼ繝ｫ縺ｮ雋ｬ莉ｻ繧呈紛逅・＠縲√さ繝溘Η繝九こ繝ｼ繧ｷ繝ｧ繝ｳ繧呈э隴倥＠縺溯ｩｦ蜷医ｒ3謌ｦ'
                }
            ]
        };
        
        // 繝・ヵ繧ｩ繝ｫ繝医い繝峨ヰ繧､繧ｹ・医ご繝ｼ繝縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷茨ｼ・
        const defaultAdvice = [
            {
                actionPlan: '蝓ｺ遉守ｷｴ鄙偵ｒ邯咏ｶ壹＠縲∬ｩｦ蜷医・謖ｯ繧願ｿ斐ｊ繧貞ｮ壽悄逧・↓陦後＞縺ｾ縺励ｇ縺・,
                effectiveness: '邯咏ｶ夂噪縺ｪ謾ｹ蝟・し繧､繧ｯ繝ｫ縺後せ繧ｭ繝ｫ蜷台ｸ翫・骰ｵ縺ｧ縺・,
                todayAction: '莉頑律縺ｮ隧ｦ蜷医ｒ1蝗樣鹸逕ｻ縺励※蠕後〒隕玖ｿ斐☆貅門ｙ'
            },
            {
                actionPlan: '逶ｮ讓吶ｒ蜈ｷ菴鍋噪縺ｪ蟆冗岼讓吶↓蛻・ｧ｣縺励∵律縲・・騾ｲ謐励ｒ貂ｬ螳壹＠縺ｾ縺励ｇ縺・,
                effectiveness: '譏守｢ｺ縺ｪ謖・ｨ吶′縺ゅｋ縺薙→縺ｧ蜷台ｸ雁ｺｦ蜷医＞縺悟庄隕門喧縺輔ｌ縺ｾ縺・,
                todayAction: '莉翫・閾ｪ蛻・・蠑ｱ轤ｹ繧・縺､迚ｹ螳壹＠縲∵隼蝟・婿豕輔ｒ隱ｿ縺ｹ繧・
            },
            {
                actionPlan: '邊ｾ逾樒噪縺ｪ繧ｳ繝ｳ繝・ぅ繧ｷ繝ｧ繝ｳ邂｡逅・ｒ諢剰ｭ倥＠縺ｾ縺励ｇ縺・,
                effectiveness: '繝｡繝ｳ繧ｿ繝ｫ髱｢縺ｮ螳牙ｮ壹・荳雋ｫ縺励◆繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ縺ｮ蝓ｺ逶､縺ｧ縺・,
                todayAction: '5蛻・俣縺ｮ豺ｱ蜻ｼ蜷ｸ縺ｨ繝昴ず繝・ぅ繝悶↑閾ｪ蟾ｱ證礼､ｺ繧定ｩｦ蜷亥燕縺ｫ螳滓命'
            }
        ];
        
        // 繧ｲ繝ｼ繝蝗ｺ譛峨・繧｢繝峨ヰ繧､繧ｹ繝ｪ繧ｹ繝医ｒ蜿門ｾ・
        const adviceList = gameAdvicePool[gameName] || defaultAdvice;
        
        // 譌･莉倥・繝ｼ繧ｹ縺ｧ繧｢繝峨ヰ繧､繧ｹ繧帝∈謚橸ｼ亥酔縺俶律縺ｪ繧牙酔縺倥い繝峨ヰ繧､繧ｹ・・
        const selectedIndex = dateHash % adviceList.length;
        const selectedAdvice = adviceList[selectedIndex];
        
        console.log('笨・Selected advice index:', selectedIndex, 'from', adviceList.length, 'options');
        console.log('統 Selected advice:', selectedAdvice.actionPlan);
        
        return selectedAdvice;
    }
    
    setupAICoachingGoalsListener() {
        // LocalStorage縺ｮ逶ｮ讓吝､画峩繧堤屮隕悶＠縺ｦAI謗ｨ螂ｨ莠矩・ｒ譖ｴ譁ｰ
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
    
    // Gemini API迥ｶ諷九・蜀阪メ繧ｧ繝・け・磯℃雋闕ｷ隗｣豸亥ｾ鯉ｼ・
    async recheckGeminiAPI() {
        if (!window.unifiedApiManager?.isConfigured()) {
            return;
        }
        
        try {
            console.log('売 Gemini API迥ｶ諷九ｒ蜀阪メ繧ｧ繝・け荳ｭ...');
            await window.unifiedApiManager.validateAPIKey();
            this.showToast('笨・Gemini API縺悟ｾｩ譌ｧ縺励∪縺励◆・、I讖溯・縺悟茜逕ｨ蜿ｯ閭ｽ縺ｫ縺ｪ繧翫∪縺励◆縲・, 'success');
            console.log('笨・Gemini API蠕ｩ譌ｧ繧堤｢ｺ隱・);
        } catch (error) {
            console.log('笞・・Gemini API縺ｯ縺ｾ縺驕手ｲ闕ｷ荳ｭ:', error.message);
            // 縺ｾ縺驕手ｲ闕ｷ荳ｭ縺ｮ蝣ｴ蜷医√＆繧峨↓5蛻・ｾ後↓蜀阪メ繧ｧ繝・け
            if (error.message.includes('驕手ｲ闕ｷ') || error.message.includes('overloaded')) {
                setTimeout(() => {
                    this.recheckGeminiAPI();
                }, 5 * 60 * 1000); // 縺輔ｉ縺ｫ5蛻・ｾ・
            }
        }
    }
}

// 繧｢繝励Μ縺ｮ襍ｷ蜍・
const app = new App();

// Export for global access
window.app = app;


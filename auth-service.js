// auth-service.js - 認証サービス
class AuthService {
  constructor() {
    this.currentUser = null;
    this.users = JSON.parse(localStorage.getItem('users')) || {};
    this.isGuest = false;
    this.guestData = {};
  }

  register(username, password, email) {
    if (this.users[username]) {
      return { success: false, message: 'ユーザー名は既に使用されています' };
    }
    
    const userId = 'user_' + Date.now();
    const hashedPassword = this.hashPassword(password);
    
    this.users[username] = {
      id: userId,
      username: username,
      email: email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      games: [],
      settings: {},
      data: {}
    };
    
    localStorage.setItem('users', JSON.stringify(this.users));
    return { success: true, userId: userId };
  }

  login(username, password) {
    const user = this.users[username];
    if (!user || user.password !== this.hashPassword(password)) {
      return { success: false, message: 'ユーザー名またはパスワードが正しくありません' };
    }
    
    this.currentUser = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return { success: true, user: user };
  }

  logout() {
    this.currentUser = null;
    this.isGuest = false;
    this.guestData = {};
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('isGuest');
  }

  loginAsGuest() {
    this.isGuest = true;
    this.currentUser = {
      id: 'guest',
      username: 'ゲストユーザー',
      isGuest: true
    };
    this.guestData = {};
    sessionStorage.setItem('isGuest', 'true');
    sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    return { success: true, user: this.currentUser };
  }

  getCurrentUser() {
    if (!this.currentUser) {
      const stored = sessionStorage.getItem('currentUser');
      const isGuestStored = sessionStorage.getItem('isGuest');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        this.isGuest = isGuestStored === 'true';
      }
    }
    return this.currentUser;
  }

  hashPassword(password) {
    // 簡易的なハッシュ処理（本番環境では適切なハッシュ化を使用）
    return btoa(password);
  }

  saveUserData(key, data) {
    if (!this.currentUser) return false;
    
    if (this.isGuest) {
      // ゲストの場合はセッションストレージのみに保存
      this.guestData[key] = data;
      return true;
    }
    
    this.currentUser.data[key] = data;
    this.users[this.currentUser.username] = this.currentUser;
    localStorage.setItem('users', JSON.stringify(this.users));
    sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    return true;
  }

  getUserData(key) {
    if (!this.currentUser) return null;
    
    if (this.isGuest) {
      return this.guestData[key] || null;
    }
    
    return this.currentUser.data[key] || null;
  }

  isGuestUser() {
    return this.isGuest;
  }
}
// store.js - Firebase Firestore版

const firebaseConfig = {
  apiKey: "AIzaSyDqN23f2bMRgrfV6erFttuc-jR7ABRxNhw",
  authDomain: "softball-manager-daito.firebaseapp.com",
  projectId: "softball-manager-daito",
  storageBucket: "softball-manager-daito.firebasestorage.app",
  messagingSenderId: "247998186306",
  appId: "1:247998186306:web:557bfc9e8d01f991c3bedb",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

window.store = Vue.reactive({
  teamName: 'チーム名',
  members: [],
  events: [],
  _ready: false,

  init() {
    // チーム設定
    db.collection('config').doc('settings').get().then(doc => {
      if (doc.exists) this.teamName = doc.data().teamName || 'チーム名';
    });

    // メンバーをリアルタイム同期
    db.collection('members').onSnapshot(snap => {
      this.members = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      this._ready = true;
    }, err => console.error('members sync error', err));

    // イベントをリアルタイム同期
    db.collection('events').onSnapshot(snap => {
      this.events = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    }, err => console.error('events sync error', err));
  },

  save() {
    db.collection('config').doc('settings').set({ teamName: this.teamName });
  },

  // ── オーダーパターン ─────────────────────────────
  lineupPatterns: [],
  saveLineupPatterns(patterns) {
    this.lineupPatterns = patterns;
    db.collection('config').doc('lineupPatterns').set({ patterns });
  },
  loadLineupPatterns(callback) {
    db.collection('config').doc('lineupPatterns').get().then(doc => {
      const patterns = doc.exists ? (doc.data().patterns || []) : [];
      this.lineupPatterns = patterns;
      if (callback) callback(patterns);
    });
  },

  // ── メンバー ──────────────────────────────────
  addMember(m) {
    const id = generateId();
    db.collection('members').doc(id).set({ ...m, id });
    return id;
  },
  updateMember(id, data) {
    db.collection('members').doc(id).update(data);
  },
  deleteMember(id) {
    db.collection('members').doc(id).delete();
  },
  getMember(id) { return this.members.find(m => m.id === id); },

  // ── イベント（試合・練習） ───────────────────
  addEvent(e) {
    const id = generateId();
    const defaults = {
      type: 'practice', date: '', time: '', opponent: '', location: '',
      homeAway: 'home', innings: 3,
      score: { us: Array(9).fill(0), them: Array(9).fill(0) },
      lineup: [], fpMemberId: '', fpPosition: '', useDP: false,
      attendance: [], atBats: [], pitcherLog: [],
      result: null, notes: '', timeOfDay: '', rainCancelled: false,
    };
    db.collection('events').doc(id).set({ ...defaults, ...e, id });
    return id;
  },
  updateEvent(id, data) {
    db.collection('events').doc(id).update(data);
  },
  deleteEvent(id) {
    db.collection('events').doc(id).delete();
  },
  getEvent(id) { return this.events.find(e => e.id === id); },

  // ── 成績計算 ────────────────────────────────
  get gameEvents() { return this.events.filter(e => ['game','tournament','scrimmage'].includes(e.type)); },
  get record() {
    const games = this.gameEvents.filter(e => e.result);
    return {
      wins:   games.filter(e => e.result === 'win').length,
      losses: games.filter(e => e.result === 'lose').length,
      draws:  games.filter(e => e.result === 'draw').length,
      total:  games.length,
    };
  },

  // ── エクスポート・インポート ──────────────────
  exportData() {
    const json = JSON.stringify({ teamName: this.teamName, members: this.members, events: this.events }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `softball_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  },
  importData(jsonStr) {
    try {
      const d = JSON.parse(jsonStr);
      if (d.teamName) {
        this.teamName = d.teamName;
        db.collection('config').doc('settings').set({ teamName: d.teamName });
      }
      if (d.members) {
        d.members.forEach(m => db.collection('members').doc(m.id).set(m));
      }
      if (d.events) {
        d.events.forEach(e => db.collection('events').doc(e.id).set(e));
      }
      return true;
    } catch(e) {
      console.error('import error', e);
      return false;
    }
  },
});

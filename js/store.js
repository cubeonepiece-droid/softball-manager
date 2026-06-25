// store.js - データ管理 (localStorage永続化)

const STORAGE_KEY = 'softball_v1';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

window.store = Vue.reactive({
  teamName: 'チーム名',
  members: [],
  events: [],

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        this.teamName = d.teamName || 'チーム名';
        this.members  = d.members  || [];
        this.events   = d.events   || [];
      }
    } catch (e) {
      console.error('load error', e);
    }
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      teamName: this.teamName,
      members:  this.members,
      events:   this.events,
    }));
  },

  // ── メンバー ──────────────────────────────────
  addMember(m) {
    this.members.push({ ...m, id: generateId() });
    this.save();
  },
  updateMember(id, data) {
    const i = this.members.findIndex(m => m.id === id);
    if (i !== -1) this.members[i] = { ...this.members[i], ...data };
    this.save();
  },
  deleteMember(id) {
    this.members = this.members.filter(m => m.id !== id);
    this.save();
  },
  getMember(id) { return this.members.find(m => m.id === id); },

  // ── イベント（試合・練習） ───────────────────
  addEvent(e) {
    const ev = {
      id: generateId(),
      type: 'game',
      date: '',
      time: '',
      opponent: '',
      location: '',
      homeAway: 'home',
      innings: 7,
      score: { us: Array(7).fill(0), them: Array(7).fill(0) },
      lineup: [],      // [{ order, memberId, position, isDP }]
      fpMemberId: '',  // FP選手ID
      fpPosition: '',  // FP守備位置
      useDP: false,
      attendance: [],  // [{ memberId, status: 'attending'|'absent'|'unknown' }]
      atBats: [],      // [{ memberId, inning, result }]
      pitcherLog: [],  // [{ memberId, fromInning, toInning }]
      result: null,    // 'win'|'lose'|'draw'|null
      notes: '',
      ...e,
    };
    this.events.push(ev);
    this.save();
    return ev.id;
  },
  updateEvent(id, data) {
    const i = this.events.findIndex(e => e.id === id);
    if (i !== -1) this.events[i] = { ...this.events[i], ...data };
    this.save();
  },
  deleteEvent(id) {
    this.events = this.events.filter(e => e.id !== id);
    this.save();
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

  // ── エクスポート ─────────────────────────────
  exportData() {
    const json = JSON.stringify({ teamName: this.teamName, members: this.members, events: this.events }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `softball_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  importData(jsonStr) {
    try {
      const d = JSON.parse(jsonStr);
      if (d.members) this.members = d.members;
      if (d.events)  this.events  = d.events;
      if (d.teamName) this.teamName = d.teamName;
      this.save();
      return true;
    } catch (e) {
      return false;
    }
  },
});

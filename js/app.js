// app.js - Vue 3 アプリ本体
;(function () {
const { createApp, ref, computed, reactive, onMounted, watch, nextTick } = Vue;

// ── 定数 ──────────────────────────────────────────
const POSITIONS = [
  { code: 'P',  label: 'ピッチャー' },
  { code: 'C',  label: 'キャッチャー' },
  { code: '1B', label: 'ファースト' },
  { code: '2B', label: 'セカンド' },
  { code: '3B', label: 'サード' },
  { code: 'SS', label: 'ショート' },
  { code: 'LF', label: 'レフト' },
  { code: 'CF', label: 'センター' },
  { code: 'RF', label: 'ライト' },
];
const GRADES = [1, 2, 3, 4, 5, 6];
const MEMBER_TYPES = [
  { code: 'player', label: '選手',         color: 'indigo' },
  { code: 'parent', label: '保護者',       color: 'green'  },
  { code: 'coach',  label: '監督・コーチ', color: 'amber'  },
];
function memberTypeLabel(code) {
  return MEMBER_TYPES.find(t => t.code === code)?.label || '選手';
}

const EVENT_TYPES = [
  { code: 'practice',   label: '練習',     color: 'green'  },
  { code: 'scrimmage',  label: '練習試合', color: 'blue'   },
  { code: 'joint',      label: '合同練習', color: 'teal'   },
  { code: 'game',       label: '大会',     color: 'indigo' },
  { code: 'social',     label: 'イベント', color: 'pink'   },
];
const GAME_TYPES     = ['game', 'tournament', 'scrimmage']; // tournament kept for legacy data
const PRACTICE_TYPES = ['practice', 'joint'];
const SOCIAL_TYPES   = ['social'];
const MAP_TYPES      = ['game', 'tournament', 'scrimmage', 'joint']; // types that show Google Maps
const TOD_TYPES      = ['game', 'tournament', 'scrimmage', 'joint', 'practice']; // types with time-of-day tag
function isGameType(type)   { return GAME_TYPES.includes(type); }
function isSocialType(type) { return SOCIAL_TYPES.includes(type); }
function hasMapLink(type)   { return MAP_TYPES.includes(type); }
function hasTimeOfDay(type) { return TOD_TYPES.includes(type); }
function timeOfDayOpts(type) {
  const p = type === 'practice';
  return [
    { value: 'allday',    label: p ? '一日練習' : '一日' },
    { value: 'morning',   label: p ? '午前練習' : '午前' },
    { value: 'afternoon', label: p ? '午後練習' : '午後' },
  ];
}
function timeOfDayLabel(type, val) {
  return (timeOfDayOpts(type).find(o => o.value === val) || {}).label || '';
}
function googleMapsUrl(location) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location);
}
function eventTypeLabel(type) {
  if (type === 'tournament') return '大会'; // legacy
  return EVENT_TYPES.find(t => t.code === type)?.label || type;
}
function memberShortName(m) { return m ? (m.shortName || m.name || '') : ''; }
function memberFullName(m)  { return m ? (m.name || '') : ''; }

const FIELD_POSITIONS = [
  { code: 'CF', label: 'センター',     x: 160, y:  34 },
  { code: 'LF', label: 'レフト',       x:  68, y:  70 },
  { code: 'RF', label: 'ライト',       x: 252, y:  70 },
  { code: 'SS', label: 'ショート',     x: 120, y: 112 },
  { code: '2B', label: 'セカンド',     x: 200, y: 112 },
  { code: '3B', label: 'サード',       x:  86, y: 162 },
  { code: '1B', label: 'ファースト',   x: 234, y: 162 },
  { code: 'P',  label: 'ピッチャー',   x: 160, y: 152 },
  { code: 'C',  label: 'キャッチャー', x: 160, y: 220 },
];

const AT_BAT_RESULTS = [
  { code: 'H',   label: 'H',   sub: 'ヒット',   color: 'green'  },
  { code: '2B',  label: '2B',  sub: '二塁打',   color: 'green'  },
  { code: '3B',  label: '3B',  sub: '三塁打',   color: 'green'  },
  { code: 'HR',  label: 'HR',  sub: 'ホームラン', color: 'yellow' },
  { code: 'BB',  label: 'BB',  sub: '四球',     color: 'blue'   },
  { code: 'HBP', label: 'HBP', sub: '死球',     color: 'blue'   },
  { code: 'K',   label: 'K',   sub: '三振',     color: 'red'    },
  { code: 'KL',  label: 'KL',  sub: '見逃三振', color: 'red'    },
  { code: 'GO',  label: 'GO',  sub: 'ゴロ',     color: 'gray'   },
  { code: 'FO',  label: 'FO',  sub: 'フライ',   color: 'gray'   },
  { code: 'LO',  label: 'LO',  sub: 'ライナー', color: 'gray'   },
  { code: 'SAC', label: '犠',  sub: '犠打',     color: 'purple' },
  { code: 'SF',  label: '犠飛', sub: '犠牲フライ', color: 'purple' },
  { code: 'E',   label: 'E',   sub: 'エラー',   color: 'orange' },
  { code: 'FC',  label: 'FC',  sub: 'フィルダースチョイス', color: 'orange' },
  { code: 'DP',  label: 'DP',  sub: 'ダブルプレー', color: 'red' },
];

function abResultColor(code) {
  const r = AT_BAT_RESULTS.find(x => x.code === code);
  if (!r) return 'bg-gray-100 text-gray-600';
  const map = { green: 'bg-green-100 text-green-700', yellow: 'bg-yellow-100 text-yellow-700', blue: 'bg-blue-100 text-blue-700', red: 'bg-red-100 text-red-600', gray: 'bg-gray-100 text-gray-600', purple: 'bg-purple-100 text-purple-700', orange: 'bg-orange-100 text-orange-700' };
  return map[r.color] || 'bg-gray-100 text-gray-600';
}

function posLabel(code) {
  const p = POSITIONS.find(p => p.code === code);
  return p ? p.label : code;
}

function totalScore(arr) { return arr ? arr.reduce((a, b) => a + (Number(b) || 0), 0) : 0; }

function navigate(hash) { location.hash = hash; }

function sortedEvents(events) {
  return [...events].sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);
}

// ── ダッシュボード ──────────────────────────────
const Dashboard = {
  setup() {
    const upcoming = computed(() =>
      sortedEvents(store.events)
        .filter(e => e.date >= new Date().toISOString().slice(0, 10))
        .slice(0, 5)
    );
    const recent = computed(() =>
      sortedEvents(store.gameEvents)
        .filter(e => e.result)
        .reverse()
        .slice(0, 5)
    );
    const rec = computed(() => store.record);
    return { upcoming, recent, rec, store, navigate, totalScore };
  },
  template: `
<div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-indigo-700">⚾ {{ store.teamName }}</h1>
    <button @click="editTeamName" class="text-sm text-gray-500 underline">チーム名変更</button>
  </div>

  <!-- 戦績サマリー -->
  <div class="bg-white rounded-2xl shadow p-5">
    <h2 class="text-sm font-semibold text-gray-500 mb-3">今シーズン戦績</h2>
    <div class="flex gap-6 text-center">
      <div><p class="text-3xl font-bold text-green-600">{{ rec.wins }}</p><p class="text-xs text-gray-500">勝</p></div>
      <div><p class="text-3xl font-bold text-red-500">{{ rec.losses }}</p><p class="text-xs text-gray-500">敗</p></div>
      <div><p class="text-3xl font-bold text-gray-500">{{ rec.draws }}</p><p class="text-xs text-gray-500">分</p></div>
      <div><p class="text-3xl font-bold text-indigo-600">{{ rec.total }}</p><p class="text-xs text-gray-500">試合</p></div>
    </div>
  </div>

  <!-- 直近の試合結果 -->
  <div class="bg-white rounded-2xl shadow p-5">
    <h2 class="text-sm font-semibold text-gray-500 mb-3">直近の試合結果</h2>
    <div v-if="recent.length === 0" class="text-sm text-gray-400 text-center py-4">試合結果はまだありません</div>
    <div v-for="ev in recent" :key="ev.id" class="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <span :class="ev.result==='win'?'text-green-600':ev.result==='lose'?'text-red-500':'text-gray-500'" class="font-bold mr-2">
          {{ ev.result==='win'?'勝':ev.result==='lose'?'敗':'分' }}
        </span>
        <span class="text-sm">{{ ev.date }} vs {{ ev.opponent || '相手未定' }}</span>
      </div>
      <span class="text-sm font-mono">{{ totalScore(ev.score.us) }} - {{ totalScore(ev.score.them) }}</span>
    </div>
  </div>

  <!-- 今後の日程 -->
  <div class="bg-white rounded-2xl shadow p-5">
    <h2 class="text-sm font-semibold text-gray-500 mb-3">今後の予定</h2>
    <div v-if="upcoming.length === 0" class="text-sm text-gray-400 text-center py-4">予定はありません</div>
    <div v-for="ev in upcoming" :key="ev.id"
         @click="navigate('#/events/' + ev.id)"
         class="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50 rounded">
      <span class="text-xs px-2 py-1 rounded-full font-semibold"
            :class="['game','tournament','scrimmage'].includes(ev.type)?'bg-indigo-100 text-indigo-700':ev.type==='social'?'bg-pink-100 text-pink-700':'bg-green-100 text-green-700'">
        {{ {'game':'大会','tournament':'大会','scrimmage':'練習試合','practice':'練習','joint':'合同練習','social':'イベント'}[ev.type]||'練習' }}
      </span>
      <div>
        <p class="text-sm font-medium">{{ ev.date }} {{ ev.time }}</p>
        <p class="text-xs text-gray-500">{{ ev.type==='game'? (ev.opponent||'相手未定') : (ev.location||'場所未定') }}</p>
      </div>
    </div>
  </div>

  <!-- クイックアクション -->
  <div class="grid grid-cols-2 gap-3">
    <button @click="navigate('#/schedule')"
            class="bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700">
      📅 日程を追加
    </button>
    <button @click="navigate('#/members')"
            class="bg-white border border-indigo-300 text-indigo-700 rounded-xl py-3 font-semibold hover:bg-indigo-50">
      👥 メンバー管理
    </button>
  </div>
</div>
  `,
  methods: {
    editTeamName() {
      const name = prompt('チーム名を入力', store.teamName);
      if (name !== null && name.trim()) { store.teamName = name.trim(); store.save(); }
    }
  }
};

// ── メンバー管理 ────────────────────────────────
const Members = {
  setup() {
    const modal = ref(false);
    const editing = ref(null);
    const filterType = ref('all');
    const form = reactive({ type: 'player', shortName: '', name: '', grade: 1, number: '', positions: [], joinDate: '', photo: '', captain: false, viceCaptain: false, notes: '' });

    function openAdd() {
      editing.value = null;
      Object.assign(form, { type: 'player', shortName: '', name: '', grade: 1, number: '', positions: [], joinDate: '', photo: '', captain: false, viceCaptain: false, notes: '' });
      modal.value = true;
    }
    function openEdit(m) {
      editing.value = m.id;
      Object.assign(form, { type: m.type||'player', shortName: m.shortName||'', name: m.name||'', grade: m.grade||1, number: m.number||'', positions: [...(m.positions||[])], joinDate: m.joinDate||'', photo: m.photo||'', captain: m.captain||false, viceCaptain: m.viceCaptain||false, notes: m.notes||'' });
      modal.value = true;
    }
    function save() {
      if (!form.name.trim()) return alert('フルネームを入力してください');
      const data = { type: form.type, name: form.name.trim(), shortName: form.shortName.trim(), grade: form.type==='player'?Number(form.grade):null, number: form.type==='player'?form.number:'', positions: form.type==='player'?[...form.positions]:[], joinDate: form.joinDate, photo: form.photo, captain: form.type==='player'?form.captain:false, viceCaptain: form.type==='player'?form.viceCaptain:false, notes: form.notes };
      if (editing.value) store.updateMember(editing.value, data);
      else store.addMember(data);
      modal.value = false;
    }
    function del(m) {
      if (confirm(`「${m.name}」を削除しますか？`)) store.deleteMember(m.id);
    }
    function togglePos(code) {
      const i = form.positions.indexOf(code);
      if (i === -1) form.positions.push(code);
      else form.positions.splice(i, 1);
    }
    function onPhotoSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { form.photo = ev.target.result; };
      reader.readAsDataURL(file);
    }
    function removePhoto() { form.photo = ''; }

    const filtered = computed(() => {
      const ms = filterType.value === 'all' ? store.members : store.members.filter(m => (m.type||'player') === filterType.value);
      const typeOrder = { player: 0, coach: 1, parent: 2 };
      return [...ms].sort((a, b) => {
        // キャプテン・副キャプテンを最上位に
        const capA = a.captain ? 0 : a.viceCaptain ? 1 : 2;
        const capB = b.captain ? 0 : b.viceCaptain ? 1 : 2;
        if (capA !== capB) return capA - capB;
        const ta = typeOrder[a.type||'player'] ?? 9, tb = typeOrder[b.type||'player'] ?? 9;
        if (ta !== tb) return ta - tb;
        const gradeDiff = (b.grade||0) - (a.grade||0); // 6年→1年の降順
        if (gradeDiff !== 0) return gradeDiff;
        const ja = a.joinDate||'9999', jb = b.joinDate||'9999';
        if (ja !== jb) return ja < jb ? -1 : 1;
        return (Number(a.number)||999) - (Number(b.number)||999);
      });
    });

    const typeColors = { player: 'indigo', parent: 'green', coach: 'amber' };
    function typeBadgeClass(type) {
      const c = typeColors[type||'player'] || 'indigo';
      return `bg-${c}-100 text-${c}-700`;
    }

    return { modal, form, editing, filterType, filtered, openAdd, openEdit, save, del, togglePos, onPhotoSelect, removePhoto, POSITIONS, GRADES, MEMBER_TYPES, store, posLabel, memberTypeLabel, typeBadgeClass, memberShortName };
  },
  template: `
<div class="max-w-2xl mx-auto px-4 py-6">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl font-bold text-gray-800">👥 メンバー管理</h1>
    <button @click="openAdd" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">+ 追加</button>
  </div>

  <!-- 種別フィルター -->
  <div class="flex gap-2 mb-4 flex-wrap">
    <button @click="filterType='all'" :class="filterType==='all'?'bg-indigo-600 text-white':'bg-white text-gray-600 border'"
            class="px-3 py-1 rounded-full text-sm font-medium">全員</button>
    <button v-for="t in MEMBER_TYPES" :key="t.code"
            @click="filterType=t.code"
            :class="filterType===t.code?'bg-indigo-600 text-white':'bg-white text-gray-600 border'"
            class="px-3 py-1 rounded-full text-sm font-medium">{{ t.label }}</button>
  </div>

  <div v-if="filtered.length === 0" class="text-center py-12 text-gray-400">
    <p class="text-4xl mb-2">👤</p>
    <p>メンバーがいません</p>
  </div>

  <!-- メンバーカード -->
  <div class="grid gap-3">
    <div v-for="m in filtered" :key="m.id"
         class="bg-white rounded-xl shadow p-4 flex items-center gap-4">
      <!-- 写真 or プレースホルダー -->
      <div class="flex-shrink-0">
        <img v-if="m.photo" :src="m.photo" class="w-14 h-14 rounded-full object-cover border-2 border-indigo-200">
        <div v-else class="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg">
          {{ m.number || memberShortName(m)[0] || '?' }}
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
          {{ m.name }}
          <span v-if="m.captain" class="text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-400 text-yellow-900">👑 キャプテン</span>
          <span v-if="m.viceCaptain" class="text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-200 text-yellow-800">👑 副キャプテン</span>
          <span :class="typeBadgeClass(m.type)" class="text-xs px-2 py-0.5 rounded-full font-medium">{{ memberTypeLabel(m.type||'player') }}</span>
          <span v-if="m.type==='player'||!m.type" class="text-xs text-gray-500">{{ m.grade }}年生</span>
          <span v-if="m.number" class="text-xs text-gray-400">#{{ m.number }}</span>
        </p>
        <p v-if="m.shortName && m.shortName !== m.name" class="text-xs text-indigo-500 mt-0.5">登録名: {{ m.shortName }}</p>
        <p v-if="m.type==='player'||!m.type" class="text-xs text-gray-500 mt-1">{{ (m.positions||[]).map(p=>posLabel(p)).join(' / ') || '守備位置未設定' }}</p>
        <p v-if="m.joinDate" class="text-xs text-gray-400 mt-0.5">入部: {{ m.joinDate }}</p>
        <p v-if="m.notes" class="text-xs text-gray-400 mt-0.5">{{ m.notes }}</p>
      </div>
      <div class="flex gap-2">
        <button @click="openEdit(m)" class="text-indigo-500 hover:text-indigo-700 text-sm">編集</button>
        <button @click="del(m)" class="text-red-400 hover:text-red-600 text-sm">削除</button>
      </div>
    </div>
  </div>

  <p class="text-center text-xs text-gray-400 mt-4">{{ store.members.length }}名登録</p>

  <!-- モーダル -->
  <div v-if="modal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
      <h2 class="text-lg font-bold mb-4">{{ editing ? 'メンバー編集' : 'メンバー追加' }}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">種別</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="t in MEMBER_TYPES" :key="t.code"
                    @click="form.type=t.code"
                    :class="form.type===t.code?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700'"
                    class="px-4 py-1.5 rounded-lg text-sm font-medium">{{ t.label }}</button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">フルネーム <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="山田 太郎">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">登録名称 <span class="text-xs text-gray-400">（打順表・フィールドに表示）</span></label>
          <input v-model="form.shortName" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="太郎（省略時はフルネームを使用）">
        </div>
        <template v-if="form.type==='player'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">役割</label>
            <div class="flex gap-3">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" v-model="form.captain" @change="form.captain && (form.viceCaptain=false)" class="accent-yellow-500 w-4 h-4">
                <span class="text-sm font-medium">👑 キャプテン</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" v-model="form.viceCaptain" @change="form.viceCaptain && (form.captain=false)" class="accent-yellow-500 w-4 h-4">
                <span class="text-sm font-medium">👑 副キャプテン</span>
              </label>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">学年</label>
              <select v-model="form.grade" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option v-for="g in GRADES" :key="g" :value="g">{{ g }}年生</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">背番号</label>
              <input v-model="form.number" type="number" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="7">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">守備位置（複数可）</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="p in POSITIONS" :key="p.code"
                      @click="togglePos(p.code)"
                      :class="form.positions.includes(p.code)?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700'"
                      class="px-3 py-1 rounded-lg text-sm font-medium">{{ p.label }}</button>
            </div>
          </div>
        </template>
        <!-- 写真 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">写真</label>
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0">
              <img v-if="form.photo" :src="form.photo" class="w-16 h-16 rounded-full object-cover border-2 border-indigo-200">
              <div v-else class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl border-2 border-dashed border-gray-300">👤</div>
            </div>
            <div class="flex flex-col gap-2">
              <label class="cursor-pointer bg-indigo-50 text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-100">
                📷 写真を選択
                <input type="file" accept="image/*" class="hidden" @change="onPhotoSelect">
              </label>
              <button v-if="form.photo" @click="removePhoto" class="text-xs text-red-400 hover:text-red-600">削除</button>
            </div>
          </div>
        </div>
        <!-- 入部年月（選手のみ） -->
        <div v-if="form.type==='player'">
          <label class="block text-sm font-medium text-gray-700 mb-1">入部年月</label>
          <input v-model="form.joinDate" type="month" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <textarea v-model="form.notes" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="自由記入"></textarea>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button @click="modal=false" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">キャンセル</button>
        <button @click="save" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">保存</button>
      </div>
    </div>
  </div>
</div>
  `
};

// ── 日程管理 ────────────────────────────────────
const Schedule = {
  setup() {
    const today = new Date();
    const calYear  = ref(today.getFullYear());
    const calMonth = ref(today.getMonth()); // 0-indexed
    const modal = ref(false);
    const editing = ref(null);
    const form = reactive({
      type: 'practice', date: '', time: '08:00', opponent: '', location: '大東小学校', homeAway: 'home', innings: 3, timeOfDay: '', transport: '', notes: ''
    });

    function prevMonth() {
      if (calMonth.value === 0) { calMonth.value = 11; calYear.value--; }
      else calMonth.value--;
    }
    function nextMonth() {
      if (calMonth.value === 11) { calMonth.value = 0; calYear.value++; }
      else calMonth.value++;
    }

    const calDays = computed(() => {
      const firstDay = new Date(calYear.value, calMonth.value, 1).getDay();
      const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let d = 1; d <= daysInMonth; d++) days.push(d);
      return days;
    });

    function dateStr(d) {
      return `${calYear.value}-${String(calMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    function eventsOnDay(d) {
      return store.events.filter(e => e.date === dateStr(d));
    }
    function isToday(d) { return dateStr(d) === today.toISOString().slice(0,10); }

    const monthEvents = computed(() =>
      sortedEvents(store.events.filter(e => {
        const [y, m] = (e.date||'').split('-').map(Number);
        return y === calYear.value && m === calMonth.value + 1;
      }))
    );

    function selectType(type) {
      form.type = type;
      if (PRACTICE_TYPES.includes(type) && !form.location) form.location = '大東小学校';
      if (GAME_TYPES.includes(type) && form.location === '大東小学校') form.location = '';
    }
    function openAdd(d) {
      editing.value = null;
      Object.assign(form, { type: 'practice', date: d ? dateStr(d) : '', time: '08:00', opponent: '', location: '大東小学校', homeAway: 'home', innings: 3, timeOfDay: '', transport: '', notes: '' });
      modal.value = true;
    }
    function openEdit(ev) {
      editing.value = ev.id;
      // legacy tournament → game
      const type = ev.type === 'tournament' ? 'game' : (ev.type||'practice');
      Object.assign(form, { type, date: ev.date, time: ev.time||'', opponent: ev.opponent||'', location: ev.location||'', homeAway: ev.homeAway||'home', innings: ev.innings||3, timeOfDay: ev.timeOfDay||'', transport: ev.transport||'', notes: ev.notes||'' });
      modal.value = true;
    }
    function save() {
      if (!form.date) return alert('日付を選択してください');
      const data = { type: form.type, date: form.date, time: form.time, opponent: form.opponent, location: form.location, homeAway: form.homeAway, innings: Number(form.innings), timeOfDay: form.timeOfDay, transport: form.type !== 'practice' ? form.transport : '', notes: form.notes };
      if (editing.value) { store.updateEvent(editing.value, data); modal.value = false; }
      else {
        const id = store.addEvent(data);
        modal.value = false;
        if (isGameType(form.type)) navigate('#/events/' + id);
      }
    }
    function del(ev) {
      if (confirm(`「${ev.date} ${eventTypeLabel(ev.type)}」を削除しますか？`)) store.deleteEvent(ev.id);
    }
    function goEvent(ev) { navigate('#/events/' + ev.id); }
    function evTypeBadgeClass(type) {
      const code = type === 'tournament' ? 'game' : type; // legacy
      const t = EVENT_TYPES.find(x => x.code === code);
      if (!t) return 'bg-gray-100 text-gray-700';
      return `bg-${t.color}-100 text-${t.color}-700`;
    }

    return { calYear, calMonth, calDays, monthEvents, modal, form, editing, prevMonth, nextMonth, eventsOnDay, isToday, openAdd, openEdit, save, del, goEvent, navigate, EVENT_TYPES, isGameType, isSocialType, hasMapLink, hasTimeOfDay, timeOfDayOpts, timeOfDayLabel, googleMapsUrl, eventTypeLabel, selectType, evTypeBadgeClass };
  },
  template: `
<div class="max-w-2xl mx-auto px-4 py-6">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl font-bold text-gray-800">📅 日程管理</h1>
    <button @click="openAdd(null)" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">+ 追加</button>
  </div>

  <!-- カレンダー -->
  <div class="bg-white rounded-2xl shadow p-4 mb-4">
    <div class="flex items-center justify-between mb-3">
      <button @click="prevMonth" class="p-2 hover:bg-gray-100 rounded-lg">◀</button>
      <h2 class="font-bold text-gray-800">{{ calYear }}年 {{ calMonth+1 }}月</h2>
      <button @click="nextMonth" class="p-2 hover:bg-gray-100 rounded-lg">▶</button>
    </div>
    <div class="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
      <div class="text-red-400">日</div><div>月</div><div>火</div><div>水</div>
      <div>木</div><div>金</div><div class="text-blue-400">土</div>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <div v-for="(d, i) in calDays" :key="i"
           :class="[d?'cursor-pointer hover:bg-indigo-50':'', isToday(d)?'bg-indigo-600 text-white rounded-full':'', i%7===0?'text-red-400':i%7===6?'text-blue-400':'']"
           @click="d && openAdd(d)"
           class="h-9 flex flex-col items-center justify-center rounded-lg relative text-sm">
        <span>{{ d }}</span>
        <div v-if="d && eventsOnDay(d).length" class="flex gap-0.5 mt-0.5">
          <span v-for="ev in eventsOnDay(d)" :key="ev.id"
                :class="['game','tournament','scrimmage'].includes(ev.type)?'bg-indigo-500':ev.type==='social'?'bg-pink-400':'bg-green-500'"
                class="w-1.5 h-1.5 rounded-full"></span>
        </div>
      </div>
    </div>
  </div>

  <!-- 月のイベント一覧 -->
  <div class="space-y-2">
    <div v-if="monthEvents.length===0" class="text-center py-8 text-gray-400">この月の予定はありません</div>
    <div v-for="ev in monthEvents" :key="ev.id"
         class="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <span :class="evTypeBadgeClass(ev.type)"
            class="text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0">
        {{ eventTypeLabel(ev.type) }}
      </span>
      <div class="flex-1 min-w-0 cursor-pointer" @click="goEvent(ev)">
        <div class="flex items-center gap-1.5 flex-wrap">
          <p class="text-sm font-medium">{{ ev.date }} {{ ev.time }}</p>
          <span v-if="ev.timeOfDay" class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{{ timeOfDayLabel(ev.type, ev.timeOfDay) }}</span>
          <span v-if="ev.transport==='bicycle'" class="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-medium">🚲 自転車</span>
          <span v-if="ev.transport==='car'" class="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-medium">🚗 車</span>
        </div>
        <p class="text-xs text-gray-500 truncate">{{ isGameType(ev.type)?(ev.opponent||'相手未定')+(ev.location?' @ '+ev.location:'') : isSocialType(ev.type)?(ev.opponent||'イベント')+(ev.location?' @ '+ev.location:'') : (ev.location||'場所未定') }}</p>
        <a v-if="hasMapLink(ev.type) && ev.location" :href="googleMapsUrl(ev.location)" target="_blank" @click.stop
           class="text-xs text-blue-500 underline mt-0.5 inline-block">🗺 地図を開く</a>
        <p v-if="isGameType(ev.type) && ev.result" :class="ev.result==='win'?'text-green-600':ev.result==='lose'?'text-red-500':'text-gray-500'"
           class="text-xs font-semibold mt-0.5">
          {{ ev.result==='win'?'● 勝利':ev.result==='lose'?'● 敗戦':'● 引分' }}
        </p>
      </div>
      <div class="flex gap-2">
        <button @click="openEdit(ev)" class="text-indigo-500 hover:text-indigo-700 text-sm">編集</button>
        <button @click="del(ev)" class="text-red-400 hover:text-red-600 text-sm">削除</button>
      </div>
    </div>
  </div>

  <!-- モーダル -->
  <div v-if="modal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
      <h2 class="text-lg font-bold mb-4">{{ editing ? '日程編集' : '日程追加' }}</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">種別</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="et in EVENT_TYPES" :key="et.code"
                    @click="selectType(et.code)"
                    :class="form.type===et.code?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700'"
                    class="px-3 py-1.5 rounded-lg text-sm font-medium">{{ et.label }}</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">日付 <span class="text-red-500">*</span></label>
            <input v-model="form.date" type="date" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">時間</label>
            <input v-model="form.time" type="time" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          </div>
        </div>
        <div v-if="isSocialType(form.type)">
          <label class="block text-sm font-medium text-gray-700 mb-1">イベント名 <span class="text-red-500">*</span></label>
          <input v-model="form.opponent" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="BBQ、卒団式、打ち上げ 等">
        </div>
        <div v-if="isGameType(form.type)">
          <label class="block text-sm font-medium text-gray-700 mb-1">相手チーム</label>
          <input v-model="form.opponent" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="○○小学校">
        </div>
        <div v-if="isGameType(form.type)">
          <label class="block text-sm font-medium text-gray-700 mb-1">ホーム / アウェイ</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-1.5 cursor-pointer"><input type="radio" v-model="form.homeAway" value="home" class="accent-indigo-600"> ホーム</label>
            <label class="flex items-center gap-1.5 cursor-pointer"><input type="radio" v-model="form.homeAway" value="away" class="accent-indigo-600"> アウェイ</label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">場所</label>
          <input v-model="form.location" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="○○グラウンド">
        </div>
        <div v-if="isGameType(form.type)">
          <label class="block text-sm font-medium text-gray-700 mb-1">イニング数</label>
          <select v-model="form.innings" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" :value="n">{{ n }}回</option>
          </select>
        </div>
        <!-- 交通手段（練習以外） -->
        <div v-if="form.type !== 'practice'">
          <label class="block text-sm font-medium text-gray-700 mb-2">交通手段</label>
          <div class="flex gap-2">
            <button v-for="t in [{value:'bicycle',label:'🚲 自転車'},{value:'car',label:'🚗 車'}]" :key="t.value"
                    @click="form.transport = form.transport===t.value ? '' : t.value"
                    :class="form.transport===t.value?'bg-sky-500 text-white':'bg-gray-100 text-gray-700'"
                    class="px-4 py-1.5 rounded-lg text-sm font-medium">{{ t.label }}</button>
          </div>
        </div>
        <!-- 時間帯タグ -->
        <div v-if="hasTimeOfDay(form.type)">
          <label class="block text-sm font-medium text-gray-700 mb-2">時間帯</label>
          <div class="flex gap-2 flex-wrap">
            <button v-for="opt in timeOfDayOpts(form.type)" :key="opt.value"
                    @click="form.timeOfDay = form.timeOfDay===opt.value ? '' : opt.value"
                    :class="form.timeOfDay===opt.value?'bg-amber-500 text-white':'bg-gray-100 text-gray-700'"
                    class="px-4 py-1.5 rounded-lg text-sm font-medium">{{ opt.label }}</button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <textarea v-model="form.notes" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"></textarea>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button @click="modal=false" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">キャンセル</button>
        <button @click="save" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700">保存</button>
      </div>
    </div>
  </div>
</div>
  `
};

// ── 試合詳細（スコア＋オーダー） ───────────────
const EventDetail = {
  props: ['eventId'],
  setup(props) {
    const ev = computed(() => store.getEvent(props.eventId));
    const tab = ref('attendance'); // default attendance; game events switch to score

    // スコア編集用ローカルコピー
    const scoreUs   = ref([]);
    const scoreThem = ref([]);
    const innings   = ref(7);

    // オーダー (打順1〜9)
    const lineup = ref([]); // [{ order, memberId, position, isDP }]
    const fpMemberId = ref('');
    const fpPosition = ref('');
    const useDP = ref(false);

    // 出欠
    const attendance = ref([]); // [{ memberId, status }]

    // 打席・投手記録
    const atBats     = ref([]); // [{ memberId, inning, result }]
    const pitcherLog = ref([]); // [{ memberId, fromInning, toInning }]
    const abModal    = ref(null); // { memberId, inning } — 打席入力中
    const pitcherModal = ref(false);
    const pitcherInningEdit = ref({ memberId: '', fromInning: 1, toInning: 1 });

    function initFromEvent() {
      if (!ev.value) return;
      const e = ev.value;
      innings.value   = e.innings || 7;
      const len = innings.value;
      scoreUs.value   = Array.from({ length: len }, (_, i) => e.score?.us?.[i]   ?? 0);
      scoreThem.value = Array.from({ length: len }, (_, i) => e.score?.them?.[i] ?? 0);
      lineup.value    = e.lineup?.length ? JSON.parse(JSON.stringify(e.lineup)) : Array.from({ length: 9 }, (_, i) => ({ order: i+1, memberId: '', position: '', isDP: false }));
      fpMemberId.value = e.fpMemberId || '';
      fpPosition.value = e.fpPosition || '';
      useDP.value      = e.useDP || false;
      attendance.value = JSON.parse(JSON.stringify(e.attendance || []));
      atBats.value     = JSON.parse(JSON.stringify(e.atBats     || []));
      pitcherLog.value = JSON.parse(JSON.stringify(e.pitcherLog || []));
      tab.value = isGameType(e.type) ? 'score' : 'attendance';
    }

    // Firestoreからデータが届いたときも初期化できるようwatchを使用
    let _initialized = false;
    watch(ev, (newEv) => {
      if (newEv && !_initialized) { _initialized = true; initFromEvent(); }
    }, { immediate: true });
    watch(() => props.eventId, () => { _initialized = false; initFromEvent(); });

    const totalUs   = computed(() => totalScore(scoreUs.value));
    const totalThem = computed(() => totalScore(scoreThem.value));
    const autoResult = computed(() => {
      if (totalUs.value > totalThem.value) return 'win';
      if (totalUs.value < totalThem.value) return 'lose';
      return 'draw';
    });

    function saveScore() {
      const score = { us: scoreUs.value.map(Number), them: scoreThem.value.map(Number) };
      const result = (scoreUs.value.some(v=>v>0) || scoreThem.value.some(v=>v>0)) ? autoResult.value : null;
      store.updateEvent(props.eventId, { score, result });
      alert('スコアを保存しました');
    }

    function saveLineup() {
      const validLineup = lineup.value.filter(l => l.memberId);
      store.updateEvent(props.eventId, { lineup: validLineup, fpMemberId: fpMemberId.value, fpPosition: fpPosition.value, useDP: useDP.value });
      alert('オーダーを保存しました');
    }

    function memberName(id) {
      if (!id) return '';
      const m = store.getMember(id);
      return m ? m.name : '';
    }

    function inningLabel(i) {
      return `${i+1}回`;
    }

    function setDP(order) {
      lineup.value.forEach(l => l.isDP = l.order === order);
    }

    const dpOrder = computed(() => lineup.value.find(l => l.isDP)?.order);

    const sortedMembers = computed(() => [...store.members].filter(m => !m.type || m.type === 'player').sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name)));

    // 出欠管理
    function getAttStatus(memberId) {
      return attendance.value.find(a => a.memberId === memberId)?.status || 'unknown';
    }
    function setAttStatus(memberId, status) {
      const idx = attendance.value.findIndex(a => a.memberId === memberId);
      if (idx !== -1) attendance.value[idx].status = status;
      else attendance.value.push({ memberId, status });
    }
    function saveAttendance() {
      store.updateEvent(props.eventId, { attendance: [...attendance.value] });
      alert('出欠を保存しました');
    }

    const memberGroups = computed(() => [
      { label: '選手',         members: store.members.filter(m => !m.type || m.type === 'player') },
      { label: '保護者',       members: store.members.filter(m => m.type === 'parent') },
      { label: '監督・コーチ', members: store.members.filter(m => m.type === 'coach') },
    ].filter(g => g.members.length > 0));

    const attSummary = computed(() => {
      const all = store.members;
      const attending  = all.filter(m => getAttStatus(m.id) === 'attending').length;
      const absent     = all.filter(m => getAttStatus(m.id) === 'absent').length;
      const undecided  = all.filter(m => { const a = attendance.value.find(x=>x.memberId===m.id); return a && a.status==='unknown'; }).length;
      const notEntered = all.filter(m => !attendance.value.find(x=>x.memberId===m.id)).length;
      return { attending, absent, undecided, notEntered, total: all.length };
    });

    // ── 打席・投手記録 ──
    function getMemberAtBats(memberId) {
      return atBats.value.filter(a => a.memberId === memberId).sort((a, b) => a.inning - b.inning);
    }
    function openAbModal(memberId, inning) {
      abModal.value = { memberId, inning };
    }
    function setAbResult(code) {
      if (!abModal.value) return;
      const { memberId, inning } = abModal.value;
      const idx = atBats.value.findIndex(a => a.memberId === memberId && a.inning === inning);
      if (code === null) {
        if (idx !== -1) atBats.value.splice(idx, 1);
      } else {
        if (idx !== -1) atBats.value[idx].result = code;
        else atBats.value.push({ memberId, inning, result: code });
      }
      abModal.value = null;
    }
    function addAbInning(memberId) {
      // 次の打席のイニング（まだ記録のない最小イニング）
      const used = atBats.value.filter(a => a.memberId === memberId).map(a => a.inning);
      let next = 1;
      while (used.includes(next)) next++;
      openAbModal(memberId, Math.min(next, innings.value));
    }
    function saveRecord() {
      store.updateEvent(props.eventId, { atBats: [...atBats.value], pitcherLog: [...pitcherLog.value] });
      alert('記録を保存しました');
    }
    function addPitcher() {
      pitcherInningEdit.value = { memberId: '', fromInning: 1, toInning: innings.value };
      pitcherModal.value = true;
    }
    function savePitcher() {
      const p = pitcherInningEdit.value;
      if (!p.memberId) return;
      pitcherLog.value.push({ memberId: p.memberId, fromInning: Number(p.fromInning), toInning: Number(p.toInning) });
      pitcherModal.value = false;
    }
    function removePitcher(idx) { pitcherLog.value.splice(idx, 1); }

    const inningNums = computed(() => Array.from({ length: innings.value }, (_, i) => i + 1));
    const orderedLineup = computed(() => lineup.value.filter(l => l.memberId).sort((a, b) => a.order - b.order));

    // ── シミュレーション ──
    const selectedPos = ref(null);
    const FIELD_POS_LIST = FIELD_POSITIONS;
    function simPlayerName(posCode) {
      const entry = lineup.value.find(l => l.position === posCode);
      if (entry?.memberId) {
        const m = store.getMember(entry.memberId);
        return m ? memberShortName(m) : '';
      }
      if (posCode === fpPosition.value && fpMemberId.value) {
        const m = store.getMember(fpMemberId.value);
        return m ? memberShortName(m) : '';
      }
      return '';
    }
    function simAssign(posCode, memberId) {
      lineup.value.forEach(l => { if (l.position === posCode) l.position = ''; });
      if (memberId) {
        const existing = lineup.value.find(l => l.memberId === memberId);
        if (existing) { existing.position = posCode; }
        else {
          const empty = lineup.value.find(l => !l.memberId);
          if (empty) { empty.memberId = memberId; empty.position = posCode; }
          else lineup.value.push({ order: lineup.value.length + 1, memberId, position: posCode, isDP: false });
        }
      }
      selectedPos.value = null;
    }
    const playerMembers = computed(() => store.members.filter(m => !m.type || m.type === 'player'));

    return { ev, tab, scoreUs, scoreThem, innings, lineup, fpMemberId, fpPosition, useDP, totalUs, totalThem, autoResult, saveScore, saveLineup, memberName, inningLabel, setDP, dpOrder, sortedMembers, POSITIONS, navigate, posLabel, attendance, getAttStatus, setAttStatus, saveAttendance, memberGroups, attSummary, selectedPos, FIELD_POS_LIST, simPlayerName, simAssign, playerMembers, isGameType, isSocialType, hasMapLink, timeOfDayLabel, googleMapsUrl, eventTypeLabel, memberShortName, atBats, pitcherLog, abModal, pitcherModal, pitcherInningEdit, getMemberAtBats, openAbModal, setAbResult, addAbInning, saveRecord, addPitcher, savePitcher, removePitcher, inningNums, orderedLineup, AT_BAT_RESULTS, abResultColor, store };
  },
  template: `
<div v-if="!ev" class="text-center py-20 text-gray-400">イベントが見つかりません</div>
<div v-else class="max-w-2xl mx-auto px-4 py-6">
  <!-- ヘッダー -->
  <div class="flex items-center gap-3 mb-4">
    <button @click="navigate('#/schedule')" class="text-indigo-600 hover:text-indigo-800 text-sm">◀ 日程</button>
    <h1 class="text-xl font-bold text-gray-800 flex-1">
      {{ isGameType(ev.type) ? '⚾ ' + eventTypeLabel(ev.type) : isSocialType(ev.type) ? '🎉 ' + (ev.opponent || eventTypeLabel(ev.type)) : '🏋️ ' + eventTypeLabel(ev.type) }}
    </h1>
  </div>

  <!-- 試合情報 -->
  <div class="bg-white rounded-2xl shadow p-4 mb-4">
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div><span class="text-gray-500">日付：</span><span class="font-medium">{{ ev.date }}</span></div>
      <div><span class="text-gray-500">時間：</span><span class="font-medium">{{ ev.time }}</span></div>
      <div v-if="isGameType(ev.type)"><span class="text-gray-500">相手：</span><span class="font-medium">{{ ev.opponent||'未定' }}</span></div>
      <div v-if="isGameType(ev.type)"><span class="text-gray-500">H/A：</span><span class="font-medium">{{ ev.homeAway==='home'?'ホーム':'アウェイ' }}</span></div>
      <div v-if="isSocialType(ev.type)"><span class="text-gray-500">イベント名：</span><span class="font-medium">{{ ev.opponent||'未定' }}</span></div>
      <div v-if="ev.timeOfDay" class="col-span-2">
        <span class="text-gray-500">時間帯：</span>
        <span class="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium ml-1">{{ timeOfDayLabel(ev.type, ev.timeOfDay) }}</span>
      </div>
      <div v-if="ev.transport" class="col-span-2">
        <span class="text-gray-500">交通手段：</span>
        <span class="inline-block bg-sky-100 text-sky-700 text-xs px-2 py-0.5 rounded-full font-medium ml-1">{{ ev.transport==='bicycle'?'🚲 自転車':'🚗 車' }}</span>
      </div>
      <div class="col-span-2">
        <span class="text-gray-500">場所：</span><span class="font-medium">{{ ev.location||'未定' }}</span>
        <a v-if="hasMapLink(ev.type) && ev.location" :href="googleMapsUrl(ev.location)" target="_blank"
           class="ml-2 text-xs text-blue-500 underline">🗺 地図</a>
      </div>
    </div>
  </div>

  <div>
    <!-- タブ -->
    <div class="flex mb-4 bg-gray-100 rounded-xl p-1 gap-0.5">
      <button v-if="isGameType(ev.type)" @click="tab='score'" :class="tab==='score'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all">スコア</button>
      <button v-if="isGameType(ev.type)" @click="tab='record'" :class="tab==='record'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all">記録</button>
      <button v-if="isGameType(ev.type)" @click="tab='lineup'" :class="tab==='lineup'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all">オーダー</button>
      <button @click="tab='attendance'" :class="tab==='attendance'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all">出欠</button>
      <button v-if="isGameType(ev.type)" @click="tab='simulate'" :class="tab==='simulate'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all">シミュレ</button>
    </div>

    <!-- ===== スコアタブ ===== -->
    <div v-if="tab==='score'">
      <!-- 結果バナー -->
      <div v-if="ev.result" class="rounded-xl p-3 mb-4 text-center font-bold text-lg"
           :class="ev.result==='win'?'bg-green-100 text-green-700':ev.result==='lose'?'bg-red-100 text-red-500':'bg-gray-100 text-gray-600'">
        {{ ev.result==='win'?'勝利 🎉':ev.result==='lose'?'敗戦':'引き分け' }}
        &nbsp;{{ totalUs }} - {{ totalThem }}
      </div>

      <div class="bg-white rounded-2xl shadow overflow-hidden mb-4">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50">
              <th class="py-2 px-3 text-left font-medium text-gray-500 w-16">チーム</th>
              <th v-for="i in innings" :key="i" class="py-2 px-2 text-center font-medium text-gray-500 w-10">{{ i }}</th>
              <th class="py-2 px-3 text-center font-bold text-gray-700 w-12">計</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t">
              <td class="py-2 px-3 font-semibold text-indigo-700">自チーム</td>
              <td v-for="(_, i) in scoreUs" :key="i" class="py-1 px-1">
                <input v-model="scoreUs[i]" type="number" min="0" max="99"
                       class="w-9 text-center border rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              </td>
              <td class="text-center font-bold text-indigo-700 text-base">{{ totalUs }}</td>
            </tr>
            <tr class="border-t bg-gray-50">
              <td class="py-2 px-3 font-semibold text-gray-600">{{ ev.opponent||'相手' }}</td>
              <td v-for="(_, i) in scoreThem" :key="i" class="py-1 px-1">
                <input v-model="scoreThem[i]" type="number" min="0" max="99"
                       class="w-9 text-center border rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50">
              </td>
              <td class="text-center font-bold text-gray-600 text-base">{{ totalThem }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="text-center text-xs text-gray-400 mb-3">
        ※ 入力後「保存」すると勝敗が自動判定されます
      </div>
      <button @click="saveScore" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">
        スコアを保存
      </button>
    </div>

    <!-- ===== オーダータブ ===== -->
    <div v-if="tab==='lineup'">
      <!-- DP/FP 切り替え -->
      <div class="bg-white rounded-xl shadow p-3 mb-4 flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="useDP" class="accent-indigo-600 w-4 h-4">
          <span class="text-sm font-medium">DP / FP ルールを使用する</span>
        </label>
      </div>

      <!-- 打順表 -->
      <div class="bg-white rounded-2xl shadow overflow-hidden mb-4">
        <div class="bg-indigo-600 text-white text-xs grid grid-cols-12 px-3 py-2 font-semibold">
          <div class="col-span-1">打順</div>
          <div class="col-span-5">選手</div>
          <div class="col-span-4">守備位置</div>
          <div v-if="useDP" class="col-span-2 text-center">DP</div>
        </div>
        <div v-for="entry in lineup" :key="entry.order"
             class="grid grid-cols-12 gap-1 px-2 py-1.5 border-b last:border-0 items-center">
          <div class="col-span-1 text-center font-bold text-gray-600 text-sm">{{ entry.order }}</div>
          <div class="col-span-5">
            <select v-model="entry.memberId" class="w-full border rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
              <option value="">選択</option>
              <option v-for="m in sortedMembers" :key="m.id" :value="m.id">{{ m.name }}({{ m.grade }}年)</option>
            </select>
          </div>
          <div class="col-span-4">
            <select v-model="entry.position" class="w-full border rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
              <option value="">-</option>
              <option v-for="p in POSITIONS" :key="p.code" :value="p.code">{{ p.label }}</option>
            </select>
          </div>
          <div v-if="useDP" class="col-span-2 flex justify-center">
            <input type="radio" name="dp" :checked="entry.isDP" @change="setDP(entry.order)" class="accent-indigo-600 w-4 h-4">
          </div>
        </div>
      </div>

      <!-- FP設定 -->
      <div v-if="useDP" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <h3 class="text-sm font-bold text-amber-800 mb-3">
          FP（フレックスプレイヤー）設定
          <span class="text-xs font-normal ml-2 text-amber-600">守備のみ・打順なし</span>
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-amber-700 mb-1">FP選手</label>
            <select v-model="fpMemberId" class="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
              <option value="">選択</option>
              <option v-for="m in sortedMembers" :key="m.id" :value="m.id">{{ m.name }}({{ m.grade }}年)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-amber-700 mb-1">守備位置</label>
            <select v-model="fpPosition" class="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
              <option value="">-</option>
              <option v-for="p in POSITIONS" :key="p.code" :value="p.code">{{ p.label }}</option>
            </select>
          </div>
        </div>
        <p class="text-xs text-amber-600 mt-2">
          DP（打順 {{ dpOrder || '?' }}番）が FP の代わりに打席に立ちます
        </p>
      </div>

      <!-- オーダー保存 -->
      <button @click="saveLineup" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">
        オーダーを保存
      </button>
    </div>

    <!-- ===== 出欠タブ ===== -->
    <div v-if="tab==='attendance'">
      <!-- サマリー -->
      <div class="grid grid-cols-4 gap-2 mb-4">
        <div class="bg-green-50 rounded-xl p-2 text-center">
          <p class="text-xl font-bold text-green-600">{{ attSummary.attending }}</p>
          <p class="text-xs text-gray-500">参加</p>
        </div>
        <div class="bg-red-50 rounded-xl p-2 text-center">
          <p class="text-xl font-bold text-red-500">{{ attSummary.absent }}</p>
          <p class="text-xs text-gray-500">不参加</p>
        </div>
        <div class="bg-amber-50 rounded-xl p-2 text-center">
          <p class="text-xl font-bold text-amber-500">{{ attSummary.undecided }}</p>
          <p class="text-xs text-gray-500">未定</p>
        </div>
        <div class="bg-slate-50 rounded-xl p-2 text-center">
          <p class="text-xl font-bold text-slate-400">{{ attSummary.notEntered }}</p>
          <p class="text-xs text-gray-500">未入力</p>
        </div>
      </div>

      <div v-if="attSummary.total === 0" class="text-center py-8 text-gray-400 text-sm">
        メンバーを先に登録してください
      </div>

      <!-- グループ別一覧 -->
      <div v-for="group in memberGroups" :key="group.label" class="bg-white rounded-2xl shadow mb-3 overflow-hidden">
        <div class="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">{{ group.label }} ({{ group.members.length }}名)</div>
        <div v-for="m in group.members" :key="m.id"
             class="flex items-center px-4 py-3 border-b last:border-0">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-800">{{ m.name }}</p>
            <p v-if="m.grade" class="text-xs text-gray-400">{{ m.grade }}年生</p>
          </div>
          <div class="flex gap-1.5">
            <button @click="setAttStatus(m.id,'attending')"
                    :class="getAttStatus(m.id)==='attending'?'bg-green-500 text-white':'bg-gray-100 text-gray-500'"
                    class="w-9 h-9 rounded-lg text-sm font-bold">○</button>
            <button @click="setAttStatus(m.id,'absent')"
                    :class="getAttStatus(m.id)==='absent'?'bg-red-500 text-white':'bg-gray-100 text-gray-500'"
                    class="w-9 h-9 rounded-lg text-sm font-bold">×</button>
            <button @click="setAttStatus(m.id,'unknown')"
                    :class="getAttStatus(m.id)==='unknown'?'bg-amber-400 text-white':'bg-gray-100 text-gray-400'"
                    class="w-9 h-9 rounded-lg text-xs font-bold">未定</button>
            <span v-if="!attendance.find(a=>a.memberId===m.id)"
                  class="w-9 h-9 rounded-lg text-xs font-bold bg-slate-100 text-slate-300 flex items-center justify-center">未</span>
          </div>
        </div>
      </div>

      <button @click="saveAttendance" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 mt-2">
        出欠を保存
      </button>
    </div>

    <!-- ===== 記録タブ ===== -->
    <div v-if="tab==='record'">
      <!-- 投手記録 -->
      <div class="bg-white rounded-2xl shadow mb-4 overflow-hidden">
        <div class="bg-gray-50 px-4 py-2 flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500">投手記録</span>
          <button @click="addPitcher" class="text-xs text-indigo-600 font-semibold">＋ 追加</button>
        </div>
        <div v-if="pitcherLog.length===0" class="px-4 py-4 text-xs text-gray-400">未入力</div>
        <div v-for="(p, i) in pitcherLog" :key="i" class="flex items-center px-4 py-2.5 border-b last:border-0 gap-3">
          <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">P</div>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ memberShortName(store.getMember(p.memberId)) }}</p>
            <p class="text-xs text-gray-400">{{ p.fromInning }}回〜{{ p.toInning }}回</p>
          </div>
          <button @click="removePitcher(i)" class="text-red-400 text-xs">削除</button>
        </div>
      </div>

      <!-- 打席結果 -->
      <div class="bg-white rounded-2xl shadow mb-4 overflow-hidden">
        <div class="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">打席結果</div>
        <div v-if="orderedLineup.length===0" class="px-4 py-4 text-xs text-gray-400">オーダーを先に設定してください</div>
        <div v-for="entry in orderedLineup" :key="entry.memberId"
             class="flex items-start px-3 py-3 border-b last:border-0 gap-2">
          <div class="flex-shrink-0 w-6 text-center">
            <span class="text-xs font-bold text-indigo-600">{{ entry.order }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium mb-1.5">{{ memberShortName(store.getMember(entry.memberId)) }}</p>
            <div class="flex flex-wrap gap-1.5">
              <!-- 既存打席 -->
              <button v-for="ab in getMemberAtBats(entry.memberId)" :key="ab.inning"
                      @click="openAbModal(entry.memberId, ab.inning)"
                      :class="abResultColor(ab.result)"
                      class="px-2 py-1 rounded-lg text-xs font-bold">
                {{ ab.result }}<span class="text-xs opacity-60 ml-0.5">{{ ab.inning }}</span>
              </button>
              <!-- 追加ボタン -->
              <button @click="addAbInning(entry.memberId)"
                      class="px-2 py-1 rounded-lg text-xs bg-gray-100 text-gray-400 font-bold">＋</button>
            </div>
          </div>
        </div>
      </div>

      <button @click="saveRecord" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">
        記録を保存
      </button>

      <!-- 打席入力モーダル -->
      <div v-if="abModal" class="fixed inset-x-4 bottom-20 bg-white rounded-2xl shadow-2xl border p-4 z-50">
        <p class="text-sm font-bold mb-3 text-gray-700">
          {{ memberShortName(store.getMember(abModal.memberId)) }} — {{ abModal.inning }}回の結果
        </p>
        <div class="grid grid-cols-4 gap-2 mb-3">
          <button v-for="r in AT_BAT_RESULTS" :key="r.code"
                  @click="setAbResult(r.code)"
                  :class="abResultColor(r.code)"
                  class="py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5">
            <span class="font-bold">{{ r.label }}</span>
            <span class="text-xs opacity-70">{{ r.sub }}</span>
          </button>
        </div>
        <div class="flex gap-2">
          <button @click="setAbResult(null)" class="flex-1 py-2 border rounded-lg text-sm text-red-400 hover:bg-red-50">削除</button>
          <button @click="abModal=null" class="flex-1 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">キャンセル</button>
        </div>
      </div>

      <!-- 投手追加モーダル -->
      <div v-if="pitcherModal" class="fixed inset-x-4 bottom-20 bg-white rounded-2xl shadow-2xl border p-4 z-50">
        <p class="text-sm font-bold mb-3">投手を登録</p>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">投手</label>
            <select v-model="pitcherInningEdit.memberId" class="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">選択</option>
              <option v-for="m in playerMembers" :key="m.id" :value="m.id">{{ memberShortName(m) }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">開始回</label>
              <select v-model="pitcherInningEdit.fromInning" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option v-for="n in inningNums" :key="n" :value="n">{{ n }}回</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">終了回</label>
              <select v-model="pitcherInningEdit.toInning" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option v-for="n in inningNums" :key="n" :value="n">{{ n }}回</option>
              </select>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button @click="pitcherModal=false" class="flex-1 py-2 border rounded-lg text-sm text-gray-500">キャンセル</button>
          <button @click="savePitcher" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">登録</button>
        </div>
      </div>
    </div>

    <!-- ===== シミュレーションタブ ===== -->
    <div v-if="tab==='simulate'">
      <!-- フィールド図 -->
      <div class="bg-white rounded-2xl shadow overflow-hidden mb-4">
        <svg viewBox="0 0 320 260" style="width:100%;display:block">
          <!-- 外野芝 -->
          <ellipse cx="160" cy="120" rx="152" ry="130" fill="#4ade80" opacity="0.35"/>
          <!-- 内野土 -->
          <polygon points="160,230 252,145 160,58 68,145" fill="#fbbf24" opacity="0.4"/>
          <!-- ベースライン -->
          <line x1="160" y1="230" x2="252" y2="145" stroke="white" stroke-width="1.5"/>
          <line x1="252" y1="145" x2="160" y2="58" stroke="white" stroke-width="1.5"/>
          <line x1="160" y1="58" x2="68" y2="145" stroke="white" stroke-width="1.5"/>
          <line x1="68" y1="145" x2="160" y2="230" stroke="white" stroke-width="1.5"/>
          <!-- ピッチャーズマウンド -->
          <circle cx="160" cy="152" r="9" fill="#d97706" opacity="0.8"/>
          <!-- ベース -->
          <rect x="153" y="222" width="14" height="14" fill="white" rx="2"/>
          <rect x="244" y="137" width="14" height="14" fill="white" rx="2"/>
          <rect x="153" y="50" width="14" height="14" fill="white" rx="2"/>
          <rect x="62" y="137" width="14" height="14" fill="white" rx="2"/>
          <!-- 各ポジション -->
          <g v-for="fp in FIELD_POS_LIST" :key="fp.code"
             @click="selectedPos=fp.code" style="cursor:pointer">
            <circle :cx="fp.x" :cy="fp.y" r="20"
                    :fill="simPlayerName(fp.code)?'#6366f1':'rgba(255,255,255,0.88)'"
                    :stroke="selectedPos===fp.code?'#f59e0b':'#6366f1'"
                    stroke-width="2"/>
            <text :x="fp.x" :y="fp.y-5" text-anchor="middle" dominant-baseline="middle"
                  font-size="7" :fill="simPlayerName(fp.code)?'#c7d2fe':'#9ca3af'">{{ fp.label }}</text>
            <text :x="fp.x" :y="fp.y+7" text-anchor="middle" dominant-baseline="middle"
                  font-size="9" font-weight="bold"
                  :fill="simPlayerName(fp.code)?'white':'#6366f1'">
              {{ simPlayerName(fp.code) || '+' }}
            </text>
          </g>
        </svg>
      </div>

      <!-- 打順一覧 -->
      <div class="bg-white rounded-2xl shadow overflow-hidden mb-4">
        <div class="px-4 py-2 border-b bg-gray-50 text-xs font-semibold text-gray-500">打順</div>
        <div v-for="entry in lineup" :key="entry.order"
             class="flex items-center gap-3 px-4 py-2.5 border-b last:border-0">
          <span class="text-sm font-bold text-indigo-600 w-5">{{ entry.order }}</span>
          <span class="text-sm font-medium flex-1">
            {{ entry.memberId ? memberShortName(store.getMember(entry.memberId)) : '未設定' }}
          </span>
          <span class="text-xs text-gray-400 w-10">{{ entry.position ? posLabel(entry.position) : '-' }}</span>
          <span v-if="entry.isDP" class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">DP</span>
        </div>
      </div>

      <button @click="saveLineup" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700">
        オーダーを保存
      </button>

      <!-- ポジション選択パネル -->
      <div v-if="selectedPos" class="fixed inset-x-4 bottom-20 bg-white rounded-2xl shadow-2xl border p-4 z-50">
        <p class="text-sm font-bold mb-3 text-gray-700">
          「{{ (FIELD_POS_LIST.find(p=>p.code===selectedPos)||{}).label }}」の選手を選択
        </p>
        <div class="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto">
          <button v-for="m in playerMembers" :key="m.id"
                  @click="simAssign(selectedPos, m.id)"
                  class="px-2 py-2 rounded-lg border text-sm hover:bg-indigo-50 text-left truncate"
                  :class="lineup.some(l=>l.memberId===m.id&&l.position===selectedPos)?'border-indigo-500 bg-indigo-50 font-semibold':''">
            {{ memberShortName(m) }}
          </button>
        </div>
        <div class="flex gap-2 mt-3">
          <button @click="simAssign(selectedPos, '')" class="flex-1 py-2 border rounded-lg text-sm text-red-400 hover:bg-red-50">削除</button>
          <button @click="selectedPos=null" class="flex-1 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">キャンセル</button>
        </div>
      </div>
    </div>
  </div>
</div>
  `
};

// ── 成績統計 ────────────────────────────────────
const Stats = {
  setup() {
    const rec = computed(() => store.record);
    const games = computed(() => sortedEvents(store.gameEvents).reverse());

    const winPct = computed(() => {
      if (!rec.value.total) return '-';
      return ((rec.value.wins / rec.value.total) * 100).toFixed(1) + '%';
    });

    const avgScoreUs = computed(() => {
      const gs = store.gameEvents.filter(e => e.result);
      if (!gs.length) return '-';
      const avg = gs.reduce((s, e) => s + totalScore(e.score?.us), 0) / gs.length;
      return avg.toFixed(1);
    });
    const avgScoreThem = computed(() => {
      const gs = store.gameEvents.filter(e => e.result);
      if (!gs.length) return '-';
      const avg = gs.reduce((s, e) => s + totalScore(e.score?.them), 0) / gs.length;
      return avg.toFixed(1);
    });

    // スコア入力モーダル
    const scoreModal = ref(null);
    const modalUs    = ref([]);
    const modalThem  = ref([]);

    function openScoreModal(ev) {
      scoreModal.value = ev;
      const len = ev.innings || 7;
      modalUs.value   = Array.from({ length: len }, (_, i) => ev.score?.us?.[i]   ?? 0);
      modalThem.value = Array.from({ length: len }, (_, i) => ev.score?.them?.[i] ?? 0);
    }
    function saveModalScore() {
      if (!scoreModal.value) return;
      const us    = modalUs.value.map(Number);
      const them  = modalThem.value.map(Number);
      const usT   = us.reduce((a,b)=>a+b,0);
      const themT = them.reduce((a,b)=>a+b,0);
      const result = (usT > 0 || themT > 0) ? (usT > themT ? 'win' : usT < themT ? 'lose' : 'draw') : null;
      store.updateEvent(scoreModal.value.id, { score: { us, them }, result });
      scoreModal.value = null;
    }
    function inningArr(ev) { return Array.from({ length: ev.innings || 7 }, (_, i) => i); }

    return { rec, games, winPct, avgScoreUs, avgScoreThem, store, totalScore, navigate, scoreModal, modalUs, modalThem, openScoreModal, saveModalScore, inningArr };
  },
  template: `
<div class="max-w-2xl mx-auto px-4 py-6 space-y-5">
  <h1 class="text-xl font-bold text-gray-800">📊 成績統計</h1>

  <!-- 戦績カード -->
  <div class="bg-white rounded-2xl shadow p-5">
    <h2 class="text-sm font-semibold text-gray-500 mb-4">チーム戦績</h2>
    <div class="flex gap-4 justify-around text-center mb-4">
      <div><p class="text-4xl font-bold text-green-600">{{ rec.wins }}</p><p class="text-xs text-gray-500 mt-1">勝</p></div>
      <div><p class="text-4xl font-bold text-red-500">{{ rec.losses }}</p><p class="text-xs text-gray-500 mt-1">敗</p></div>
      <div><p class="text-4xl font-bold text-gray-400">{{ rec.draws }}</p><p class="text-xs text-gray-500 mt-1">分</p></div>
    </div>
    <div class="grid grid-cols-3 gap-3 text-center border-t pt-4">
      <div><p class="text-xl font-bold text-indigo-600">{{ rec.total }}</p><p class="text-xs text-gray-500">試合数</p></div>
      <div><p class="text-xl font-bold text-indigo-600">{{ winPct }}</p><p class="text-xs text-gray-500">勝率</p></div>
      <div><p class="text-xl font-bold text-indigo-600">{{ store.members.length }}</p><p class="text-xs text-gray-500">メンバー</p></div>
    </div>
  </div>

  <!-- 得点統計 -->
  <div class="bg-white rounded-2xl shadow p-5">
    <h2 class="text-sm font-semibold text-gray-500 mb-4">得点統計（試合平均）</h2>
    <div class="grid grid-cols-2 gap-4 text-center">
      <div class="bg-indigo-50 rounded-xl p-3">
        <p class="text-3xl font-bold text-indigo-700">{{ avgScoreUs }}</p>
        <p class="text-xs text-gray-500 mt-1">平均得点</p>
      </div>
      <div class="bg-red-50 rounded-xl p-3">
        <p class="text-3xl font-bold text-red-500">{{ avgScoreThem }}</p>
        <p class="text-xs text-gray-500 mt-1">平均失点</p>
      </div>
    </div>
  </div>

  <!-- 試合結果一覧 -->
  <div class="bg-white rounded-2xl shadow p-5">
    <h2 class="text-sm font-semibold text-gray-500 mb-3">試合一覧</h2>
    <div v-if="!games.length" class="text-center py-6 text-gray-400 text-sm">試合がありません</div>
    <div v-for="ev in games" :key="ev.id"
         class="py-2.5 border-b last:border-0">
      <div class="flex items-center gap-3">
        <span :class="ev.result==='win'?'bg-green-100 text-green-700':ev.result==='lose'?'bg-red-100 text-red-600':ev.result==='draw'?'bg-gray-100 text-gray-600':'bg-blue-50 text-blue-400'"
              class="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 w-8 text-center">
          {{ ev.result==='win'?'勝':ev.result==='lose'?'敗':ev.result==='draw'?'分':'未' }}
        </span>
        <div class="flex-1 cursor-pointer" @click="navigate('#/events/'+ev.id)">
          <p class="text-sm font-medium text-gray-800">{{ ev.date }} vs {{ ev.opponent||'未定' }}</p>
          <p class="text-xs text-gray-400">{{ ev.homeAway==='home'?'ホーム':'アウェイ' }}{{ ev.location?' / '+ev.location:'' }}</p>
        </div>
        <span v-if="ev.result" class="font-mono text-sm font-bold mr-2">{{ totalScore(ev.score?.us) }}-{{ totalScore(ev.score?.them) }}</span>
        <button @click="openScoreModal(ev)"
                class="text-xs border border-indigo-300 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-50 flex-shrink-0">
          スコア入力
        </button>
      </div>
    </div>
  </div>

  <!-- スコア入力モーダル -->
  <div v-if="scoreModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
      <h2 class="text-lg font-bold mb-1">スコア入力</h2>
      <p class="text-sm text-gray-500 mb-4">{{ scoreModal.date }} vs {{ scoreModal.opponent||'未定' }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm mb-4">
          <thead>
            <tr class="bg-gray-50">
              <th class="py-2 px-2 text-left text-gray-500 text-xs w-16">チーム</th>
              <th v-for="i in inningArr(scoreModal)" :key="i" class="py-2 px-1 text-center text-gray-500 text-xs w-10">{{ i+1 }}</th>
              <th class="py-2 px-2 text-center text-gray-700 text-xs w-10">計</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t">
              <td class="py-2 px-2 font-semibold text-indigo-700 text-xs">自チーム</td>
              <td v-for="(_, i) in modalUs" :key="i" class="py-1 px-0.5">
                <input v-model="modalUs[i]" type="number" min="0" max="99"
                       class="w-9 text-center border rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              </td>
              <td class="text-center font-bold text-indigo-700">{{ modalUs.reduce((a,b)=>a+(+b),0) }}</td>
            </tr>
            <tr class="border-t bg-gray-50">
              <td class="py-2 px-2 font-semibold text-gray-600 text-xs">{{ scoreModal.opponent||'相手' }}</td>
              <td v-for="(_, i) in modalThem" :key="i" class="py-1 px-0.5">
                <input v-model="modalThem[i]" type="number" min="0" max="99"
                       class="w-9 text-center border rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50">
              </td>
              <td class="text-center font-bold text-gray-600">{{ modalThem.reduce((a,b)=>a+(+b),0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-400 text-center mb-4">保存すると勝敗が自動判定されます</p>
      <div class="flex gap-3">
        <button @click="scoreModal=null" class="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">キャンセル</button>
        <button @click="saveModalScore" class="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">保存</button>
      </div>
    </div>
  </div>

  <!-- データ管理 -->
  <div class="bg-white rounded-2xl shadow p-5">
    <h2 class="text-sm font-semibold text-gray-500 mb-3">データ管理</h2>
    <div class="flex gap-3 mb-3">
      <button @click="store.exportData()" class="flex-1 border border-indigo-300 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50">
        📤 エクスポート
      </button>
      <label class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 text-center cursor-pointer">
        📥 インポート
        <input type="file" accept=".json" class="hidden" @change="importFile">
      </label>
    </div>
    <!-- ローカルデータ移行ボタン（旧バージョンからの引き継ぎ用） -->
    <button @click="migrateFromLocal" class="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600">
      🔄 このPCのデータをクラウドに移行
    </button>
    <p class="text-xs text-gray-400 mt-2 text-center">旧バージョンのデータをFirestoreに一括移行します</p>
  </div>
</div>
  `,
  methods: {
    importFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = store.importData(ev.target.result);
        alert(ok ? 'インポートしました！' : 'ファイルの形式が正しくありません');
      };
      reader.readAsText(file);
    },
    migrateFromLocal() {
      const LOCAL_KEY = 'softball_v1';
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return alert('このPCにローカルデータが見つかりませんでした。');
      if (!confirm('このPCのデータをクラウドに移行しますか？\n（既存のクラウドデータとマージされます）')) return;
      const ok = store.importData(raw);
      if (ok) alert('移行完了！\nスマホや他のPCでも同じデータが見られます。');
      else alert('移行に失敗しました。');
    }
  }
};

// ── ラインナップシミュレーター ──────────────────
const SIM_DRAFT_KEY = 'softball_sim_draft';
const LineupSim = {
  setup() {
    const playerMembers = computed(() => [...store.members]
      .filter(m => !m.type || m.type === 'player')
      .sort((a, b) => (b.grade||0) - (a.grade||0) || a.name.localeCompare(b.name))
    );

    // 状態
    const useDP      = ref(false);
    const lineup     = ref(Array.from({ length: 9 }, (_, i) => ({ order: i+1, memberId: '', position: '', isDP: false })));
    const fpMemberId = ref('');
    const fpPosition = ref('');
    const selectedPos = ref(null);

    // ドラッグ並び替え
    const dragFrom = ref(null);
    function onDragStart(idx) { dragFrom.value = idx; }
    function onDragOver(e) { e.preventDefault(); }
    function onDrop(idx) {
      if (dragFrom.value === null || dragFrom.value === idx) { dragFrom.value = null; return; }
      const arr = lineup.value;
      const [moved] = arr.splice(dragFrom.value, 1);
      arr.splice(idx, 0, moved);
      arr.forEach((l, i) => l.order = i + 1);
      dragFrom.value = null;
    }

    // ベンチ外メンバー（打順に未登録の選手）
    const benchMembers = computed(() => {
      const assignedIds = new Set(lineup.value.filter(l => l.memberId).map(l => l.memberId));
      if (useDP.value && fpMemberId.value) assignedIds.add(fpMemberId.value);
      return playerMembers.value.filter(m => !assignedIds.has(m.id));
    });

    // ドラフト保存・復元
    function loadDraft() {
      try {
        const d = JSON.parse(localStorage.getItem(SIM_DRAFT_KEY) || 'null');
        if (!d) return;
        useDP.value      = d.useDP     || false;
        lineup.value     = d.lineup    || lineup.value;
        fpMemberId.value = d.fpMemberId || '';
        fpPosition.value = d.fpPosition || '';
      } catch(e) {}
    }
    function saveDraft() {
      localStorage.setItem(SIM_DRAFT_KEY, JSON.stringify({
        useDP: useDP.value, lineup: lineup.value,
        fpMemberId: fpMemberId.value, fpPosition: fpPosition.value,
      }));
      alert('ラインナップを保存しました');
    }
    function clearDraft() {
      if (!confirm('ラインナップをリセットしますか？')) return;
      lineup.value    = Array.from({ length: 9 }, (_, i) => ({ order: i+1, memberId: '', position: '', isDP: false }));
      fpMemberId.value = '';
      fpPosition.value = '';
      useDP.value      = false;
      localStorage.removeItem(SIM_DRAFT_KEY);
    }

    onMounted(loadDraft);

    // フィールド図
    const FIELD_POS_LIST = FIELD_POSITIONS;
    function simPlayerName(posCode) {
      const entry = lineup.value.find(l => l.position === posCode);
      if (entry?.memberId) { const m = store.getMember(entry.memberId); return m ? memberShortName(m) : ''; }
      if (posCode === fpPosition.value && fpMemberId.value) { const m = store.getMember(fpMemberId.value); return m ? memberShortName(m) : ''; }
      return '';
    }
    function simAssign(posCode, memberId) {
      lineup.value.forEach(l => { if (l.position === posCode) l.position = ''; });
      if (memberId) {
        const existing = lineup.value.find(l => l.memberId === memberId);
        if (existing) existing.position = posCode;
        else {
          const empty = lineup.value.find(l => !l.memberId);
          if (empty) { empty.memberId = memberId; empty.position = posCode; }
          else lineup.value.push({ order: lineup.value.length + 1, memberId, position: posCode, isDP: false });
        }
      }
      selectedPos.value = null;
    }

    function setDP(order) { lineup.value.forEach(l => l.isDP = l.order === order); }
    const dpOrder = computed(() => lineup.value.find(l => l.isDP)?.order);

    // 打順に選手を設定したとき、ポジションを自動入力
    function onMemberSelect(entry) {
      if (!entry.memberId) return;
      const m = store.getMember(entry.memberId);
      if (m?.positions?.length && !entry.position) entry.position = m.positions[0];
    }

    // テキスト出力（LINEやメモアプリへコピー）
    const showCopy = ref(false);
    const copyText = computed(() => {
      const lines = ['【打順・守備】'];
      lineup.value.filter(l => l.memberId).sort((a,b)=>a.order-b.order).forEach(l => {
        const m = store.getMember(l.memberId);
        const name = m ? memberShortName(m) : '?';
        const pos  = l.position ? posLabel(l.position) : '-';
        const dp   = l.isDP ? ' [DP]' : '';
        lines.push(`${l.order}. ${name}（${pos}）${dp}`);
      });
      if (useDP.value && fpMemberId.value) {
        const m = store.getMember(fpMemberId.value);
        const pos = fpPosition.value ? posLabel(fpPosition.value) : '-';
        lines.push(`FP. ${m ? memberShortName(m) : '?'}（${pos}）`);
      }
      return lines.join('\n');
    });
    function copyToClipboard() {
      navigator.clipboard?.writeText(copyText.value).then(() => alert('コピーしました！'));
    }

    return { playerMembers, benchMembers, useDP, lineup, fpMemberId, fpPosition, selectedPos, FIELD_POS_LIST, simPlayerName, simAssign, setDP, dpOrder, onMemberSelect, saveDraft, clearDraft, showCopy, copyText, copyToClipboard, POSITIONS, posLabel, memberShortName, navigate, store, onDragStart, onDragOver, onDrop, dragFrom };
  },
  template: `
<div class="max-w-2xl mx-auto px-4 py-6 pb-24">
  <div class="flex items-center justify-between mb-4">
    <h1 class="text-xl font-bold text-gray-800">🎯 ラインナップ</h1>
    <div class="flex gap-2">
      <button @click="copyToClipboard" class="text-sm text-indigo-600 font-semibold border border-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50">コピー</button>
      <button @click="clearDraft" class="text-sm text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">リセット</button>
    </div>
  </div>

  <!-- フィールド図 -->
  <div class="bg-white rounded-2xl shadow overflow-hidden mb-4">
    <svg viewBox="0 0 320 260" style="width:100%;display:block">
      <ellipse cx="160" cy="120" rx="152" ry="130" fill="#4ade80" opacity="0.35"/>
      <polygon points="160,230 252,145 160,58 68,145" fill="#fbbf24" opacity="0.4"/>
      <line x1="160" y1="230" x2="252" y2="145" stroke="white" stroke-width="1.5"/>
      <line x1="252" y1="145" x2="160" y2="58" stroke="white" stroke-width="1.5"/>
      <line x1="160" y1="58" x2="68" y2="145" stroke="white" stroke-width="1.5"/>
      <line x1="68" y1="145" x2="160" y2="230" stroke="white" stroke-width="1.5"/>
      <circle cx="160" cy="152" r="9" fill="#d97706" opacity="0.8"/>
      <rect x="153" y="222" width="14" height="14" fill="white" rx="2"/>
      <rect x="244" y="137" width="14" height="14" fill="white" rx="2"/>
      <rect x="153" y="50" width="14" height="14" fill="white" rx="2"/>
      <rect x="62" y="137" width="14" height="14" fill="white" rx="2"/>
      <g v-for="fp in FIELD_POS_LIST" :key="fp.code" @click="selectedPos=fp.code" style="cursor:pointer">
        <circle :cx="fp.x" :cy="fp.y" r="20"
                :fill="simPlayerName(fp.code)?'#6366f1':'rgba(255,255,255,0.88)'"
                :stroke="selectedPos===fp.code?'#f59e0b':'#6366f1'"
                stroke-width="2"/>
        <text :x="fp.x" :y="fp.y-5" text-anchor="middle" dominant-baseline="middle"
              font-size="7" :fill="simPlayerName(fp.code)?'#c7d2fe':'#9ca3af'">{{ fp.label }}</text>
        <text :x="fp.x" :y="fp.y+7" text-anchor="middle" dominant-baseline="middle"
              font-size="9" font-weight="bold"
              :fill="simPlayerName(fp.code)?'white':'#6366f1'">
          {{ simPlayerName(fp.code) || '+' }}
        </text>
      </g>
    </svg>
  </div>

  <!-- DP/FP -->
  <div class="bg-white rounded-2xl shadow p-3 mb-4 flex items-center gap-3">
    <label class="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" v-model="useDP" class="accent-indigo-600 w-4 h-4">
      <span class="text-sm font-medium text-gray-700">DP / FP ルールを使用する</span>
    </label>
  </div>

  <!-- 打順テーブル -->
  <div class="bg-white rounded-2xl shadow overflow-hidden mb-4">
    <div class="grid gap-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 border-b"
         :class="useDP ? 'grid-cols-12' : 'grid-cols-11'">
      <div class="col-span-1 text-center">≡</div>
      <div class="col-span-1">#</div>
      <div class="col-span-4">選手</div>
      <div class="col-span-4">守備位置</div>
      <div v-if="useDP" class="col-span-2 text-center">DP</div>
    </div>
    <div v-for="(entry, idx) in lineup" :key="entry.order"
         draggable="true"
         @dragstart="onDragStart(idx)"
         @dragover="onDragOver"
         @drop="onDrop(idx)"
         :class="dragFrom===idx ? 'opacity-40' : ''"
         class="grid gap-1 items-center px-2 py-2 border-b last:border-0 transition-opacity"
         :style="useDP ? 'grid-template-columns:repeat(12,minmax(0,1fr))' : 'grid-template-columns:repeat(11,minmax(0,1fr))'">
      <div class="col-span-1 text-center text-gray-400 cursor-grab active:cursor-grabbing text-base select-none">⠿</div>
      <div class="col-span-1 text-sm font-bold text-indigo-600">{{ entry.order }}</div>
      <div class="col-span-4">
        <select v-model="entry.memberId" @change="onMemberSelect(entry)"
                class="w-full border rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
          <option value="">-</option>
          <option v-for="m in playerMembers" :key="m.id" :value="m.id">{{ memberShortName(m) }}({{ m.grade }}年)</option>
        </select>
      </div>
      <div class="col-span-4">
        <select v-model="entry.position"
                class="w-full border rounded-lg px-1 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
          <option value="">-</option>
          <option v-for="p in POSITIONS" :key="p.code" :value="p.code">{{ p.label }}</option>
        </select>
      </div>
      <div v-if="useDP" class="col-span-2 flex justify-center">
        <input type="radio" name="dp" :checked="entry.isDP" @change="setDP(entry.order)" class="accent-indigo-600 w-4 h-4">
      </div>
    </div>

    <!-- FP -->
    <div v-if="useDP" class="bg-amber-50 border-t border-amber-200 px-3 py-3">
      <p class="text-xs font-bold text-amber-700 mb-2">FP（フレックスプレイヤー）</p>
      <div class="grid grid-cols-2 gap-2">
        <select v-model="fpMemberId" class="border border-amber-300 rounded-lg px-2 py-1.5 text-xs bg-white">
          <option value="">選択</option>
          <option v-for="m in playerMembers" :key="m.id" :value="m.id">{{ memberShortName(m) }}</option>
        </select>
        <select v-model="fpPosition" class="border border-amber-300 rounded-lg px-2 py-1.5 text-xs bg-white">
          <option value="">守備位置</option>
          <option v-for="p in POSITIONS" :key="p.code" :value="p.code">{{ p.label }}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- ベンチ外メンバー -->
  <div v-if="benchMembers.length" class="bg-white rounded-2xl shadow p-4 mb-4">
    <p class="text-xs font-semibold text-gray-500 mb-2">ベンチ外（{{ benchMembers.length }}名）</p>
    <div class="flex flex-wrap gap-2">
      <span v-for="m in benchMembers" :key="m.id"
            class="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
        {{ memberShortName(m) }}({{ m.grade }}年)
      </span>
    </div>
  </div>

  <!-- 保存ボタン -->
  <button @click="saveDraft" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 mb-4">
    ラインナップを保存
  </button>

  <!-- テキスト出力 -->
  <div class="bg-white rounded-2xl shadow p-4">
    <p class="text-xs font-semibold text-gray-500 mb-2">LINEやメモにコピー</p>
    <pre class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ copyText }}</pre>
    <button @click="copyToClipboard" class="mt-3 w-full border border-indigo-300 text-indigo-600 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-50">
      📋 クリップボードにコピー
    </button>
  </div>

  <!-- ポジション選択パネル -->
  <div v-if="selectedPos" class="fixed inset-x-4 bottom-20 bg-white rounded-2xl shadow-2xl border p-4 z-50">
    <p class="text-sm font-bold mb-3 text-gray-700">
      「{{ (FIELD_POS_LIST.find(p=>p.code===selectedPos)||{}).label }}」の選手を選択
    </p>
    <div class="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto">
      <button v-for="m in playerMembers" :key="m.id"
              @click="simAssign(selectedPos, m.id)"
              class="px-2 py-2 rounded-lg border text-sm hover:bg-indigo-50 text-left truncate"
              :class="lineup.some(l=>l.memberId===m.id&&l.position===selectedPos)?'border-indigo-500 bg-indigo-50 font-semibold':''">
        {{ memberShortName(m) }}
      </button>
    </div>
    <div class="flex gap-2 mt-3">
      <button @click="simAssign(selectedPos,'')" class="flex-1 py-2 border rounded-lg text-sm text-red-400 hover:bg-red-50">削除</button>
      <button @click="selectedPos=null" class="flex-1 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">キャンセル</button>
    </div>
  </div>
</div>
  `
};

// ── ルーター ────────────────────────────────────
const App = {
  components: { Dashboard, Members, Schedule, EventDetail, Stats, LineupSim },
  setup() {
    const hash = ref(location.hash.replace('#', '') || '/');
    window.addEventListener('hashchange', () => {
      hash.value = location.hash.replace('#', '') || '/';
    });

    const pageComponent = computed(() => {
      const h = hash.value;
      if (h === '/' || h === '') return Dashboard;
      if (h.startsWith('/members'))  return Members;
      if (h.startsWith('/schedule')) return Schedule;
      if (h.startsWith('/events/'))  return EventDetail;
      if (h === '/stats')            return Stats;
      if (h === '/sim')              return LineupSim;
      return Dashboard;
    });

    const eventId = computed(() => {
      const m = hash.value.match(/^\/events\/(.+)$/);
      return m ? m[1] : null;
    });

    const navLinks = [
      { href: '#/', label: 'ホーム', icon: '🏠' },
      { href: '#/members', label: 'メンバー', icon: '👥' },
      { href: '#/schedule', label: '日程', icon: '📅' },
      { href: '#/sim', label: 'オーダー', icon: '🎯' },
      { href: '#/stats', label: '成績', icon: '📊' },
    ];

    function isActive(href) {
      const path = href.replace('#', '');
      if (path === '/') return hash.value === '/' || hash.value === '';
      return hash.value.startsWith(path);
    }

    return { pageComponent, eventId, navLinks, isActive };
  },
  template: `
<div class="min-h-screen bg-gray-50">
  <!-- PCトップナビ -->
  <nav class="hidden md:flex fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 h-14 items-center">
    <div class="max-w-2xl mx-auto w-full px-4 flex items-center gap-6">
      <span class="font-bold text-indigo-700 mr-4">⚾ Softball Manager</span>
      <a v-for="l in navLinks" :key="l.href" :href="l.href"
         :class="isActive(l.href)?'text-indigo-600 font-semibold border-b-2 border-indigo-600':'text-gray-500 hover:text-gray-800'"
         class="text-sm pb-0.5">{{ l.icon }} {{ l.label }}</a>
    </div>
  </nav>

  <!-- メインコンテンツ -->
  <div class="md:pt-14 pb-20 md:pb-0">
    <component :is="pageComponent" :eventId="eventId" />
  </div>

  <!-- モバイルボトムナビ -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex h-16">
    <a v-for="l in navLinks" :key="l.href" :href="l.href"
       :class="isActive(l.href)?'text-indigo-600':'text-gray-400'"
       class="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium">
      <span class="text-xl">{{ l.icon }}</span>
      <span>{{ l.label }}</span>
    </a>
  </nav>
</div>
  `
};

// ── 起動 ────────────────────────────────────────
store.init();
createApp(App).mount('#app');
})();

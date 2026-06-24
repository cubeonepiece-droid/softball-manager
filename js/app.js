// app.js - Vue 3 アプリ本体
;(function () {
const { createApp, ref, computed, reactive, onMounted, watch, nextTick } = Vue;

// ── 定数 ──────────────────────────────────────────
const POSITIONS = [
  { code: 'P',  label: '投手' },
  { code: 'C',  label: '捕手' },
  { code: '1B', label: '一塁' },
  { code: '2B', label: '二塁' },
  { code: '3B', label: '三塁' },
  { code: 'SS', label: '遊撃' },
  { code: 'LF', label: '左翼' },
  { code: 'CF', label: '中堅' },
  { code: 'RF', label: '右翼' },
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
      <span :class="ev.type==='game'?'bg-indigo-100 text-indigo-700':'bg-green-100 text-green-700'"
            class="text-xs px-2 py-1 rounded-full font-semibold">{{ ev.type==='game'?'試合':'練習' }}</span>
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
    const form = reactive({ type: 'player', name: '', grade: 1, number: '', positions: [], notes: '' });

    function openAdd() {
      editing.value = null;
      Object.assign(form, { type: 'player', name: '', grade: 1, number: '', positions: [], notes: '' });
      modal.value = true;
    }
    function openEdit(m) {
      editing.value = m.id;
      Object.assign(form, { type: m.type||'player', name: m.name, grade: m.grade||1, number: m.number||'', positions: [...(m.positions||[])], notes: m.notes||'' });
      modal.value = true;
    }
    function save() {
      if (!form.name.trim()) return alert('名前を入力してください');
      const data = { type: form.type, name: form.name.trim(), grade: form.type==='player'?Number(form.grade):null, number: form.type==='player'?form.number:'', positions: form.type==='player'?[...form.positions]:[], notes: form.notes };
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

    const filtered = computed(() => {
      const ms = filterType.value === 'all' ? store.members : store.members.filter(m => (m.type||'player') === filterType.value);
      return [...ms].sort((a, b) => {
        const ta = a.type||'player', tb = b.type||'player';
        if (ta !== tb) return ta < tb ? -1 : 1;
        return (a.grade||0) - (b.grade||0) || (a.number||999) - (b.number||999);
      });
    });

    const typeColors = { player: 'indigo', parent: 'green', coach: 'amber' };
    function typeBadgeClass(type) {
      const c = typeColors[type||'player'] || 'indigo';
      return `bg-${c}-100 text-${c}-700`;
    }

    return { modal, form, editing, filterType, filtered, openAdd, openEdit, save, del, togglePos, POSITIONS, GRADES, MEMBER_TYPES, store, posLabel, memberTypeLabel, typeBadgeClass };
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
      <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg flex-shrink-0">
        {{ m.number || m.name[0] }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
          {{ m.name }}
          <span :class="typeBadgeClass(m.type)" class="text-xs px-2 py-0.5 rounded-full font-medium">{{ memberTypeLabel(m.type||'player') }}</span>
          <span v-if="m.type==='player'||!m.type" class="text-xs text-gray-500">{{ m.grade }}年生</span>
          <span v-if="m.number" class="text-xs text-gray-400">#{{ m.number }}</span>
        </p>
        <p v-if="m.type==='player'||!m.type" class="text-xs text-gray-500 mt-1">{{ (m.positions||[]).map(p=>posLabel(p)).join(' / ') || '守備位置未設定' }}</p>
        <p v-if="m.notes" class="text-xs text-gray-400 mt-1">{{ m.notes }}</p>
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
          <label class="block text-sm font-medium text-gray-700 mb-1">名前 <span class="text-red-500">*</span></label>
          <input v-model="form.name" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="山田 太郎">
        </div>
        <template v-if="form.type==='player'">
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
      type: 'game', date: '', time: '09:00', opponent: '', location: '', homeAway: 'home', innings: 7, notes: ''
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

    function openAdd(d) {
      editing.value = null;
      Object.assign(form, { type: 'game', date: d ? dateStr(d) : '', time: '09:00', opponent: '', location: '', homeAway: 'home', innings: 7, notes: '' });
      modal.value = true;
    }
    function openEdit(ev) {
      editing.value = ev.id;
      Object.assign(form, { type: ev.type, date: ev.date, time: ev.time||'', opponent: ev.opponent||'', location: ev.location||'', homeAway: ev.homeAway||'home', innings: ev.innings||7, notes: ev.notes||'' });
      modal.value = true;
    }
    function save() {
      if (!form.date) return alert('日付を選択してください');
      const data = { type: form.type, date: form.date, time: form.time, opponent: form.opponent, location: form.location, homeAway: form.homeAway, innings: Number(form.innings), notes: form.notes };
      if (editing.value) { store.updateEvent(editing.value, data); modal.value = false; }
      else {
        const id = store.addEvent(data);
        modal.value = false;
        if (form.type === 'game') navigate('#/events/' + id);
      }
    }
    function del(ev) {
      if (confirm(`「${ev.date} ${ev.type==='game'?'試合':'練習'}」を削除しますか？`)) store.deleteEvent(ev.id);
    }
    function goEvent(ev) { navigate('#/events/' + ev.id); }

    return { calYear, calMonth, calDays, monthEvents, modal, form, editing, prevMonth, nextMonth, eventsOnDay, isToday, openAdd, openEdit, save, del, goEvent, navigate };
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
                :class="ev.type==='game'?'bg-indigo-500':'bg-green-500'"
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
      <span :class="ev.type==='game'?'bg-indigo-100 text-indigo-700':'bg-green-100 text-green-700'"
            class="text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0">
        {{ ev.type==='game'?'試合':'練習' }}
      </span>
      <div class="flex-1 cursor-pointer" @click="goEvent(ev)">
        <p class="text-sm font-medium">{{ ev.date }} {{ ev.time }}</p>
        <p class="text-xs text-gray-500">{{ ev.type==='game'?(ev.opponent||'相手未定')+(ev.location?' @ '+ev.location:'') : (ev.location||'場所未定') }}</p>
        <p v-if="ev.type==='game' && ev.result" :class="ev.result==='win'?'text-green-600':ev.result==='lose'?'text-red-500':'text-gray-500'"
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
          <div class="flex gap-3">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" v-model="form.type" value="game" class="accent-indigo-600"> 試合
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" v-model="form.type" value="practice" class="accent-green-600"> 練習
            </label>
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
        <div v-if="form.type==='game'">
          <label class="block text-sm font-medium text-gray-700 mb-1">相手チーム</label>
          <input v-model="form.opponent" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="○○小学校">
        </div>
        <div v-if="form.type==='game'">
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
        <div v-if="form.type==='game'">
          <label class="block text-sm font-medium text-gray-700 mb-1">イニング数</label>
          <select v-model="form.innings" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option v-for="n in [5,6,7,9]" :key="n" :value="n">{{ n }}回</option>
          </select>
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
    const tab = ref('score'); // 'score' | 'lineup'

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
    }

    onMounted(initFromEvent);
    watch(() => props.eventId, initFromEvent);

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

    const sortedMembers = computed(() => [...store.members].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name)));

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
      const attending = all.filter(m => getAttStatus(m.id) === 'attending').length;
      const absent    = all.filter(m => getAttStatus(m.id) === 'absent').length;
      return { attending, absent, unknown: all.length - attending - absent, total: all.length };
    });

    return { ev, tab, scoreUs, scoreThem, innings, lineup, fpMemberId, fpPosition, useDP, totalUs, totalThem, autoResult, saveScore, saveLineup, memberName, inningLabel, setDP, dpOrder, sortedMembers, POSITIONS, navigate, posLabel, attendance, getAttStatus, setAttStatus, saveAttendance, memberGroups, attSummary };
  },
  template: `
<div v-if="!ev" class="text-center py-20 text-gray-400">イベントが見つかりません</div>
<div v-else class="max-w-2xl mx-auto px-4 py-6">
  <!-- ヘッダー -->
  <div class="flex items-center gap-3 mb-4">
    <button @click="navigate('#/schedule')" class="text-indigo-600 hover:text-indigo-800 text-sm">◀ 日程</button>
    <h1 class="text-xl font-bold text-gray-800 flex-1">
      {{ ev.type==='game'?'⚾ 試合詳細':'🏋️ 練習詳細' }}
    </h1>
  </div>

  <!-- 試合情報 -->
  <div class="bg-white rounded-2xl shadow p-4 mb-4">
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div><span class="text-gray-500">日付：</span><span class="font-medium">{{ ev.date }}</span></div>
      <div><span class="text-gray-500">時間：</span><span class="font-medium">{{ ev.time }}</span></div>
      <div v-if="ev.type==='game'"><span class="text-gray-500">相手：</span><span class="font-medium">{{ ev.opponent||'未定' }}</span></div>
      <div v-if="ev.type==='game'"><span class="text-gray-500">H/A：</span><span class="font-medium">{{ ev.homeAway==='home'?'ホーム':'アウェイ' }}</span></div>
      <div><span class="text-gray-500">場所：</span><span class="font-medium">{{ ev.location||'未定' }}</span></div>
    </div>
  </div>

  <!-- 練習の場合はここまで -->
  <div v-if="ev.type==='practice'" class="text-center py-8 text-gray-400">
    <p>練習の記録はメモ欄を活用してください</p>
    <p class="mt-2 text-sm">{{ ev.notes }}</p>
  </div>

  <template v-if="ev.type==='game'">
    <!-- タブ -->
    <div class="flex mb-4 bg-gray-100 rounded-xl p-1">
      <button @click="tab='score'" :class="tab==='score'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all">スコア</button>
      <button @click="tab='lineup'" :class="tab==='lineup'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all">オーダー</button>
      <button @click="tab='attendance'" :class="tab==='attendance'?'bg-white shadow text-indigo-700':'text-gray-500'"
              class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all">出欠</button>
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
      <div class="flex gap-3 mb-4">
        <div class="flex-1 bg-green-50 rounded-xl p-3 text-center">
          <p class="text-2xl font-bold text-green-600">{{ attSummary.attending }}</p>
          <p class="text-xs text-gray-500 mt-0.5">参加</p>
        </div>
        <div class="flex-1 bg-red-50 rounded-xl p-3 text-center">
          <p class="text-2xl font-bold text-red-500">{{ attSummary.absent }}</p>
          <p class="text-xs text-gray-500 mt-0.5">不参加</p>
        </div>
        <div class="flex-1 bg-gray-50 rounded-xl p-3 text-center">
          <p class="text-2xl font-bold text-gray-400">{{ attSummary.unknown }}</p>
          <p class="text-xs text-gray-500 mt-0.5">未定</p>
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
          <div class="flex gap-2">
            <button @click="setAttStatus(m.id,'attending')"
                    :class="getAttStatus(m.id)==='attending'?'bg-green-500 text-white':'bg-gray-100 text-gray-500'"
                    class="px-3 py-1.5 rounded-lg text-sm font-bold">○</button>
            <button @click="setAttStatus(m.id,'absent')"
                    :class="getAttStatus(m.id)==='absent'?'bg-red-500 text-white':'bg-gray-100 text-gray-500'"
                    class="px-3 py-1.5 rounded-lg text-sm font-bold">×</button>
            <button @click="setAttStatus(m.id,'unknown')"
                    :class="getAttStatus(m.id)==='unknown'?'bg-gray-400 text-white':'bg-gray-100 text-gray-400'"
                    class="px-3 py-1.5 rounded-lg text-sm font-bold">?</button>
          </div>
        </div>
      </div>

      <button @click="saveAttendance" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 mt-2">
        出欠を保存
      </button>
    </div>
  </template>
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
    <div class="flex gap-3">
      <button @click="store.exportData()" class="flex-1 border border-indigo-300 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50">
        📤 エクスポート
      </button>
      <label class="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 text-center cursor-pointer">
        📥 インポート
        <input type="file" accept=".json" class="hidden" @change="importFile">
      </label>
    </div>
    <p class="text-xs text-gray-400 mt-2 text-center">JSONファイルでチーム内共有できます</p>
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
    }
  }
};

// ── ルーター ────────────────────────────────────
const App = {
  components: { Dashboard, Members, Schedule, EventDetail, Stats },
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

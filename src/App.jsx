import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

const INITIAL_PLAYERS = [
  'Afnan', 'Dilshad', 'Hana', 'Haris', 'Hiba',  // ← Hiba added here
  'Imad', 'Irfad', 'Iyad', 'Najad', 'Rammi', 
  'Rebi', 'Riyas', 'Saif', 'Thaju', 'Thanu',
].map((name, i) => ({
  id: i + 1,
  name,
  existingPoints: 0,
  todayPoints: 0,
  totalPoints: 0,
  zeroPointMatch: 0,
  bestSingleDay: 0
}));

const getRankDisplay = (rank) => {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  if (rank === 4) return '4th';
  if (rank === 5) return '5th';
  if (rank === 6) return '6th';
  if (rank === 7) return '7th';
  if (rank === 8) return '8th';
  if (rank === 9) return '9th';
  if (rank === 10) return '10th';
  if (rank === 11) return '11th';
  if (rank === 12) return '12th';
  if (rank === 13) return '13th';
  if (rank === 14) return '14th';
  if (rank === 15) return '15th';
  return `${rank}th`;
};

const getFormattedDates = () => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  return { today: fmt(today), yesterday: fmt(yesterday) };
};

export default function App() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [saving, setSaving] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const tableRef = useRef(null);
  const dates = getFormattedDates();

  // LOAD saved data when app starts
  useEffect(() => {
    const savedData = localStorage.getItem('familyForeverPoints');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPlayers(parsed);
        showToast('Previous data loaded!', 'success');
      } catch (e) {
        console.error('Failed to load saved data');
      }
    }
  }, []);

  // SAVE data whenever players change
  useEffect(() => {
    if (players !== INITIAL_PLAYERS) {
      localStorage.setItem('familyForeverPoints', JSON.stringify(players));
    }
  }, [players]);

  // Find all-time best single day performance
  const getAllTimeBest = () => {
    let bestPlayer = null;
    let bestPoints = 0;

    players.forEach(player => {
      if ((player.bestSingleDay || 0) > bestPoints) {
        bestPoints = player.bestSingleDay;
        bestPlayer = player;
      }
    });

    return { bestPlayer, bestPoints };
  };

  const { bestPlayer, bestPoints } = getAllTimeBest();

  // Ranking logic with proper tie handling
  const getRankedPlayers = () => {
    const sorted = [...players].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.zeroPointMatch - b.zeroPointMatch;
    });

    const ranked = [];
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) {
        ranked.push({ ...sorted[i], rank: currentRank });
      } else {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        if (curr.totalPoints === prev.totalPoints && curr.zeroPointMatch === prev.zeroPointMatch) {
          ranked.push({ ...curr, rank: currentRank });
        } else {
          currentRank = i + 1;
          ranked.push({ ...curr, rank: currentRank });
        }
      }
    }

    return ranked;
  };

  const ranked = getRankedPlayers();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const startEdit = (id, field, currentVal) => {
    setEditing({ id, field });
    setEditVal(String(currentVal));
  };

  const commitEdit = () => {
    if (!editing) return;
    const num = parseInt(editVal);
    if (isNaN(num) || num < 0) {
      showToast('Enter a valid non-negative number', 'error');
      setEditing(null);
      return;
    }

    setPlayers(prev => prev.map(p => {
      if (p.id !== editing.id) return p;

      const updated = { ...p };

      if (editing.field === 'todayPoints') {
        updated.todayPoints = num;
        updated.totalPoints = (p.existingPoints || 0) + num;

        // Update best single day performance (all-time record)
        if (num > (p.bestSingleDay || 0)) {
          updated.bestSingleDay = num;
        }

        // ALWAYS increment zeroPointMatch when todayPoints is 0
        if (num === 0) {
          updated.zeroPointMatch = (p.zeroPointMatch || 0) + 1;
        }
      }
      else if (editing.field === 'existingPoints') {
        updated.existingPoints = num;
        updated.totalPoints = num + (p.todayPoints || 0);
      }
      else if (editing.field === 'zeroPointMatch') {
        updated.zeroPointMatch = num;
      }
      else if (editing.field === 'bestSingleDay') {
        updated.bestSingleDay = num;
      }

      return updated;
    }));

    setEditing(null);
    showToast('Updated!', 'success');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  const newDay = () => {
    if (!window.confirm('Start new day? Today\'s total will become existing points for tomorrow.')) return;

    setPlayers(prev => prev.map(p => ({
      ...p,
      existingPoints: p.totalPoints,
      todayPoints: 0,
      totalPoints: p.totalPoints
    })));
    showToast('New day started! Zero point matches and best day records preserved.', 'success');
  };

  const resetAll = () => {
    if (!window.confirm('Reset ALL points to zero? This will also reset zero point matches and best day records.')) return;
    setPlayers(prev => prev.map(p => ({
      ...p,
      existingPoints: 0,
      todayPoints: 0,
      totalPoints: 0,
      zeroPointMatch: 0,
      bestSingleDay: 0
    })));
    showToast('All points reset. Data auto-saved.', 'success');
  };

  const saveAsImage = async () => {
    if (!tableRef.current) return;
    setSaving(true);
    try {
      const el = tableRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: '#fff7f7',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Family_Forever_Leaderboard.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Saved to gallery!', 'success');
    } catch (err) {
      showToast('Failed to save image', 'error');
    } finally {
      setSaving(false);
    }
  };

  const topScore = ranked[0]?.totalPoints || 0;
  const totalPts = players.reduce((s, p) => s + (p.totalPoints || 0), 0);
  const avgPts = players.length ? Math.round(totalPts / players.length) : 0;

  return (
    <div className="min-h-screen py-10 px-4 font-sans"
      style={{ background: 'linear-gradient(135deg, #fff7f7 0%, #fff0ee 50%, #fde8e8 100%)' }}>

      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-700'}`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7a0000, #3d0000)' }}>
              <svg className="w-8 h-8 text-[#c9a84c]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-6.75c-.621 0-1.125.504-1.125 1.125v3.375m9 0h-9M9 6a3 3 0 116 0 3 3 0 01-6 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: '#3d0000' }}>
            Family Forever
          </h1>
          <p className="text-base font-bold tracking-widest uppercase" style={{ color: '#7a0000' }}>
            FIFA World Cup 2026 · Prediction League
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(120,0,0,0.1)' }}>
            <p className="text-2xl sm:text-3xl font-black" style={{ color: '#7a0000' }}>{players.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'rgba(61,0,0,0.45)' }}>Total Contestants</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(120,0,0,0.1)' }}>
            <p className="text-2xl sm:text-3xl font-black" style={{ color: '#7a0000' }}>{topScore}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'rgba(61,0,0,0.45)' }}>Leading Score</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(120,0,0,0.1)' }}>
            <p className="text-2xl sm:text-3xl font-black" style={{ color: '#7a0000' }}>{avgPts}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'rgba(61,0,0,0.45)' }}>Avg Points</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(120,0,0,0.1)' }}>
            <p className="text-lg sm:text-xl font-black" style={{ color: '#7a0000' }}>
              {bestPlayer ? bestPlayer.name : '-'}
            </p>
            <p className="text-sm font-bold" style={{ color: '#c9a84c' }}>
              {bestPoints > 0 ? `${bestPoints} pts` : '-'}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'rgba(61,0,0,0.45)' }}>🔥 All-Time Best Day</p>
          </div>
        </div>

        {/* Admin Toggle Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="text-xs px-3 py-1.5 rounded-lg transition"
            style={{ background: 'rgba(120,0,0,0.08)', color: '#7a0000' }}
          >
            {showHidden ? '👁️ Hide Admin View' : '🔒 Admin View (Show Best Day)'}
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={newDay}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#2563eb' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Day
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset All
          </button>
          <button
            onClick={saveAsImage}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 text-white"
            style={{ background: 'linear-gradient(135deg, #7a0000, #3d0000)' }}
          >
            {saving ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {saving ? 'Saving...' : 'Save as Image'}
          </button>
        </div>

        {/* Table */}
        <div
          ref={tableRef}
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid rgba(120,0,0,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          {/* Table Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-black" style={{ color: '#3d0000' }}>Family Forever</h2>
            <p className="text-xs font-bold uppercase mt-1" style={{ color: '#7a0000' }}>FIFA World Cup 2026 · Prediction League</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(61,0,0,0.4)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(120,0,0,0.3)' }}>
                  <th className="py-3 px-3 text-left text-xs font-bold uppercase" style={{ color: '#7a0000', borderRight: '1px solid rgba(120,0,0,0.1)' }}>Rank</th>
                  <th className="py-3 px-3 text-left text-xs font-bold uppercase" style={{ color: '#7a0000', borderRight: '1px solid rgba(120,0,0,0.1)' }}>Name</th>
                  <th className="py-3 px-3 text-center text-xs font-bold uppercase" style={{ color: '#7a0000', borderRight: '1px solid rgba(120,0,0,0.1)' }}>
                    Existing Pts
                    <div className="text-[10px] font-normal" style={{ color: 'rgba(61,0,0,0.45)' }}>({dates.yesterday})</div>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-bold uppercase" style={{ color: '#7a0000', borderRight: '1px solid rgba(120,0,0,0.1)' }}>
                    Today's Pts
                    <div className="text-[10px] font-normal" style={{ color: 'rgba(61,0,0,0.45)' }}>({dates.today})</div>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-bold uppercase" style={{ color: '#7a0000', borderRight: '1px solid rgba(120,0,0,0.1)' }}>
                    Total Pts
                    <div className="text-[10px] font-normal" style={{ color: 'rgba(61,0,0,0.45)' }}>({dates.today})</div>
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-bold uppercase" style={{ color: '#7a0000', borderRight: showHidden ? '1px solid rgba(120,0,0,0.1)' : 'none' }}>
                    Zero Pt/Match
                  </th>
                  {showHidden && (
                    <th className="py-3 px-3 text-center text-xs font-bold uppercase" style={{ color: '#7a0000' }}>
                      Best Day (Admin)
                      <div className="text-[10px] font-normal" style={{ color: 'rgba(61,0,0,0.45)' }}>All-Time Record</div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {ranked.map((player, idx) => {
                  const isLastRow = idx === ranked.length - 1;
                  return (
                    <tr
                      key={player.id}
                      style={{
                        borderBottom: isLastRow ? 'none' : '1px solid rgba(120,0,0,0.15)',
                        background: player.rank === 1 ? 'rgba(201,168,76,0.06)' : 'transparent'
                      }}
                    >
                      <td className="py-3 px-3" style={{ borderRight: '1px solid rgba(120,0,0,0.08)' }}>
                        <span className={`font-bold ${player.rank === 1 ? 'text-amber-600' :
                            player.rank === 2 ? 'text-slate-500' :
                              player.rank === 3 ? 'text-amber-700' :
                                'text-gray-500'
                          }`}>
                          {getRankDisplay(player.rank)}
                        </span>
                      </td>
                      <td className="py-3 px-3" style={{ borderRight: '1px solid rgba(120,0,0,0.08)' }}>
                        <span className="font-semibold text-sm" style={{ color: '#3d0000' }}>{player.name}</span>
                      </td>
                      <td className="py-3 px-3 text-center" style={{ borderRight: '1px solid rgba(120,0,0,0.08)' }}>
                        {editing?.id === player.id && editing?.field === 'existingPoints' ? (
                          <input
                            autoFocus
                            type="number"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className="w-20 text-center px-2 py-1 rounded border focus:outline-none mx-auto block"
                            style={{ borderColor: '#c9a84c', background: '#fff' }}
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(player.id, 'existingPoints', player.existingPoints)}
                            className="cursor-pointer hover:text-amber-700 px-2 py-1 rounded inline-block"
                            style={{ color: 'rgba(61,0,0,0.6)' }}
                          >
                            {player.existingPoints}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center" style={{ borderRight: '1px solid rgba(120,0,0,0.08)' }}>
                        {editing?.id === player.id && editing?.field === 'todayPoints' ? (
                          <input
                            autoFocus
                            type="number"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className="w-20 text-center px-2 py-1 rounded border focus:outline-none mx-auto block"
                            style={{ borderColor: '#c9a84c', background: '#fff' }}
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(player.id, 'todayPoints', player.todayPoints)}
                            className={`cursor-pointer px-3 py-1 rounded font-bold inline-block hover:opacity-70 ${player.todayPoints > 0 ? 'text-[#7a0000]' : 'text-gray-400'}`}
                          >
                            {player.todayPoints > 0 ? `+${player.todayPoints}` : '0'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center" style={{ borderRight: '1px solid rgba(120,0,0,0.08)' }}>
                        <span className="font-black text-base" style={{ color: '#3d0000' }}>{player.totalPoints}</span>
                      </td>
                      <td className="py-3 px-3 text-center" style={{ borderRight: showHidden ? '1px solid rgba(120,0,0,0.08)' : 'none' }}>
                        {editing?.id === player.id && editing?.field === 'zeroPointMatch' ? (
                          <input
                            autoFocus
                            type="number"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className="w-16 text-center px-2 py-1 rounded border focus:outline-none mx-auto block"
                            style={{ borderColor: '#c9a84c', background: '#fff' }}
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(player.id, 'zeroPointMatch', player.zeroPointMatch)}
                            className="cursor-pointer px-2 py-1 rounded inline-block hover:opacity-70"
                            style={{ color: '#7a0000' }}
                          >
                            {player.zeroPointMatch}
                          </span>
                        )}
                      </td>
                      {showHidden && (
                        <td className="py-3 px-3 text-center">
                          {editing?.id === player.id && editing?.field === 'bestSingleDay' ? (
                            <input
                              autoFocus
                              type="number"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={handleKeyDown}
                              className="w-20 text-center px-2 py-1 rounded border focus:outline-none mx-auto block"
                              style={{ borderColor: '#c9a84c', background: '#fff' }}
                            />
                          ) : (
                            <span
                              onClick={() => startEdit(player.id, 'bestSingleDay', player.bestSingleDay)}
                              className="cursor-pointer px-2 py-1 rounded inline-block hover:opacity-70 font-semibold"
                              style={{ color: '#c9a84c' }}
                            >
                              {player.bestSingleDay > 0 ? `${player.bestSingleDay} pts` : '-'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
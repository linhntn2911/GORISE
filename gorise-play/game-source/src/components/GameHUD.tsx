import React, { useState, useEffect, useRef } from 'react';
import { Player, SafetyMission, LapState, TIGORI_MASCOT, GORISE_CHARACTERS, RoomZone } from '../types/game';
import {
  Dice5,
  Star,
  AlertTriangle,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Compass,
  Eye,
  GitBranch,
  Bug,
  Sparkles,
  Users,
  Flag,
  Shield,
  Home,
  Sliders,
  Award,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react';
import { toggleMute, getIsMuted, playButtonClick } from '../audio/soundEffects';

interface GameHUDProps {
  players: Player[];
  activePlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  isMoving: boolean;
  onRollDice: () => void;
  safeStars: number;
  dangerMeter: number;
  missions: SafetyMission[];
  lapState: LapState;
  spawnNotification: string | null;
  cameraMode: 'isometric' | 'topdown' | 'follow';
  onChangeCameraMode: (mode: 'isometric' | 'topdown' | 'follow') => void;
  focusedRoom: RoomZone | null;
  onChangeFocusedRoom: (room: RoomZone | null) => void;
  onResetCamera: () => void;
  onToggleDevMode: () => void;
  onToggleDebugPanel: () => void;
  isDebugOpen: boolean;
  onRestartGame: () => void;
  branchOptions: string[] | null;
  onSelectBranch: (nodeId: string) => void;
  pendingSteps: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  players,
  activePlayerIndex,
  diceValue,
  isRolling,
  isMoving,
  onRollDice,
  safeStars,
  dangerMeter,
  missions,
  lapState,
  spawnNotification,
  cameraMode,
  onChangeCameraMode,
  focusedRoom,
  onChangeFocusedRoom,
  onResetCamera,
  onToggleDevMode,
  onToggleDebugPanel,
  isDebugOpen,
  onRestartGame,
  branchOptions,
  onSelectBranch,
  pendingSteps,
}) => {
  const [isMutedState, setIsMutedState] = useState(getIsMuted());
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isTigoriOpen, setIsTigoriOpen] = useState(false);
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Phase UI 4.1 Animation states
  const [isStarBumping, setIsStarBumping] = useState(false);
  const [isDangerPulsing, setIsDangerPulsing] = useState(false);
  const [isDicePopping, setIsDicePopping] = useState(false);
  const prevSafeStars = useRef(safeStars);
  const prevDanger = useRef(dangerMeter);
  const prevDiceValue = useRef(diceValue);

  // Trigger Safe Star celebratory pop animation when stars increase
  useEffect(() => {
    if (safeStars > prevSafeStars.current) {
      setIsStarBumping(true);
      const timer = setTimeout(() => setIsStarBumping(false), 900);
      prevSafeStars.current = safeStars;
      return () => clearTimeout(timer);
    }
    prevSafeStars.current = safeStars;
  }, [safeStars]);

  // Trigger Danger Meter warning pulse animation when danger rises
  useEffect(() => {
    if (dangerMeter > prevDanger.current) {
      setIsDangerPulsing(true);
      const timer = setTimeout(() => setIsDangerPulsing(false), 900);
      prevDanger.current = dangerMeter;
      return () => clearTimeout(timer);
    }
    prevDanger.current = dangerMeter;
  }, [dangerMeter]);

  // Trigger Dice Result pop and golden glow when result appears
  useEffect(() => {
    if (diceValue !== null && diceValue !== prevDiceValue.current && !isRolling) {
      setIsDicePopping(true);
      const timer = setTimeout(() => setIsDicePopping(false), 700);
      prevDiceValue.current = diceValue;
      return () => clearTimeout(timer);
    }
    prevDiceValue.current = diceValue;
  }, [diceValue, isRolling]);

  const activePlayer = players[activePlayerIndex] || players[0];
  const charInfo = GORISE_CHARACTERS.find((c) => c.id === activePlayer?.characterId) || GORISE_CHARACTERS[0];
  const completedMissionsCount = missions.filter((m) => m.completed).length;

  const handleToggleMute = () => {
    const muted = toggleMute();
    setIsMutedState(muted);
  };

  const isDiceDisabled = isRolling || isMoving || (branchOptions !== null && branchOptions.length > 0);

  const roomNames: { id: RoomZone | null; label: string; icon: string }[] = [
    { id: null, label: 'Toàn bộ ngôi nhà', icon: '🏠' },
    { id: 'kitchen', label: 'Phòng Bếp', icon: '🍳' },
    { id: 'bathroom', label: 'Phòng Tắm', icon: '🛁' },
    { id: 'bedroom', label: 'Phòng Ngủ', icon: '🛏️' },
    { id: 'living', label: 'Phòng Khách', icon: '🛋️' },
    { id: 'study', label: 'Phòng Học', icon: '📚' },
    { id: 'gara', label: 'Nhà để xe', icon: '🚗' },
  ];

  const ROOM_SAFETY_TIPS: Record<RoomZone, { title: string; tip: string; rule: string }> = {
    kitchen: {
      title: 'Khu Vực Bếp Nấu',
      tip: 'Xoay cán chảo vào trong lòng bếp khi đun, khóa van bình gas sau khi dùng và để dao kéo trong kệ có khóa.',
      rule: '⚠️ Chú ý: Dầu mỡ sôi, bề mặt bếp từ/bếp gas nóng và dụng cụ gọt cắt sắc nhọn.',
    },
    bathroom: {
      title: 'Phòng Tắm & Vệ Sinh',
      tip: 'Lót thảm gai chống trượt, luôn lau khô sàn và tuyệt đối không cắm máy sấy tóc gần bồn nước.',
      rule: '⚠️ Chú ý: Nguy cơ trơn trượt té ngã và rò điện nơi ẩm ướt.',
    },
    living: {
      title: 'Phòng Khách Gia Đình',
      tip: 'Bịt nắp bảo vệ vào mọi ổ cắm dưới thấp, không chạy nhảy va chạm cạnh bàn kính và thu gọn dây điện.',
      rule: '⚠️ Chú ý: Ổ cắm chân tường, góc nhọn nội thất và thiết bị điện tử gia dụng.',
    },
    study: {
      title: 'Góc Học Tập & Làm Việc',
      tip: 'Xếp dây nguồn máy tính cố định vào rãnh ghim, dùng đèn bảo vệ thị lực và ngắt nguồn khi rời bàn.',
      rule: '⚠️ Chú ý: Quá tải ổ cắm chia nhiều cổng và chập điện từ cáp sạc hư mòn.',
    },
    bedroom: {
      title: 'Phòng Ngủ & Cửa Sổ',
      tip: 'Gài chốt an toàn cửa sổ trên cao, không sạc điện thoại trên chăn nệm và để lối đi thông thoáng ban đêm.',
      rule: '⚠️ Chú ý: Nguy cơ rơi ngã ban công/cửa sổ và pin sạc phát nhiệt trên nệm.',
    },
    gara: {
      title: 'Nhà Để Xe & Kho Đồ',
      tip: 'Đậy chặt nắp can xăng dầu, cất sơn và hóa chất tẩy rửa lên kệ khóa kín ngoài tầm với của trẻ nhỏ.',
      rule: '⚠️ Chú ý: Chất lỏng dễ bốc cháy nổ và dụng cụ kim khí sắc nhọn.',
    },
    corridor: {
      title: 'Hành Lang & Cầu Thang',
      tip: 'Giữ bậc thang sạch sẽ, không để đồ chơi hay giày dép chắn lối thoát hiểm và luôn bật đèn đêm.',
      rule: '⚠️ Chú ý: Nguy cơ vấp ngã khi di chuyển thiếu ánh sáng.',
    },
  };

  // Status badge for active player
  const getEntryBadge = () => {
    if (!activePlayer) return null;
    if (!activePlayer.hasEntered) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold tracking-wide">
          <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
          Chờ xuất quân (Cần số 6)
        </span>
      );
    }
    if (activePlayer.entryStatus === 'waiting_next_lap') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/40 text-blue-300 text-[10px] font-bold tracking-wide">
          <Flag className="w-3 h-3 text-blue-400" />
          Về đích Vòng {activePlayer.completedLaps} (Cần số 6 mở Vòng {activePlayer.completedLaps + 1})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold tracking-wide">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        Đang di chuyển (Vòng {activePlayer.currentLap}/5)
      </span>
    );
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-5 select-none font-sans">
      {/* ========================================================================= */}
      {/* 2. REORGANIZED HUD: TOP ROW (Current Player, Unified Progress, Utilities) */}
      {/* ========================================================================= */}
      <header className="flex flex-wrap items-center justify-between gap-3 w-full">
        {/* --- A. TOP LEFT: CURRENT PLAYER PANEL --- */}
        <div className="pointer-events-auto bg-[#0C182B]/95 backdrop-blur-xl border border-[#1E3A5F] rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-3 shrink-0">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-md shrink-0 border-2"
              style={{
                backgroundColor: activePlayer?.color || '#2563EB',
                borderColor: activePlayer?.color || '#38BDF8',
              }}
            >
              {charInfo.emoji}
            </div>
            {activePlayer?.isBot && (
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-purple-600 text-[9px] font-black text-white border border-purple-300">
                AI
              </span>
            )}
          </div>

          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Lượt chơi:</span>
              <span className="text-blue-300 font-semibold truncate max-w-[130px]">{charInfo.roleVi}</span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-1.5">
              {activePlayer?.name || 'Người chơi'}
            </h2>
            <div className="mt-0.5">{getEntryBadge()}</div>
          </div>
        </div>

        {/* --- B. TOP CENTER: ONE UNIFIED GAME PROGRESS PANEL --- */}
        <div className="pointer-events-auto bg-[#0C182B]/95 backdrop-blur-xl border border-[#1E3A5F] rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-4 sm:gap-6 divide-x divide-[#1E3A5F] mx-auto">
          {/* Section 1: Laps / Vòng Chơi (Completed laps / 5) */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Vòng Chơi</span>
                <span className="text-blue-400 font-extrabold">({lapState.completedLaps}/5)</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((lap) => {
                  const isDone = lap <= lapState.completedLaps;
                  const isCurrent = lap === lapState.completedLaps + 1;
                  return (
                    <div
                      key={lap}
                      className={`w-3.5 h-2 rounded-xs transition-all ${
                        isDone
                          ? 'bg-blue-500'
                          : isCurrent
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-slate-800'
                      }`}
                      title={`Vòng ${lap}: ${isDone ? 'Đã hoàn thành' : isCurrent ? 'Đang thực hiện' : 'Chưa đến'}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Safe Stars (Sao An Toàn) */}
          <div className={`flex items-center gap-2.5 pl-4 sm:pl-6 transition-all duration-300 rounded-xl ${isStarBumping ? 'animate-pop-scale bg-amber-500/20 ring-2 ring-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.4)] p-1' : ''}`}>
            <div className={`w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 transition-transform ${isStarBumping ? 'animate-gold-sparkle scale-110' : ''}`}>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>Sao An Toàn</span>
                {isStarBumping && <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />}
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-lg font-black text-amber-400 font-mono leading-none transition-transform ${isStarBumping ? 'scale-125 text-yellow-300' : ''}`}>
                  {safeStars}
                </span>
                <span className="text-[10px] text-amber-300/80 font-bold">Sao</span>
              </div>
            </div>
          </div>

          {/* Section 3: Danger Meter (Thước đo nguy hiểm / 10) */}
          <div className={`flex items-center gap-2.5 pl-4 sm:pl-6 transition-all duration-300 rounded-xl ${isDangerPulsing ? 'animate-danger-warning bg-rose-500/20 ring-2 ring-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.4)] p-1' : ''}`}>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                isDangerPulsing
                  ? 'bg-rose-500/30 border-rose-400 text-rose-300 scale-110 shadow-lg'
                  : dangerMeter >= 7
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                  : dangerMeter >= 4
                  ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isDangerPulsing ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
                <span className="text-slate-400">Nguy Hiểm</span>
                <span
                  className={`font-mono font-black transition-colors ${
                    isDangerPulsing
                      ? 'text-rose-300 scale-110'
                      : dangerMeter >= 7
                      ? 'text-rose-400'
                      : dangerMeter >= 4
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {dangerMeter}/10
                </span>
              </div>
              {/* 10 clean LED segments with smooth animation */}
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const step = i + 1;
                  const isFilled = step <= dangerMeter;
                  let color = 'bg-emerald-400';
                  if (step >= 8) color = 'bg-rose-500';
                  else if (step >= 5) color = 'bg-amber-400';
                  return (
                    <div
                      key={step}
                      className={`w-1.5 h-2 rounded-xs transition-all duration-300 ${
                        isFilled
                          ? `${color} ${isDangerPulsing && step === dangerMeter ? 'scale-y-125 shadow-sm' : ''}`
                          : 'bg-slate-800'
                      }`}
                      title={`Mức ${step}/10`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* --- C. TOP RIGHT: GAME UTILITIES TOOLBAR --- */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0C182B]/95 backdrop-blur-xl border border-[#1E3A5F] rounded-2xl p-1.5 shadow-lg shrink-0">
          {/* Sound control */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isMutedState ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMutedState ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* TIGORI guide */}
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              setIsTigoriOpen(!isTigoriOpen);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isTigoriOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
            }`}
            title="Linh vật Hướng dẫn Tigori"
          >
            <span className="text-sm leading-none animate-subtle-float inline-block">{TIGORI_MASCOT.emoji}</span>
            <span className="hidden sm:inline font-bold text-amber-300">Tigori</span>
          </button>

          {/* Mission drawer */}
          <button
            type="button"
            onClick={() => {
              playButtonClick();
              setIsMissionsOpen(!isMissionsOpen);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isMissionsOpen
                ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-700'
            }`}
            title="5 Nhiệm vụ an toàn"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Nhiệm Vụ</span>
            <span className="px-1.5 py-0.2 rounded-md bg-blue-500/30 text-blue-300 font-mono text-[10px] font-black">
              {completedMissionsCount}/5
            </span>
          </button>

          {/* Developer Calibration Studio */}
          <button
            type="button"
            onClick={onToggleDevMode}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
            title="Mở Calibration Studio căn chỉnh bàn cờ 3D"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Calibration</span>
          </button>

          {/* Debug Panel Toggle */}
          <button
            type="button"
            onClick={onToggleDebugPanel}
            className={`p-2 rounded-xl transition cursor-pointer border ${
              isDebugOpen
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border-transparent'
            }`}
            title="Bảng điều khiển Debug"
          >
            <Bug className="w-4 h-4" />
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn khởi động lại ván chơi từ đầu? Tất cả sao và vị trí sẽ về lại ban đầu.')) {
                onRestartGame();
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Khởi động lại ván chơi"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* FLOATING NOTIFICATION BANNERS (Spawn Toast, Branch Fork, Room Guide) */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center gap-2.5 my-auto pointer-events-none">
        {/* Celebratory Spawn Notification Toast */}
        {spawnNotification && (
          <div className="pointer-events-auto bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 px-5 py-2.5 rounded-2xl shadow-xl font-black text-xs sm:text-sm flex items-center gap-2.5 animate-bounce border border-white/60">
            <Sparkles className="w-4 h-4 text-slate-950 shrink-0 animate-spin" />
            <span className="tracking-wide">{spawnNotification}</span>
          </div>
        )}

        {/* Interactive Branch Route Selection Fork Station */}
        {branchOptions && branchOptions.length > 0 && (
          <div className="pointer-events-auto bg-[#0C182B]/98 border-2 border-blue-400 text-white p-4 sm:p-5 rounded-3xl shadow-2xl backdrop-blur-2xl max-w-md w-full text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-blue-300 font-black text-sm tracking-wide">
              <div className="p-1 rounded-lg bg-blue-500/20 border border-blue-400">
                <GitBranch className="w-4 h-4 text-blue-400" />
              </div>
              <span>NGÃ RẼ ĐƯỜNG ĐI — CHỌN HƯỚNG TIẾP!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Còn lại <span className="font-mono font-black text-amber-400 text-sm px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40">{pendingSteps}</span> bước đi. Chọn ô bạn muốn tiến vào:
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {branchOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelectBranch(opt)}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-blue-300"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Đi vào ô [{opt}]</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Educational Room Safety Guide Banner */}
        {focusedRoom && ROOM_SAFETY_TIPS[focusedRoom] && (
          <div className="pointer-events-auto bg-[#0C182B]/98 border border-[#1E3A5F] text-white p-3.5 sm:p-4 rounded-2xl shadow-xl backdrop-blur-2xl max-w-lg w-full flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-lg shrink-0">
                {roomNames.find((r) => r.id === focusedRoom)?.icon || '🏠'}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider px-2 py-0.2 rounded-full bg-blue-500/10 border border-blue-500/30">
                    Safe Home
                  </span>
                  <span className="text-xs font-black text-white">
                    {ROOM_SAFETY_TIPS[focusedRoom].title}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-snug font-medium">
                  {ROOM_SAFETY_TIPS[focusedRoom].tip}
                </p>
                <p className="text-[11px] text-amber-300 font-semibold pt-0.5">
                  {ROOM_SAFETY_TIPS[focusedRoom].rule}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChangeFocusedRoom(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 shrink-0 text-xs font-bold transition cursor-pointer"
              title="Đóng xem chi tiết phòng"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FLOATING DRAWERS: Tigori Advice & 5 Safety Missions */}
      {/* ========================================================================= */}
      <div className="flex justify-between items-start pointer-events-none">
        {/* Tigori Guide Mascot Panel */}
        {isTigoriOpen && (
          <div className="pointer-events-auto w-80 sm:w-88 bg-[#0C182B]/98 border border-amber-500/50 rounded-3xl p-4 shadow-2xl space-y-3 text-xs backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-black">
                <span className="text-lg">{TIGORI_MASCOT.emoji}</span>
                <span className="text-xs sm:text-sm">{TIGORI_MASCOT.name} • Hướng Dẫn Safe Home</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTigoriOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              &quot;Chào bạn! Mình là Tigori. Bàn cờ 3D giữ trọn vẹn tranh vẽ Safe Home gốc. Hãy quan sát kỹ từng phòng để bảo vệ cả gia đình nhé!&quot;
            </p>

            <div className="bg-gradient-to-br from-amber-950/40 to-[#0A1628] border border-amber-500/30 rounded-2xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Mẹo an toàn ({currentTipIndex + 1}/{TIGORI_MASCOT.tips.length}):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playButtonClick();
                    setCurrentTipIndex((prev) => (prev + 1) % TIGORI_MASCOT.tips.length);
                  }}
                  className="text-amber-400 hover:text-amber-200 underline font-bold cursor-pointer text-[10px]"
                >
                  Tiếp theo →
                </button>
              </div>
              <p className="text-amber-100 text-xs leading-relaxed font-medium">
                &quot;{TIGORI_MASCOT.tips[currentTipIndex]}&quot;
              </p>
            </div>

            <div className="space-y-1 text-[10px] text-slate-400 pt-1 border-t border-[#1E3A5F]">
              <p className="font-black text-amber-300 uppercase tracking-wider">3 Quy tắc bước đi:</p>
              <ul className="space-y-0.5 text-slate-300">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  Chỉ đi theo vạch trắng nối giữa các ô tròn
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  Luôn đi qua ô cửa thông phòng, không bước xuyên tường
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  Tung trúng số 6 để xuất quân hoặc mở khóa vòng tiếp theo
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Safety Missions Drawer */}
        {isMissionsOpen && (
          <div className="pointer-events-auto ml-auto w-84 sm:w-96 bg-[#0C182B]/98 border border-[#1E3A5F] rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 max-h-[65vh] overflow-y-auto backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-2">
              <h3 className="font-black text-amber-400 text-xs sm:text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> 5 NHIỆM VỤ AN TOÀN GIA ĐÌNH
              </h3>
              <button
                type="button"
                onClick={() => setIsMissionsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {missions.map((m) => (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-2xl border text-xs transition-all ${
                    m.completed
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-xs text-white">
                      {m.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {m.titleVi}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        m.completed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {m.starsCollected} / {m.starsRequired} Sao
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{m.descriptionVi}</p>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.completed ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, (m.starsCollected / m.starsRequired) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. PLAYER BAR & BOTTOM CONTROLS (D. View Controls & E. Dice Control) */}
      {/* ========================================================================= */}
      <footer className="space-y-2.5">
        {/* --- 3. COMPACT FLOATING PLAYER BAR --- */}
        {players.length > 1 && (
          <div className="pointer-events-auto flex items-center gap-2 bg-[#0C182B]/90 backdrop-blur-xl border border-[#1E3A5F] rounded-2xl px-3 py-1.5 shadow-xl overflow-x-auto max-w-2xl mx-auto">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider shrink-0 pl-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400" /> Đội chơi:
            </span>
            {players.map((p, idx) => {
              const isActive = idx === activePlayerIndex;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate max-w-[100px] flex items-center gap-1">
                    {p.name}
                    {p.isBot && <span className="text-[10px]" title="Bot tự động">🤖</span>}
                  </span>
                  {!p.hasEntered ? (
                    <span className="text-[9px] text-amber-400 font-semibold px-1 py-0.2 rounded bg-amber-500/10">Chờ 6</span>
                  ) : p.entryStatus === 'waiting_next_lap' ? (
                    <span className="text-[9px] text-blue-300 font-semibold px-1 py-0.2 rounded bg-blue-500/10">Chờ V{p.completedLaps + 1}</span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-semibold px-1 py-0.2 rounded bg-emerald-500/10">Vòng {p.currentLap}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* --- BOTTOM ROW: VIEW CONTROLS (D) & DICE CONTROL (E) --- */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* --- D. BOTTOM LEFT: VIEW CONTROLS --- */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 bg-[#0C182B]/95 backdrop-blur-xl border border-[#1E3A5F] rounded-2xl p-1.5 shadow-xl">
            {/* View Modes */}
            <button
              type="button"
              onClick={() => {
                onChangeCameraMode('isometric');
                onChangeFocusedRoom(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                cameraMode === 'isometric' && !focusedRoom
                  ? 'bg-blue-600 text-white font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Góc nhìn 3D Isometric"
            >
              <Compass className="w-3.5 h-3.5" /> 3D Isometric
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeCameraMode('topdown');
                onChangeFocusedRoom(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                cameraMode === 'topdown'
                  ? 'bg-blue-600 text-white font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Góc nhìn 2D Toàn Cảnh"
            >
              <Eye className="w-3.5 h-3.5" /> Toàn Cảnh 2D
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeCameraMode('follow');
                onChangeFocusedRoom(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                cameraMode === 'follow'
                  ? 'bg-blue-600 text-white font-black shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Camera bám sát quân cờ đang đi"
            >
              <Users className="w-3.5 h-3.5" /> Theo Quân
            </button>

            {/* Room Focus Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoomMenuOpen(!isRoomMenuOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                  focusedRoom
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white'
                }`}
                title="Phóng to vào từng phòng cụ thể"
              >
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {focusedRoom
                    ? roomNames.find((r) => r.id === focusedRoom)?.label
                    : 'Chọn Phòng'}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isRoomMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#0C182B] border border-[#1E3A5F] rounded-2xl shadow-2xl p-1.5 space-y-0.5 z-40 backdrop-blur-xl">
                  {roomNames.map((r) => (
                    <button
                      key={r.id || 'all'}
                      type="button"
                      onClick={() => {
                        onChangeFocusedRoom(r.id);
                        setIsRoomMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        focusedRoom === r.id
                          ? 'bg-blue-600 text-white font-black'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Camera Button */}
            <button
              type="button"
              onClick={onResetCamera}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Đặt lại camera về mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* --- E. BOTTOM RIGHT: DICE CONTROL (Primary Game Action) --- */}
          <div className="pointer-events-auto flex items-center gap-3 bg-[#0C182B]/98 backdrop-blur-xl border border-[#1E3A5F] rounded-3xl p-2.5 sm:p-3 shadow-2xl shrink-0">
            {/* 3D Dice Display Box */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center border-2 shadow-inner shrink-0 transition-all duration-300 ${
                isRolling
                  ? 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                  : isDicePopping
                  ? 'animate-pop-scale bg-gradient-to-br from-amber-900/80 to-[#0A1628] border-amber-300 ring-4 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  : diceValue !== null
                  ? 'bg-gradient-to-br from-slate-900 to-[#0A1628] border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-950/80 border-slate-800 text-slate-600'
              }`}
            >
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                ĐIỂM
              </span>
              {isRolling ? (
                <Dice5 className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 animate-dice-tumble" />
              ) : diceValue !== null ? (
                <span className={`text-2xl sm:text-3xl font-black font-mono leading-none text-white transition-transform ${isDicePopping ? 'scale-125 text-amber-300' : ''}`}>
                  {diceValue}
                </span>
              ) : (
                <span className="text-xl font-black leading-none text-slate-600">-</span>
              )}
            </div>

            {/* Roll CTA Button & Clear Unambiguous Action State */}
            <div className="flex flex-col gap-1 min-w-[180px] sm:min-w-[210px]">
              <button
                type="button"
                disabled={isDiceDisabled || activePlayer?.isBot}
                onClick={onRollDice}
                className={`w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-2xl font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all transform active:scale-95 border ${
                  isDiceDisabled || activePlayer?.isBot
                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                    : !activePlayer?.hasEntered
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-105 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                    : 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:brightness-105 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                }`}
              >
                <Dice5 className={`w-4 h-4 shrink-0 ${isRolling ? 'animate-spin' : ''}`} />
                <span className="truncate tracking-wide">
                  {isRolling
                    ? 'Đang lắc xúc xắc...'
                    : isMoving
                    ? 'Đang di chuyển...'
                    : activePlayer?.isBot
                    ? `Lượt Bot: ${activePlayer.name}`
                    : !activePlayer?.hasEntered
                    ? 'Tung Số 6 Để Xuất Quân'
                    : activePlayer?.entryStatus === 'waiting_next_lap'
                    ? 'Tung Số 6 Để Mở Vòng'
                    : 'Tung Xúc Xắc Di Chuyển'}
                </span>
              </button>

              {/* Clear Contextual Subtext (Never overlaps) */}
              <div className="text-[11px] text-center font-bold px-1 truncate">
                {isRolling ? (
                  <span className="text-amber-300">Đang quay điểm ngẫu nhiên...</span>
                ) : isMoving ? (
                  <span className="text-blue-300">Nhân vật đang tiến bước...</span>
                ) : activePlayer?.isBot ? (
                  <span className="text-slate-400">Bot AI tự động thực hiện lượt đi</span>
                ) : !activePlayer?.hasEntered ? (
                  <span className="text-amber-400 font-semibold">Cần đổ trúng số 6 để vào ô START</span>
                ) : activePlayer?.entryStatus === 'waiting_next_lap' ? (
                  <span className="text-blue-300 font-semibold">Cần số 6 để xuất phát Vòng {activePlayer.completedLaps + 1}</span>
                ) : (
                  <span className="text-slate-400">Đi từ 1–6 bước theo điểm xúc xắc</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { SituationCard, SituationChoice, Player } from '../types/game';
import {
  AlertTriangle,
  Star,
  ShieldCheck,
  HelpCircle,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  Info,
  Maximize2,
  X,
  Sparkles,
  Shield,
  Lightbulb,
  Clock,
  Hourglass,
  Timer,
} from 'lucide-react';
import {
  playStarChime,
  playDangerAlertSound,
  playButtonClick,
  playTickSound,
} from '../audio/soundEffects';

interface SituationModalProps {
  card: SituationCard;
  activePlayer: Player;
  onResolve: (choice: SituationChoice) => void;
  type?: 'situation' | 'mystery' | 'danger' | 'safe_star';
}

const TOTAL_QUESTION_TIME = 40; // 40-second reading and answering limit

const CATEGORY_ILLUSTRATIONS: Record<
  string,
  {
    image: string;
    label: string;
    tag: string;
    accentColor: string;
    bgAccent: string;
  }
> = {
  kitchen_safety: {
    image: '/gorise-play/game/assets/situations/kitchen_safety.jpg',
    label: 'Khu vực Phòng Bếp — Thao tác Đun Nấu & Đồ Dùng Nguy Hiểm',
    tag: '🍳 Phòng Bếp An Toàn',
    accentColor: 'text-amber-400 border-amber-400/40',
    bgAccent: 'from-amber-500/20 via-orange-500/10 to-transparent',
  },
  electrical_safety: {
    image: '/gorise-play/game/assets/situations/electrical_safety.jpg',
    label: 'Khu vực Điện & Thiết Bị — Phòng Khách & Phòng Ngủ',
    tag: '⚡ An Toàn Điện Gia Đình',
    accentColor: 'text-sky-400 border-sky-400/40',
    bgAccent: 'from-sky-500/20 via-blue-500/10 to-transparent',
  },
  bathroom_safety: {
    image: '/gorise-play/game/assets/situations/bathroom_safety.jpg',
    label: 'Khu vực Phòng Tắm & Nước — Chống Trượt & Chống Bỏng',
    tag: '🚿 Phòng Tắm & Nước',
    accentColor: 'text-cyan-400 border-cyan-400/40',
    bgAccent: 'from-cyan-500/20 via-teal-500/10 to-transparent',
  },
  door_stranger_safety: {
    image: '/gorise-play/game/assets/situations/door_stranger_safety.jpg',
    label: 'Khu vực Cửa Chính & Người Lạ — Ban Công & Lối Ra Vào',
    tag: '🚪 Cảnh Giác Người Lạ & Cửa',
    accentColor: 'text-emerald-400 border-emerald-400/40',
    bgAccent: 'from-emerald-500/20 via-green-500/10 to-transparent',
  },
  emergency_response: {
    image: '/gorise-play/game/assets/situations/emergency_response.jpg',
    label: 'Ứng Phó Khẩn Cấp & Thoát Hiểm — Cứu Nạn Cứu Hộ 114',
    tag: '🚨 Thoát Hiểm Khẩn Cấp',
    accentColor: 'text-rose-400 border-rose-400/40',
    bgAccent: 'from-rose-500/20 via-red-500/10 to-transparent',
  },
};

export const SituationModal: React.FC<SituationModalProps> = ({
  card,
  activePlayer,
  onResolve,
  type = 'situation',
}) => {
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_QUESTION_TIME);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Randomize choices order so correct answers aren't fixed to A, B, or C
  const shuffledChoices = useMemo(() => {
    const list = [...card.choices];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [card.id]);

  // Reset state when card changes
  useEffect(() => {
    setSelectedChoiceIndex(null);
    setHasConfirmed(false);
    setIsImageZoomed(false);
    setTimeLeft(TOTAL_QUESTION_TIME);
    setIsTimedOut(false);
  }, [card.id]);

  // 40-second countdown timer effect
  useEffect(() => {
    if (hasConfirmed) return; // Freeze timer once answered so user can read lesson calmly

    if (timeLeft <= 0) {
      // Timeout event: Player ran out of time!
      setIsTimedOut(true);
      setHasConfirmed(true);
      playDangerAlertSound();

      // If user had selected a choice, keep it; otherwise select the first risky choice to enforce danger penalty
      setSelectedChoiceIndex((prev) => {
        if (prev !== null) return prev;
        const firstUnsafe = shuffledChoices.findIndex((c) => !c.isSafe);
        return firstUnsafe !== -1 ? firstUnsafe : 0;
      });
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 10 && prev > 1) {
          playTickSound(prev <= 5);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasConfirmed, timeLeft, shuffledChoices]);

  const handleSelectChoice = (index: number) => {
    if (hasConfirmed) return;
    playButtonClick();
    setSelectedChoiceIndex(index);
  };

  const handleConfirmChoice = () => {
    if (selectedChoiceIndex === null) return;
    const choice = shuffledChoices[selectedChoiceIndex];
    setHasConfirmed(true);

    if (choice.isSafe) {
      playStarChime();
    } else {
      playDangerAlertSound();
    }
  };

  const handleFinish = () => {
    const choice =
      selectedChoiceIndex !== null
        ? shuffledChoices[selectedChoiceIndex]
        : shuffledChoices.find((c) => !c.isSafe) || shuffledChoices[0];
    onResolve(choice);
  };

  const getHeaderIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-rose-400" />;
      case 'safe_star':
        return <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 fill-amber-300" />;
      case 'mystery':
        return <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-purple-300" />;
      case 'situation':
      default:
        return <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />;
    }
  };

  const getHeaderBadge = () => {
    switch (type) {
      case 'danger':
        return { label: 'THẺ NGUY HIỂM / DANGER ALERT', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'safe_star':
        return { label: 'Ô AN TOÀN / SAFE STAR', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'mystery':
        return { label: 'THẺ THỬ THÁCH / MYSTERY CHALLENGE', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'situation':
      default:
        return { label: 'Ô TÌNH HUỐNG / SITUATION CARD', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
    }
  };

  const badge = getHeaderBadge();
  const selectedChoice = selectedChoiceIndex !== null ? shuffledChoices[selectedChoiceIndex] : null;
  const safeChoice = card.choices.find((c) => c.isSafe);

  const illustration = card.imageUrl
    ? {
        image: card.imageUrl,
        label: card.titleVi,
        tag: '📸 Minh Họa Tình Huống',
        accentColor: 'text-slate-300 border-slate-600/40',
        bgAccent: 'from-slate-700/20 via-slate-800/10 to-transparent',
      }
    : CATEGORY_ILLUSTRATIONS[card.missionCategory] || {
        image: '/gorise-play/game/assets/situations/kitchen_safety.jpg',
        label: 'Tình huống an toàn tại nhà',
        tag: '🛡️ Safe Home',
        accentColor: 'text-sky-400 border-sky-400/40',
        bgAccent: 'from-sky-500/20 to-transparent',
      };

  return (
    <>
      {/* Lightbox Fullscreen Zoom Modal */}
      {isImageZoomed && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsImageZoomed(false)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] bg-slate-900 border-2 border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-slate-900 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                {illustration.label}
              </span>
              <button
                type="button"
                onClick={() => setIsImageZoomed(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={illustration.image}
              alt={illustration.label}
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[78vh] object-contain bg-slate-950"
            />
          </div>
        </div>
      )}

      {/* Main Question Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900/98 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh] transition-all">
          
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border-b border-slate-800/90 flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner">
              {getHeaderIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
                {card.missionCategory && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
                    {card.missionCategory === 'kitchen_safety' && '🍳 An toàn Bếp'}
                    {card.missionCategory === 'electrical_safety' && '⚡ An toàn Điện'}
                    {card.missionCategory === 'bathroom_safety' && '🚿 An toàn Phòng Tắm'}
                    {card.missionCategory === 'door_stranger_safety' && '🚪 Cửa & Người lạ'}
                    {card.missionCategory === 'emergency_response' && '🚨 Ứng phó Khẩn cấp'}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium ml-auto flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activePlayer?.color || '#2563eb' }}
                  />
                  <span>Lượt của</span>
                  <strong className="text-white">{activePlayer.name}</strong>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                {card.titleVi}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">{card.title}</p>
            </div>
          </div>

          {/* 40-Second Reading & Answering Timer Bar */}
          <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                  hasConfirmed
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                    : isTimedOut
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                    : timeLeft <= 5
                    ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-ping'
                    : timeLeft <= 15
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                }`}
              >
                <Clock className={`w-4 h-4 ${!hasConfirmed && timeLeft <= 10 ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                    Thời gian đọc & trả lời (40s)
                  </span>
                  {isTimedOut && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      HẾT 40 GIÂY
                    </span>
                  )}
                  {hasConfirmed && !isTimedOut && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ĐÃ DỪNG ĐỒNG HỒ ({TOTAL_QUESTION_TIME - timeLeft}s)
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-200 truncate">
                  {hasConfirmed
                    ? `Đã hoàn tất quyết định trong ${TOTAL_QUESTION_TIME - timeLeft} giây`
                    : timeLeft <= 5
                    ? `⚠️ Khẩn cấp! Chỉ còn ${timeLeft} giây để đưa ra lựa chọn!`
                    : timeLeft <= 15
                    ? `⏳ Sắp hết thời gian! Hãy chọn hành động an toàn (${timeLeft}s)`
                    : `Đọc kỹ tình huống và chọn phương án xử lý an toàn nhất (${timeLeft}s)`}
                </p>
              </div>
            </div>

            {/* Countdown Badge */}
            <div
              className={`px-3 py-1 rounded-xl font-mono font-black text-sm sm:text-base border shrink-0 transition-all ${
                hasConfirmed
                  ? 'bg-slate-900 border-slate-800 text-slate-500'
                  : isTimedOut
                  ? 'bg-rose-500/30 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : timeLeft <= 5
                  ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-bounce shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : timeLeft <= 15
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                  : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              }`}
            >
              {timeLeft}s
            </div>
          </div>

          {/* Visual Countdown Progress Line (40s -> 0s) */}
          <div className="w-full bg-slate-950 h-1.5 overflow-hidden border-b border-slate-800/80 shrink-0">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                hasConfirmed
                  ? 'bg-slate-700'
                  : timeLeft <= 5
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                  : timeLeft <= 15
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                  : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
              }`}
              style={{ width: `${Math.max(0, (timeLeft / TOTAL_QUESTION_TIME) * 100)}%` }}
            />
          </div>

          {/* Interactive Scrollable Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            
            {/* Visual Illustrative Image Card */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-md group bg-slate-950">
              <div className="relative aspect-[16/8] sm:aspect-[16/7] w-full overflow-hidden bg-slate-900">
                <img
                  src={illustration.image}
                  alt={illustration.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Tag Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{illustration.tag}</span>
                </div>

                {/* Zoom Lightbox Trigger */}
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-200 backdrop-blur-md border border-white/15 transition shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  title="Phóng to ảnh minh họa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Bottom Caption Overlay */}
                <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-xs text-slate-200">
                  <span className="font-semibold text-slate-100 truncate drop-shadow-md pr-2">
                    {illustration.label}
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 rounded-full shrink-0">
                    Minh họa 3D
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario Description Card */}
            <div className="bg-slate-950/80 border-l-4 border-amber-400 rounded-2xl p-4 border border-slate-800/80 text-xs sm:text-sm shadow-inner">
              <div className="flex items-center gap-2 mb-1 text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>TÌNH HUỐNG THỰC TẾ:</span>
              </div>
              <p className="text-slate-100 font-medium text-sm leading-relaxed">{card.scenarioVi}</p>
              <p className="text-[11px] text-slate-400 mt-1.5 italic font-sans">{card.scenario}</p>
            </div>

            {/* Multiple Choice Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chọn hành động xử lý an toàn nhất:</span>
                </p>
                <span className="text-[11px] font-semibold text-slate-400">
                  {hasConfirmed
                    ? 'Đã có kết quả đánh giá'
                    : `Còn lại ${timeLeft}s suy nghĩ`}
                </span>
              </div>

              {shuffledChoices.map((choice, idx) => {
                const isSelected = selectedChoiceIndex === idx;
                let choiceStyle =
                  'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-slate-500 hover:-translate-y-0.5 text-slate-200 shadow-sm';

                if (hasConfirmed) {
                  if (choice.isSafe) {
                    choiceStyle =
                      'bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 font-semibold shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/40 animate-pop-scale';
                  } else if (isSelected && !choice.isSafe) {
                    choiceStyle =
                      'bg-rose-950/90 border-2 border-rose-400 text-rose-100 font-semibold shadow-lg shadow-rose-500/10 ring-1 ring-rose-400/40 animate-danger-warning';
                  } else {
                    choiceStyle = 'opacity-40 border-slate-800/60 text-slate-400 bg-slate-900/60';
                  }
                } else if (isSelected) {
                  choiceStyle =
                    'bg-amber-500/15 border-2 border-amber-400 text-white font-medium ring-2 ring-amber-400/30 shadow-md shadow-amber-500/10';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={hasConfirmed}
                    onClick={() => handleSelectChoice(idx)}
                    style={{ animationDelay: `${idx * 70}ms` }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 cursor-pointer transform active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards ${choiceStyle}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 mt-0.5 border shadow-inner transition-transform duration-200 ${
                        hasConfirmed
                          ? choice.isSafe
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-105'
                            : isSelected
                            ? 'bg-rose-500 border-rose-300 text-white scale-105'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                          : isSelected
                          ? 'bg-amber-400 border-amber-300 text-slate-950 scale-105'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <div className="flex-1 text-xs sm:text-sm">
                      <p className="font-semibold leading-snug">{choice.textVi}</p>
                      <p className="text-[11px] text-slate-400 mt-1 italic">{choice.text}</p>
                    </div>
                    {hasConfirmed && choice.isSafe && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-in zoom-in-75 duration-300" />
                    )}
                    {hasConfirmed && isSelected && !choice.isSafe && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-in zoom-in-75 duration-300" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Post-Selection Feedback & Educational Cards */}
            {hasConfirmed && selectedChoice && (
              <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Result Status Banner */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 shadow-lg ${
                    isTimedOut
                      ? 'bg-rose-950/80 border-rose-500 text-rose-100 shadow-rose-500/20'
                      : selectedChoice.isSafe
                      ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-100 shadow-emerald-500/10'
                      : 'bg-rose-950/70 border-rose-500/80 text-rose-100 shadow-rose-500/10'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedChoice.isSafe && !isTimedOut
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {isTimedOut ? (
                      <Timer className="w-5 h-5" />
                    ) : selectedChoice.isSafe ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <Flame className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm">
                      {isTimedOut
                        ? 'HẾT 40 GIÂY! XỬ LÝ QUÁ CHẬM TRONG TÌNH HUỐNG KHẨN CẤP (+Danger Meter)'
                        : selectedChoice.isSafe
                        ? 'QUYẾT ĐỊNH CHÍNH XÁC & AN TOÀN! (+1 Sao An Toàn ★)'
                        : `HÀNH ĐỘNG CÓ RỦI RO NGUY HIỂM! (+${selectedChoice.dangerDelta} Danger Meter)`}
                    </p>
                    <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-medium">
                      {isTimedOut
                        ? 'Trong các sự cố an toàn tại nhà, chần chừ không hành động kịp thời có thể làm nguy cơ bùng phát nhanh chóng.'
                        : selectedChoice.feedbackVi}
                    </p>
                  </div>
                </div>

                {/* If selected wrong or timed out: Highlight the safe choice explicitly */}
                {(!selectedChoice.isSafe || isTimedOut) && safeChoice && (
                  <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/50 text-emerald-100 shadow-sm">
                    <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Phương án xử lý an toàn chuẩn xác:</span>
                    </p>
                    <p className="font-bold text-sm text-white mt-1 leading-snug">{safeChoice.textVi}</p>
                    <p className="text-xs text-emerald-200/90 mt-1">{safeChoice.feedbackVi}</p>
                  </div>
                )}

                {/* Scientific & Practical Explanation */}
                {(card.explanationVi || selectedChoice.feedbackVi) && (
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-slate-200 shadow-inner">
                    <p className="text-[11px] font-bold text-sky-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-sky-400" />
                      <span>Phân tích & Giải thích cơ chế an toàn:</span>
                    </p>
                    <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">
                      {card.explanationVi || selectedChoice.feedbackVi}
                    </p>
                  </div>
                )}

                {/* Core Safety Lesson */}
                <div className="bg-amber-950/30 p-3.5 rounded-2xl border border-amber-500/40 text-amber-100 shadow-sm">
                  <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Bài học an toàn Safe Home cốt lõi:</span>
                  </p>
                  <p className="text-xs text-amber-100 font-semibold mt-1 leading-relaxed">
                    {card.lessonVi || card.tipVi}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {!hasConfirmed
                  ? `Còn ${timeLeft}s — Hãy chọn 1 đáp án để kiểm tra`
                  : 'Đã hoàn thành tình huống an toàn'}
              </span>
            </div>

            {!hasConfirmed ? (
              <button
                type="button"
                disabled={selectedChoiceIndex === null}
                onClick={handleConfirmChoice}
                className={`px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer transform active:scale-95 ${
                  selectedChoiceIndex !== null
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 border border-amber-300 shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                }`}
              >
                <span>Xác nhận ({timeLeft}s)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-7 py-2.5 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer transform active:scale-95 border border-emerald-300"
              >
                <span>Tiếp tục chơi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

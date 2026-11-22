import React, { useEffect } from 'react';
import { Player, SafetyMission, LapState, EndGameReason } from '../types/game';
import { Trophy, AlertOctagon, RotateCcw, Star, ShieldCheck, CheckCircle2, Compass, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playVictorySound, playDangerAlertSound, playButtonClick } from '../audio/soundEffects';

interface GameOverModalProps {
  reason: EndGameReason;
  lapState: LapState;
  safeStars: number;
  dangerMeter: number;
  missions: SafetyMission[];
  players: Player[];
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  reason,
  lapState,
  safeStars,
  dangerMeter,
  missions,
  players,
  onRestart,
}) => {
  const isVictory = reason === 'ALL_MISSIONS_COMPLETED' || reason === 'FIVE_LAPS_COMPLETED';

  useEffect(() => {
    if (isVictory) {
      playVictorySound();
      try {
        confetti({
          particleCount: 130,
          spread: 85,
          origin: { y: 0.6 },
        });
      } catch (err) {
        console.warn('Confetti error:', err);
      }
    } else {
      playDangerAlertSound();
    }
  }, [isVictory]);

  const completedMissions = missions.filter((m) => m.completed).length;

  const getTitleAndMessage = () => {
    if (reason === 'ALL_MISSIONS_COMPLETED') {
      return {
        title: '🎉 CHIẾN THẮNG TUYỆT ĐỐI — ĐẠT ĐỦ 5 NHIỆM VỤ!',
        subtitle:
          'Biệt đội Safe Home đã xuất sắc hoàn thành cả 5 nhiệm vụ an toàn, thu thập đủ 15 Sao An Toàn trước khi kết thúc 5 vòng chơi!',
        badge: 'SAFE HOME MASTER',
      };
    }
    if (reason === 'FIVE_LAPS_COMPLETED') {
      return {
        title: '🏁 HOÀN THÀNH TOÀN DIỆN 5 VÒNG HÀNH TRÌNH!',
        subtitle:
          'Cả đội đã kiên trì vượt qua trọn vẹn 5 vòng chơi từ START đến FINISH, bảo vệ an toàn cho cả ngôi nhà!',
        badge: '5-LAP CHAMPION',
      };
    }
    return {
      title: '⚠️ BÁO ĐỘNG NGUY HIỂM VƯỢT MỨC TỐI ĐA (10/10)!',
      subtitle:
        'Thước đo Nguy Hiểm đã chạm mốc 10. Hãy cùng xem lại các bài học phòng ngừa rủi ro để bảo vệ gia đình tốt hơn!',
      badge: 'CẦN RÚT KINH NGHIỆM',
    };
  };

  const { title, subtitle, badge } = getTitleAndMessage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0C182B] border border-[#1E3A5F] rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 text-center space-y-6">
        {/* Main Icon */}
        <div className="flex justify-center">
          {isVictory ? (
            <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-rose-500/15 border-2 border-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/10">
              <AlertOctagon className="w-10 h-10 text-rose-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-800/80 border border-[#1E3A5F] text-[11px] font-bold text-amber-300 uppercase tracking-wider">
            {badge}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-[#1E3A5F]">
          <div className="p-1.5">
            <span className="text-[10px] text-slate-400 block mb-1">Vòng hoàn thành</span>
            <div className="font-black text-white text-base sm:text-lg">
              {lapState.completedLaps}/5
            </div>
          </div>
          <div className="p-1.5 border-l border-[#1E3A5F]">
            <span className="text-[10px] text-slate-400 block mb-1">Sao An Toàn</span>
            <div className="flex items-center justify-center gap-0.5 font-black text-amber-400 text-base sm:text-lg">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{safeStars}</span>
            </div>
          </div>
          <div className="p-1.5 border-l border-[#1E3A5F]">
            <span className="text-[10px] text-slate-400 block mb-1">Nhiệm vụ xong</span>
            <div className="flex items-center justify-center gap-0.5 font-black text-emerald-400 text-base sm:text-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{completedMissions}/5</span>
            </div>
          </div>
          <div className="p-1.5 border-l border-[#1E3A5F]">
            <span className="text-[10px] text-slate-400 block mb-1">Mức Nguy Hiểm</span>
            <div className="font-black text-rose-400 text-base sm:text-lg">
              {dangerMeter}/10
            </div>
          </div>
        </div>

        {/* Characters Involved */}
        <div className="bg-slate-950/50 p-3 rounded-2xl border border-[#1E3A5F] text-left">
          <span className="text-[11px] font-bold text-slate-400 block mb-2">
            Biệt đội thám hiểm đã tham gia ({players.length} nhân vật):
          </span>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <span
                key={p.id}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm"
                style={{ backgroundColor: p.color }}
              >
                <span>{p.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Restart Action */}
        <button
          onClick={() => {
            playButtonClick();
            onRestart();
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <RotateCcw className="w-4 h-4" /> Bắt đầu ván chơi mới
        </button>
      </div>
    </div>
  );
};

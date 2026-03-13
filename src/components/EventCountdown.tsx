import { useEffect, useState } from "react";

interface EventCountdownProps {
  dateTime: string;
}

const EventCountdown = ({ dateTime }: EventCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(dateTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [dateTime]);

  if (!timeLeft) return null;

  const blocks = [
    { value: timeLeft.days, label: "dias" },
    { value: timeLeft.hours, label: "horas" },
    { value: timeLeft.minutes, label: "min" },
  ];

  return (
    <div className="flex items-center gap-2">
      {blocks.map((b, i) => (
        <div key={b.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center rounded-xl bg-primary/10 px-3 py-2 min-w-[3.2rem]">
            <span className="text-lg font-black text-primary leading-none">{b.value}</span>
            <span className="text-[10px] font-semibold text-primary/70 uppercase">{b.label}</span>
          </div>
          {i < blocks.length - 1 && <span className="text-primary/40 font-bold text-sm">:</span>}
        </div>
      ))}
    </div>
  );
};

export default EventCountdown;

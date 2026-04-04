"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;
  composite: number | null;
  physical: number | null;
  cognitive: number | null;
}

export default function RecoveryChart({ data }: { data: DataPoint[] }) {
  if (!data.length) return (
    <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
      No recovery data yet. Complete a session to see your trend.
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f9fafb" }}
        />
        <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
        <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "70% — Level up", fill: "#22c55e", fontSize: 10 }} />
        <Line type="monotone" dataKey="composite" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Recovery Score" />
        <Line type="monotone" dataKey="physical" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Physical" strokeDasharray="4 2" />
        <Line type="monotone" dataKey="cognitive" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Cognitive" strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}

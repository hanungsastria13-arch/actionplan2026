import { Target, TrendingUp, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';

export default function DashboardCards({ data }) {
  const total = data.length;
  const achieved = data.filter((item) => item.status === 'Achieved').length;
  const inProgress = data.filter((item) => item.status === 'On Progress').length;
  const pending = data.filter((item) => item.status === 'Pending').length;
  const notAchieved = data.filter((item) => item.status === 'Not Achieved').length;
  const completionRate = total > 0 ? ((achieved / total) * 100).toFixed(1) : 0;

  const cards = [
    { label: 'Total Action Plans', value: total, icon: Target, color: 'bg-teal-500', textColor: 'text-teal-600' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: 'Achieved', value: achieved, icon: CheckCircle2, color: 'bg-green-500', textColor: 'text-green-600' },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { label: 'Pending', value: pending, icon: AlertCircle, color: 'bg-gray-400', textColor: 'text-gray-600' },
    { label: 'Not Achieved', value: notAchieved, icon: X, color: 'bg-red-500', textColor: 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

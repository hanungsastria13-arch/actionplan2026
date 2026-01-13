import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#0d9488', '#0891b2', '#6366f1', '#8b5cf6', '#ec4899', '#94a3b8'];

export default function StrategyDistributionChart({ plans }) {
  const chartData = useMemo(() => {
    if (!plans || plans.length === 0) return [];

    // Group by goal_strategy
    const strategyMap = {};
    plans.forEach((plan) => {
      const strategy = plan.goal_strategy?.trim() || 'Uncategorized';
      if (!strategyMap[strategy]) {
        strategyMap[strategy] = 0;
      }
      strategyMap[strategy]++;
    });

    // Convert to array and sort by count
    const sorted = Object.entries(strategyMap)
      .map(([name, count]) => ({
        name: name.length > 25 ? name.substring(0, 22) + '...' : name,
        fullName: name,
        value: count,
        percentage: Math.round((count / plans.length) * 100),
      }))
      .sort((a, b) => b.value - a.value);

    // Take top 5, group rest as "Others"
    if (sorted.length <= 6) return sorted;

    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    const othersTotal = others.reduce((sum, item) => sum + item.value, 0);

    return [
      ...top5,
      {
        name: 'Others',
        fullName: `Others (${others.length} strategies)`,
        value: othersTotal,
        percentage: Math.round((othersTotal / plans.length) * 100),
      },
    ];
  }, [plans]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
          <p className="font-medium text-gray-800 text-sm">{data.fullName}</p>
          <p className="text-sm text-gray-600">
            {data.value} plans ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-800">Strategic Focus Distribution</h3>
        </div>
        <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-500 text-sm">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-2">
        <PieChartIcon className="w-5 h-5 text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-800">Strategic Focus Distribution</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">{chartData.length} strategies tracked</p>
      
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        {chartData.slice(0, 6).map((item, index) => (
          <span key={item.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            {item.name} ({item.percentage}%)
          </span>
        ))}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const MONTH_ORDER = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };

export default function BottleneckChart({ plans, getDeptName }) {
  const currentMonth = new Date().getMonth(); // 0-indexed

  const chartData = useMemo(() => {
    if (!plans || plans.length === 0) return [];

    // Filter for overdue items: status NOT 'Achieved' AND month BEFORE current month
    const overdueItems = plans.filter((plan) => {
      const status = plan.status?.toLowerCase();
      if (status === 'achieved') return false;

      const planMonthIndex = MONTH_ORDER[plan.month];
      if (planMonthIndex === undefined) return false;

      return planMonthIndex < currentMonth;
    });

    if (overdueItems.length === 0) return [];

    // Group by department_code
    const deptMap = {};
    overdueItems.forEach((plan) => {
      const dept = plan.department_code || 'Unknown';
      if (!deptMap[dept]) {
        deptMap[dept] = 0;
      }
      deptMap[dept]++;
    });

    // Convert to array, sort descending, take top 5
    return Object.entries(deptMap)
      .map(([code, count]) => ({
        code,
        name: getDeptName ? getDeptName(code) : code,
        overdue: count,
      }))
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5);
  }, [plans, currentMonth, getDeptName]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
          <p className="font-medium text-gray-800 text-sm">{data.name}</p>
          <p className="text-sm text-red-600">
            {data.overdue} overdue plan{data.overdue !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  // Empty state - all caught up
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-800">Bottleneck Radar</h3>
        </div>
        <div className="h-[220px] flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-700 font-medium">No Bottlenecks Detected</p>
          <p className="text-gray-400 text-sm mt-1">All departments are on track</p>
        </div>
      </div>
    );
  }

  const totalOverdue = chartData.reduce((sum, d) => sum + d.overdue, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800">Bottleneck Radar</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {totalOverdue} overdue items across {chartData.length} department{chartData.length !== 1 ? 's' : ''}
      </p>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            type="category"
            dataKey="code"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="overdue" radius={[0, 4, 4, 0]} maxBarSize={25}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="#ef4444" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 mt-2 text-center">
        Top {chartData.length} departments with overdue action plans
      </p>
    </div>
  );
}

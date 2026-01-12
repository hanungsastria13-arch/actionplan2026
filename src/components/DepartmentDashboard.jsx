import { useState, useMemo, useEffect } from 'react';
import { Target, TrendingUp, CheckCircle2, Clock, AlertCircle, ChevronDown, Calendar } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { useActionPlans } from '../hooks/useActionPlans';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS, supabase } from '../lib/supabase';
import PerformanceChart from './PerformanceChart';

// Sort months chronologically
const MONTH_ORDER = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
const MONTHS_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sortByMonth = (a, b) => (MONTH_ORDER[a.name] ?? 99) - (MONTH_ORDER[b.name] ?? 99);

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const COMPARISON_YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Map months to quarters
const getQuarter = (month) => {
  const idx = MONTH_ORDER[month];
  if (idx === undefined) return 'Unknown';
  if (idx <= 2) return 'Q1';
  if (idx <= 5) return 'Q2';
  if (idx <= 8) return 'Q3';
  return 'Q4';
};

// Get bar color based on rate
const getBarColor = (value) => {
  if (value >= 90) return '#15803d';
  if (value >= 70) return '#b45309';
  return '#b91c1c';
};

// Dropdown component for chart dimension switching
function ChartDropdown({ value, onChange, options, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-xs text-gray-600 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
      >
        {children || options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

// Custom tooltip for composed chart
const BenchmarkTooltip = ({ active, payload, label, currentYear, comparisonLabel }) => {
  if (active && payload && payload.length) {
    const currentValue = payload.find(p => p.dataKey === 'current')?.value;
    const compValue = payload.find(p => p.dataKey === 'comparison')?.value;
    return (
      <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
        <p className="font-medium text-gray-800 mb-1">{label}</p>
        <p className="text-sm" style={{ color: getBarColor(currentValue || 0) }}>
          {currentYear}: <span className="font-bold">{currentValue !== null ? `${currentValue}%` : 'No data'}</span>
        </p>
        {compValue !== null && compValue !== undefined && (
          <p className="text-sm text-gray-500">
            {comparisonLabel}: <span className="font-bold">{compValue}%</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function DepartmentDashboard({ departmentCode }) {
  const { profile } = useAuth();
  const { plans, loading } = useActionPlans(departmentCode);
  
  // Year and dimension switching states
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [breakdownMetric, setBreakdownMetric] = useState('goal_strategy');
  const [timeMetric, setTimeMetric] = useState('monthly');
  const [comparisonYear, setComparisonYear] = useState('prev_year');

  // Get department info
  const deptInfo = DEPARTMENTS.find((d) => d.code === departmentCode);
  const deptName = deptInfo?.name || departmentCode;

  // Filter plans by selected year
  const yearFilteredPlans = useMemo(() => {
    return plans.filter((plan) => (plan.year || CURRENT_YEAR) === selectedYear);
  }, [plans, selectedYear]);

  // Calculate comparison year value
  const comparisonYearValue = useMemo(() => {
    if (comparisonYear === 'none') return null;
    if (comparisonYear === 'prev_year') return selectedYear - 1;
    return parseInt(comparisonYear, 10);
  }, [comparisonYear, selectedYear]);

  // Comparison year plans for benchmark
  const comparisonPlans = useMemo(() => {
    if (!comparisonYearValue) return [];
    return plans.filter((plan) => (plan.year || CURRENT_YEAR) === comparisonYearValue);
  }, [plans, comparisonYearValue]);

  // Historical data for comparison (monthly)
  const [comparisonHistorical, setComparisonHistorical] = useState([]);

  useEffect(() => {
    const fetchComparisonHistory = async () => {
      if (!comparisonYearValue) {
        setComparisonHistorical([]);
        return;
      }

      const { data } = await supabase
        .from('historical_stats')
        .select('*')
        .eq('year', comparisonYearValue)
        .eq('department_code', departmentCode);
      
      setComparisonHistorical(data || []);
    };

    fetchComparisonHistory();
  }, [comparisonYearValue, departmentCode]);

  const hasComparisonData = comparisonPlans.length > 0 || comparisonHistorical.length > 0;
  const comparisonLabel = comparisonYearValue ? `${comparisonYearValue}` : null;

  // Calculate stats from year-filtered plans
  const stats = useMemo(() => {
    const total = yearFilteredPlans.length;
    const achieved = yearFilteredPlans.filter((p) => p.status === 'Achieved').length;
    const inProgress = yearFilteredPlans.filter((p) => p.status === 'On Progress').length;
    const pending = yearFilteredPlans.filter((p) => p.status === 'Pending').length;
    const notAchieved = yearFilteredPlans.filter((p) => p.status === 'Not Achieved').length;
    const rate = total > 0 ? Math.round((achieved / total) * 100) : 0;

    return { total, achieved, inProgress, pending, notAchieved, rate };
  }, [yearFilteredPlans]);

  // Chart 1: Performance Breakdown (by Strategy or PIC)
  const breakdownChartData = useMemo(() => {
    const dataMap = {};
    
    yearFilteredPlans.forEach((plan) => {
      let key;
      if (breakdownMetric === 'goal_strategy') {
        key = plan.goal_strategy?.trim() || 'Uncategorized';
      } else {
        key = plan.pic?.trim() || 'Unassigned';
      }
      
      const shortName = key.length > 25 ? key.substring(0, 22) + '...' : key;
      
      if (!dataMap[shortName]) {
        dataMap[shortName] = { total: 0, achieved: 0, fullName: key };
      }
      dataMap[shortName].total++;
      if (plan.status === 'Achieved') {
        dataMap[shortName].achieved++;
      }
    });

    return Object.entries(dataMap)
      .map(([name, s]) => ({
        name,
        fullName: s.fullName,
        rate: s.total > 0 ? Math.round((s.achieved / s.total) * 100) : 0,
        total: s.total,
        achieved: s.achieved,
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [yearFilteredPlans, breakdownMetric]);

  // Chart 2: Time Analysis (Monthly or Quarterly)
  const timeChartData = useMemo(() => {
    const dataMap = {};
    
    yearFilteredPlans.forEach((plan) => {
      let key;
      if (timeMetric === 'monthly') {
        key = plan.month || 'Unknown';
      } else {
        key = getQuarter(plan.month);
      }
      
      if (!dataMap[key]) {
        dataMap[key] = { total: 0, achieved: 0 };
      }
      dataMap[key].total++;
      if (plan.status === 'Achieved') {
        dataMap[key].achieved++;
      }
    });

    const result = Object.entries(dataMap)
      .map(([name, s]) => ({
        name,
        fullName: name,
        rate: s.total > 0 ? Math.round((s.achieved / s.total) * 100) : 0,
        total: s.total,
        achieved: s.achieved,
      }));

    // Sort appropriately
    if (timeMetric === 'monthly') {
      return result.sort(sortByMonth);
    } else {
      // Sort quarters Q1, Q2, Q3, Q4
      return result.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [yearFilteredPlans, timeMetric]);

  // Benchmark chart data for Monthly view (current year bars + comparison year line)
  const benchmarkMonthlyData = useMemo(() => {
    // Build current year data by month
    const currentMap = {};
    yearFilteredPlans.forEach((plan) => {
      const month = plan.month || 'Unknown';
      if (!currentMap[month]) currentMap[month] = { total: 0, achieved: 0 };
      currentMap[month].total++;
      if (plan.status === 'Achieved') currentMap[month].achieved++;
    });

    // Build comparison year data by month from real plans
    const compMap = {};
    comparisonPlans.forEach((plan) => {
      const month = plan.month || 'Unknown';
      if (!compMap[month]) compMap[month] = { total: 0, achieved: 0 };
      compMap[month].total++;
      if (plan.status === 'Achieved') compMap[month].achieved++;
    });

    // Build historical comparison map (month number to rate)
    const compHistoricalMap = {};
    comparisonHistorical.forEach((h) => {
      const monthName = MONTHS_ORDER[h.month - 1];
      compHistoricalMap[monthName] = h.completion_rate;
    });

    // Combine into chart data for all months
    return MONTHS_ORDER.map((month) => {
      const curr = currentMap[month];
      const comp = compMap[month];
      
      // Current year value
      const currentValue = curr && curr.total > 0 
        ? Math.round((curr.achieved / curr.total) * 100) 
        : null;

      // Comparison value: prefer real data, fall back to historical
      let comparisonValue = null;
      if (comp && comp.total > 0) {
        comparisonValue = Math.round((comp.achieved / comp.total) * 100);
      } else if (compHistoricalMap[month] !== undefined) {
        comparisonValue = Math.round(compHistoricalMap[month]);
      }

      return {
        name: month,
        current: currentValue,
        comparison: comparisonValue,
      };
    });
  }, [yearFilteredPlans, comparisonPlans, comparisonHistorical]);

  // Benchmark chart data for Quarterly view
  const benchmarkQuarterlyData = useMemo(() => {
    const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
    
    // Build current year data by quarter
    const currentMap = {};
    yearFilteredPlans.forEach((plan) => {
      const quarter = getQuarter(plan.month);
      if (!currentMap[quarter]) currentMap[quarter] = { total: 0, achieved: 0 };
      currentMap[quarter].total++;
      if (plan.status === 'Achieved') currentMap[quarter].achieved++;
    });

    // Build comparison year data by quarter from real plans
    const compMap = {};
    comparisonPlans.forEach((plan) => {
      const quarter = getQuarter(plan.month);
      if (!compMap[quarter]) compMap[quarter] = { total: 0, achieved: 0 };
      compMap[quarter].total++;
      if (plan.status === 'Achieved') compMap[quarter].achieved++;
    });

    // Build historical comparison by quarter
    const compHistoricalByQuarter = { Q1: [], Q2: [], Q3: [], Q4: [] };
    comparisonHistorical.forEach((h) => {
      const quarter = getQuarter(MONTHS_ORDER[h.month - 1]);
      if (compHistoricalByQuarter[quarter]) {
        compHistoricalByQuarter[quarter].push(h.completion_rate);
      }
    });

    // Combine into chart data for all quarters
    return QUARTERS.map((quarter) => {
      const curr = currentMap[quarter];
      const comp = compMap[quarter];
      
      // Current year value
      const currentValue = curr && curr.total > 0 
        ? Math.round((curr.achieved / curr.total) * 100) 
        : null;

      // Comparison value: prefer real data, fall back to historical average
      let comparisonValue = null;
      if (comp && comp.total > 0) {
        comparisonValue = Math.round((comp.achieved / comp.total) * 100);
      } else if (compHistoricalByQuarter[quarter].length > 0) {
        const avg = compHistoricalByQuarter[quarter].reduce((a, b) => a + b, 0) / compHistoricalByQuarter[quarter].length;
        comparisonValue = Math.round(avg);
      }

      return {
        name: quarter,
        current: currentValue,
        comparison: comparisonValue,
      };
    });
  }, [yearFilteredPlans, comparisonPlans, comparisonHistorical]);

  // Select the right benchmark data based on timeMetric
  const benchmarkChartData = timeMetric === 'monthly' ? benchmarkMonthlyData : benchmarkQuarterlyData;

  // Get rate color
  const getRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  // Chart titles based on selected metric
  const breakdownTitle = breakdownMetric === 'goal_strategy' ? 'Performance by Strategy' : 'Performance by PIC';
  const breakdownSubtitle = breakdownMetric === 'goal_strategy' 
    ? `${breakdownChartData.length} strategies tracked`
    : `${breakdownChartData.length} team members`;
  
  const timeTitle = timeMetric === 'monthly' ? 'Monthly Progress' : 'Quarterly Progress';
  const timeSubtitle = timeMetric === 'monthly' 
    ? 'Completion rate by month'
    : 'Completion rate by quarter';

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-80 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{deptName}</h1>
            <p className="text-gray-500 text-sm">Department Performance Dashboard — FY {selectedYear}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div className="flex gap-1">
                {AVAILABLE_YEARS.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedYear === year ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Welcome back,</p>
              <p className="font-medium text-gray-800">{profile?.full_name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-teal-100 text-xs">Total Plans</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rate}%</p>
                <p className="text-emerald-100 text-xs">Completion Rate</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.achieved}</p>
                <p className="text-green-100 text-xs">Achieved</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-amber-100 text-xs">In Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.notAchieved + stats.pending}</p>
                <p className="text-red-100 text-xs">Needs Attention</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Summary</h3>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Overall Progress</span>
                <span className={`text-lg font-bold ${getRateColor(stats.rate)}`}>{stats.rate}%</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${stats.rate}%`,
                    backgroundColor: stats.rate >= 90 ? '#15803d' : stats.rate >= 70 ? '#b45309' : '#b91c1c'
                  }}
                />
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.achieved}</p>
                <p className="text-gray-500">Achieved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                <p className="text-gray-500">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{stats.pending}</p>
                <p className="text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.notAchieved}</p>
                <p className="text-gray-500">Not Achieved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section with Dimension Switching */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Chart: Performance Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{breakdownTitle}</h3>
                <p className="text-sm text-gray-500">{breakdownSubtitle}</p>
              </div>
              <ChartDropdown
                value={breakdownMetric}
                onChange={setBreakdownMetric}
                options={[
                  { value: 'goal_strategy', label: 'Goal/Strategy' },
                  { value: 'pic', label: 'PIC' },
                ]}
              />
            </div>
            <PerformanceChart
              data={breakdownChartData}
              xKey="name"
              yKey="rate"
              height={280}
              hideHeader
            />
          </div>
          
          {/* Right Chart: Time Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{timeTitle}</h3>
                <p className="text-sm text-gray-500">{timeSubtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Comparison dropdown for both monthly and quarterly */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Compare:</span>
                  <ChartDropdown
                    value={comparisonYear}
                    onChange={setComparisonYear}
                  >
                    <option value="none">None</option>
                    <option value="prev_year">Previous Year ({selectedYear - 1})</option>
                    <optgroup label="Specific Year">
                      {COMPARISON_YEARS.filter(y => y !== selectedYear).map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </optgroup>
                  </ChartDropdown>
                </div>
                <ChartDropdown
                  value={timeMetric}
                  onChange={setTimeMetric}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                  ]}
                />
              </div>
            </div>
            
            {/* Warning if no comparison data */}
            {comparisonYear !== 'none' && !hasComparisonData && (
              <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ⚠️ No data available for {comparisonLabel}. The comparison line will not be shown.
              </div>
            )}
            
            {/* Conditional chart rendering */}
            {comparisonYear !== 'none' ? (
              <>
                {/* Legend */}
                <div className="flex items-center gap-4 mb-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-teal-500"></span>
                    {selectedYear}
                  </span>
                  {hasComparisonData && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-0.5 bg-amber-500 rounded"></span>
                      {comparisonLabel}
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={benchmarkChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<BenchmarkTooltip currentYear={selectedYear} comparisonLabel={comparisonLabel} />} />
                    <Bar dataKey="current" radius={[4, 4, 0, 0]} maxBarSize={timeMetric === 'quarterly' ? 60 : 35}>
                      {benchmarkChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.current || 0)} />
                      ))}
                    </Bar>
                    {hasComparisonData && (
                      <Line
                        type="monotone"
                        dataKey="comparison"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#f59e0b', r: 4 }}
                        connectNulls
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            ) : (
              <PerformanceChart
                data={timeChartData}
                xKey="name"
                yKey="rate"
                height={280}
                hideHeader
              />
            )}
          </div>
        </div>

        {/* Empty State */}
        {yearFilteredPlans.length === 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-amber-800 mb-1">No Action Plans for {selectedYear}</h3>
            <p className="text-amber-600 text-sm">
              {plans.length > 0 
                ? `Try selecting a different year. You have ${plans.length} plans in other years.`
                : 'Contact your administrator to add action plans for your department.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HeaderBrand } from '@/components/HeaderBrand';
import { IndicatorsData, YearlyIndicators, PeopleIndicators, StrategicLineData } from '@/types';

type AudienceType = 'total' | 'estudiantes' | 'colaboradores';

type ActivityData = {
  id: number;
  name: string;
  strategic_line: string;
  year: number;
  registrations_count: number;
  attended_count: number;
  created_at: string;
};

const STRATEGIC_LINES = [
  'Apostolado',
  'Sacramentos',
  'Crecimiento Espiritual',
  'Identidad y Comunidad'
] as const;

export default function IndicatorsModule() {
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('total');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [data, setData] = useState<IndicatorsData | null>(null);
  const [activitiesData, setActivitiesData] = useState<ActivityData[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIndicators();
    fetchActivities();
  }, []);

  const fetchIndicators = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/indicators/');
      setData(response.data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error loading indicators');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get('/api/activities/?per_page=100');
      setActivitiesData(response.data.items);
    } catch (error: any) {
      console.error('Error loading activities:', error);
    }
  };

  // Get available years from data
  const getAvailableYears = (): number[] => {
    if (!data) return [];
    const years = new Set<number>();

    // Add years from yearly data
    Object.values(data.yearly).forEach(audienceData => {
      audienceData.forEach(yearData => {
        years.add(yearData.year);
      });
    });

    // Add years from activities
    activitiesData.forEach(activity => {
      years.add(activity.year);
    });

    return Array.from(years).sort((a, b) => b - a); // Sort descending
  };

  // Filter data by selected year
  const filterDataByYear = (yearlyData: YearlyIndicators[]) => {
    if (selectedYear === 'all') return yearlyData;
    return yearlyData.filter(item => item.year === selectedYear);
  };

  // Toggle expanded state for strategic lines
  const toggleExpanded = (line: string) => {
    const newExpanded = new Set(expandedLines);
    if (newExpanded.has(line)) {
      newExpanded.delete(line);
    } else {
      newExpanded.add(line);
    }
    setExpandedLines(newExpanded);
  };

  // Get activities for a strategic line and year
  const getActivitiesForLine = (strategicLine: string) => {
    return activitiesData.filter(activity => {
      const matchesLine = activity.strategic_line === strategicLine;
      const matchesYear = selectedYear === 'all' || activity.year === selectedYear;
      return matchesLine && matchesYear;
    });
  };

  // Year Filter Component
  const YearFilter = () => {
    const availableYears = getAvailableYears();

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-brand-text">Año:</span>
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(value === 'all' ? 'all' : parseInt(value))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // Segmented Control Component
  const SegmentedControl = () => (
    <div className="flex bg-gray-100 rounded-full p-1 shadow-sm">
      {(['total', 'estudiantes', 'colaboradores'] as AudienceType[]).map((audience) => (
        <button
          key={audience}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedAudience === audience
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-700 hover:bg-neutral-100'
          }`}
          onClick={() => setSelectedAudience(audience)}
        >
          {audience === 'total' ? 'Total' :
           audience === 'estudiantes' ? 'Estudiantes' : 'Colaboradores'}
        </button>
      ))}
    </div>
  );

  // Table Component with Brand Styling
  const BrandTable = ({
    data,
    title,
    showTotalRow = false,
    forceYearlyView = false
  }: {
    data: YearlyIndicators[] | PeopleIndicators[],
    title?: string,
    showTotalRow?: boolean,
    forceYearlyView?: boolean
  }) => {
    const isYearlyData = forceYearlyView || (data.length > 0 && 'inscripciones' in data[0]);

    // Calculate totals for yearly data
    const totals = isYearlyData && showTotalRow ? (data as YearlyIndicators[]).reduce(
      (acc, row) => ({
        inscripciones: acc.inscripciones + row.inscripciones,
        participaciones: acc.participaciones + row.participaciones,
        personas_inscritas: acc.personas_inscritas + row.personas_inscritas,
        personas_participantes: acc.personas_participantes + row.personas_participantes,
        tasa: 0 // Will calculate after
      }),
      { inscripciones: 0, participaciones: 0, personas_inscritas: 0, personas_participantes: 0, tasa: 0 }
    ) : null;

    if (totals) {
      totals.tasa = totals.inscripciones > 0 ?
        Math.round((totals.participaciones / totals.inscripciones) * 100 * 100) / 100 : 0;
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {title && (
          <div className="p-4 border-b">
            <h3 className="text-[16px] font-semibold text-brand-text">{title}</h3>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="bg-brand-teal hover:bg-brand-teal">
              <TableHead scope="col" className="text-white font-bold px-4 py-3 text-left">
                Año
              </TableHead>
              {isYearlyData ? (
                <>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Inscripciones
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Participaciones
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Personas Inscritas
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Personas Participantes
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Tasa (%)
                  </TableHead>
                </>
              ) : (
                <>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Est. Inscritas
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Est. Participantes
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Col. Inscritas
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Col. Participantes
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Total Inscritas
                  </TableHead>
                  <TableHead scope="col" className="text-white font-bold px-4 py-3 text-right">
                    Total Participantes
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="px-4 py-2 font-medium">
                    {'year' in row ? row.year : index + 1}
                  </TableCell>
                  {isYearlyData ? (
                    <>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as YearlyIndicators).inscripciones.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as YearlyIndicators).participaciones.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as YearlyIndicators).personas_inscritas.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as YearlyIndicators).personas_participantes.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as YearlyIndicators).tasa}%
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as PeopleIndicators).estudiantes_inscritas.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as PeopleIndicators).estudiantes_participantes.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as PeopleIndicators).colaboradores_inscritas.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as PeopleIndicators).colaboradores_participantes.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as PeopleIndicators).total_inscritas.toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        {(row as PeopleIndicators).total_participantes.toLocaleString()}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isYearlyData ? 6 : 7} className="px-4 py-8 text-center text-gray-500">
                  No hay datos disponibles para esta línea estratégica
                </TableCell>
              </TableRow>
            )}
            {totals && (
              <TableRow className="bg-brand-grayRow hover:bg-brand-grayRow" aria-label="Suma Total">
                <TableCell className="px-4 py-2 font-semibold">
                  Suma Total
                </TableCell>
                <TableCell className="px-4 py-2 text-right font-semibold">
                  {totals.inscripciones.toLocaleString()}
                </TableCell>
                <TableCell className="px-4 py-2 text-right font-semibold">
                  {totals.participaciones.toLocaleString()}
                </TableCell>
                <TableCell className="px-4 py-2 text-right font-semibold">
                  {totals.personas_inscritas.toLocaleString()}
                </TableCell>
                <TableCell className="px-4 py-2 text-right font-semibold">
                  {totals.personas_participantes.toLocaleString()}
                </TableCell>
                <TableCell className="px-4 py-2 text-right font-semibold">
                  {totals.tasa}%
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Custom label component for the line chart
  const CustomLabel = (props: any) => {
    const { x, y, value } = props;
    return (
      <text x={x} y={y - 10} fill="#000" textAnchor="middle" fontSize="12" fontWeight="500">
        {value}%
      </text>
    );
  };

  // Chart Component
  const IndicatorsChart = ({ data }: { data: YearlyIndicators[] }) => (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <h3 className="text-[16px] font-semibold text-brand-text mb-4">
        Inscripciones, Participaciones, Tasa Conversión, Personas Inscritas y Participantes
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'Tasa') return [`${value}%`, name];
              return [typeof value === 'number' ? value.toLocaleString() : value, name];
            }}
            labelFormatter={(label) => `Año ${label}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="rect"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          <Bar
            yAxisId="left"
            dataKey="inscripciones"
            fill="#0E6E7E"
            name="Inscripciones"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="participaciones"
            fill="#7A7A7A"
            name="Participaciones"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="personas_inscritas"
            fill="#BDBDBD"
            name="Personas Inscritas"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="personas_participantes"
            fill="#9E9E9E"
            name="Personas Participantes"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tasa"
            stroke="#000000"
            strokeWidth={2}
            name="Tasa"
            dot={{ fill: '#000000', r: 4 }}
          >
            <LabelList content={CustomLabel} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  // Expandable Strategic Lines Table Component
  const ExpandableStrategicTable = () => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-brand-teal hover:bg-brand-teal">
              <TableHead scope="col" className="text-white font-bold px-6 py-4 text-left w-12">
                {/* Empty header for expand button */}
              </TableHead>
              <TableHead scope="col" className="text-white font-bold px-6 py-4 text-left">
                Línea Estratégica
              </TableHead>
              <TableHead scope="col" className="text-white font-bold px-6 py-4 text-right">
                Inscripciones
              </TableHead>
              <TableHead scope="col" className="text-white font-bold px-6 py-4 text-right">
                Participaciones
              </TableHead>
              <TableHead scope="col" className="text-white font-bold px-6 py-4 text-right">
                Tasa (%)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {STRATEGIC_LINES.map((line) => {
              const lineData = data?.strategic[line]?.yearly[selectedAudience] || [];
              const filteredLineData = filterDataByYear(lineData);
              const lineActivities = getActivitiesForLine(line);
              const isExpanded = expandedLines.has(line);

              // Calculate totals for the strategic line
              const totals = filteredLineData.reduce(
                (acc, row) => ({
                  inscripciones: acc.inscripciones + row.inscripciones,
                  participaciones: acc.participaciones + row.participaciones
                }),
                { inscripciones: 0, participaciones: 0 }
              );
              const totalTasa = totals.inscripciones > 0 ?
                Math.round((totals.participaciones / totals.inscripciones) * 100 * 100) / 100 : 0;

              return (
                <React.Fragment key={line}>
                  {/* Strategic Line Row */}
                  <TableRow
                    className="hover:bg-gray-50 cursor-pointer border-b-2 border-gray-100"
                    onClick={() => toggleExpanded(line)}
                  >
                    <TableCell className="px-6 py-4">
                      {lineActivities.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )
                      ) : (
                        <div className="h-5 w-5" />
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-semibold text-brand-text">
                      {line}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right font-medium">
                      {totals.inscripciones.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right font-medium">
                      {totals.participaciones.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right font-medium">
                      {totalTasa}%
                    </TableCell>
                  </TableRow>

                  {/* Expanded Activities */}
                  {isExpanded && lineActivities.map((activity) => {
                    const tasa = activity.registrations_count > 0 ?
                      Math.round((activity.attended_count / activity.registrations_count) * 100 * 100) / 100 : 0;

                    return (
                      <TableRow key={`${activity.id}-${activity.year}`} className="bg-gray-50/50">
                        <TableCell className="px-6 py-3">
                          <div className="w-5" />
                        </TableCell>
                        <TableCell className="px-6 py-3 pl-12 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">•</span>
                            <span className="font-medium">{activity.name}</span>
                            <span className="text-gray-500">- {activity.year}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3 text-right text-sm">
                          {activity.registrations_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-6 py-3 text-right text-sm">
                          {activity.attended_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-6 py-3 text-right text-sm">
                          {tasa}%
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Show "No activities" message if expanded but no activities */}
                  {isExpanded && lineActivities.length === 0 && (
                    <TableRow className="bg-gray-50/50">
                      <TableCell className="px-6 py-4" />
                      <TableCell className="px-6 py-4 pl-12 text-sm text-gray-500 italic" colSpan={4}>
                        No hay actividades disponibles para esta línea estratégica
                        {selectedYear !== 'all' && ` en el año ${selectedYear}`}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderBrand />
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="flex items-center justify-center">
            <div className="text-lg text-gray-600">Cargando indicadores...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderBrand />
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const yearlyData = data.yearly[selectedAudience];
  const peopleData = data.people;

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderBrand />

      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
        {/* Header with filters */}
        <div className="flex justify-between items-center">
          <YearFilter />
          <SegmentedControl />
        </div>

        {/* First section: Yearly indicators + Chart */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-6">
            <div className="space-y-2">
              <h2 className="text-[16px] font-semibold text-brand-text">
                Inscripciones y participaciones por año
              </h2>
              <BrandTable data={filterDataByYear(yearlyData)} showTotalRow={true} />
            </div>
          </div>
          <div className="col-span-12 md:col-span-6">
            <IndicatorsChart data={filterDataByYear(yearlyData)} />
          </div>
        </div>

        {/* Second section: People participants */}
        <div className="space-y-2">
          <h2 className="text-[16px] font-semibold text-brand-text">
            Personas por año (inscritas vs participantes)
          </h2>
          <BrandTable data={selectedYear === 'all' ? peopleData : peopleData.filter(item => item.year === selectedYear)} />
        </div>

        {/* Third section: Original Strategic lines grid */}
        <div className="space-y-6">
          <h2 className="text-[18px] font-semibold text-brand-text">
            Líneas de acción
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {STRATEGIC_LINES.map((line) => {
              const lineData = data.strategic[line]?.yearly[selectedAudience] || [];
              const filteredLineData = filterDataByYear(lineData);
              return (
                <div key={line} className="space-y-2">
                  <h3 className="text-[16px] font-semibold text-brand-text">
                    {line}
                  </h3>
                  <BrandTable data={filteredLineData} showTotalRow={true} forceYearlyView={true} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Fourth section: NEW Expandable Strategic Lines Table */}
        <div className="space-y-6">
          <h2 className="text-[18px] font-semibold text-brand-text">
            Líneas de acción por actividad (Expandible)
          </h2>
          <ExpandableStrategicTable />
        </div>
      </div>
    </div>
  );
}
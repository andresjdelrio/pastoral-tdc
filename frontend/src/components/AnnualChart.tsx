import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface YearlyData {
  year: number;
  inscripciones: number;
  participaciones: number;
  personas_inscritas: number;
  personas_participantes: number;
  tasa_conversion: number;
}

interface ChartData {
  data: YearlyData[];
  total: {
    inscripciones: number;
    participaciones: number;
    personas_inscritas: number;
    personas_participantes: number;
    tasa_conversion: number;
  };
}

export default function AnnualChart() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/indicators/annual-chart');
      setChartData(response.data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al cargar datos del gráfico');
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!chartData || chartData.data.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No hay datos disponibles para mostrar</AlertDescription>
      </Alert>
    );
  }

  const chartDataWithTotal = [
    ...chartData.data,
    {
      year: 'Total' as any,
      inscripciones: chartData.total.inscripciones,
      participaciones: chartData.total.participaciones,
      personas_inscritas: chartData.total.personas_inscritas,
      personas_participantes: chartData.total.personas_participantes,
      tasa_conversion: chartData.total.tasa_conversion,
    }
  ];

  const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value) return null;
    return (
      <text x={x + width / 2} y={y - 5} fill="#333" textAnchor="middle" fontSize="12" fontWeight="600">
        {value.toLocaleString()}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-semibold">{entry.name}:</span> {entry.value.toLocaleString()}
            {entry.dataKey === 'tasa_conversion' && '%'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Indicadores Anuales de Participación</h2>
        <p className="text-sm text-gray-600">Comparación anual de inscripciones, participaciones y personas únicas</p>
      </div>
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart data={chartDataWithTotal} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={{ fill: '#666', fontSize: 14 }} />
          <YAxis yAxisId="left" tick={{ fill: '#666' }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar yAxisId="left" dataKey="inscripciones" name="Inscripciones" fill="#0891b2">
            <LabelList content={renderCustomLabel} />
          </Bar>
          <Bar yAxisId="left" dataKey="participaciones" name="Participaciones" fill="#ef4444">
            <LabelList content={renderCustomLabel} />
          </Bar>
          <Bar yAxisId="left" dataKey="personas_inscritas" name="Personas Inscritas" fill="#4b5563">
            <LabelList content={renderCustomLabel} />
          </Bar>
          <Bar yAxisId="left" dataKey="personas_participantes" name="Personas Participantes" fill="#d1d5db">
            <LabelList content={renderCustomLabel} />
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="tasa_conversion" name="Tasa Conversión" stroke="#000" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-cyan-50 p-4 rounded-lg">
          <div className="text-xs text-cyan-700 font-semibold">Total Inscripciones</div>
          <div className="text-2xl font-bold text-cyan-900">{chartData.total.inscripciones.toLocaleString()}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-xs text-red-700 font-semibold">Total Participaciones</div>
          <div className="text-2xl font-bold text-red-900">{chartData.total.participaciones.toLocaleString()}</div>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="text-xs text-gray-700 font-semibold">Personas Inscritas</div>
          <div className="text-2xl font-bold text-gray-900">{chartData.total.personas_inscritas.toLocaleString()}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-xs text-gray-600 font-semibold">Personas Participantes</div>
          <div className="text-2xl font-bold text-gray-700">{chartData.total.personas_participantes.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-xs text-green-700 font-semibold">Tasa de Conversión</div>
          <div className="text-2xl font-bold text-green-900">{chartData.total.tasa_conversion}%</div>
        </div>
      </div>
    </div>
  );
}

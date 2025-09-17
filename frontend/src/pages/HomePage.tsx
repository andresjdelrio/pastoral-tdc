import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, BarChart3, Users, Settings, Heart, TrendingUp, FileText } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      icon: Upload,
      title: 'Subir CSV',
      description: 'Sube los archivos CSV de cada actividad desde Google Forms'
    },
    {
      icon: FileText,
      title: 'Revisar Datos',
      description: 'Revisa y valida la información de cada actividad registrada'
    },
    {
      icon: Users,
      title: 'Marcar Asistencia',
      description: 'Gestiona y marca la asistencia de los participantes en cada actividad'
    },
    {
      icon: TrendingUp,
      title: 'Ver Indicadores',
      description: 'Visualiza y descarga los indicadores y métricas de la Pastoral'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header with logo and brand colors */}
      <div className="w-full">
        {/* Top red strip */}
        <div className="w-full h-1 bg-brand-red"></div>

        {/* Logo section */}
        <div className="py-8 bg-white">
          <img
            src="/assets/logo-finis.png"
            alt="Finis Terrae"
            className="h-16 mx-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const placeholder = document.createElement('div');
              placeholder.className = 'h-16 w-40 mx-auto bg-gray-200 rounded flex items-center justify-center text-sm text-gray-500 font-medium';
              placeholder.textContent = 'LOGO FINIS TERRAE';
              e.currentTarget.parentNode?.appendChild(placeholder);
            }}
          />
        </div>

        {/* Title banner */}
        <div className="w-full bg-brand-teal text-white py-4 text-center">
          <h1 className="text-xl font-semibold uppercase tracking-wide">
            DIRECCIÓN DE PASTORAL | PLATAFORMA DE GESTIÓN
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Welcome section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-teal rounded-full mb-4">
            <Heart className="h-10 w-10 text-white" />
          </div>

          <h2 className="text-4xl font-bold text-brand-text">
            Bienvenido a la plataforma de gestión de actividades e indicadores de la Pastoral Finis
          </h2>

          <div className="max-w-4xl mx-auto space-y-4 text-lg leading-relaxed text-gray-700">
            <p>
              Aquí puedes subir los CSV de cada actividad, revisarlos, marcar asistencia y, por supuesto, ver y descargar los indicadores.
            </p>
            <p className="text-brand-teal font-medium flex items-center justify-center gap-2">
              <Heart className="h-5 w-5" />
              Ésta plataforma fue desarrollada con mucho cariño para ustedes.
              <Heart className="h-5 w-5" />
            </p>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="text-center hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-brand-teal">
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-teal rounded-full mx-auto mb-3">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-brand-text text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom decoration */}
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Pastoral Finis Terrae • Plataforma de Gestión de Actividades e Indicadores
          </p>
        </div>
      </div>
    </div>
  );
}
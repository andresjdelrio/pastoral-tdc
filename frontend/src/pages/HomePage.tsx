import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Upload, BarChart3, Users, Database, Settings, UserCheck, FolderOpen } from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      title: 'Subir Datos',
      description: 'Sube archivos CSV de registros de actividades y eventos',
      icon: Upload,
      href: '/upload',
      color: 'bg-blue-500'
    },
    {
      title: 'Indicadores',
      description: 'Visualiza métricas y estadísticas de participación',
      icon: BarChart3,
      href: '/indicators',
      color: 'bg-green-500'
    },
    {
      title: 'Asistencia',
      description: 'Gestiona la asistencia a actividades y eventos',
      icon: UserCheck,
      href: '/attendance',
      color: 'bg-purple-500'
    },
    {
      title: 'Base de Datos',
      description: 'Explora y gestiona los datos de participantes',
      icon: Database,
      href: '/database',
      color: 'bg-teal-500'
    },
    {
      title: 'Archivos',
      description: 'Administra archivos subidos y descargas',
      icon: FolderOpen,
      href: '/files',
      color: 'bg-orange-500'
    },
    {
      title: 'Administración',
      description: 'Configuración y herramientas administrativas',
      icon: Settings,
      href: '/admin',
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Brand */}
      <div className="w-full">
        <div className="w-full h-1 bg-brand-red"></div>
        <div className="py-6 bg-white">
          <img
            src="/assets/logo-finis.png"
            alt="Finis Terrae"
            className="h-14 mx-auto my-3 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const placeholder = document.createElement('div');
              placeholder.className = 'h-14 w-32 mx-auto bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500';
              placeholder.textContent = 'LOGO';
              e.currentTarget.parentNode?.appendChild(placeholder);
            }}
          />
        </div>
        <div className="w-full bg-brand-teal text-white py-3 text-center">
          <h1 className="text-lg font-semibold uppercase tracking-wide">
            PLATAFORMA DE GESTIÓN DE REGISTROS | PASTORAL
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Bienvenido a la Plataforma de Gestión
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Administra eficientemente los registros de participantes, analiza datos de actividades
            pastorales y obtén insights valiosos sobre la participación en eventos.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                to={feature.href}
                className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-lg hover:border-brand-teal transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.color} text-white mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-brand-teal transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Funcionalidades Principales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-teal rounded-full mb-4">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Datos</h4>
              <p className="text-gray-600">
                Sube y procesa archivos CSV con mapeo inteligente de columnas
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-teal rounded-full mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Análisis Avanzado</h4>
              <p className="text-gray-600">
                Visualiza tendencias y métricas de participación en tiempo real
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-teal rounded-full mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Control Completo</h4>
              <p className="text-gray-600">
                Administra participantes, actividades y genera reportes detallados
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 flex items-center justify-center gap-2">
            <Heart className="h-4 w-4" />
            Desarrollado con cariño para la Pastoral Finis Terrae
            <Heart className="h-4 w-4" />
          </p>
        </div>
      </div>
    </div>
  );
}
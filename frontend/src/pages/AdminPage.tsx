import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CatalogManagement from '@/components/CatalogManagement';
import DataQualityModule from '@/components/DataQualityModule';
import UserManagement from '@/components/UserManagement';
import { BookOpen, FileX, Users, Settings } from 'lucide-react';

export default function AdminPage() {
  const [showCatalogManagement, setShowCatalogManagement] = useState(false);
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  if (showCatalogManagement) {
    return <CatalogManagement onClose={() => setShowCatalogManagement(false)} />;
  }

  if (showDataQuality) {
    return <DataQualityModule />;
  }

  if (showUserManagement) {
    return <UserManagement onClose={() => setShowUserManagement(false)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Administración</h1>
        <p className="text-muted-foreground">
          Herramientas administrativas para gestión de usuarios, catálogos y calidad de datos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Gestión de Usuarios</span>
            </CardTitle>
            <CardDescription>
              Administrar usuarios del sistema, roles y permisos de acceso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowUserManagement(true)} className="w-full">
              Gestionar Usuarios
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <span>Gestión de Catálogos</span>
            </CardTitle>
            <CardDescription>
              Administrar vocabularios controlados: líneas estratégicas, actividades y carreras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCatalogManagement(true)} className="w-full">
              Gestionar Catálogos
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileX className="h-5 w-5 text-orange-600" />
              <span>Calidad de Datos</span>
            </CardTitle>
            <CardDescription>
              Monitorear errores de validación y métricas de calidad de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowDataQuality(true)} className="w-full">
              Ver Calidad de Datos
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <span>Otros Módulos</span>
            </CardTitle>
            <CardDescription>
              Herramientas administrativas adicionales disponibles en otros módulos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start space-x-2">
                <span className="font-medium text-gray-700 min-w-[140px]">Base de Datos:</span>
                <span>Edición de registros, gestión de asistencia y búsqueda de duplicados</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-gray-700 min-w-[140px]">Archivos:</span>
                <span>Historial de cargas CSV y gestión de archivos</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-medium text-gray-700 min-w-[140px]">Carga:</span>
                <span>Importación de nuevos registros desde archivos CSV</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
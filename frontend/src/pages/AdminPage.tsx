import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CatalogManagement from '@/components/CatalogManagement';
import DataQualityModule from '@/components/DataQualityModule';
import { BookOpen, Settings, Upload, AlertTriangle, Database, FileX } from 'lucide-react';

export default function AdminPage() {
  const [showCatalogManagement, setShowCatalogManagement] = useState(false);
  const [showDataQuality, setShowDataQuality] = useState(false);

  if (showCatalogManagement) {
    return <CatalogManagement onClose={() => setShowCatalogManagement(false)} />;
  }

  if (showDataQuality) {
    return <DataQualityModule />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">
          Administrative tools for data management and bulk operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Catalog Management</span>
            </CardTitle>
            <CardDescription>
              Manage controlled vocabularies for strategic lines, activities, and careers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCatalogManagement(true)} className="w-full">
              Abrir Gestión de Catálogos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Editing</span>
            </CardTitle>
            <CardDescription>
              Edit registrant information and manage attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Database editing tools will be implemented here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Bulk Operations</span>
            </CardTitle>
            <CardDescription>
              Perform bulk updates and data management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bulk operations tools will be implemented here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload History</span>
            </CardTitle>
            <CardDescription>
              View and manage CSV upload history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Upload history will be displayed here</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileX className="h-5 w-5" />
              <span>Data Quality</span>
            </CardTitle>
            <CardDescription>
              Monitor validation errors and data quality metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowDataQuality(true)} className="w-full">
              Ver Calidad de Datos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Reconciliation</span>
            </CardTitle>
            <CardDescription>
              Map unknown values to catalog items during ingestion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Reconciliation tools will be implemented here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Trash2,
  FileText,
  Calendar,
  Users,
  Target,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileInfo, FileListResponse } from '@/types';

export function RecentUploads() {
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentFiles();
  }, []);

  const fetchRecentFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<FileListResponse>('/api/files/?per_page=5');
      setRecentFiles(response.data.files);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading recent files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: number, filename: string) => {
    try {
      const response = await axios.post(`/api/files/download/enriched/${fileId}`, {}, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error downloading file');
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
      return;
    }

    try {
      await axios.delete(`/api/files/${fileId}`);
      await fetchRecentFiles(); // Refresh the list
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error deleting file');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getValidationRate = (file: FileInfo) => {
    if (file.records_count === 0) return 0;
    return Math.round((file.valid_records_count / file.records_count) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subidas Recientes</CardTitle>
          <CardDescription>Últimos archivos subidos al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Cargando archivos recientes...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subidas Recientes</CardTitle>
        <CardDescription>
          Últimos archivos subidos al sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {recentFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay archivos subidos aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Información</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{file.filename}</div>
                          <div className={`text-xs ${
                            getValidationRate(file) >= 90 ? 'text-green-600' :
                            getValidationRate(file) >= 70 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {getValidationRate(file)}% validación
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{file.activity_name}</div>
                        <div className="text-muted-foreground">{file.strategic_line}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {file.year}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {file.audience === 'estudiantes' ? 'Est.' : 'Col.'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{file.records_count.toLocaleString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {file.valid_records_count} válidos
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(file.uploaded_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(file.id, file.filename)}
                          title="Descargar archivo enriquecido"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          title="Eliminar archivo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {recentFiles.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <a href="/files">Ver todos los archivos</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
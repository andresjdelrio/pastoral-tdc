import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Trash2,
  FileText,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Users,
  Target
} from 'lucide-react';
import { FileInfo, FileListResponse, ReportRequest } from '@/types';

export default function FilesPage() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [strategicLineFilter, setStrategicLineFilter] = useState('__all__');
  const [yearFilter, setYearFilter] = useState('__all__');
  const [audienceFilter, setAudienceFilter] = useState('__all__');

  // Report generation state
  const [reportRequest, setReportRequest] = useState<ReportRequest>({
    include_attendance: true,
    include_validation_errors: false,
    report_format: 'csv'
  });

  const STRATEGIC_LINES = [
    'Apostolado',
    'Sacramentos',
    'Crecimiento Espiritual',
    'Identidad y Comunidad'
  ];

  const AUDIENCES = ['estudiantes', 'colaboradores'];

  useEffect(() => {
    fetchFiles();
  }, [currentPage, searchTerm, strategicLineFilter, yearFilter, audienceFilter]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (strategicLineFilter && strategicLineFilter !== '__all__') params.append('strategic_line', strategicLineFilter);
      if (yearFilter && yearFilter !== '__all__') params.append('year', yearFilter);
      if (audienceFilter && audienceFilter !== '__all__') params.append('audience', audienceFilter);

      const response = await axios.get<FileListResponse>(`/api/files?${params}`);
      setFiles(response.data.files);
      setTotalPages(response.data.pages);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading files');
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

  const handleDelete = async (fileIds: number[]) => {
    try {
      setDeleteLoading(true);

      if (fileIds.length === 1) {
        await axios.delete(`/api/files/${fileIds[0]}`);
      } else {
        await axios.delete('/api/files/bulk', { data: fileIds });
      }

      setSelectedFiles(new Set());
      setShowDeleteDialog(false);
      await fetchFiles();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error deleting files');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);

      const response = await axios.post('/api/files/generate-report', reportRequest, {
        responseType: 'blob'
      });

      const contentType = response.headers['content-type'];
      const isExcel = contentType?.includes('spreadsheet');
      const extension = isExcel ? 'xlsx' : 'csv';
      const filename = `pastoral_report_${new Date().toISOString().split('T')[0]}.${extension}`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowReportDialog(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generating report');
    } finally {
      setReportLoading(false);
    }
  };

  const toggleFileSelection = (fileId: number) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Archivos</h1>
        <p className="text-muted-foreground">
          Administra, descarga y elimina archivos subidos y genera reportes personalizados
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Acciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar archivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={strategicLineFilter} onValueChange={setStrategicLineFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Línea estratégica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las líneas</SelectItem>
                {STRATEGIC_LINES.map(line => (
                  <SelectItem key={line} value={line}>{line}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los años</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Audiencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las audiencias</SelectItem>
                {AUDIENCES.map(audience => (
                  <SelectItem key={audience} value={audience}>
                    {audience === 'estudiantes' ? 'Estudiantes' : 'Colaboradores'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Seleccionados ({selectedFiles.size})
                </Button>
              )}
            </div>
            <Button onClick={() => setShowReportDialog(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Generar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Archivos Subidos</CardTitle>
          <CardDescription>
            {files.length} archivos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando archivos...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron archivos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllSelection}
                        className="h-8 w-8 p-0"
                      >
                        {selectedFiles.size === files.length ?
                          <CheckSquare className="h-4 w-4" /> :
                          <Square className="h-4 w-4" />
                        }
                      </Button>
                    </TableHead>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Actividad</TableHead>
                    <TableHead>Línea</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Audiencia</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Validación</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFileSelection(file.id)}
                          className="h-8 w-8 p-0"
                        >
                          {selectedFiles.has(file.id) ?
                            <CheckSquare className="h-4 w-4" /> :
                            <Square className="h-4 w-4" />
                          }
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {file.filename}
                        </div>
                      </TableCell>
                      <TableCell>{file.activity_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          {file.strategic_line}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {file.year}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {file.audience === 'estudiantes' ? 'Estudiantes' : 'Colaboradores'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{file.records_count.toLocaleString()} total</div>
                          <div className="text-muted-foreground">
                            {file.valid_records_count} válidos, {file.invalid_records_count} inválidos
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${
                          getValidationRate(file) >= 90 ? 'text-green-600' :
                          getValidationRate(file) >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {getValidationRate(file)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(file.uploaded_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(file.id, file.filename)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFiles(new Set([file.id]));
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar {selectedFiles.size === 1 ? 'este archivo' : `estos ${selectedFiles.size} archivos`}?
              Esta acción también eliminará todos los registros asociados y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(Array.from(selectedFiles))}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Generation Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Reporte</DialogTitle>
            <DialogDescription>
              Configura los parámetros del reporte a generar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Formato</label>
              <Select
                value={reportRequest.report_format}
                onValueChange={(value: 'csv' | 'excel') =>
                  setReportRequest(prev => ({ ...prev, report_format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Incluir</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="attendance"
                    checked={reportRequest.include_attendance}
                    onCheckedChange={(checked) =>
                      setReportRequest(prev => ({ ...prev, include_attendance: checked as boolean }))
                    }
                  />
                  <label htmlFor="attendance" className="text-sm">
                    Información de asistencia
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="validation"
                    checked={reportRequest.include_validation_errors}
                    onCheckedChange={(checked) =>
                      setReportRequest(prev => ({ ...prev, include_validation_errors: checked as boolean }))
                    }
                  />
                  <label htmlFor="validation" className="text-sm">
                    Errores de validación
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              disabled={reportLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={reportLoading}
            >
              {reportLoading ? 'Generando...' : 'Generar Reporte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
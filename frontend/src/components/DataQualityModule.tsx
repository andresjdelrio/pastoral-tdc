import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Search,
  Activity,
  Users,
  TrendingDown,
  TrendingUp,
  FileX,
  History,
  Filter
} from 'lucide-react';
import { PaginatedResponse } from '@/types';

interface ValidationError {
  registrant_id: number;
  full_name: string;
  upload_source: string;
  activity_name: string;
  activity_id: number;
  error_types: string[];
  validation_errors: Record<string, string>;
  created_at: string;
}

interface DataQualityStats {
  total_registrants: number;
  valid_registrants: number;
  invalid_registrants: number;
  validation_rate: number;
  error_breakdown: Record<string, number>;
}

interface AuditEntry {
  id: number;
  user_id: string;
  action: string;
  entity: string;
  entity_id: number;
  before_data: Record<string, any>;
  after_data: Record<string, any>;
  request_id: string;
  ip_address: string;
  timestamp: string;
}

interface ActivityWithErrors {
  id: number;
  name: string;
  strategic_line: string;
  year: number;
  error_count: number;
}

export default function DataQualityModule() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DataQualityStats | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [activitiesWithErrors, setActivitiesWithErrors] = useState<ActivityWithErrors[]>([]);
  const [errorTypes, setErrorTypes] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchStats();
    fetchErrorTypes();
    fetchActivitiesWithErrors();
  }, []);

  useEffect(() => {
    if (activeTab === 'validation-errors') {
      fetchValidationErrors();
    } else if (activeTab === 'audit-trail') {
      fetchAuditTrail();
    }
  }, [activeTab, errorTypeFilter, activityFilter, searchTerm, auditEntityFilter, auditActionFilter, page]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/data-quality/stats');
      setStats(response.data);
    } catch (error: any) {
      setError('Error loading data quality stats');
    }
  };

  const fetchErrorTypes = async () => {
    try {
      const response = await axios.get('/api/data-quality/error-types');
      setErrorTypes(response.data.error_types);
    } catch (error: any) {
      console.error('Error loading error types:', error);
    }
  };

  const fetchActivitiesWithErrors = async () => {
    try {
      const response = await axios.get('/api/data-quality/activities-with-errors');
      setActivitiesWithErrors(response.data.activities);
    } catch (error: any) {
      console.error('Error loading activities with errors:', error);
    }
  };

  const fetchValidationErrors = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, per_page: 20 };
      if (errorTypeFilter) params.error_type = errorTypeFilter;
      if (activityFilter) params.activity_id = activityFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get('/api/data-quality/validation-errors', { params });
      const data: PaginatedResponse<ValidationError> = response.data;
      setValidationErrors(data.items as ValidationError[]);
      setTotalPages(data.pages);
    } catch (error: any) {
      setError('Error loading validation errors');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, per_page: 20 };
      if (auditEntityFilter) params.entity = auditEntityFilter;
      if (auditActionFilter) params.action = auditActionFilter;

      const response = await axios.get('/api/data-quality/audit-trail', { params });
      const data: PaginatedResponse<AuditEntry> = response.data;
      setAuditTrail(data.items as AuditEntry[]);
      setTotalPages(data.pages);
    } catch (error: any) {
      setError('Error loading audit trail');
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorTypeBadge = (errorType: string) => {
    const colors: Record<string, string> = {
      'invalid_rut': 'bg-red-100 text-red-800',
      'invalid_email': 'bg-orange-100 text-orange-800',
      'invalid_phone': 'bg-yellow-100 text-yellow-800',
      'invalid_name': 'bg-purple-100 text-purple-800',
      'invalid_career': 'bg-blue-100 text-blue-800',
      'missing_field': 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={colors[errorType] || 'bg-gray-100 text-gray-800'}>
        {errorType.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const resetFilters = () => {
    setErrorTypeFilter('');
    setActivityFilter('');
    setSearchTerm('');
    setAuditEntityFilter('');
    setAuditActionFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calidad de Datos</h1>
        <p className="text-muted-foreground">
          Monitorea la calidad de los datos y visualiza errores de validación
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="validation-errors" className="flex items-center space-x-2">
            <FileX className="h-4 w-4" />
            <span>Errores de Validación</span>
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Auditoría</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {stats && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-500" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Registrantes</p>
                          <p className="text-2xl font-bold">{stats.total_registrants.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-green-500" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Registros Válidos</p>
                          <p className="text-2xl font-bold">{stats.valid_registrants.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingDown className="h-8 w-8 text-red-500" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Registros Inválidos</p>
                          <p className="text-2xl font-bold">{stats.invalid_registrants.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Activity className="h-8 w-8 text-purple-500" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Tasa de Validación</p>
                          <p className={`text-2xl font-bold ${
                            stats.validation_rate >= 90 ? 'text-green-600' :
                            stats.validation_rate >= 75 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {stats.validation_rate}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Error Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tipos de Errores</CardTitle>
                    <CardDescription>Distribución de errores de validación por tipo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(stats.error_breakdown).map(([errorType, count]) => (
                        <div key={errorType} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getErrorTypeBadge(errorType)}
                            <span className="font-medium">{errorType.replace('_', ' ')}</span>
                          </div>
                          <span className="text-lg font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Activities with Errors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Actividades con Errores</CardTitle>
                    <CardDescription>Actividades que tienen registros con errores de validación</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Actividad</TableHead>
                          <TableHead>Línea Estratégica</TableHead>
                          <TableHead>Año</TableHead>
                          <TableHead className="text-right">Errores</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activitiesWithErrors.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell className="font-medium">{activity.name}</TableCell>
                            <TableCell>{activity.strategic_line}</TableCell>
                            <TableCell>{activity.year}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{activity.error_count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* Validation Errors Tab */}
        <TabsContent value="validation-errors">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Errores de Validación</CardTitle>
                  <CardDescription>Registros con errores de validación de datos</CardDescription>
                </div>
                <Button variant="outline" onClick={resetFilters}>
                  <Filter className="h-4 w-4 mr-2" />
                  Limpiar Filtros
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo de Error</label>
                    <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos los tipos</SelectItem>
                        {errorTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Actividad</label>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las actividades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas las actividades</SelectItem>
                        {activitiesWithErrors.map((activity) => (
                          <SelectItem key={activity.id} value={activity.id.toString()}>
                            {activity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Buscar</label>
                    <Input
                      placeholder="Buscar por nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Validation Errors Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Tipos de Error</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : validationErrors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No se encontraron errores de validación
                        </TableCell>
                      </TableRow>
                    ) : (
                      validationErrors.map((error) => (
                        <TableRow key={error.registrant_id}>
                          <TableCell className="font-medium">{error.full_name}</TableCell>
                          <TableCell>{error.activity_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {error.error_types.map((type) => getErrorTypeBadge(type))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {Object.entries(error.validation_errors).map(([field, errorMsg]) => (
                                <div key={field} className="text-xs text-red-600">
                                  <strong>{field}:</strong> {errorMsg}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{formatTimestamp(error.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-3">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit-trail">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Auditoría</CardTitle>
              <CardDescription>Historial de cambios y acciones del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Audit Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Entidad</label>
                    <Select value={auditEntityFilter} onValueChange={setAuditEntityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las entidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas las entidades</SelectItem>
                        <SelectItem value="registration">Registros</SelectItem>
                        <SelectItem value="registrant">Registrantes</SelectItem>
                        <SelectItem value="activity">Actividades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Acción</label>
                    <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las acciones" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todas las acciones</SelectItem>
                        <SelectItem value="toggle_attendance">Cambio de Asistencia</SelectItem>
                        <SelectItem value="create">Crear</SelectItem>
                        <SelectItem value="update">Actualizar</SelectItem>
                        <SelectItem value="delete">Eliminar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Audit Trail Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                        </TableRow>
                      ))
                    ) : auditTrail.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No se encontraron registros de auditoría
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditTrail.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.user_id || 'Sistema'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {entry.action}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.entity}</TableCell>
                          <TableCell>{entry.entity_id}</TableCell>
                          <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-3">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
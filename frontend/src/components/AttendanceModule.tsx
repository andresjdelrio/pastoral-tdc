import React, { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import {
  ActivitySummary,
  RegistrationDetail,
  PaginatedResponse,
  WalkInRequest,
  WalkInResponse
} from '@/types';

interface AttendanceFilters {
  activityId: number | null;
  onlyPending: boolean;
  audience: string | null;
  year: number | null;
  strategicLine: string | null;
  search: string;
}

export default function AttendanceModule() {
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivitySummary | null>(null);
  const [filters, setFilters] = useState<AttendanceFilters>({
    activityId: null,
    onlyPending: false,
    audience: null,
    year: null,
    strategicLine: null,
    search: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInData, setWalkInData] = useState<WalkInRequest>({
    full_name: '',
    rut: '',
    university_email: '',
    career_or_area: '',
    person_type: undefined
  });
  const [walkInErrors, setWalkInErrors] = useState<string[]>([]);
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);

  // Activity search state
  const [activitySearch, setActivitySearch] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [filters.year, filters.strategicLine, activitySearch]);

  useEffect(() => {
    if (filters.activityId) {
      fetchRegistrations();
    }
  }, [filters, page]);

  const fetchActivities = async () => {
    try {
      const params: any = {
        q: activitySearch,
        per_page: 100
      };
      if (filters.year && filters.year !== 'all') params.year = filters.year;
      if (filters.strategicLine && filters.strategicLine !== 'all') params.strategic_line = filters.strategicLine;

      const response = await axios.get('/api/activities', { params });
      setActivities(response.data.items);
    } catch (error: any) {
      setError('Error loading activities');
    }
  };

  const fetchRegistrations = async () => {
    if (!filters.activityId) return;

    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        q: filters.search,
        only_pending: filters.onlyPending,
        page,
        per_page: 50
      };
      if (filters.audience && filters.audience !== 'all') params.audience = filters.audience;

      const response = await axios.get(`/api/activities/${filters.activityId}/registrations`, { params });

      const data: PaginatedResponse<RegistrationDetail> = response.data;
      setRegistrations(data.items);
      setTotalPages(data.pages);
    } catch (error: any) {
      setError('Error loading registrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivitySelect = (activityId: string) => {
    const activity = activities.find(a => a.id.toString() === activityId);
    setSelectedActivity(activity || null);
    setFilters(prev => ({ ...prev, activityId: parseInt(activityId) }));
    setPage(1);
  };

  const toggleAttendance = async (registrationId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'attended' ? 'registered' : 'attended';

    try {
      // Optimistic update
      setRegistrations(prev =>
        prev.map(reg =>
          reg.registration_id === registrationId
            ? { ...reg, participation_status: newStatus }
            : reg
        )
      );

      await axios.patch(`/api/registrations/${registrationId}`, {
        participation_status: newStatus
      });

      // Refresh activity counts
      fetchActivities();
    } catch (error: any) {
      // Rollback on error
      setRegistrations(prev =>
        prev.map(reg =>
          reg.registration_id === registrationId
            ? { ...reg, participation_status: currentStatus }
            : reg
        )
      );
      setError('Error updating attendance');
    }
  };

  const handleWalkInSubmit = async () => {
    if (!filters.activityId || !walkInData.full_name.trim()) {
      return;
    }

    try {
      setIsSubmittingWalkIn(true);
      setWalkInErrors([]);

      const response = await axios.post(`/api/activities/${filters.activityId}/walkins`, walkInData);
      const newRegistration: WalkInResponse = response.data;

      // Add to current registrations if we're viewing the same activity
      const registrationDetail: RegistrationDetail = {
        registration_id: newRegistration.registration_id,
        registrant_id: newRegistration.registrant_id,
        full_name: newRegistration.full_name,
        email: newRegistration.email,
        rut: newRegistration.rut,
        career_or_area: newRegistration.career_or_area,
        person_type: newRegistration.person_type,
        participation_status: newRegistration.participation_status,
        source: newRegistration.source,
        registered_at: new Date().toISOString()
      };

      setRegistrations(prev => [registrationDetail, ...prev]);

      // Show validation errors if any
      if (newRegistration.validation_errors?.length) {
        setWalkInErrors(newRegistration.validation_errors);
      }

      // Reset form and close modal
      setWalkInData({
        full_name: '',
        rut: '',
        university_email: '',
        career_or_area: '',
        person_type: undefined
      });
      setShowWalkInModal(false);

      // Refresh activity counts
      fetchActivities();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error creating walk-in');
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, registrationId: number, currentStatus: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleAttendance(registrationId, currentStatus);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attended':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Asistió</Badge>;
      case 'no_show':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />No asistió</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Registrado</Badge>;
    }
  };

  const getPersonTypeBadge = (type: string) => {
    return type === 'student' ?
      <Badge variant="outline">Estudiante</Badge> :
      <Badge variant="outline">Colaborador</Badge>;
  };

  const filteredActivities = activities.filter(activity =>
    activity.name.toLowerCase().includes(activitySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Asistencia</h1>
        <p className="text-muted-foreground">
          Controla la asistencia a eventos y registra participantes de walk-in
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Filters */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Filtros</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Activity Selector */}
              <div>
                <label className="text-sm font-medium">Actividad</label>
                <Input
                  placeholder="Buscar actividad..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  className="mb-2"
                />
                <Select onValueChange={handleActivitySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar actividad" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredActivities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id.toString()}>
                        <div className="flex justify-between items-center w-full">
                          <span className="truncate">{activity.name}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            {activity.attended_count}/{activity.registrations_count}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="text-sm font-medium">Año</label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, year: value === 'all' ? null : (value ? parseInt(value) : null) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los años" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Strategic Line Filter */}
              <div>
                <label className="text-sm font-medium">Línea Estratégica</label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, strategicLine: value === 'all' ? null : (value || null) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las líneas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las líneas</SelectItem>
                    <SelectItem value="Apostolado">Apostolado</SelectItem>
                    <SelectItem value="Sacramentos">Sacramentos</SelectItem>
                    <SelectItem value="Crecimiento Espiritual">Crecimiento Espiritual</SelectItem>
                    <SelectItem value="Identidad y Comunidad">Identidad y Comunidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Registrations */}
              <div>
                <label className="text-sm font-medium">Buscar Persona</label>
                <Input
                  placeholder="Nombre, RUT, email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              {/* Audience Filter */}
              <div>
                <label className="text-sm font-medium">Audiencia</label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, audience: value === 'all' ? null : (value || null) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="estudiantes">Estudiantes</SelectItem>
                    <SelectItem value="colaboradores">Colaboradores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Only Pending Filter */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="onlyPending"
                  checked={filters.onlyPending}
                  onChange={(e) => setFilters(prev => ({ ...prev, onlyPending: e.target.checked }))}
                />
                <label htmlFor="onlyPending" className="text-sm">Solo pendientes</label>
              </div>

              {selectedActivity && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900">{selectedActivity.name}</h4>
                  <p className="text-sm text-blue-700">{selectedActivity.strategic_line} - {selectedActivity.year}</p>
                  <div className="flex justify-between mt-2 text-sm">
                    <span>Asistieron: {selectedActivity.attended_count}</span>
                    <span>Total: {selectedActivity.registrations_count}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Registration Table */}
        <div className="lg:col-span-3">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedActivity ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Registros - {selectedActivity.name}</span>
                    </CardTitle>
                    <CardDescription>
                      {registrations.length} registros mostrados
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowWalkInModal(true)} className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Agregar Walk-in</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>RUT</TableHead>
                        <TableHead>Carrera</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Asistencia</TableHead>
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
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                            <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        registrations.map((registration) => (
                          <TableRow
                            key={registration.registration_id}
                            className="cursor-pointer hover:bg-gray-50"
                            tabIndex={0}
                            onKeyDown={(e) => handleKeyPress(e, registration.registration_id, registration.participation_status)}
                          >
                            <TableCell className="font-medium">{registration.full_name}</TableCell>
                            <TableCell>{registration.email || '-'}</TableCell>
                            <TableCell>{registration.rut || '-'}</TableCell>
                            <TableCell>{registration.career_or_area || '-'}</TableCell>
                            <TableCell>{getPersonTypeBadge(registration.person_type)}</TableCell>
                            <TableCell>{getStatusBadge(registration.participation_status)}</TableCell>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={registration.participation_status === 'attended'}
                                onChange={() => toggleAttendance(registration.registration_id, registration.participation_status)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

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
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una Actividad</h3>
                <p className="text-gray-500">
                  Elige una actividad del panel lateral para ver y gestionar la asistencia
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Walk-in Modal */}
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Agregar Walk-in</span>
            </DialogTitle>
            <DialogDescription>
              Registra a una persona que asiste sin registro previo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre Completo *</label>
              <Input
                value={walkInData.full_name}
                onChange={(e) => setWalkInData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>

            <div>
              <label className="text-sm font-medium">RUT</label>
              <Input
                value={walkInData.rut}
                onChange={(e) => setWalkInData(prev => ({ ...prev, rut: e.target.value }))}
                placeholder="12.345.678-9"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email Universitario</label>
              <Input
                type="email"
                value={walkInData.university_email}
                onChange={(e) => setWalkInData(prev => ({ ...prev, university_email: e.target.value }))}
                placeholder="usuario@universidad.cl"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Carrera/Área</label>
              <Input
                value={walkInData.career_or_area}
                onChange={(e) => setWalkInData(prev => ({ ...prev, career_or_area: e.target.value }))}
                placeholder="Carrera o área de trabajo"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tipo de Persona</label>
              <Select onValueChange={(value) => setWalkInData(prev => ({ ...prev, person_type: value as 'student' | 'collab' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Detectar automáticamente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Estudiante</SelectItem>
                  <SelectItem value="collab">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {walkInErrors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Errores de validación:</strong></p>
                    {walkInErrors.map((error, idx) => (
                      <p key={idx} className="text-sm">• {error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWalkInModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleWalkInSubmit}
              disabled={!walkInData.full_name.trim() || isSubmittingWalkIn}
            >
              {isSubmittingWalkIn ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
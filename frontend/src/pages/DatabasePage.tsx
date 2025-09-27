import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, Search, Filter, ChevronLeft, ChevronRight, Database, Users, Trash2, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';

interface DatabaseFilters {
  audience: string;
  year: string;
  activity: string;
  search: string;
}

interface RegistrationRecord {
  registration_id: number;
  registrant_id: number;
  full_name: string;
  rut: string;
  university_email: string;
  career: string;
  phone: string;
  activity_name: string;
  strategic_line: string;
  year: number;
  audience: string;
  participation_status: string;
  source: string;
  registered_at: string;
}

interface Activity {
  id: number;
  name: string;
  strategic_line: string;
  year: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

interface EditModalProps {
  registration: RegistrationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRegistration: RegistrationRecord) => void;
}

interface DeleteConfirmationProps {
  registration: RegistrationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function EditModal({ registration, isOpen, onClose, onSave }: EditModalProps) {
  const [formData, setFormData] = useState<Partial<RegistrationRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (registration) {
      setFormData(registration);
    }
  }, [registration]);

  const handleSave = async () => {
    if (!registration || !formData) return;

    setIsSaving(true);
    try {
      const response = await axios.put(`/api/database/registrants/${registration.registrant_id}`, {
        full_name: formData.full_name,
        rut: formData.rut,
        university_email: formData.university_email,
        career: formData.career,
        phone: formData.phone
      });

      onSave(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating registration:', error);
      alert('Error updating registration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Registration</DialogTitle>
          <DialogDescription>
            Update the registrant's information. Changes will be logged for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="full_name" className="text-right">
              Name
            </Label>
            <Input
              id="full_name"
              value={formData.full_name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rut" className="text-right">
              RUT
            </Label>
            <Input
              id="rut"
              value={formData.rut || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="university_email" className="text-right">
              Email
            </Label>
            <Input
              id="university_email"
              value={formData.university_email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, university_email: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="career" className="text-right">
              Career
            </Label>
            <Input
              id="career"
              value={formData.career || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, career: e.target.value }))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmationDialog({ registration, isOpen, onClose, onConfirm, isDeleting }: DeleteConfirmationProps) {
  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Deletion
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this registration? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div><strong>Name:</strong> {registration.full_name}</div>
            <div><strong>RUT:</strong> {registration.rut}</div>
            <div><strong>Email:</strong> {registration.university_email}</div>
            <div><strong>Activity:</strong> {registration.activity_name}</div>
            <div><strong>Year:</strong> {registration.year}</div>
          </div>
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Warning</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              This will permanently delete this registration record from the database.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Registration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DatabasePage() {
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRegistration, setEditingRegistration] = useState<RegistrationRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingRegistration, setDeletingRegistration] = useState<RegistrationRecord | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filters, setFilters] = useState<DatabaseFilters>({
    audience: 'all',
    year: 'all',
    activity: 'all',
    search: ''
  });

  const perPage = 50;

  const fetchActivities = async () => {
    try {
      const response = await axios.get<PaginatedResponse<Activity>>('/api/activities/', {
        params: { per_page: 100 }
      });
      setActivities(response.data.items);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        per_page: perPage
      };

      if (filters.search) params.q = filters.search;
      if (filters.year && filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.audience && filters.audience !== 'all') params.audience = filters.audience;
      if (filters.activity && filters.activity !== 'all') params.activity_id = parseInt(filters.activity);

      const response = await axios.get<PaginatedResponse<RegistrationRecord>>('/api/database/', {
        params
      });

      setRegistrations(response.data.items);
      setTotalItems(response.data.total);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [currentPage, filters]);

  const handleFilterChange = (key: keyof DatabaseFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const generateCSV = (data: any[], format: string) => {
    if (data.length === 0) return 'No data available';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item =>
      Object.values(item).map(value =>
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    ).join('\n');

    return `${headers}\n${rows}`;
  };

  const clearFilters = () => {
    setFilters({
      audience: 'all',
      year: 'all',
      activity: 'all',
      search: ''
    });
    setCurrentPage(1);
  };

  const handleEdit = (registration: RegistrationRecord) => {
    setEditingRegistration(registration);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedRegistration: RegistrationRecord) => {
    setRegistrations(prev =>
      prev.map(reg =>
        reg.registrant_id === updatedRegistration.registrant_id
          ? updatedRegistration
          : reg
      )
    );
  };

  const handleDelete = (registration: RegistrationRecord) => {
    setDeletingRegistration(registration);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRegistration) return;

    setIsDeleting(true);
    try {
      await axios.delete(`/api/database/registrations/${deletingRegistration.registration_id}`);

      // Remove the deleted registration from the local state
      setRegistrations(prev =>
        prev.filter(reg => reg.registration_id !== deletingRegistration.registration_id)
      );

      // Update total count
      setTotalItems(prev => prev - 1);

      // Close the modal
      setIsDeleteModalOpen(false);
      setDeletingRegistration(null);

      // Show success message (you could use a toast library here)
      alert('Registration deleted successfully');

    } catch (error) {
      console.error('Error deleting registration:', error);
      alert('Error deleting registration. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const params: any = {};
      if (filters.search) params.q = filters.search;
      if (filters.audience && filters.audience !== 'all') params.audience = filters.audience;
      if (filters.year && filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.activity && filters.activity !== 'all') params.activity_id = parseInt(filters.activity);

      // Get current data and export as CSV
      const csvContent = generateCSV(registrations, format);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `registrations_database.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const uniqueYears = Array.from(new Set(activities.map(a => a.year))).sort((a, b) => b - a);

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
            DIRECCIÓN DE PASTORAL | BASE DE DATOS
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center">
          <p className="text-gray-700 text-lg">
            Busca, filtra y gestiona los datos de registros de participantes
          </p>
        </div>

        <Tabs defaultValue="registrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white rounded-2xl shadow-sm border">
            <TabsTrigger value="registrations" className="flex items-center gap-2 data-[state=active]:bg-brand-teal data-[state=active]:text-white">
              <Database className="h-4 w-4" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="name-review" className="flex items-center gap-2 data-[state=active]:bg-brand-teal data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              Name Review
            </TabsTrigger>
          </TabsList>

        <TabsContent value="registrations" className="space-y-6">

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-brand-teal" />
                <h3 className="text-lg font-semibold text-brand-text">Filtros</h3>
              </div>
              <p className="text-gray-600 mt-2">
                Usa estos filtros para buscar y filtrar los datos de registro
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search name, RUT, email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select value={filters.audience} onValueChange={(value) => handleFilterChange('audience', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="estudiantes">Estudiantes</SelectItem>
                  <SelectItem value="colaboradores">Colaboradores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {uniqueYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity">Activity</Label>
              <Select value={filters.activity} onValueChange={(value) => handleFilterChange('activity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All activities</SelectItem>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id.toString()}>
                      {activity.name} ({activity.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
                >
                  Clear Filters
                </Button>
              </div>
              </div>
            </div>
          </div>

      {/* Export and Stats */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {registrations.length} of {totalItems} registrations
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('csv')} className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('xlsx')} className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white">
              <Download className="h-4 w-4 mr-2" />
              Export XLSX
            </Button>
        </div>
      </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-brand-teal hover:bg-brand-teal">
                    <TableHead className="text-white font-bold">Name</TableHead>
                    <TableHead className="text-white font-bold">RUT</TableHead>
                    <TableHead className="text-white font-bold">Email</TableHead>
                    <TableHead className="text-white font-bold">Career</TableHead>
                    <TableHead className="text-white font-bold">Phone</TableHead>
                    <TableHead className="text-white font-bold">Activity</TableHead>
                    <TableHead className="text-white font-bold">Strategic Line</TableHead>
                    <TableHead className="text-white font-bold">Year</TableHead>
                    <TableHead className="text-white font-bold">Audience</TableHead>
                    <TableHead className="text-white font-bold">Status</TableHead>
                    <TableHead className="text-white font-bold">Source</TableHead>
                    <TableHead className="text-white font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      Loading registrations...
                    </TableCell>
                  </TableRow>
                ) : registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      No registrations found with current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  registrations.map((registration) => (
                    <TableRow key={registration.registration_id}>
                      <TableCell className="font-medium">{registration.full_name}</TableCell>
                      <TableCell>{registration.rut}</TableCell>
                      <TableCell>{registration.university_email}</TableCell>
                      <TableCell>{registration.career}</TableCell>
                      <TableCell>{registration.phone || '-'}</TableCell>
                      <TableCell>{registration.activity_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{registration.strategic_line}</Badge>
                      </TableCell>
                      <TableCell>{registration.year}</TableCell>
                      <TableCell>
                        <Badge variant={registration.audience === 'estudiantes' ? 'default' : 'secondary'}>
                          {registration.audience}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={registration.participation_status === 'attended' ? 'default' : 'outline'}
                        >
                          {registration.participation_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{registration.source}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(registration)}
                            title="Edit registration"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(registration)}
                            title="Delete registration"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </div>
          </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
        </div>
      )}

        </TabsContent>

        <TabsContent value="name-review">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium">Name Review</h3>
            <p className="text-muted-foreground">Name review functionality temporarily disabled</p>
          </div>
          </TabsContent>

        </Tabs>

        <EditModal
          registration={editingRegistration}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRegistration(null);
          }}
          onSave={handleSaveEdit}
        />

        <DeleteConfirmationDialog
          registration={deletingRegistration}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingRegistration(null);
          }}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
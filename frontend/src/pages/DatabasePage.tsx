import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, Search, Filter, ChevronLeft, ChevronRight, Database, Users } from 'lucide-react';
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

export default function DatabasePage() {
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRegistration, setEditingRegistration] = useState<RegistrationRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      if (filters.audience && filters.audience !== 'all') params.strategic_line = filters.audience;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Database</h1>
        <p className="text-muted-foreground">
          Search, filter, and manage registration data
        </p>
      </div>

      <Tabs defaultValue="registrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registrations" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Registrations
          </TabsTrigger>
          <TabsTrigger value="name-review" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Name Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="space-y-6">

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Use these filters to narrow down the registration data
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export and Stats */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {registrations.length} of {totalItems} registrations
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('xlsx')}>
            <Download className="h-4 w-4 mr-2" />
            Export XLSX
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Career</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Strategic Line</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(registration)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
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
    </div>
  );
}
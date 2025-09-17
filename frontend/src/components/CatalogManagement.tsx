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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  Check,
  X,
  BookOpen,
  Target,
  GraduationCap
} from 'lucide-react';
import {
  CatalogStrategicLine,
  CatalogActivity,
  CatalogCareer,
  CatalogStrategicLineCreate,
  CatalogActivityCreate,
  CatalogCareerCreate,
  PaginatedResponse
} from '@/types';

interface CatalogManagementProps {
  onClose?: () => void;
}

type CatalogType = 'strategic_lines' | 'activities' | 'careers';

interface FormData {
  name: string;
  strategic_line_id?: number;
  active: boolean;
}

export default function CatalogManagement({ onClose }: CatalogManagementProps) {
  const [activeTab, setActiveTab] = useState<CatalogType>('strategic_lines');
  const [strategicLines, setStrategicLines] = useState<CatalogStrategicLine[]>([]);
  const [activities, setActivities] = useState<CatalogActivity[]>([]);
  const [careers, setCareers] = useState<CatalogCareer[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    strategic_line_id: undefined,
    active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, showActiveOnly, searchTerm]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        active_only: showActiveOnly,
        q: searchTerm || undefined,
        per_page: 100
      };

      let response;
      switch (activeTab) {
        case 'strategic_lines':
          response = await axios.get('/api/catalog/strategic-lines', {
            params,
            headers: { Authorization: 'Bearer admin' }
          });
          setStrategicLines(response.data.items);
          break;
        case 'activities':
          response = await axios.get('/api/catalog/activities', {
            params,
            headers: { Authorization: 'Bearer admin' }
          });
          setActivities(response.data.items);
          break;
        case 'careers':
          response = await axios.get('/api/catalog/careers', {
            params,
            headers: { Authorization: 'Bearer admin' }
          });
          setCareers(response.data.items);
          break;
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      strategic_line_id: undefined,
      active: true
    });
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      strategic_line_id: item.strategic_line_id,
      active: item.active
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const headers = { Authorization: 'Bearer admin' };
      let endpoint = '';
      let data: any = {
        name: formData.name.trim(),
        active: formData.active
      };

      if (activeTab === 'activities' && formData.strategic_line_id) {
        data.strategic_line_id = formData.strategic_line_id;
      }

      if (editingItem) {
        // Update
        switch (activeTab) {
          case 'strategic_lines':
            endpoint = `/api/catalog/strategic-lines/${editingItem.id}`;
            break;
          case 'activities':
            endpoint = `/api/catalog/activities/${editingItem.id}`;
            break;
          case 'careers':
            endpoint = `/api/catalog/careers/${editingItem.id}`;
            break;
        }
        await axios.put(endpoint, data, { headers });
      } else {
        // Create
        switch (activeTab) {
          case 'strategic_lines':
            endpoint = '/api/catalog/strategic-lines';
            break;
          case 'activities':
            endpoint = '/api/catalog/activities';
            break;
          case 'careers':
            endpoint = '/api/catalog/careers';
            break;
        }
        await axios.post(endpoint, data, { headers });
      }

      setShowForm(false);
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error saving item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`¿Estás seguro de eliminar "${item.name}"?`)) return;

    try {
      setError(null);
      const headers = { Authorization: 'Bearer admin' };
      let endpoint = '';

      switch (activeTab) {
        case 'strategic_lines':
          endpoint = `/api/catalog/strategic-lines/${item.id}`;
          break;
        case 'activities':
          endpoint = `/api/catalog/activities/${item.id}`;
          break;
        case 'careers':
          endpoint = `/api/catalog/careers/${item.id}`;
          break;
      }

      await axios.delete(endpoint, { headers });
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error deleting item');
    }
  };

  const renderTable = () => {
    let data: any[] = [];
    let columns: string[] = [];

    switch (activeTab) {
      case 'strategic_lines':
        data = strategicLines;
        columns = ['Nombre', 'Estado', 'Creado', 'Acciones'];
        break;
      case 'activities':
        data = activities;
        columns = ['Nombre', 'Línea Estratégica', 'Estado', 'Creado', 'Acciones'];
        break;
      case 'careers':
        data = careers;
        columns = ['Nombre', 'Estado', 'Creado', 'Acciones'];
        break;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8">
                No se encontraron elementos
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {activeTab === 'activities' && (
                  <TableCell>{item.strategic_line_name}</TableCell>
                )}
                <TableCell>
                  <Badge variant={item.active ? 'default' : 'outline'}>
                    {item.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(item.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(item)}
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
    );
  };

  const getTabIcon = (tab: CatalogType) => {
    switch (tab) {
      case 'strategic_lines':
        return <Target className="h-4 w-4" />;
      case 'activities':
        return <BookOpen className="h-4 w-4" />;
      case 'careers':
        return <GraduationCap className="h-4 w-4" />;
    }
  };

  const getTabLabel = (tab: CatalogType) => {
    switch (tab) {
      case 'strategic_lines':
        return 'Líneas Estratégicas';
      case 'activities':
        return 'Actividades';
      case 'careers':
        return 'Carreras';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Catálogos</h2>
          <p className="text-muted-foreground">
            Administra los vocabularios controlados del sistema
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Catálogos</CardTitle>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </div>
          <CardDescription>
            Gestiona los elementos de cada catálogo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activeOnly"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                />
                <label htmlFor="activeOnly" className="text-sm">Solo activos</label>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CatalogType)}>
              <TabsList className="grid w-full grid-cols-3">
                {(['strategic_lines', 'activities', 'careers'] as CatalogType[]).map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="flex items-center space-x-2">
                    {getTabIcon(tab)}
                    <span>{getTabLabel(tab)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {(['strategic_lines', 'activities', 'careers'] as CatalogType[]).map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {renderTable()}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar' : 'Crear'} {getTabLabel(activeTab).slice(0, -1)}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Modifica' : 'Agrega'} un elemento al catálogo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del elemento"
              />
            </div>

            {activeTab === 'activities' && (
              <div>
                <label className="text-sm font-medium">Línea Estratégica</label>
                <Select
                  value={formData.strategic_line_id?.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, strategic_line_id: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar línea estratégica" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategicLines
                      .filter(sl => sl.active)
                      .map((strategicLine) => (
                        <SelectItem key={strategicLine.id} value={strategicLine.id.toString()}>
                          {strategicLine.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
              />
              <label htmlFor="active" className="text-sm">Activo</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isSubmitting || (activeTab === 'activities' && !formData.strategic_line_id)}
            >
              {isSubmitting ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
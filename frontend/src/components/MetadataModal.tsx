import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, Target, Activity, Users } from 'lucide-react';
import { UploadMetadata } from '@/types';

interface MetadataSuggestions {
  strategic_lines: string[];
  activities: string[];
}

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (metadata: UploadMetadata) => void;
  isLoading?: boolean;
}

const STRATEGIC_LINES = [
  'Apostolado',
  'Sacramentos',
  'Crecimiento Espiritual',
  'Identidad y Comunidad'
];

export function MetadataModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: MetadataModalProps) {
  const [metadata, setMetadata] = useState<UploadMetadata>({
    strategic_line: '',
    activity: '',
    year: new Date().getFullYear(),
    audience: 'estudiantes'
  });

  const [suggestions, setSuggestions] = useState<MetadataSuggestions>({
    strategic_lines: [],
    activities: []
  });

  const [error, setError] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load autocomplete suggestions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await axios.get('/api/meta/suggestions');
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Use fallback data if API fails
      setSuggestions({
        strategic_lines: STRATEGIC_LINES,
        activities: []
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!metadata.strategic_line || !metadata.activity || !metadata.year || !metadata.audience) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (metadata.year < 2020 || metadata.year > 2030) {
      setError('El año debe estar entre 2020 y 2030');
      return;
    }

    setError(null);
    onConfirm(metadata);
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  const isFormValid = metadata.strategic_line && metadata.activity && metadata.year && metadata.audience;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Información del Evento</DialogTitle>
          <DialogDescription>
            Proporciona los metadatos que se aplicarán a todos los registros del CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Strategic Line */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium">
              <Target className="h-4 w-4" />
              <span>Línea Estratégica *</span>
            </label>
            <Select
              value={metadata.strategic_line || undefined}
              onValueChange={(value) => setMetadata(prev => ({ ...prev, strategic_line: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar línea estratégica..." />
              </SelectTrigger>
              <SelectContent>
                {(suggestions.strategic_lines.length > 0 ? suggestions.strategic_lines : STRATEGIC_LINES)
                  .filter(line => line && line.trim() !== '') // Filter out empty strings
                  .map(line => (
                    <SelectItem key={line} value={line}>
                      {line}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium">
              <Activity className="h-4 w-4" />
              <span>Actividad *</span>
            </label>
            <div className="relative">
              <Input
                value={metadata.activity}
                onChange={(e) => setMetadata(prev => ({ ...prev, activity: e.target.value }))}
                placeholder="Nombre de la actividad"
                disabled={isLoading}
                list="activity-suggestions"
              />
              <datalist id="activity-suggestions">
                {suggestions.activities
                  .filter(activity => activity && activity.trim() !== '') // Filter out empty strings
                  .map(activity => (
                    <option key={activity} value={activity} />
                  ))}
              </datalist>
            </div>
            {suggestions.activities.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sugerencias disponibles basadas en actividades anteriores
              </p>
            )}
          </div>

          {/* Year */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              <span>Año *</span>
            </label>
            <Input
              type="number"
              value={metadata.year}
              onChange={(e) => setMetadata(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
              min="2020"
              max="2030"
              disabled={isLoading}
            />
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              <span>Audiencia *</span>
            </label>
            <Select
              value={metadata.audience}
              onValueChange={(value) => setMetadata(prev => ({ ...prev, audience: value }))}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar audiencia..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estudiantes">Estudiantes</SelectItem>
                <SelectItem value="colaboradores">Colaboradores</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecciona la audiencia principal de este evento específico.
            </p>
          </div>

          {/* Loading state for suggestions */}
          {loadingSuggestions && (
            <div className="text-sm text-muted-foreground">
              Cargando sugerencias...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? 'Procesando...' : 'Confirmar y Subir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
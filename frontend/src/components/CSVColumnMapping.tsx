import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { CanonicalField, ColumnMapping, CSVPreview } from '@/types';

interface CSVColumnMappingProps {
  preview: CSVPreview;
  mappings: ColumnMapping;
  onMappingChange: (csvHeader: string, canonicalField: string | null) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const CANONICAL_FIELDS: CanonicalField[] = [
  {
    id: 'full_name',
    label: 'Nombre Completo',
    required: true,
    description: 'Nombre y apellido completo del registrante'
  },
  {
    id: 'rut',
    label: 'RUT',
    required: true,
    description: 'Cédula de identidad chilena'
  },
  {
    id: 'university_email',
    label: 'Correo Universitario',
    required: true,
    description: 'Dirección de correo electrónico institucional'
  },
  {
    id: 'career_or_area',
    label: 'Carrera o Área',
    required: true,
    description: 'Programa de estudios o área académica'
  },
  {
    id: 'phone',
    label: 'Teléfono',
    required: true,
    description: 'Número de teléfono de contacto'
  }
];

export function CSVColumnMapping({
  preview,
  mappings,
  onMappingChange,
  onConfirm,
  isLoading = false
}: CSVColumnMappingProps) {
  // Get the required fields that are mapped
  const mappedCanonicalFields = new Set(Object.values(mappings));
  const requiredFields = CANONICAL_FIELDS.filter(field => field.required);
  const missingRequiredFields = requiredFields.filter(field => !mappedCanonicalFields.has(field.id));
  const canProceed = missingRequiredFields.length === 0;

  // Get field status for each canonical field
  const getFieldStatus = (canonicalField: CanonicalField) => {
    const isMapped = mappedCanonicalFields.has(canonicalField.id);
    if (canonicalField.required) {
      return isMapped ? 'complete' : 'missing';
    }
    return isMapped ? 'complete' : 'optional';
  };

  const getFieldIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'missing':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const getFieldBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'complete':
        return 'default';
      case 'missing':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Field Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Campo Requeridos</CardTitle>
          <CardDescription>
            Asegúrate de mapear todos los campos obligatorios antes de continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CANONICAL_FIELDS.map((field) => {
              const status = getFieldStatus(field);
              return (
                <div key={field.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  {getFieldIcon(status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{field.label}</span>
                      <Badge variant={getFieldBadgeVariant(status)} size="sm">
                        {status === 'complete' ? 'Mapeado' : status === 'missing' ? 'Faltante' : 'Opcional'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {missingRequiredFields.length > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Campos faltantes:</strong> {missingRequiredFields.map(f => f.label).join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Mapeo de Columnas</CardTitle>
          <CardDescription>
            Asocia cada columna de tu CSV con los campos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Columna del CSV</TableHead>
                <TableHead>Valores de Muestra</TableHead>
                <TableHead>Mapear a Campo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.headers.map((header) => {
                const sampleValues = preview.sample_data
                  .slice(0, 3)
                  .map(row => row[header])
                  .filter(val => val && val.toString().trim())
                  .slice(0, 2);

                const currentMapping = mappings[header];
                const mappedField = CANONICAL_FIELDS.find(f => f.id === currentMapping);

                return (
                  <TableRow key={header}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {sampleValues.length > 0 ? (
                          <div>
                            {sampleValues.map((val, idx) => (
                              <div key={idx} className="truncate max-w-[200px]">
                                "{val}"
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="italic">Sin datos</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentMapping === "__ignore__" ? "__ignore__" : currentMapping || "__unmapped__"}
                        onValueChange={(value) => onMappingChange(header, value === "__unmapped__" ? null : value)}
                      >
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Seleccionar campo..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unmapped__">Sin mapear</SelectItem>
                          <SelectItem value="__ignore__">🗑️ Ignorar columna</SelectItem>
                          {CANONICAL_FIELDS.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              <div className="flex items-center space-x-2">
                                <span>{field.label}</span>
                                {field.required && (
                                  <Badge variant="outline" size="sm">Requerido</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {mappedField ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Mapeado a {mappedField.label}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 rounded-full bg-gray-200" />
                          <span className="text-sm text-muted-foreground">Sin mapear</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Vista Previa de Datos</CardTitle>
          <CardDescription>
            Primeras filas del archivo CSV ({preview.sample_data.length} de {preview.headers.length} columnas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.headers.map((header) => (
                    <TableHead key={header} className="min-w-[120px]">
                      <div>
                        <div className="font-medium">{header}</div>
                        {mappings[header] && (
                          <div className="text-xs text-muted-foreground mt-1">
                            → {CANONICAL_FIELDS.find(f => f.id === mappings[header])?.label}
                          </div>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sample_data.slice(0, 5).map((row, idx) => (
                  <TableRow key={idx}>
                    {preview.headers.map((header) => (
                      <TableCell key={header} className="max-w-[200px] truncate">
                        {row[header] || <span className="text-gray-400 italic">vacío</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end">
        <Button
          onClick={onConfirm}
          disabled={!canProceed || isLoading}
          size="lg"
        >
          {isLoading ? 'Procesando...' : 'Confirmar y Subir CSV'}
        </Button>
      </div>
    </div>
  );
}
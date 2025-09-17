import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CSVColumnMapping } from '@/components/CSVColumnMapping';
import { MetadataModal } from '@/components/MetadataModal';
import { RecentUploads } from '@/components/RecentUploads';
import { Upload, AlertCircle, CheckCircle, Download, Shield, AlertTriangle } from 'lucide-react';
import { CSVPreview, ColumnMapping, UploadMetadata, UploadResult } from '@/types';

interface UploadSteps {
  UPLOAD: 'upload';
  MAPPING: 'mapping';
  COMPLETE: 'complete';
}

const STEPS: UploadSteps = {
  UPLOAD: 'upload',
  MAPPING: 'mapping',
  COMPLETE: 'complete'
};


export default function UploadPage() {
  const [currentStep, setCurrentStep] = useState<string>(STEPS.UPLOAD);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping>({});
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);


  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/ingest/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreview(response.data);
      setMappings(response.data.suggested_mappings || {});
      setCurrentStep(STEPS.MAPPING);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error processing CSV file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleMappingConfirm = () => {
    // Validate that all required fields are mapped
    const mappedFields = new Set(Object.values(mappings));
    const requiredFields = new Set(['full_name', 'rut', 'university_email', 'career_or_area', 'phone']);
    const missingFields = [...requiredFields].filter(field => !mappedFields.has(field));

    if (missingFields.length > 0) {
      setError(`Missing required field mappings: ${missingFields.join(', ')}`);
      return;
    }

    setError(null);
    setShowMetadataModal(true);
  };

  const handleMappingChange = (csvHeader: string, canonicalField: string | null) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      if (canonicalField) {
        newMappings[csvHeader] = canonicalField;
      } else {
        delete newMappings[csvHeader];
      }
      return newMappings;
    });
  };

  const handleMetadataConfirm = async (metadata: UploadMetadata) => {
    if (!selectedFile || !preview) return;

    setIsLoading(true);
    setError(null);
    setShowMetadataModal(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('strategic_line', metadata.strategic_line);
      formData.append('activity', metadata.activity);
      formData.append('year', metadata.year.toString());
      formData.append('audience', metadata.audience);
      formData.append('column_mappings', JSON.stringify(mappings));

      const response = await axios.post('/api/ingest/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadResult(response.data);
      setCurrentStep(STEPS.COMPLETE);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error uploading CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const resetUpload = () => {
    setCurrentStep(STEPS.UPLOAD);
    setSelectedFile(null);
    setPreview(null);
    setMappings({});
    setShowMetadataModal(false);
    setError(null);
    setUploadResult(null);
  };

  const handleDownloadEnrichedCSV = () => {
    if (uploadResult?.enriched_csv_download) {
      window.open(uploadResult.enriched_csv_download, '_blank');
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: STEPS.UPLOAD, label: 'Subir Archivo' },
      { key: STEPS.MAPPING, label: 'Mapeo de Columnas' },
      { key: STEPS.COMPLETE, label: 'Completo' }
    ];

    const currentIndex = steps.findIndex(step => step.key === currentStep);

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
              ${index <= currentIndex
                ? 'bg-brand-teal border-brand-teal text-white'
                : 'border-gray-300 text-gray-400'
              }
            `}>
              {index < currentIndex ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span className={`ml-2 text-sm ${index <= currentIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-4 ${index < currentIndex ? 'bg-brand-teal' : 'bg-gray-300'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

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
            DIRECCIÓN DE PASTORAL | SUBIR ARCHIVO CSV
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center">
          <p className="text-gray-700 text-lg">
            Sube archivos CSV exportados de Google Forms y mapea las columnas a los campos del sistema
          </p>
        </div>

      {renderStepIndicator()}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

        {/* Step 1: File Upload */}
        {currentStep === STEPS.UPLOAD && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold text-brand-text">Seleccionar Archivo CSV</h3>
              <p className="text-gray-600 mt-2">
                Arrastra y suelta un archivo CSV o haz clic para seleccionar
              </p>
            </div>
            <div className="p-6">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-brand-teal bg-brand-teal/5' : 'border-gray-300 hover:border-gray-400'}
                  ${isLoading ? 'pointer-events-none opacity-50' : ''}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                {isDragActive ? (
                  <p>Suelta el archivo aquí...</p>
                ) : (
                  <div>
                    <p className="text-lg mb-2">
                      {isLoading ? 'Procesando archivo...' : 'Arrastra un archivo CSV aquí'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      o haz clic para seleccionar un archivo
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Solo archivos CSV (máximo 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Step 2: Column Mapping */}
      {currentStep === STEPS.MAPPING && preview && (
        <CSVColumnMapping
          preview={preview}
          mappings={mappings}
          onMappingChange={handleMappingChange}
          onConfirm={handleMappingConfirm}
          isLoading={isLoading}
        />
      )}

        {/* Step 3: Upload Complete */}
        {currentStep === STEPS.COMPLETE && uploadResult && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <h3 className="text-xl font-semibold text-brand-text">Subida Completada</h3>
              </div>
              <p className="text-gray-600 mt-2">
                El archivo CSV ha sido procesado exitosamente
              </p>
            </div>
            <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.registrations_created}
                </div>
                <div className="text-sm text-green-700">Registros creados</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {uploadResult.activity_id}
                </div>
                <div className="text-sm text-blue-700">ID de actividad</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {uploadResult.metadata.strategic_line}
                </div>
                <div className="text-sm text-purple-700">Línea estratégica</div>
              </div>
              <div className={`p-4 rounded-lg ${
                uploadResult.validation_summary.validation_rate >= 90
                  ? 'bg-green-50'
                  : uploadResult.validation_summary.validation_rate >= 70
                  ? 'bg-yellow-50'
                  : 'bg-red-50'
              }`}>
                <div className={`text-2xl font-bold ${
                  uploadResult.validation_summary.validation_rate >= 90
                    ? 'text-green-600'
                    : uploadResult.validation_summary.validation_rate >= 70
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {uploadResult.validation_summary.validation_rate}%
                </div>
                <div className={`text-sm ${
                  uploadResult.validation_summary.validation_rate >= 90
                    ? 'text-green-700'
                    : uploadResult.validation_summary.validation_rate >= 70
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}>
                  Tasa de validación
                </div>
              </div>
            </div>

            {/* Validation Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium">Resultados de Validación</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    <strong>{uploadResult.validation_summary.valid_rows}</strong> registros válidos
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>
                    <strong>{uploadResult.validation_summary.invalid_rows}</strong> registros con errores
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">
                    <strong>{uploadResult.validation_summary.total_rows}</strong> registros totales
                  </span>
                </div>
              </div>
              {uploadResult.validation_summary.invalid_rows > 0 && (
                <div className="mt-2 p-2 bg-yellow-100 rounded text-sm text-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Los registros con errores de validación fueron ingresados pero marcados para revisión.
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Información del evento:</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Actividad:</span> {uploadResult.metadata.activity}
                </div>
                <div>
                  <span className="font-medium">Año:</span> {uploadResult.metadata.year}
                </div>
                <div>
                  <span className="font-medium">Línea:</span> {uploadResult.metadata.strategic_line}
                </div>
                <div>
                  <span className="font-medium">Audiencia:</span> {uploadResult.metadata.audience === 'estudiantes' ? 'Estudiantes' : 'Colaboradores'}
                </div>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>Se encontraron algunos errores:</strong></p>
                    {uploadResult.errors.map((error, idx) => (
                      <p key={idx} className="text-sm">• {error}</p>
                    ))}
                    {uploadResult.total_errors && uploadResult.total_errors > uploadResult.errors.length && (
                      <p className="text-sm italic">
                        ...y {uploadResult.total_errors - uploadResult.errors.length} errores más
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {uploadResult.enriched_csv_download && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">CSV Enriquecido Disponible</h4>
                    <p className="text-sm text-blue-700">
                      Descarga el archivo CSV con las columnas de metadatos añadidas
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadEnrichedCSV}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar CSV
                  </Button>
                </div>
              </div>
            )}

              <div className="flex justify-center">
                <Button onClick={resetUpload} className="bg-brand-teal hover:bg-brand-tealDark text-white">
                  Subir Otro Archivo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Uploads - Only show if not in the middle of upload process */}
        {currentStep === STEPS.UPLOAD && (
          <RecentUploads />
        )}

        {/* Metadata Modal */}
        <MetadataModal
          isOpen={showMetadataModal}
          onClose={() => setShowMetadataModal(false)}
          onConfirm={handleMetadataConfirm}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
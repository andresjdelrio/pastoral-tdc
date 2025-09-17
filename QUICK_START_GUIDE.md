# 🚀 Pastoral TDC - Guía de Inicio Rápido

## ⚡ Acceso Rápido a la Plataforma

### 1. Encender el Computador
- Enciende el computador y espera a que cargue Windows
- Abre el **Explorador de Archivos** (Windows + E)

### 2. Navegar al Proyecto
```
📁 Ir a: C:\Users\chica\Pastoral_tdc
```

### 3. Abrir Terminal en la Carpeta del Proyecto
- **Clic derecho** en el espacio vacío de la carpeta
- Seleccionar **"Abrir en Terminal"** o **"PowerShell aquí"**

### 4. Iniciar el Backend (Servidor)
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
✅ **Verás**: `Uvicorn running on http://0.0.0.0:8000`

### 5. Iniciar el Frontend (Interfaz Web)
- **Abrir NUEVA terminal** (mantén la anterior abierta)
- En la nueva terminal:
```bash
cd frontend
npm start
```
✅ **Verás**: `Local: http://localhost:3000`

### 6. Acceder a la Plataforma
- El navegador se abrirá automáticamente en: **http://localhost:3000**
- Si no se abre, ve manualmente a esa dirección

---

## 🌐 URLs de Acceso

| Componente | URL | Descripción |
|------------|-----|-------------|
| **Plataforma Principal** | http://localhost:3000 | Interfaz principal de usuario |
| **API Backend** | http://localhost:8000 | Servidor de datos |
| **Documentación API** | http://localhost:8000/docs | Documentación automática |

---

## 📋 Verificación Rápida

### ✅ Todo Funciona Si Ves:
1. **Terminal Backend**: `INFO: Uvicorn running on http://0.0.0.0:8000`
2. **Terminal Frontend**: `webpack compiled with 0 errors`
3. **Navegador**: Página de bienvenida con logo Finis Terrae

### ❌ Si Hay Problemas:
- **Error de Puerto**: Algún servicio ya está corriendo en el puerto
- **Error de Dependencias**: Ejecutar `npm install` en la carpeta frontend
- **Error de Python**: Verificar que Python esté instalado

---

## 🔄 Comandos de Respaldo

### Si el Frontend No Inicia:
```bash
cd frontend
npm install
npm start
```

### Si el Backend No Inicia:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 📱 Acceso desde Otros Dispositivos

Para acceder desde otros computadores en la misma red:
1. Obtén la IP de tu computador: `ipconfig` en cmd
2. Accede desde otro dispositivo: `http://[TU-IP]:3000`

---

## 🛑 Cerrar la Plataforma

1. **En ambas terminales**: Presiona `Ctrl + C`
2. **Cerrar navegador** (opcional)

---

## 💡 Tips Útiles

- **Mantén ambas terminales abiertas** mientras uses la plataforma
- **No cierres las ventanas de terminal** o la plataforma dejará de funcionar
- **El navegador se actualiza automáticamente** cuando cambias código
- **Los datos se guardan en la base de datos** automáticamente

---

## 🎯 Funcionalidades Principales

1. **📁 Subir CSV** - Cargar datos desde Google Forms
2. **📊 Ver Indicadores** - Estadísticas y métricas
3. **✅ Marcar Asistencia** - Gestionar participación
4. **🗃️ Base de Datos** - Administrar registros
5. **📂 Gestión de Archivos** - Descargar y administrar

---

---

## 📊 **Información de la Plataforma**

### 🏷️ **Versión y Estado Actual**
- **Versión**: v1.2.0 (Septiembre 2025)
- **Estado**: ✅ **ESTABLE Y FUNCIONANDO**
- **Última Actualización**: 17 de Septiembre, 2025
- **Branch Estable**: `backup-working-version-20250917-002913` / `v1.0-stable`

### 🔧 **Especificaciones Técnicas**
- **Frontend**: React + TypeScript + Vite (Puerto 5173)
- **Backend**: FastAPI + Python + SQLAlchemy (Puerto 8000)
- **Base de Datos**: SQLite con migración a PostgreSQL disponible
- **Diseño**: TailwindCSS + shadcn/ui + Branding Finis Terrae

### 🎨 **Características del Diseño**
- **Colores Institucionales**:
  - Teal Finis Terrae (`#0E6E7E`)
  - Rojo Institucional (`#D7262E`)
  - Texto Principal (`#1C1C1C`)
- **Logo**: Integrado en todas las páginas
- **Responsivo**: Optimizado para escritorio y móvil

---

## 🚀 **Modificaciones y Mejoras Recientes**

### **✨ Septiembre 2025 - Actualización Mayor**

#### **🎨 Diseño y Branding**
- ✅ **Branding Consistente**: Aplicado diseño institucional Finis Terrae en todos los módulos
- ✅ **HeaderBrand**: Componente unificado con franja roja, logo y banner teal
- ✅ **Tablas Profesionales**: Headers con fondo teal y texto blanco
- ✅ **Filtros Horizontales**: Layout mejorado en módulo de asistencia

#### **📊 Módulo de Indicadores**
- ✅ **Estructura Unificada**: Todas las líneas estratégicas muestran columnas consistentes
  - Año, Inscripciones, Participaciones, Personas, Tasa (%)
- ✅ **Visualización Mejorada**: Charts profesionales con datos completos
- ✅ **Manejo de Datos Vacíos**: Mensajes informativos para líneas sin datos

#### **🔧 Limpieza de Código**
- ✅ **Dependencias**: Removidas 9 dependencias no utilizadas (i18n, papaparse)
- ✅ **Componentes**: Eliminados 3 componentes obsoletos (256 líneas)
- ✅ **API**: Removidos endpoints deprecated (`/api/uploads/`)
- ✅ **Modernización**: Solo endpoints modernos (`/api/ingest/`)

#### **📝 Documentación**
- ✅ **Guía de Inicio**: Documento completo para acceso rápido
- ✅ **CLAUDE.md**: Instrucciones técnicas para desarrollo
- ✅ **README.md**: Documentación completa del proyecto

### **🔒 Sistema de Respaldo**
- **Backup Automático**: Cada cambio mayor tiene respaldo automático
- **Recuperación Rápida**: Comandos disponibles para volver a versión estable
- **Git Tags**: Versiones marcadas para fácil acceso

---

## 🛠️ **Estado de Funcionalidades**

### **✅ Módulos Operativos**
1. **🏠 Inicio**: Dashboard principal con estadísticas
2. **📊 Indicadores**: Métricas completas por línea estratégica
3. **📄 Subir CSV**: Upload inteligente con mapeo automático
4. **👥 Asistencia**: Gestión de participación con filtros
5. **🗃️ Base de Datos**: Administración completa de registros
6. **📂 Archivos**: Gestión y descarga de archivos

### **🎯 Líneas Estratégicas Configuradas**
- **Apostolado** - Actividades apostólicas
- **Sacramentos** - Actividades sacramentales
- **Crecimiento Espiritual** - Actividades de crecimiento espiritual
- **Identidad y Comunidad** - Actividades de identidad y comunidad

### **📈 Analíticas Disponibles**
- Inscripciones vs Participaciones por año
- Tasas de conversión por línea estratégica
- Conteos de personas únicas
- Filtros por audiencia (Total/Estudiantes/Colaboradores)
- Gráficos interactivos con datos históricos

---

## 🔄 **Comandos de Recuperación**

Si algo falla, puedes volver a la versión estable:

```bash
cd "C:\Users\chica\Pastoral_tdc"
git checkout backup-working-version-20250917-002913
```

O usar el tag estable:
```bash
git checkout v1.0-stable
```

---

*✨ ¡La plataforma está lista para usar! Desarrollada con ❤️ para la Pastoral Finis Terrae*

*📅 Última actualización: 17 de Septiembre, 2025 | Versión: v1.2.0*
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

*✨ ¡La plataforma está lista para usar! Desarrollada con ❤️ para la Pastoral Finis Terrae*
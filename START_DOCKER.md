# Guía de Inicio - Pastoral TDC con Docker

## ✅ Estado de Verificación

Todo está listo para el deploy con Docker:

### Archivos Docker Verificados ✓
- `docker-compose.yml` - Configuración de 3 servicios (Redis, Backend, Frontend)
- `backend/Dockerfile` - Imagen Python 3.11 con FastAPI
- `frontend/Dockerfile` - Build multi-stage con Node 18 + Nginx
- `frontend/nginx.conf` - Proxy inverso para API
- `.env` - Variables de entorno configuradas

### Estructura de Servicios ✓
1. **Redis** (puerto 6379) - Cache con 256MB max memory
2. **Backend** (puerto 8000) - FastAPI con SQLite + Alembic
3. **Frontend** (puerto 80) - React + Nginx

### Dependencias Verificadas ✓
- Backend: FastAPI, SQLAlchemy, Alembic, Redis, pandas, sentence-transformers
- Frontend: React, Vite, TypeScript, TailwindCSS, Recharts
- Migraciones: 3 migraciones de Alembic listas

### Configuración Lista ✓
- Archivo `.env` creado con SECRET_KEY
- Docker version: 28.5.1
- Docker Compose version: v2.40.0

## 🚀 Pasos para Iniciar

### 1. Iniciar Docker Desktop

**IMPORTANTE**: Antes de ejecutar los comandos, asegúrate de que Docker Desktop esté corriendo.

**Windows**:
- Busca "Docker Desktop" en el menú inicio
- Haz clic para iniciarlo
- Espera a que aparezca el ícono de Docker en la barra de tareas
- Verifica que diga "Docker Desktop is running"

**Verificar que Docker está listo**:
```bash
docker ps
```

Si ves una tabla vacía o con contenedores, Docker está listo. Si ves un error, Docker Desktop no está corriendo.

### 2. Construir y Levantar los Servicios

```bash
cd C:\Users\chica\Pastoral_tdc
docker-compose up -d --build
```

Este comando:
- Construye las imágenes del backend y frontend
- Descarga la imagen de Redis
- Crea los volúmenes para persistencia
- Levanta los 3 servicios en segundo plano

### 3. Verificar que los Servicios Están Corriendo

```bash
docker-compose ps
```

Deberías ver:
- `pastoral-redis` - Estado: Up (healthy)
- `pastoral-backend` - Estado: Up (healthy)
- `pastoral-frontend` - Estado: Up

### 4. Ver Logs (Opcional)

Ver todos los logs:
```bash
docker-compose logs -f
```

Ver logs de un servicio específico:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis
```

Presiona `Ctrl+C` para salir de los logs.

### 5. Acceder a la Aplicación

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## 🛠️ Comandos Útiles

### Detener los Servicios
```bash
docker-compose down
```

### Detener y Eliminar Volúmenes (Borra datos)
```bash
docker-compose down -v
```

### Reiniciar los Servicios
```bash
docker-compose restart
```

### Reiniciar un Servicio Específico
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Reconstruir sin Cache
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Ver Estado de los Servicios
```bash
docker-compose ps
```

### Ejecutar Comando en un Contenedor
```bash
# Acceder al shell del backend
docker-compose exec backend bash

# Ejecutar migración manualmente
docker-compose exec backend alembic upgrade head

# Acceder al shell del frontend
docker-compose exec frontend sh
```

## 📊 Estructura de Volúmenes

Los datos se persisten en volúmenes Docker:
- `redis_data` - Cache de Redis
- `backend_data` - Base de datos SQLite
- `backend_uploads` - Archivos CSV subidos

Para ver los volúmenes:
```bash
docker volume ls | findstr pastoral
```

## 🔧 Solución de Problemas

### Error: "Docker daemon no responde"
**Solución**: Inicia Docker Desktop y espera a que esté completamente cargado.

### Error: "Port is already allocated"
**Solución**: Otro servicio está usando los puertos 80, 8000 o 6379.
```bash
# Ver qué está usando el puerto
netstat -ano | findstr :80
netstat -ano | findstr :8000
netstat -ano | findstr :6379
```

### Backend no inicia (health check falla)
**Solución**: Ver logs del backend
```bash
docker-compose logs backend
```
Común: Problemas con migraciones de base de datos.

### Frontend no puede conectar al Backend
**Solución**: Verifica que el backend esté corriendo y healthy
```bash
docker-compose ps
curl http://localhost:8000/api/health
```

### Necesito limpiar todo y empezar de cero
```bash
docker-compose down -v
docker-compose up -d --build
```

## 🔄 Actualizar la Aplicación

Después de hacer cambios en el código:

```bash
# Detener servicios
docker-compose down

# Reconstruir imágenes
docker-compose build

# Levantar servicios
docker-compose up -d
```

O todo en un comando:
```bash
docker-compose up -d --build
```

## 📝 Notas de Producción

Para usar en producción:

1. **Cambiar SECRET_KEY** en el archivo `.env`
2. **Considerar PostgreSQL** en lugar de SQLite
   - Modificar `DATABASE_URL` en `.env`
   - Actualizar `docker-compose.yml` para agregar servicio PostgreSQL
3. **Configurar dominio** en vez de localhost
4. **Habilitar HTTPS** con certificados SSL (Let's Encrypt)
5. **Configurar backups** de volúmenes Docker

## ✅ Checklist de Verificación

- [ ] Docker Desktop está corriendo
- [ ] Archivo `.env` existe y tiene SECRET_KEY
- [ ] Puerto 80 está disponible
- [ ] Puerto 8000 está disponible
- [ ] Puerto 6379 está disponible
- [ ] `docker-compose up -d --build` ejecutado exitosamente
- [ ] `docker-compose ps` muestra los 3 servicios como "Up"
- [ ] http://localhost carga correctamente
- [ ] http://localhost:8000/docs carga correctamente

## 🎉 ¡Listo!

Si todos los pasos se completaron sin errores, la aplicación Pastoral TDC está corriendo en Docker.

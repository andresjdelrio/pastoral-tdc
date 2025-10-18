# Docker Deployment Guide - Pastoral TDC

Esta guía te ayudará a desplegar la aplicación completa usando Docker y Docker Compose.

## Prerrequisitos

- Docker Desktop instalado ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose (incluido con Docker Desktop)

## Despliegue Rápido

### 1. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.example .env
```

Edita `.env` y cambia `SECRET_KEY` por una clave segura aleatoria.

### 2. Construir y Ejecutar

```bash
docker-compose up -d
```

Este comando:
- Descarga las imágenes base necesarias
- Construye las imágenes del backend y frontend
- Inicia Redis, Backend y Frontend
- Crea volúmenes persistentes para datos

### 3. Acceder a la Aplicación

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Redis**: localhost:6379

## Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

### Detener servicios
```bash
docker-compose down
```

### Detener y eliminar volúmenes (¡CUIDADO! Elimina la base de datos)
```bash
docker-compose down -v
```

### Reconstruir imágenes
```bash
# Reconstruir todo
docker-compose build

# Reconstruir solo backend
docker-compose build backend

# Reconstruir y reiniciar
docker-compose up -d --build
```

### Ejecutar comandos dentro de contenedores

```bash
# Backend shell
docker-compose exec backend /bin/bash

# Ver base de datos
docker-compose exec backend ls -la /app/data

# Correr migraciones manualmente
docker-compose exec backend alembic upgrade head

# Poblar catálogos
docker-compose exec backend python populate_catalog.py
```

## Estructura de Volúmenes

Los datos persisten en volúmenes Docker:

- `backend_data`: Base de datos SQLite (`/app/data`)
- `backend_uploads`: Archivos CSV subidos (`/app/uploads`)
- `redis_data`: Datos de cache Redis

## Actualizar la Aplicación

1. Obtener últimos cambios:
```bash
git pull origin main
```

2. Reconstruir y reiniciar:
```bash
docker-compose up -d --build
```

## Migración de Datos Existentes

Si tienes datos locales que quieres migrar:

```bash
# Copiar base de datos existente
docker cp ./backend/app.db pastoral-backend:/app/data/app.db

# Copiar archivos subidos
docker cp ./backend/uploads/. pastoral-backend:/app/uploads/
```

## Producción

Para producción, considera:

1. **PostgreSQL en lugar de SQLite**: Edita `docker-compose.yml` y agrega servicio PostgreSQL
2. **Variables de entorno seguras**: Nunca commitees `.env` al repositorio
3. **HTTPS**: Usa un reverse proxy como Nginx o Traefik
4. **Backups**: Programa backups automáticos de los volúmenes
5. **Monitoreo**: Agrega herramientas como Prometheus/Grafana

### Ejemplo con PostgreSQL

Agrega este servicio a `docker-compose.yml`:

```yaml
postgres:
  image: postgres:15-alpine
  container_name: pastoral-postgres
  restart: unless-stopped
  environment:
    - POSTGRES_DB=pastoral_tdc
    - POSTGRES_USER=pastoral
    - POSTGRES_PASSWORD=change-this-password
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
```

Y actualiza el `DATABASE_URL` en `.env`:
```
DATABASE_URL=postgresql://pastoral:change-this-password@postgres:5432/pastoral_tdc
```

## Troubleshooting

### El frontend no puede conectarse al backend
- Verifica que ambos servicios estén corriendo: `docker-compose ps`
- Revisa logs del backend: `docker-compose logs backend`
- Verifica CORS en `backend/main.py`

### La base de datos está vacía
```bash
# Correr migraciones
docker-compose exec backend alembic upgrade head

# Poblar catálogos
docker-compose exec backend python populate_catalog.py
```

### Problemas de permisos
```bash
# En Linux/Mac, puede necesitar permisos
sudo chown -R $USER:$USER backend/data backend/uploads
```

### Redis no conecta
```bash
# Verificar que Redis esté healthy
docker-compose ps redis

# Ver logs de Redis
docker-compose logs redis
```

## Deployment en Servidores

### Usando Docker Machine (servidor remoto)

```bash
# Configurar contexto remoto
docker context create remote --docker "host=ssh://user@your-server.com"
docker context use remote

# Desplegar
docker-compose up -d
```

### Usando Railway/Render/Fly.io

Estos servicios detectan automáticamente `docker-compose.yml` o Dockerfiles.
Consulta la documentación específica de cada plataforma.

## Monitoreo de Salud

Los servicios incluyen health checks:

```bash
# Ver estado de salud
docker-compose ps

# Backend health endpoint
curl http://localhost:8000/api/health

# Frontend health
curl http://localhost/
```

## Respaldos (Backups)

### Backup de la base de datos
```bash
# Crear backup
docker-compose exec backend cp /app/data/app.db /app/data/backup-$(date +%Y%m%d).db

# Copiar backup al host
docker cp pastoral-backend:/app/data/backup-YYYYMMDD.db ./backups/
```

### Backup de volúmenes completos
```bash
# Crear tarball de volumen
docker run --rm -v pastoral_tdc_backend_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/backend-data-$(date +%Y%m%d).tar.gz -C /data .
```

## Soporte

Para problemas o preguntas:
- Revisa logs: `docker-compose logs`
- Verifica configuración: `docker-compose config`
- Issues: [GitHub Issues](https://github.com/andresjdelrio/pastoral-tdc/issues)

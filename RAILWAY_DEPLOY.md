# Deploy Pastoral TDC a Railway

## 🚀 Pasos para Deploy

### 1. Login a Railway

```bash
railway login
```

Esto abrirá tu navegador. Inicia sesión con GitHub.

### 2. Inicializar Proyecto

```bash
cd C:\Users\chica\Pastoral_tdc
railway init
```

Selecciona "Create new project" y dale un nombre (ej: "pastoral-tdc")

### 3. Agregar los Servicios

Railway detectará automáticamente el `docker-compose.yml` y creará 3 servicios:
- Redis
- Backend (FastAPI)
- Frontend (Nginx)

### 4. Configurar Variables de Entorno

En el dashboard de Railway (https://railway.app):

**Para el servicio Backend:**
```
DATABASE_URL=sqlite:///data/app.db
REDIS_URL=redis://redis:6379
SECRET_KEY=<genera-una-clave-segura-aqui>
ENVIRONMENT=production
```

### 5. Deploy

```bash
railway up
```

### 6. Obtener la URL

```bash
railway domain
```

O ve al dashboard y haz clic en "Generate Domain" para el servicio frontend.

## 📊 Monitoreo

- **Dashboard**: https://railway.app/dashboard
- **Logs**: `railway logs`
- **Variables**: `railway variables`

## 💰 Costos

Railway ofrece:
- **$5 USD gratis/mes** de crédito
- Luego paga por uso
- Típicamente $5-10/mes para apps pequeñas

## 🔧 Troubleshooting

### Error: "Failed to deploy"
```bash
railway logs --tail 100
```

### Error: "Port already in use"
Railway asigna puertos automáticamente. No necesitas cambiar nada.

### Base de datos vacía
Railway crea volúmenes persistentes automáticamente. Los datos se mantienen entre deploys.

## 🌐 URL Final

Tu app estará disponible en:
```
https://pastoral-tdc-production.up.railway.app
```

(El nombre exacto te lo dará Railway)

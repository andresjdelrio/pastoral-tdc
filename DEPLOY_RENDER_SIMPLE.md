# 🚀 Deploy GRATUITO a Render.com - 100% desde Web

## ✅ TODO desde la interfaz web - NO necesitas terminal!

### Paso 1: Push a GitHub (hazlo ahora)

Yo ya preparé todo. Solo ejecuta esto en tu terminal:

```bash
cd C:\Users\chica\Pastoral_tdc
git add .
git commit -m "Add Render configuration for free deploy"
git push origin main
```

### Paso 2: Crear cuenta en Render (2 minutos)

1. Ve a https://render.com
2. Haz clic en **"Get Started"**
3. Inicia sesión con tu cuenta de **GitHub**
4. Autoriza Render para acceder a tus repositorios

### Paso 3: Crear Blueprint (1 clic!)

1. En el dashboard de Render, haz clic en **"New +"**
2. Selecciona **"Blueprint"**
3. Busca y selecciona el repositorio **"pastoral-tdc"**
4. Render detectará automáticamente el archivo `render.yaml`
5. Haz clic en **"Apply"**

**¡Eso es todo!** Render creará automáticamente:
- ✅ Redis (gratis)
- ✅ Backend (gratis)
- ✅ Frontend (gratis)

### Paso 4: Esperar el Deploy (10-15 minutos)

Render mostrará el progreso:
- 🔵 Building... (construyendo imágenes Docker)
- 🟡 Deploying... (desplegando servicios)
- 🟢 Live (funcionando!)

### Paso 5: Obtener tu URL

Cuando termine:
1. Ve a **"Dashboard"**
2. Haz clic en **"pastoral-frontend"**
3. Verás tu URL pública:
   ```
   https://pastoral-frontend.onrender.com
   ```

**¡Esa es tu app en internet!** 🎉

---

## 💰 Costos

**100% GRATIS** ✨

Render.com ofrece:
- Redis gratis (25 MB)
- 2 servicios web gratuitos
- 750 horas/mes gratis (suficiente 24/7)

**Limitación**: Los servicios gratuitos "duermen" después de 15 minutos de inactividad. La primera visita puede tardar 30-60 segundos en "despertar".

---

## 🔧 Después del Deploy

### Ver logs
1. Dashboard → Selecciona servicio → Pestaña "Logs"

### Variables de entorno (ya configuradas automáticamente)
- `SECRET_KEY`: Generada automáticamente
- `DATABASE_URL`: sqlite:///data/app.db
- `REDIS_URL`: Conectado automáticamente
- `ENVIRONMENT`: production

### Actualizar la app
Cada vez que hagas `git push origin main`, Render se actualizará automáticamente! 🚀

---

## ⚠️ Troubleshooting

### "Build failed"
Ve a Logs del servicio que falló y busca el error.

### "Service unavailable"
Espera 1-2 minutos. El primer deploy siempre tarda más.

### "Database empty"
Normal en el primer deploy. Sube un CSV para empezar a usar.

---

## 🎉 Resumen

1. `git push origin main` ← Haz esto
2. Ve a render.com
3. New + → Blueprint → Selecciona pastoral-tdc
4. Apply
5. Espera 15 minutos
6. ¡Listo!

Tu app estará en: `https://pastoral-frontend.onrender.com`

---

## 📊 Monitoreo

Dashboard de Render:
- ✅ Estado de servicios
- 📊 Uso de recursos
- 📝 Logs en tiempo real
- 🔄 Historial de deploys

---

## 🔄 Auto-Deploy

Cada `git push` a `main` = Deploy automático! ✨

No necesitas hacer nada más después de la configuración inicial.

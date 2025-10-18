# Guía de Instalación de Docker - Windows

## Instalación de Docker Desktop para Windows

### Paso 1: Descargar Docker Desktop

1. Visita: https://www.docker.com/products/docker-desktop
2. Haz clic en "Download for Windows"
3. Ejecuta el instalador `Docker Desktop Installer.exe`

### Paso 2: Requisitos del Sistema

Docker Desktop para Windows requiere:
- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 o superior)
- O Windows 11 64-bit
- WSL 2 habilitado (el instalador lo configurará automáticamente)
- Virtualización habilitada en BIOS

### Paso 3: Instalación

1. Ejecuta el instalador
2. Sigue el asistente de instalación
3. Asegúrate de marcar "Use WSL 2 instead of Hyper-V" (recomendado)
4. Reinicia tu computadora cuando se solicite

### Paso 4: Verificar Instalación

Abre PowerShell o Command Prompt y ejecuta:

```bash
docker --version
docker-compose --version
```

Deberías ver algo como:
```
Docker version 24.0.x, build xxxxx
Docker Compose version v2.x.x
```

### Paso 5: Configurar Docker Desktop

1. Abre Docker Desktop desde el menú de inicio
2. Ve a Settings (icono de engranaje)
3. Recomendaciones:
   - **Resources > Advanced**: Asigna al menos 4GB de RAM
   - **Docker Engine**: Deja la configuración por defecto
   - **WSL Integration**: Habilita integración con tu distribución WSL si la usas

## Verificar que Docker está Funcionando

```bash
# Test básico
docker run hello-world
```

Si ves un mensaje de bienvenida, ¡Docker está instalado correctamente!

## Problemas Comunes

### WSL 2 no está instalado

Si obtienes un error sobre WSL 2:

```powershell
# Ejecuta en PowerShell como Administrador
wsl --install
wsl --set-default-version 2
```

Reinicia y vuelve a instalar Docker Desktop.

### Virtualización no habilitada

1. Reinicia tu PC
2. Entra al BIOS/UEFI (usualmente F2, F10, F12, o DEL al iniciar)
3. Busca "Virtualization Technology" o "VT-x" o "AMD-V"
4. Habilítalo
5. Guarda y reinicia

### Docker Desktop no inicia

1. Asegúrate de que WSL 2 esté instalado
2. Verifica que la virtualización esté habilitada
3. Ejecuta como Administrador la primera vez
4. Revisa los logs en: `%LOCALAPPDATA%\Docker\log.txt`

## Alternativa: Docker en WSL 2

Si prefieres usar Docker directamente en WSL 2 sin Docker Desktop:

```bash
# En WSL 2 (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

## Siguiente Paso

Una vez Docker esté instalado, regresa a [README.Docker.md](./README.Docker.md) para desplegar la aplicación.

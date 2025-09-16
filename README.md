# Project Scope - Backend para Vercel (Gratuito)

## 🆓 **Hosting Gratuito Completo**

Este directorio contiene la versión del backend optimizada para **Vercel** (hosting gratuito).

## 🎯 **Arquitectura Gratuita**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Pages  │    │   Vercel        │    │   Railway       │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (PostgreSQL)  │
│   index.html    │    │   Node.js API   │    │   Base de datos │
│   CSS/JS        │    │   Gratis        │    │   Gratis        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✅ **Ventajas del Hosting Gratuito**

### **Vercel (Backend)**
- ✅ **Costo**: Completamente gratis
- ✅ **Límites**: 100GB bandwidth/mes, 1000 funciones/mes
- ✅ **Soporte**: Node.js nativo
- ✅ **Deploy**: Automático desde GitHub
- ✅ **SSL**: Certificado gratuito
- ✅ **CDN**: Global
- ✅ **URL**: `https://tuproyecto.vercel.app`

### **Railway (Base de Datos)**
- ✅ **Costo**: Completamente gratis
- ✅ **Límites**: $5 de crédito/mes
- ✅ **Soporte**: PostgreSQL
- ✅ **Backup**: Automático
- ✅ **URL**: `postgresql://user:pass@host:port/db`

### **GitHub Pages (Frontend)**
- ✅ **Costo**: Completamente gratis
- ✅ **Límites**: Sin límites prácticos
- ✅ **Soporte**: HTML, CSS, JavaScript
- ✅ **Deploy**: Automático desde GitHub
- ✅ **URL**: `https://lorencha0209.github.io/project-scope`

## 🚀 **Configuración Paso a Paso**

### **Paso 1: Configurar Railway (Base de Datos)**

#### **1.1 Crear cuenta en Railway**
1. Ve a [railway.app](https://railway.app)
2. Crea una cuenta con GitHub
3. Haz clic en "New Project"
4. Selecciona "Provision PostgreSQL"

#### **1.2 Obtener URL de conexión**
1. Haz clic en la base de datos PostgreSQL
2. Ve a la pestaña "Connect"
3. Copia la "Connection URL"
4. Ejecuta el script `database-schema.sql`

### **Paso 2: Configurar Vercel (Backend)**

#### **2.1 Crear cuenta en Vercel**
1. Ve a [vercel.com](https://vercel.com)
2. Crea una cuenta con GitHub
3. Haz clic en "New Project"
4. Conecta tu repositorio

#### **2.2 Configurar variables de entorno**
En Vercel Dashboard → Settings → Environment Variables:
```
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=project-scope-secret-key-2024-change-in-production
JWT_EXPIRY=24h
CORS_ORIGIN=https://lorencha0209.github.io
```

#### **2.3 Deploy automático**
1. Sube los archivos de `vercel-backend/` a GitHub
2. Vercel detectará automáticamente el proyecto
3. Deploy se ejecutará automáticamente

### **Paso 3: Configurar GitHub Pages (Frontend)**

#### **3.1 Crear repositorio**
1. Crea un repositorio en GitHub
2. Sube los archivos de `github-pages/`
3. Habilita GitHub Pages en Settings → Pages

#### **3.2 Configurar frontend**
Editar `api-client.js`:
```javascript
this.baseURL = 'https://tuproyecto.vercel.app/api';
```

## 📁 **Archivos Incluidos**

### **Backend Vercel (`vercel-backend/`)**
- ✅ `package.json` - Dependencias Node.js
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `api/index.js` - API principal
- ✅ `database-schema.sql` - Esquema PostgreSQL

### **Frontend GitHub Pages (`github-pages/`)**
- ✅ `index.html` - Página principal
- ✅ `app.js` - Lógica de la aplicación
- ✅ `app-extensions.js` - Funcionalidades extendidas
- ✅ `api-client.js` - Cliente API para Vercel
- ✅ `demo-data.js` - Datos de demostración

## 🔧 **Comandos de Despliegue**

### **Para Vercel**
```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login en Vercel
vercel login

# 3. Deploy
cd vercel-backend
vercel

# 4. Configurar variables de entorno
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add CORS_ORIGIN
```

### **Para Railway**
```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login en Railway
railway login

# 3. Crear proyecto
railway new

# 4. Conectar base de datos
railway add postgresql
```

### **Para GitHub Pages**
```bash
# 1. Crear repositorio en GitHub
# 2. Clonar repositorio
git clone https://github.com/tuusuario/project-scope.git
cd project-scope

# 3. Copiar archivos del frontend
cp ../Project_Scope/github-pages/* .

# 4. Actualizar URL de la API en api-client.js
# 5. Subir a GitHub
git add .
git commit -m "Frontend for Vercel deployment"
git push origin main
```

## 🌐 **URLs de Ejemplo**

### **Frontend (GitHub Pages)**
```
https://lorencha0209.github.io/project-scope
```

### **Backend (Vercel)**
```
https://tuproyecto.vercel.app/api
```

### **Base de Datos (Railway)**
```
postgresql://user:pass@host:port/db
```

## 🔒 **Configuración de Seguridad**

### **CORS Configuration**
```javascript
// En api/index.js
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://lorencha0209.github.io',
    credentials: true
}));
```

### **JWT en Vercel**
```javascript
// Variables de entorno en Vercel
JWT_SECRET=project-scope-secret-key-2024-change-in-production
JWT_EXPIRY=24h
```

## 📊 **Límites del Plan Gratuito**

### **Vercel**
- **Bandwidth**: 100GB/mes
- **Funciones**: 1000/mes
- **Deploy**: Ilimitado
- **SSL**: Incluido

### **Railway**
- **Crédito**: $5/mes
- **Base de datos**: PostgreSQL gratuita
- **Backup**: Automático
- **Escalado**: Automático

### **GitHub Pages**
- **Bandwidth**: Ilimitado
- **Storage**: 1GB
- **Deploy**: Ilimitado
- **SSL**: Incluido

## ✅ **Ventajas del Hosting Gratuito**

- **Costo**: Completamente gratis
- **Escalabilidad**: Automática
- **SSL**: Certificados gratuitos
- **CDN**: Global
- **Backup**: Automático
- **Soporte**: Comunidad activa
- **Deploy**: Automático desde GitHub

## ⚠️ **Consideraciones**

- **Límites**: Respeta los límites del plan gratuito
- **Performance**: Puede ser más lento que hosting pagado
- **Soporte**: Solo soporte de comunidad
- **Personalización**: Limitada
- **Dominio**: Subdominios gratuitos

## 🚀 **Próximos Pasos**

1. **Crear cuentas** en Railway y Vercel
2. **Configurar base de datos** PostgreSQL en Railway
3. **Deploy backend** en Vercel
4. **Configurar frontend** en GitHub Pages
5. **Probar** funcionamiento completo

## 🎉 **Estado Final**

- ✅ **Frontend preparado** para GitHub Pages
- ✅ **Backend preparado** para Vercel
- ✅ **Base de datos** configurada para Railway
- ✅ **Documentación completa** incluida
- ✅ **Scripts de despliegue** listos
- ✅ **CORS configurado** para GitHub Pages

**¡Tu aplicación puede funcionar completamente gratis con Vercel + Railway + GitHub Pages!** 🚀

## 📝 **Notas Importantes**

- **Usuario único**: Solo `lorena.alvarez` puede acceder
- **Contraseña**: `Anto0929**`
- **Backend**: Node.js en Vercel
- **Base de datos**: PostgreSQL en Railway
- **Frontend**: GitHub Pages
- **CORS**: Configurado para GitHub Pages

¿Te gustaría que te ayude con algún paso específico de la configuración gratuita?

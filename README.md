# Dashboard
Dashboard Cableworld

================================================================================
                   CABLEWORLD - GUÍA COMPLETA DE INSTALACIÓN
================================================================================

Este archivo contiene instrucciones detalladas para instalar y ejecutar 
Cableworld en cualquier servidor o máquina local.

================================================================================
PARTE 0: REQUISITOS DEL SISTEMA
================================================================================

Antes de comenzar, asegúrate de tener instalado:

1. NODE.JS (v14 o superior)
   - Descarga desde: https://nodejs.org/
   - Elige la versión LTS (recomendado)
   - Instala normalmente
   - Verifica: abre PowerShell y ejecuta:
     
     node --version
     npm --version

   Deberías ver algo como:
     v18.17.0
     9.6.7

2. GIT (opcional pero recomendado)
   - Descarga desde: https://git-scm.com/
   - Instala normalmente

3. Un Editor de Código (VS Code recomendado)
   - Descarga desde: https://code.visualstudio.com/

================================================================================
PARTE 1: DESCARGA Y PREPARACIÓN DEL PROYECTO
================================================================================

OPCIÓN A: Descargar como ZIP
----------------------------
1. Descarga el archivo cableworld.zip
2. Extrae el contenido en una carpeta (ej: C:\proyectos\cableworld)
3. Abre la carpeta en PowerShell o CMD

OPCIÓN B: Usar Git (si está instalado)
--------------------------------------
En PowerShell, ejecuta:

    git clone https://tuurl.com/cableworld.git
    cd cableworld

VERIFICAR LA ESTRUCTURA DEL PROYECTO
-----------------------------------
La carpeta debe contener:

    cableworld/
    ├── backend/                    (servidor Node.js)
    │   ├── .env.example            (variables de entorno de ejemplo)
    │   ├── server.js               (servidor principal)
    │   ├── package.json            (dependencias)
    │   └── cableworld.db           (base de datos - se crea automáticamente)
    │
    ├── frontend-server.js          (servidor del frontend)
    ├── html/                       (archivos HTML)
    │   └── index.html              (página principal)
    │
    ├── css/                        (estilos)
    │   └── styles.css
    │
    ├── js/                         (JavaScript del cliente)
    │   ├── app.js
    │   ├── apiClient.js
    │   ├── dataService.js
    │   └── search-clean.js
    │
    ├── reiniciar-servidores.bat    (script para Windows)
    ├── iniciar-servidores.bat      (script para Windows)
    ├── detener-servidores.bat      (script para Windows)
    └── SETUP-COMPLETO.txt          (este archivo)

================================================================================
PARTE 2: INSTALACIÓN COMPLETA DE DEPENDENCIAS
================================================================================

PASO 0: Verificar que Node.js está instalado
---------------------------------------------
Abre PowerShell y ejecuta:

    node --version

Deberías ver algo como:
    v18.17.0

Si no lo ves, Node.js no está instalado. Ve a Parte 0.

PASO 1: Navegar a la carpeta backend
-------------------------------------
En PowerShell, ejecuta:

    cd backend

Deberías ver que la línea de comandos cambia a:

    PS C:\Users\TuUsuario\Desktop\call-center\backend>

PASO 2: Instalar todas las dependencias de npm
----------------------------------------------
Ejecuta:

    npm install

ESPERA A QUE TERMINE (puede tardar 2-3 minutos)

Verás un output parecido a esto:

    npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher
    npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher

    added 255 packages, and audited 256 packages in 47s

    found 0 vulnerabilities

ESTO SIGNIFICA: ✓ INSTALACIÓN EXITOSA

Si hay errores, intenta:

    npm install --legacy-peer-deps

PASO 3: DESPUÉS de npm install, obtendrás:
-------------------------------------------
✓ Una carpeta "node_modules/" con 255+ carpetas (muy grande)
✓ Un archivo "package-lock.json" (no editar)
✓ Todos estos paquetes instalados:

    Paquete              Uso
    ─────────────────────────────────────────────────────
    express              Servidor web principal
    sqlite3              Base de datos
    bcrypt               Encriptación de contraseñas
    nodemailer           Envío de emails
    dotenv               Leer variables de entorno (.env)
    cors                 Permitir navegadores cruzados
    uuid                 Generar IDs únicos
    body-parser          Parsear JSON del cliente

LISTADO COMPLETO DE DEPENDENCIAS
---------------------------------
Para ver todas las dependencias instaladas, ejecuta:

    npm list

Deberías ver:

    └── express@4.18.2
    └── sqlite3@5.1.6
    └── bcrypt@5.1.0
    └── nodemailer@6.9.3
    └── dotenv@16.3.1
    └── cors@2.8.5
    └── uuid@9.0.0
    └── body-parser@1.20.2

VERIFICACIÓN RÁPIDA
-------------------
Para verificar que la instalación fue correcta, ejecuta:

    npm test

O simplemente intenta iniciar el servidor:

    npm start

Deberías ver:
    ✓ Base de datos conectada
    ✓ Admin user check completado
    🚀 Cableworld Backend corriendo en http://localhost:5000

================================================================================
PARTE 3: CONFIGURACIÓN DEL ENTORNO Y CREDENCIALES
================================================================================

CREAR ARCHIVO .env
------------------
1. En la carpeta backend/, copia el archivo .env.example a .env
   
   En PowerShell (desde la carpeta backend):
       Copy-Item .env.example .env
   
   O manualmente:
   - Abre la carpeta backend/
   - Busca .env.example
   - Haz clic derecho → Copiar
   - Haz clic derecho → Pegar
   - Renombra a .env

2. Abre el archivo .env con un editor de texto (Bloc de Notas o VS Code)
   - Clic derecho en .env → Abrir con → Bloc de Notas

3. Reemplaza los valores placeholders con tus configuraciones reales:

════════════════════════════════════════════════════════════════════════════
Archivo: backend/.env (ejemplo completo)
════════════════════════════════════════════════════════════════════════════

   # ===== CREDENCIALES DEL ADMINISTRADOR =====
   # Cambiar estas credenciales SI deseas valores diferentes
   # IMPORTANTE: Debe tener al menos 8 caracteres, mayúscula, minúscula, 
   #             número y carácter especial
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=Admin1234@
   ADMIN_EMAIL=admin@cableworld.local

   # ===== CONFIGURACIÓN DE EMAIL =====
   # Dejar en blanco si no deseas enviar emails de bienvenida
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASSWORD=tu-contraseña-app-de-16-caracteres

   # ===== CONFIGURACIÓN DE LA APLICACIÓN =====
   APP_URL=http://localhost:3000
   PORT=5000

════════════════════════════════════════════════════════════════════════════

CAMBIAR CREDENCIALES DEL ADMINISTRADOR
--------------------------------------

OPCIÓN 1: Cambiar en el archivo .env (RECOMENDADO)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

El archivo .env en backend/ tiene:

   ADMIN_USERNAME=admin           (línea ~2)
   ADMIN_PASSWORD=Admin1234@      (línea ~3)
   ADMIN_EMAIL=admin@cableworld.local  (línea ~4)

Para cambiar:
   1. Abre backend/.env con un editor de texto
   2. Busca las líneas ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL
   3. Reemplaza los valores:
      
      Antes:
         ADMIN_USERNAME=admin
         ADMIN_PASSWORD=Admin1234@
         ADMIN_EMAIL=admin@cableworld.local
      
      Después:
         ADMIN_USERNAME=miusuario
         ADMIN_PASSWORD=MiContraseña123!
         ADMIN_EMAIL=miemail@empresa.com
   
   4. Guarda el archivo (Ctrl+S)
   5. Reinicia los servidores para que los cambios surtan efecto

   ✓ La contraseña se encriptará automáticamente con bcrypt al iniciar

OPCIÓN 2: Cambiar directamente en server.js (SI NO TIENES .env)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Si prefieres hardcodear las credenciales en el código:

Archivo: backend/server.js (líneas 261-263)

   Busca:
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@cableworld.local';

   Reemplaza con:
      const adminUsername = 'miusuario';                      // Línea 261
      const adminPassword = 'MiContraseña123!';               // Línea 262
      const adminEmail = 'miemail@empresa.com';               // Línea 263

   NOTA: Esta no es la mejor práctica. Usa .env siempre que sea posible.

VALIDACIÓN DE CONTRASEÑA SEGURA
-------------------------------

La contraseña debe cumplir estos requisitos:
   ✓ Mínimo 8 caracteres
   ✓ Al menos 1 MAYÚSCULA (A-Z)
   ✓ Al menos 1 minúscula (a-z)
   ✓ Al menos 1 número (0-9)
   ✓ Al menos 1 carácter especial (!@#$%^&*)

Ejemplos válidos:
   ✓ Admin1234@
   ✓ Cableworld#2025
   ✓ Soporte!Tech123
   ✓ Password@123abc

Ejemplos INVÁLIDOS:
   ✗ admin123        (sin mayúsculas, sin especial)
   ✗ ADMIN123@       (sin minúsculas)
   ✗ Admin@          (sin número, muy corto)
   ✗ Admin1234       (sin carácter especial)

CONFIGURAR EMAIL (OPCIONAL PERO RECOMENDADO)
--------------------------------------------

Si quieres que los usuarios reciban emails de bienvenida:

OPCIÓN A: Usar Gmail
1. Ve a https://myaccount.google.com/apppasswords
2. Asegúrate de tener 2FA habilitado (2-Step Verification)
3. Selecciona:
   - Aplicación: Mail
   - Dispositivo: Windows Computer
4. Se generará una contraseña de 16 caracteres
5. Copia esa contraseña (sin espacios)
6. En .env, establece:
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASSWORD=xxxxxxxxxxxxxxxx  (la contraseña de 16 caracteres)

OPCIÓN B: Usar otro proveedor de email
1. Obtén credenciales SMTP de tu proveedor
2. En .env, establece:
   EMAIL_USER=tu-usuario
   EMAIL_PASSWORD=tu-contraseña

NOTA: Los emails NO son obligatorios. El sistema funciona sin ellos.

================================================================================
PARTE 4: EJECUTAR LOS SERVIDORES - GUÍA COMPLETA
================================================================================

EXPLICACIÓN PREVIA
------------------
Cableworld necesita 2 servidores ejecutándose en paralelo:

   1. BACKEND (Node.js Express)
      - Puerto: 5000
      - URL: http://localhost:5000
      - Maneja APIs, base de datos, autenticación
      - Archivo: backend/server.js

   2. FRONTEND (Servidor web)
      - Puerto: 3000
      - URL: http://localhost:3000
      - Sirve HTML, CSS, JavaScript
      - Archivo: frontend-server.js

IMPORTANTE: Ambos deben estar ejecutándose al mismo tiempo.

════════════════════════════════════════════════════════════════════════════
OPCIÓN A: FORMA MÁS FÁCIL - Usar el script de Windows
════════════════════════════════════════════════════════════════════════════

1. Abre PowerShell en la carpeta raíz del proyecto

   Presiona Windows+R, escribe:
       powershell
   Presiona Enter
   Ejecuta:
       cd C:\Users\TuUsuario\Desktop\call-center

2. Ejecuta el script:

       .\reiniciar-servidores.bat

3. Verás 2 ventanas de PowerShell nuevas abrirse automáticamente

4. En la primera ventana deberías ver:
   
       ✓ Base de datos conectada
       ✓ Admin user check completado
       🚀 Cableworld Backend corriendo en http://localhost:5000

5. En la segunda ventana deberías ver:

       Frontend running on http://localhost:3000

6. Si todo está bien, abre tu navegador:
       http://localhost:3000

   Y verás el login de Cableworld

════════════════════════════════════════════════════════════════════════════
OPCIÓN B: INICIACIÓN MANUAL (DOS TERMINALES)
════════════════════════════════════════════════════════════════════════════

Abre TERMINAL 1 - Backend
--------------------------
1. Abre PowerShell en la carpeta raíz:

       cd C:\Users\TuUsuario\Desktop\call-center

2. Navega a la carpeta backend:

       cd backend

3. Inicia el servidor:

       npm start

4. Espera a ver estos mensajes:

       ✓ Base de datos conectada
       ✓ Tablas de base de datos inicializadas
       ✓ Admin user check completado
       ✓ Usuario admin por defecto creado (usuario: admin)
       🚀 Cableworld Backend corriendo en http://localhost:5000

   ✓ ÉXITO: El backend está running

Abre TERMINAL 2 - Frontend
---------------------------
1. Abre OTRA PowerShell (o tab en PowerShell)

2. Navega a la carpeta raíz del proyecto:

       cd C:\Users\TuUsuario\Desktop\call-center

3. Inicia el servidor frontend:

       node frontend-server.js

4. Verás:

       Frontend running on http://localhost:3000

   ✓ ÉXITO: El frontend está running

AHORA PRUEBA LA APLICACIÓN
--------------------------
1. Abre tu navegador (Chrome, Firefox, Edge, etc.)

2. Ve a: http://localhost:3000

3. Verás el login de Cableworld

4. Usa estas credenciales:
   
   Usuario: admin
   Contraseña: Admin1234@
   
   (O las que hayas configurado en .env)

5. Presiona "Ingresar"

6. Si te pide configurar contraseña, sigue los pasos

════════════════════════════════════════════════════════════════════════════
OPCIÓN C: Iniciar sin salir de la carpeta raíz (ALTERNATIVA)
════════════════════════════════════════════════════════════════════════════

TERMINAL 1 - Backend desde raíz:

       cd backend && npm start

TERMINAL 2 - Frontend desde raíz:

       node frontend-server.js

════════════════════════════════════════════════════════════════════════════
COMANDOS EXACTOS PARA COPIAR Y PEGAR
════════════════════════════════════════════════════════════════════════════

PARA TERMINAL 1 (Backend):
──────────────────────────
Copy-Paste estos comandos en orden:

    cd C:\Users\Borja Practicas\Desktop\call-center
    cd backend
    npm start

Cuando veas "Cableworld Backend corriendo" = ✓ Listo

PARA TERMINAL 2 (Frontend):
───────────────────────────
Copy-Paste estos comandos en orden:

    cd C:\Users\Borja Practicas\Desktop\call-center
    node frontend-server.js

Cuando veas "Frontend running on" = ✓ Listo

LUEGO:
    Abre navegador → http://localhost:3000
    Login: admin / Admin1234@

================================================================================
PARTE 5: ACCEDER A LA APLICACIÓN POR PRIMERA VEZ
================================================================================

PASO 1: Verificar que ambos servidores están corriendo
-----------------------------------------------------
Deberías tener:
   ✓ Terminal 1: "Cableworld Backend corriendo en http://localhost:5000"
   ✓ Terminal 2: "Frontend running on http://localhost:3000"

Si ves algún error, ve a "Solucionar Problemas Comunes" (Parte 6)

PASO 2: Abrir el navegador
--------------------------
1. Abre Chrome, Firefox, Edge o tu navegador preferido

2. En la barra de dirección, escribe:

       http://localhost:3000

3. Presiona Enter

Deberías ver la pantalla de LOGIN de Cableworld:

   ┌─────────────────────────────┐
   │      CABLEWORLD LOGIN       │
   │                             │
   │  [Usuario Admin: ________]  │
   │  [Contraseña: __________]   │
   │                             │
   │      [INGRESAR]             │
   └─────────────────────────────┘

PASO 3: Iniciar sesión como administrador
------------------------------------------
Ingresa estas credenciales:

   Usuario: admin
   Contraseña: Admin1234@

(O las que hayas configurado en backend/.env)

Si olvidaste qué configuraste, revisa:
   backend/.env 
   Líneas: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL

PASO 4: Primera vez configurando contraseña
-------------------------------------------
Si esta es la PRIMERA VEZ con este usuario:

1. Presiona "SIGUIENTE" en la pantalla de login

2. Verás: "Configurar Contraseña"

3. Sigue los requisitos:
   ✓ Mínimo 8 caracteres
   ✓ 1 mayúscula
   ✓ 1 minúscula
   ✓ 1 número
   ✓ 1 carácter especial (!@#$%^&*)

4. Presiona "GUARDAR CONTRASEÑA"

5. ¡Listo! Ahora estás dentro de Cableworld

PASO 5: Explorar el dashboard
-----------------------------
Dentro verás:

   MENÚ PRINCIPAL (Izquierda):
   ├── 📖 Manuales
   ├── 🌳 Fibra (Árboles de Decisión)
   ├── ❓ FAQs
   ├── 📋 Historial
   └── ⚙️ Ajustes (solo Admin)

ACCIONES COMUNES:
   • Ver manual → Clic en Manuales
   • Ver FAQ → Clic en FAQs
   • Buscar → Caja de búsqueda en la parte superior
   • Cambiar tema → Ajustes → Temas
   • Crear usuarios → Ajustes → Gestión de Usuarios (Admin)

================================================================================
PARTE 6: BASE DE DATOS - ENTENDER CÓMO FUNCIONA
================================================================================

¿QUÉ ES LA BASE DE DATOS?
------------------------
La base de datos (cableworld.db) almacena todos tus datos:
   • Usuarios y sus contraseñas (encriptadas)
   • Manuales, pasos, imágenes
   • Árboles de decisión (Fibra)
   • FAQs
   • Historial de búsquedas
   • Notificaciones

Está alojada en: backend/cableworld.db

TIPO DE BASE DE DATOS
---------------------
SQLite - Una base de datos muy ligera que:
   ✓ Funciona sin servidor externo
   ✓ Se guarda en un archivo (.db)
   ✓ Es perfecta para pequeñas/medianas aplicaciones
   ✓ Muy fácil de hacer backup (solo copiar el archivo)

CREACIÓN AUTOMÁTICA
-------------------
Cuando inicias server.js por PRIMERA VEZ:

   1. El servidor verifica si cableworld.db existe
   2. Si NO existe, lo crea automáticamente
   3. Crea todas las tablas necesarias:
      • users       (usuarios y contraseñas)
      • manuals     (manuales y pasos)
      • decisionTree (árboles de decisión)
      • faqs        (preguntas frecuentes)
      • search_history (historial de búsquedas)
      • notifications (notificaciones)

   Ver en server.js - líneas 130-240

4. Crea el usuario admin usando ADMIN_PASSWORD de .env
5. Imprime: "✓ Base de datos conectada"

ESTRUCTURA DE TABLAS
-------------------

TABLA: users
┌─────────────────────────────────────────┐
│ id (UUID)      | Identificador único    │
│ username       | Nombre de usuario      │
│ email          | Email del usuario      │
│ password       | Contraseña (encriptada)│
│ role           | 'admin' o 'user'       │
│ name           | Nombre completo        │
│ passwordSet    | Si ya configuró pwd    │
│ created_at     | Fecha de creación      │
│ updated_at     | Última actualización   │
└─────────────────────────────────────────┘

TABLA: manuals
┌─────────────────────────────────────────┐
│ id             | Identificador único    │
│ title          | Título del manual      │
│ category       | Categoría              │
│ role           | Rol que puede verlo    │
│ type           | Tipo (procedimiento...)│
│ summary        | Resumen                │
│ content        | Pasos en HTML          │
│ created_by     | Usuario que lo creó    │
│ created_at     | Fecha de creación      │
│ updated_at     | Última actualización   │
└─────────────────────────────────────────┘

(Las otras tablas tienen estructura similar)

GESTIÓN DE LA BASE DE DATOS
---------------------------

VER EL CONTENIDO DE LA BASE DE DATOS
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Opción 1: Usar una herramienta GUI
   • Descarga DB Browser for SQLite: https://sqlitebrowser.org/
   • Abre backend/cableworld.db
   • Explora las tablas visualmente

Opción 2: Usar línea de comandos (sqlite3)
   • Instala sqlite3: https://www.sqlite.org/download.html
   • Ejecuta: sqlite3 backend/cableworld.db
   • Escribe SQL queries
   • Escribe: .tables (para ver todas las tablas)
   • Escribe: .exit (para salir)

HACER BACKUP DE LA BASE DE DATOS
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
La base de datos es un ARCHIVO, así que es muy fácil hacer backup:

   En PowerShell:
   
      # Crear carpeta de backup
      New-Item -ItemType Directory -Path .\backup -Force
      
      # Copiar base de datos
      Copy-Item .\backend\cableworld.db .\backup\cableworld-backup-$(Get-Date -Format 'yyyy-MM-dd-HHmm').db
      
      # O manualmente: copia backend/cableworld.db a otra carpeta

REINICIAR LA BASE DE DATOS
~~~~~~~~~~~~~~~~~~~~~~~~~
Si quieres empezar de cero (BORRA TODOS LOS DATOS):

   En PowerShell (desde carpeta del proyecto):
   
      Remove-Item .\backend\cableworld.db -Force -ErrorAction SilentlyContinue
      Write-Host "Base de datos eliminada"
   
   Luego reinicia el servidor:
   
      cd backend
      npm start
   
   El servidor creará una nueva base de datos vacía.

RESTAURAR UN BACKUP
~~~~~~~~~~~~~~~~~~~
Si cometiste un error y necesitas restaurar:

   1. Detén los servidores
   
   2. Elimina la base de datos actual:
      Remove-Item .\backend\cableworld.db -Force
   
   3. Copia tu backup:
      Copy-Item .\backup\cableworld-backup-2025-12-15-0900.db .\backend\cableworld.db
   
   4. Reinicia los servidores:
      npm start

TABLAS MÁS IMPORTANTES Y SUS FUNCIONES
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

users
   • Almacena: username, email, password (bcrypt), role
   • API que la usa: /api/login, /api/change-password, /api/users

manuals
   • Almacena: Manuales técnicos completos con pasos
   • API que la usa: /api/manuals, /api/manuals/:id

decisionTree
   • Almacena: Árboles de decisión (Fibra) con nodos y opciones
   • API que la usa: /api/decision-trees, /api/decision-trees/:id

faqs
   • Almacena: Preguntas frecuentes y sus respuestas
   • API que la usa: /api/faqs, /api/faqs/:id

search_history
   • Almacena: Historial de búsquedas del usuario
   • API que la usa: /api/search-history

Ver en server.js para más detalles: líneas 130-240 (createDB function)

================================================================================
PARTE 7: PARAR LOS SERVIDORES
================================================================================

OPCIÓN A: Usar script de Windows (MÁS FÁCIL)
--------------------------------------------
En la carpeta raíz del proyecto, ejecuta:

    .\detener-servidores.bat

Esto cerrará automáticamente ambas terminales.

OPCIÓN B: Parar manualmente cada servidor
------------------------------------------
En CADA terminal donde tengas un servidor ejecutándose:

   1. Presiona: Ctrl + C

   2. Si sale un mensaje, confirma con: Y

   Deberías ver:

      PS C:\Users\...\backend>

   Lo que significa que el servidor se detuvo.

3. Repite en la otra terminal.

OPCIÓN C: Cerrar las ventanas directamente
-------------------------------------------
Simplemente cierra las ventanas de PowerShell de los servidores:
   • Haz clic en la X de la ventana
   • O presiona Alt+F4

Los servidores se detendrán automáticamente.

================================================================================
PARTE 8: SOLUCIONAR PROBLEMAS COMUNES
================================================================================

PROBLEMA 1: "npm: The term 'npm' is not recognized"
---------------------------------------------------
CAUSA: Node.js no está instalado o no está en PATH

SOLUCIÓN:
   1. Descarga Node.js desde https://nodejs.org/
   2. Instala la versión LTS
   3. IMPORTANTE: Durante la instalación, marca:
      ☑ Add to PATH
      ☑ Add to Start Menu
   4. REINICIA tu computadora
   5. Abre una NUEVA ventana de PowerShell
   6. Ejecuta: node --version
   7. Debería mostrar un número de versión (ej: v18.17.0)

PROBLEMA 2: "Port 5000 is already in use" o "listen EADDRINUSE"
--------------------------------------------------------------
CAUSA: Otro proceso o instancia ya está usando el puerto 5000

SOLUCIÓN A: Cerrar la otra aplicación
   • Si tienes otro servidor Cableworld abierto, ciérralo
   • Si tienes otra aplicación en el puerto, ciérrala

SOLUCIÓN B: Cambiar el puerto en .env
   1. Abre backend/.env
   2. Busca: PORT=5000
   3. Cámbialo a: PORT=5001 (u otro número disponible)
   4. Guarda el archivo
   5. En frontend-server.js, busca http://localhost:5000
   6. Cámbialo a http://localhost:5001
   7. Reinicia los servidores

SOLUCIÓN C: Liberar el puerto manualmente (avanzado)
   En PowerShell como Administrador:
   
      netstat -ano | findstr :5000
   
   Anotarás un PID (número), luego:
   
      taskkill /PID 12345 /F
   
   (Reemplaza 12345 con el PID que salió)

PROBLEMA 3: "Cannot find module 'express'" o "Cannot find module 'bcrypt'"
------------------------------------------------------------------------
CAUSA: Las dependencias no se han instalado correctamente

SOLUCIÓN:
   1. Abre PowerShell en la carpeta backend:
      
         cd backend
      
   2. Instala las dependencias:
      
         npm install
      
   3. Espera a que termine (puede tardar 2-3 minutos)
   
   4. Si hay errores, intenta:
      
         npm install --legacy-peer-deps
      
   5. Si aún falla:
      
         rm -r node_modules -Force
         npm install

PROBLEMA 4: "Error: ENOENT: no such file or directory, open '.env'"
------------------------------------------------------------------
CAUSA: El archivo .env no existe en la carpeta backend/

SOLUCIÓN:
   1. Ve a la carpeta backend/
   2. Busca el archivo .env.example
   3. Cópialo:
      
      En PowerShell:
         cd backend
         Copy-Item .env.example .env
      
      O manualmente:
      • Clic derecho en .env.example
      • Copiar
      • Pegar en la misma carpeta
      • Renombrar a .env

PROBLEMA 5: Los emails de bienvenida no llegan
---------------------------------------------
CAUSA: Credenciales incorrectas o Gmail requiere configuración especial

SOLUCIÓN A: Verificar credenciales
   1. En Google, ve a https://myaccount.google.com/
   2. Verifica que tu email es correcto
   3. Abre backend/.env
   4. Busca: EMAIL_USER=tu-email@gmail.com
   5. Asegúrate de que es exactamente tu email de Google

SOLUCIÓN B: Generar nueva App Password
   1. Ve a https://myaccount.google.com/apppasswords
   2. Si NO ves esta opción:
      • Ve a Seguridad (https://myaccount.google.com/security)
      • Busca "Verificación en dos pasos"
      • Si NO está activada, actívalo primero
   3. Selecciona:
      • Aplicación: Mail
      • Dispositivo: Windows Computer
   4. Genera la contraseña (16 caracteres sin espacios)
   5. En backend/.env:
      EMAIL_USER=tu-email@gmail.com
      EMAIL_PASSWORD=xxxxxxxxxxxxxxxx
   6. Reinicia el servidor

SOLUCIÓN C: Deshabilitar emails (si no los necesitas)
   En backend/.env, simplemente elimina:
   EMAIL_USER=
   EMAIL_PASSWORD=
   
   Deja esos campos vacíos. El servidor funcionará sin enviar emails.

PROBLEMA 6: "Access denied" al crear archivos o "Database locked"
-----------------------------------------------------------------
CAUSA: Permisos de carpeta o la base de datos está bloqueada

SOLUCIÓN:
   1. Cierra todos los servidores (Ctrl+C en ambas terminales)
   2. Asegúrate de que cableworld.db NO está abierto en otra aplicación
   3. En PowerShell, ejecuta:
      
         Remove-Item .\backend\cableworld.db -Force -ErrorAction SilentlyContinue
      
   4. Reinicia los servidores:
      
         cd backend
         npm start

PROBLEMA 7: "TypeError: Cannot read property 'X' of undefined"
-------------------------------------------------------------
CAUSA: Error en el código JavaScript

SOLUCIÓN:
   1. Lee el error completo en la terminal
   2. Busca el nombre del archivo y la línea del error
   3. Abre ese archivo en un editor
   4. Verifica que la variable está definida
   5. Si es en app.js, búscala en JavaScript
   6. Si es en server.js, búscala en Node.js
   7. Si no sabes qué está mal, reinicia:
      • Detén ambos servidores
      • Cierra todas las ventanas
      • Abre nuevas terminales
      • Reinicia: npm start

PROBLEMA 8: No puedo ingresar al login (Error 401 o 403)
------------------------------------------------------
CAUSA: Credenciales incorrectas o base de datos vacía

SOLUCIÓN:
   1. Verifica que el backend está corriendo
      • Deberías ver "Cableworld Backend corriendo"
      • Si no lo ves, hay un error en el backend
   
   2. Verifica el usuario y contraseña:
      • Usuario: admin (por defecto, o lo que configuraste en .env)
      • Contraseña: Admin1234@ (por defecto, o lo que configuraste en .env)
      • Son SENSIBLES a mayúsculas (case-sensitive)
   
   3. Si olvidaste la contraseña:
      • Detén los servidores
      • Elimina backend/cableworld.db
      • Reinicia los servidores
      • Se creará una nueva BD con el usuario admin por defecto

PROBLEMA 9: "Error: listen EACCES: permission denied 0.0.0.0:3000"
-----------------------------------------------------------------
CAUSA: No tienes permiso para usar el puerto 3000 (problema de Linux/Mac)

SOLUCIÓN (Windows):
   Esta solución es principalmente para Linux/Mac. En Windows es raro.
   1. Cambia el puerto en frontend-server.js
      Busca: 3000
      Cámbialo a: 8080 (u otro número)
   2. Reinicia

SOLUCIÓN (Linux/Mac):
   1. Usa sudo: sudo node frontend-server.js
   2. O cambia a un puerto superior a 1024

PROBLEMA 10: La aplicación carga lentamente o no responde
---------------------------------------------------------
CAUSA: Servidor sobrecargado o recurso insuficiente

SOLUCIÓN:
   1. Cierra otras aplicaciones (navegadores, IDEs, etc.)
   2. Reinicia los servidores:
      • Ctrl+C en ambas terminales
      • npm start en backend
      • node frontend-server.js en frontend
   3. Espera 5-10 segundos a que se cargue
   4. Si sigue lento, verifica tu conexión de red

PROBLEMA 11: Cambios que hago no se reflejan en la aplicación
-------------------------------------------------------------
CAUSA: El navegador está usando cache o servidor no se reinició

SOLUCIÓN A: Limpiar cache del navegador
   • En Chrome: Ctrl+Shift+Delete
   • En Firefox: Ctrl+Shift+Delete
   • En Edge: Ctrl+Shift+Delete
   • Selecciona "Todas" o "Últimas 24 horas"
   • Presiona "Limpiar"

SOLUCIÓN B: Reload Forzado
   • Presiona: Ctrl+F5 (en la página de Cableworld)
   • Esto recarga la página y ignora el cache

SOLUCIÓN C: Reiniciar servidores
   1. Cierra ambos servidores (Ctrl+C)
   2. Abre nuevas terminales
   3. Inicia de nuevo:
      npm start (backend)
      node frontend-server.js (frontend)
   4. Reload en el navegador (F5 o Ctrl+R)

================================================================================
PARTE 9: DEPLOYMENT EN SERVIDOR (PRODUCCIÓN - LINUX/UBUNTU)
================================================================================

REQUISITOS PREVIOS
------------------
✓ Un servidor Linux (Ubuntu 20.04 LTS recomendado)
✓ Acceso SSH al servidor (usuario con permisos sudo)
✓ Un dominio propio (ej: cableworld.tuempresa.com)
✓ Conocimiento básico de línea de comandos

PASOS DETALLADOS
----------------

PASO 1: Conectar al servidor vía SSH
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Desde tu computadora Windows (PowerShell):

    ssh usuario@ip-del-servidor

Ejemplo:
    ssh admin@192.168.1.100

Te pedirá contraseña. Ingresa la contraseña del servidor.

PASO 2: Instalar Node.js y npm
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
En el servidor, ejecuta:

    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

Verifica:
    node --version
    npm --version

Debería mostrar algo como: v18.17.0 y npm 9.6.7

PASO 3: Descargar el código
~~~~~~~~~~~~~~~~~~~~~~~~~~~
En el servidor:

    cd /home/usuario
    wget https://link-a-tu-proyecto.zip
    unzip cableworld.zip
    cd cableworld

O si usas Git:

    git clone https://github.com/tuusuario/cableworld.git
    cd cableworld

PASO 4: Instalar dependencias
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    cd backend
    npm install

Espera a que termine (puede tardar 3-5 minutos en un servidor).

PASO 5: Configurar .env para producción
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    nano .env

O si prefieres:
    vi .env

Configura:

    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=TuContraseñaSegura123!
    ADMIN_EMAIL=admin@tuempresa.com
    
    EMAIL_USER=tu-email@gmail.com
    EMAIL_PASSWORD=tu-app-password-de-gmail
    
    APP_URL=https://cableworld.tuempresa.com
    PORT=5000

Presiona Ctrl+X, luego Y, luego Enter para guardar.

PASO 6: Instalar PM2 (Process Manager)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
PM2 mantendrá tus servidores corriendo incluso si se reinician:

    sudo npm install -g pm2

PASO 7: Iniciar servidores con PM2
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Desde la carpeta cableworld/:

    pm2 start backend/server.js --name "cableworld-backend"
    pm2 start frontend-server.js --name "cableworld-frontend"

Verifica que están corriendo:

    pm2 list

Deberías ver dos procesos con estado "online".

PASO 8: Configurar auto-inicio de PM2
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Para que los servidores se reinicien automáticamente:

    pm2 startup
    pm2 save

Sigue las instrucciones que aparecen en pantalla.

PASO 9: Instalar Nginx como proxy inverso
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Nginx actuará como intermediario seguro:

    sudo apt-get install -y nginx

Crear archivo de configuración:

    sudo nano /etc/nginx/sites-available/cableworld

Pega esto:

```
server {
    listen 80;
    server_name cableworld.tuempresa.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Guarda: Ctrl+X, Y, Enter

Habilita la configuración:

    sudo ln -s /etc/nginx/sites-available/cableworld /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx

PASO 10: Instalar certificado SSL (Let's Encrypt)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
HTTPS es OBLIGATORIO en producción:

    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot certonly --nginx -d cableworld.tuempresa.com

Sigue los pasos (ingresa email, acepta términos).

Actualiza la configuración de Nginx:

    sudo nano /etc/nginx/sites-available/cableworld

Reemplaza:
    listen 80;

Con:
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/cableworld.tuempresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cableworld.tuempresa.com/privkey.pem;

Reinicia Nginx:
    sudo systemctl restart nginx

PASO 11: Configurar renovación automática de SSL
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    sudo certbot renew --dry-run
    sudo systemctl enable certbot.timer

ACCESO FINAL
-----------
Tu aplicación está disponible en:

    https://cableworld.tuempresa.com

Login:
    Usuario: admin
    Contraseña: (la que configuraste en .env)

MONITOREO EN PRODUCCIÓN
~~~~~~~~~~~~~~~~~~~~~~~
Ver logs en tiempo real:

    pm2 logs

Ver estado de procesos:

    pm2 status

Reiniciar un proceso:

    pm2 restart cableworld-backend

Ver memoria/CPU:

    pm2 monit

PROBLEMAS COMUNES EN PRODUCCIÓN
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Error "502 Bad Gateway":
   • El backend no está corriendo
   • Ejecuta: pm2 list
   • Si no está "online", ejecuta: pm2 start backend/server.js --name "cableworld-backend"

Conexión rechazada en https:
   • SSL no está configurado correctamente
   • Verifica: sudo certbot certificates
   • Si falta, reinstala SSL (Paso 10)

Base de datos corrupta:
   • Verifica: ls -la backend/cableworld.db
   • Si está vacía, reinicia los servidores para recrearla
   • Restaura un backup si es necesario

BACKUP EN PRODUCCIÓN
~~~~~~~~~~~~~~~~~~~
Ejecutar diariamente (agregar a cron):

    crontab -e

Agregar:

    0 2 * * * cp /home/usuario/cableworld/backend/cableworld.db /home/usuario/backups/cableworld-$(date +\%Y-\%m-\%d).db

Esto hace backup todos los días a las 2 AM.

================================================================================
PARTE 10: PRIMEROS PASOS EN LA APLICACIÓN
================================================================================

CREAR USUARIOS
--------------
1. Inicia sesión como admin
2. Ve a Ajustes → Gestión de Usuarios (Administrador)
3. Completa:
   - Nombre de usuario
   - Nombre completo
   - Correo electrónico
   - Rol (Usuario o Administrador)
4. El usuario recibirá un email para configurar su contraseña
   (si EMAIL está configurado)

CREAR MANUALES
--------------
1. Ve a Manuales
2. Haz clic en "+ Crear Manual"
3. Completa la información:
   - Título
   - Categoría
   - Rol (qué usuarios ven este manual)
   - Tipo
   - Resumen
   - Pasos (con contenido HTML)

CREAR ÁRBOLES DE DECISIÓN (FIBRA)
---------------------------------
1. Ve a Fibra
2. Haz clic en "+ Crear Árbol de Decisión"
3. Diseña el árbol con:
   - Nodos de decisión
   - Opciones sí/no
   - Acciones finales

CREAR FAQs
----------
1. Ve a FAQs
2. Haz clic en "+ Crear FAQ"
3. Completa pregunta y respuesta

================================================================================
PARTE 11: SEGURIDAD RECOMENDADA
================================================================================

CHECKLIST ANTES DE PRODUCCIÓN
-----------------------------
Antes de llevar Cableworld a un servidor en producción:

   ☐ 1. Contraseña admin segura
        • Mínimo 8 caracteres
        • Incluir mayúsculas, minúsculas, números y símbolos
        • Cambiar de "Admin1234@"
   
   ☐ 2. Credenciales de email configuradas
        • EMAIL_USER y EMAIL_PASSWORD en .env
        • O dejar vacíos si no necesitas emails
   
   ☐ 3. HTTPS/SSL activado
        • Certificado de Let's Encrypt (gratuito)
        • URL comienza con https://
   
   ☐ 4. .env seguro
        • Contenido NO compartido
        • Cambiar ADMIN_PASSWORD a algo único
        • Cambiar APP_URL a tu dominio
   
   ☐ 5. Permisos de archivos correctos
        • backend/cableworld.db con permisos 600 (solo el usuario)
        • .env con permisos 600
   
   ☐ 6. Firewall configurado
        • Solo puertos 80 (HTTP) y 443 (HTTPS) abiertos
        • SSH en puerto 22 (acceso restringido)
   
   ☐ 7. Backup automático
        • Script cron diario para backup de cableworld.db
        • Guardar en carpeta diferente o servidor externo
   
   ☐ 8. Monitoreo activado
        • pm2 logs configurado
        • Alertas en caso de error
   
   ☐ 9. Acceso a base de datos limitado
        • SQLite solo accesible al usuario del servidor
        • NO exponer puerto 5000 a internet
   
   ☐ 10. Updates de Node.js planificados
        • Mantener Node.js actualizado
        • npm install -g npm para actualizar npm

ENCRIPTACIÓN DE CONTRASEÑAS
---------------------------
Las contraseñas de los usuarios se almacenan ENCRIPTADAS con bcrypt:

   • Algoritmo: bcrypt (hash irreversible)
   • Salt rounds: 10
   • Imposible recuperar contraseña original
   • Incluso administrador no puede ver contraseñas
   • Si usuario olvida, debe resetearla

En server.js (línea ~282):
   const hashedPassword = await bcrypt.hash(adminPassword, 10);

GESTIÓN DE CREDENCIALES
-----------------------
Dónde se guardan las credenciales:

   ADMIN_USERNAME    → backend/.env línea 2
   ADMIN_PASSWORD    → backend/.env línea 3 (se encripta)
   ADMIN_EMAIL       → backend/.env línea 4
   EMAIL_USER        → backend/.env línea 6
   EMAIL_PASSWORD    → backend/.env línea 7

NUNCA guardes en:
   ✗ Código JavaScript
   ✗ GitHub/repositorio público
   ✗ Comentarios en el código
   ✗ Archivos de texto sin protección

SIEMPRE usa:
   ✓ Archivo .env en carpeta backend/
   ✓ Ignorado en .gitignore
   ✓ NO versionado en Git

LOGS Y AUDITORÍA
----------------
Los servidores registran automáticamente:

   • Intentos de login (éxito y fracaso)
   • Creación/eliminación de usuarios (con ID de quien lo hizo)
   • Cambios en manuales y FAQs
   • Errores del servidor
   • Acceso a APIs

Ver logs:
   Con PM2:
      pm2 logs cableworld-backend
   
   O directamente:
      tail -f backend/nohup.out

PROTECCIÓN CONTRA ATAQUES COMUNES
---------------------------------

SQL Injection:
   ✓ Todas las queries usan prepared statements
   ✓ En server.js (línea ~400+):
     db.run('SELECT * FROM users WHERE username = ?', [username], ...)
   
   Nunca concatenar strings en SQL:
     ✗ db.run(`SELECT * FROM users WHERE username = '${username}'`)

Cross-Site Scripting (XSS):
   ✓ HTML user input se sanitiza en frontend
   ✓ Nunca confíes en datos del cliente
   ✓ En app.js, validar todos los inputs

CORS (Cross-Origin Resource Sharing):
   ✓ Configurado en server.js (línea ~15):
     app.use(cors());
   
   En producción, considera restringir a tu dominio:
     app.use(cors({ origin: 'https://cableworld.tuempresa.com' }));

BACKUP Y RECUPERACIÓN
---------------------

Hacer backup (Windows):
   
   powershell:
      $timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
      Copy-Item ".\backend\cableworld.db" ".\backups\cableworld-$timestamp.db"

Hacer backup (Linux):

   bash:
      timestamp=$(date +%Y-%m-%d-%H%M)
      cp backend/cableworld.db backup/cableworld-$timestamp.db

Restaurar backup:

   1. Detén los servidores
   2. Haz backup del archivo actual (por si acaso)
   3. Copia el archivo de backup:
      
      cp backup/cableworld-2025-12-15-1400.db backend/cableworld.db
   
   4. Reinicia los servidores

RECUPERACIÓN DE DESASTRES
------------------------

Si el servidor se bloquea:
   
   1. Conéctate vía SSH
   2. Verifica si backend/cableworld.db está corrupto:
      
         sqlite3 backend/cableworld.db "PRAGMA integrity_check;"
      
      Si salida es "ok": ✓ Sin problemas
      Si salida tiene errores: base de datos corrupta
   
   3. Si está corrupto, restaura del último backup:
      
         cp backup/cableworld-ultim.db backend/cableworld.db
   
   4. Reinicia servicios:
      
         pm2 restart all

================================================================================
PARTE 12: DOCUMENTACIÓN TÉCNICA Y SOPORTE
================================================================================

ARCHIVOS IMPORTANTES DEL PROYECTO
---------------------------------

   backend/server.js (1057 líneas)
   ├─ Contiene: Todas las APIs REST, base de datos, autenticación
   ├─ Puertos: Backend en 5000
   ├─ APIs principales:
   │  ├─ POST /api/login - Autenticación
   │  ├─ GET /api/manuals - Obtener manuales
   │  ├─ POST /api/change-password - Cambiar contraseña
   │  └─ (20+ endpoints más)
   └─ Variables de entorno: .env

   frontend-server.js
   ├─ Contiene: Servidor web simple para servir archivos
   ├─ Puerto: Frontend en 3000
   └─ Sirve: HTML, CSS, JavaScript desde carpetas html/, css/, js/

   js/app.js (5340+ líneas)
   ├─ Contiene: Toda la lógica del cliente
   ├─ Funciones principales:
   │  ├─ renderManualsView() - Ver manuales
   │  ├─ renderFibraView() - Árboles de decisión
   │  ├─ renderFaqsView() - FAQs
   │  ├─ changePassword() - Cambiar contraseña
   │  ├─ showAlert() - Diálogos personalizados
   │  └─ (100+ funciones más)
   └─ Eventos: onclick, oninput, etc.

   html/index.html
   ├─ Estructura: HTML principal
   ├─ Contiene: Todos los elementos de UI
   └─ Usa: CSS de styles.css

   css/styles.css
   ├─ Estilos: Tema actual (claro/oscuro)
   ├─ Animaciones: slideInUp, fadeIn, etc.
   └─ Responsive: Media queries para móvil

   backend/.env.example
   ├─ Plantilla: Variables de entorno
   ├─ NO usar directamente
   └─ Copiar a .env y rellenar valores

   backend/package.json
   ├─ Dependencias: Express, bcrypt, nodemailer, etc.
   ├─ Scripts: npm start, npm test
   └─ Versión: 1.0.0

DOCUMENTACIÓN TÉCNICA
---------------------

Ver: copilot-instructions.md (si existe en el proyecto)

Contiene:
   • Especificación de APIs
   • Esquema de base de datos
   • Flujos de autenticación
   • Estructura de datos JSON

OBTENER AYUDA
-------------

SI TIENES ERRORES:

1. LEE EL MENSAJE DE ERROR COMPLETO
   • En terminal, ve línea por línea
   • Busca "Error:" o "EADDRINUSE"

2. COMPRUEBA EL NÚMERO DE LÍNEA
   • Si error está en línea 261 de server.js
   • Abre server.js y ve a esa línea

3. BUSCA EN INTERNET
   • Copia el error exacto en Google
   • Incluye el nombre del archivo

4. INTENTA LAS SOLUCIONES (PARTE 8)
   • Lee "Solucionar Problemas Comunes"
   • Sigue las instrucciones paso a paso

5. SI AÚN NO FUNCIONA:
   • Reinicia los servidores
   • Cierra el navegador
   • Abre nuevas terminales
   • npm install (desde backend)
   • npm start

ESTRUCTURA DE CARPETAS EXPLICADA
--------------------------------

cableworld/
│
├── 📁 backend/                    (SERVIDOR)
│   ├── server.js                  → Servidor principal Node.js
│   ├── package.json               → Dependencias npm
│   ├── .env                       → Variables secretas (crear)
│   ├── .env.example               → Plantilla de .env
│   └── cableworld.db              → Base de datos (se crea sola)
│
├── 📁 html/                       (PÁGINAS)
│   └── index.html                 → Página principal
│
├── 📁 css/                        (ESTILOS)
│   └── styles.css                 → Todos los estilos CSS
│
├── 📁 js/                         (LÓGICA)
│   ├── app.js                     → Lógica principal (5340+ líneas)
│   ├── apiClient.js               → Cliente HTTP para APIs
│   ├── dataService.js             → Gestión de datos
│   └── search-clean.js            → Búsqueda
│
├── frontend-server.js             → Servidor del frontend
├── iniciar-servidores.bat         → Script para iniciar (Windows)
├── reiniciar-servidores.bat       → Script para reiniciar (Windows)
├── detener-servidores.bat         → Script para parar (Windows)
├── copilot-instructions.md        → Documentación de APIs
├── SETUP-INSTRUCCIONES.txt        → Este archivo
└── SETUP-COMPLETO.txt             → Guía completa

CÓMO FUNCIONA LA APLICACIÓN
---------------------------

1. Usuario abre navegador:
   http://localhost:3000

2. Frontend-server.js sirve:
   • HTML (index.html)
   • CSS (styles.css)
   • JavaScript (app.js)

3. Usuario ve el login

4. Usuario ingresa credenciales

5. app.js envía POST a:
   http://localhost:5000/api/login

6. server.js recibe solicitud

7. server.js verifica contraseña en sqlite3 (cableworld.db)

8. Si credenciales correctas:
   • server.js devuelve token
   • app.js guarda token en localStorage
   • app.js redirige a dashboard

9. Cada solicitud subsecuente incluye el token:
   • GET /api/manuals?token=ABC123
   • POST /api/manuals con token en headers

10. Token expira después de 7 días
    • Usuario debe login nuevamente

FLUJO DE AUTENTICACIÓN
---------------------

PRIMER INGRESO:
   1. Usuario: admin
   2. Contraseña: Admin1234@
   3. Login envía: POST /api/login
   4. server.js valida en BD
   5. Devuelve: { token: "ABC123", passwordSet: false }
   6. app.js ve passwordSet=false
   7. Muestra pantalla "Configurar Contraseña"
   8. Usuario ingresa nueva contraseña
   9. POST /api/change-password con nueva pwd
   10. server.js encripta con bcrypt
    11. BD se actualiza
    12. Redirige a dashboard

INGRESOS POSTERIORES:
   1. Usuario: admin
   2. Contraseña: (la nueva que configuró)
   3. Login normal → Dashboard

CAMBIAR CONTRASEÑA DESPUÉS:
   • Ajustes → Cambiar Contraseña
   • Completa: contraseña actual + nueva
   • server.js valida contraseña actual
   • Si es correcta, actualiza en BD

API ENDPOINTS PRINCIPALES
------------------------

AUTENTICACIÓN
   POST /api/login
      Body: { username, password }
      Return: { token, userId, role, passwordSet }

   POST /api/change-password
      Body: { userId, currentPassword, newPassword, confirmPassword }
      Return: { success: true }

MANUALES
   GET /api/manuals
      Return: Array de manuales

   GET /api/manuals/:id
      Return: Manual específico

   POST /api/manuals
      Body: { title, category, role, type, summary, content }
      Return: { id, success: true }

   PUT /api/manuals/:id
      Body: { título, category, ... }
      Return: { success: true }

   DELETE /api/manuals/:id
      Return: { success: true }

USUARIOS (ADMIN)
   GET /api/users
      Return: Array de usuarios

   POST /api/users
      Body: { username, email, role, name }
      Return: { id, success: true }

   DELETE /api/users/:id
      Return: { success: true }

(Ver copilot-instructions.md para lista completa)

RECURSO EXTERNOS RECOMENDADOS
-----------------------------

LEARNING:
   • Node.js Tutorial: https://nodejs.org/en/docs/
   • Express Guide: https://expressjs.com/
   • SQLite 3: https://www.sqlite.org/lang.html
   • JavaScript MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript

HERRAMIENTAS:
   • Postman: https://www.postman.com/ (Testear APIs)
   • DB Browser SQLite: https://sqlitebrowser.org/ (Ver BD)
   • VS Code: https://code.visualstudio.com/ (Editor)

DEVOPS:
   • PM2: https://pm2.keymetrics.io/ (Gestor de procesos)
   • Nginx: https://nginx.org/ (Proxy inverso)
   • Let's Encrypt: https://letsencrypt.org/ (SSL gratuito)
   • DigitalOcean: https://www.digitalocean.com/ (Hosting recomendado)

SECURITY:
   • OWASP: https://owasp.org/ (Seguridad web)
   • bcryptjs: https://github.com/dcodeIO/bcrypt.js (Encriptación)
   • Nodemailer: https://nodemailer.com/ (Emails)

================================================================================
                            FIN DEL DOCUMENTO
================================================================================

RESUMEN RÁPIDO DE COMANDOS ESENCIALES:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

INSTALAR (primera vez):
    cd backend
    npm install
    Copy-Item .env.example .env

CONFIGURAR (editar credenciales):
    notepad backend\.env

INICIAR (desarrollo):
    cd backend; npm start
    (en otra terminal) node frontend-server.js

INICIAR (Windows - automático):
    .\reiniciar-servidores.bat

PARAR:
    Ctrl+C en cada terminal
    O: .\detener-servidores.bat

PRODUCCIÓN:
    sudo npm install -g pm2
    pm2 start backend/server.js --name "cableworld-backend"
    pm2 start frontend-server.js --name "cableworld-frontend"
    pm2 logs

BACKUP:
    copy backend\cableworld.db backup\cableworld-backup.db

================================================================================

Última actualización: 15 de Diciembre de 2025
Versión: 2.5 (Completa con instrucciones detalladas de credenciales y deployment)

Autor: Cableworld Development Team
Licencia: Propietario

Para más ayuda o reportar problemas, contacta al administrador del servidor.

================================================================================

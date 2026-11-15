# Tenderito Web — PWA (Vite + React + TypeScript)

Versión Web y Progressive Web App (PWA) de **Tenderito**, la libreta de fiados digital para tiendas de barrio, desarrollada manteniendo **estricta paridad visual y funcional** con la aplicación móvil original en React Native.

---

## 🚀 Características Principales

1. **Paridad Visual Absoluta**:
   - Paleta institucional idéntica (`#FF6B00` primario, `#F7F9FC` fondo, semáforo de estados de mora y deuda).
   - Tipografías *Plus Jakarta Sans* y *Outfit*.
   - Bordes redondeados, sombras, iconografía (`react-icons/io5`), curvas fluidas de marca (`DynamicBrandCurves`) y animaciones de dinero (`AnimatedMoney`).
   - Contenedor responsive optimizado: centrado en escritorio/tablets (`max-width: 520px`) para replicar fielmente la experiencia móvil sin desfigurar la interfaz.

2. **Arquitectura Offline-First (SQLite WASM + IndexedDB)**:
   - Conserva la misma base de datos relacional y transaccional que utilizaba `react-native-quick-sqlite`.
   - Implementado mediante **`sql.js` (SQLite compilado a WebAssembly)** respaldado automáticamente en **IndexedDB** (`tenderito_pwa_db`).
   - Mismas tablas (`customers`, `credits`, `payments`, `parametrizacion`, `subscription_plans`), migraciones automáticas y triggers de balance.
   - Sincronización bidireccional continua con Supabase (`sync.ts`) con debouncing, resolución de conflictos y reintentos automáticos ante reconexión.

3. **Multi-Rol Completo**:
   - **Modo Tienda (Tendero)**:
     - Dashboard (`/dashboard`) con saldos totales, clientes con deuda, próximos a vencer, métricas y accesos rápidos.
     - Gestión de Clientes (`/customers`): búsqueda en vivo, filtros de saldo/mora, creación de clientes con validación en red.
     - Detalle de Cliente (`/customers/:id`): balance en tiempo real, límite de crédito, movimientos, nuevo fiado y nuevo abono.
     - Historial y Movimientos (`/customers/:id/history`).
     - Registro de Fiado (`/credits/new`) con cálculo de fechas de vencimiento y notas.
     - Registro de Abono (`/payments/new`) con cancelación en cascada de fiados según regla FIFO.
     - Cartera y Reportes (`/portfolio`, `/reports`) con filtros y exportación/impresión.
     - Estadísticas y Métricas del negocio (`/stats`).
     - Perfil y Configuración de Tienda (`/profile`).
   - **Modo Cliente (Portal de Consulta)**:
     - Acceso exclusivo para clientes (`/customer-home`) donde visualizan sus saldos pendientes por tienda, detalle de fiados, abonos realizados y estados de cuenta.

4. **Capacidades PWA (Progressive Web App)**:
   - Instalable en Android, iOS, Windows y macOS.
   - Manifiesto completo (`manifest.webmanifest`) en modo `standalone`.
   - Service Worker (`sw.js` mediante Workbox) con precaché de assets, fuentes, imágenes y el binario WebAssembly (`sql-wasm.wasm`).
   - Capacidad total de operación sin conexión a internet.

---

## 🛠️ Estructura del Proyecto

```
tenderito-web/
├── public/
│   ├── logo.png                # Icono de la PWA
│   ├── sql-wasm.wasm           # Binario SQLite WebAssembly
│   └── favicon.svg
├── src/
│   ├── assets/                 # Logotipos y fondos originales
│   ├── components/
│   │   ├── ui/                 # Botones, Cards, Inputs, Modales, TabBar, Header, Curvas
│   │   └── CreateCustomerModal.tsx
│   ├── context/
│   │   └── AuthContext.tsx     # Contexto de autenticación, roles y sesión
│   ├── database/
│   │   ├── db.ts               # Conexión SQLite WASM + persistencia IndexedDB
│   │   ├── schema.ts           # DDL relacional idéntico a React Native
│   │   ├── migrations.ts       # Migrador automático
│   │   └── tables/             # Módulos DDL por entidad
│   ├── hooks/
│   │   ├── useDatabase.ts      # Inicialización y recuperación de BD
│   │   ├── useSync.ts          # Sincronización automática con Supabase
│   │   ├── useMutationWithSync.ts
│   │   └── useResponsive.ts
│   ├── lib/
│   │   ├── asyncStorage.ts     # Wrapper localStorage API AsyncStorage
│   │   ├── netInfo.ts          # Wrapper eventos online/offline navigator
│   │   ├── supabase.ts         # Cliente Supabase Web
│   │   └── queryClient.ts      # Configuración TanStack React Query
│   ├── navigation/
│   │   └── RootNavigator.tsx   # Enrutador por roles y estado de autenticación
│   ├── screens/                # Todas las pantallas replicadas fielmente
│   ├── services/               # Lógica de negocio (credits, customers, sync, etc.)
│   ├── types/                  # Modelos de datos TypeScript
│   ├── utils/                  # Formateadores COP, TimeZone Bogotá, alertas
│   ├── theme.ts                # Tokens de diseño idénticos al proyecto móvil
│   ├── App.tsx
│   └── main.tsx
├── .env                        # Variables Supabase configuradas
├── vite.config.ts              # Configuración Vite + VitePWA
└── package.json
```

---

## 💻 Requisitos y Puesta en Marcha

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Variables de Entorno
El archivo `.env` ya se encuentra configurado con las credenciales de Supabase del proyecto original:
```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

### 3. Modo Desarrollo
Para iniciar el servidor local con Hot Module Replacement (HMR):
```bash
npm run dev
```

### 4. Compilación para Producción (Build)
Para generar el paquete optimizado y los Service Workers de la PWA:
```bash
npm run build
```
Los archivos estáticos listos para desplegar quedarán en la carpeta `dist/`.

### 5. Probar Build de Producción Localmente
```bash
npm run preview
```

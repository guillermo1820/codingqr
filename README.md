# Sistema de Cálculo de Matrices con Factorización QR

Este proyecto implementa un sistema completo para el cálculo de factorización QR de matrices y análisis estadístico, utilizando microservicios con Go Fiber, Node.js Express, y un frontend en Angular.

## Arquitectura del Sistema

### Componentes

1. **API Go Fiber** (`go-api/`): Realiza la factorización QR de matrices
2. **API Node.js Express** (`node-api/`): Calcula estadísticas de las matrices
3. **Frontend Angular** (`angular-frontend/`): Interfaz de usuario web
4. **Autenticación JWT**: Protección de todas las APIs
5. **Docker**: Contenerización de todas las aplicaciones


## Funcionalidades

### API Go Fiber (Puerto 8080)
- Factorización QR usando el método de Gram-Schmidt
- Autenticación JWT
- Validación de matrices rectangulares
- Endpoints:
  - `POST /api/qr-with-stats` - Factorización QR + estadisticas
  - `GET /health` - Estado del servicio

### API Node.js Express (Puerto 3000)
- Cálculo de estadísticas de matrices
- Comunicación con API Go
- Endpoints:
  - `POST /api/login` - Autenticación
  - `POST /api/stats` - Solo estadísticas
  - `GET /health` - Estado del servicio

### Frontend Angular (Puerto 4200)
- Interfaz de usuario intuitiva
- Configuración de matrices
- Visualización de resultados
- Autenticación integrada

## Instalación y Ejecución

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- Go 1.21+ (para desarrollo local)

### Ejecución con Docker Compose

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd matrix-calculator
```

2. **Construir y ejecutar todos los servicios**
```bash
docker-compose up --build
```

3. **Acceder a la aplicación**
- Frontend: http://localhost:4200
- API Go: http://localhost:8080
- API Node.js: http://localhost:3000

### Desarrollo Local

#### API Go Fiber
```bash
cd go-api
go mod tidy
go run main.go
```

#### API Node.js
```bash
cd node-api
npm install
npm start
```

#### Frontend Angular
```bash
cd angular-frontend
npm install
npm start
```

3. **Acceder a la aplicación (Local)**
- Frontend: http://localhost:4200
- API Go: http://localhost:8080
- API Node.js: http://localhost:3000


## Autenticación

### Credenciales del Login por Defecto
- **Usuario**: `demo`
- **Contraseña**: `demo`

### Uso de JWT
Todas las APIs requieren autenticación JWT. El token se obtiene mediante el endpoint `/api/login` de la API en Node.js y debe incluirse en el header `Authorization: Bearer <token>`.


## Estructura del Proyecto

```
├── go-api/                 # API en Go Fiber
│   ├── main.go            # Servidor principal
│   ├── main_test.go       # Pruebas unitarias
│   ├── go.mod             # Dependencias Go
│   └── Dockerfile         # Imagen Docker
├── node-api/              # API en Node.js
│   ├── server.js          # Servidor principal
│   ├── tests/             # Pruebas
│   ├── package.json       # Dependencias Node.js
│   └── Dockerfile         # Imagen Docker
├── angular-frontend/      # Frontend Angular
│   ├── src/               # Código fuente
│   ├── package.json       # Dependencias Angular
│   └── Dockerfile         # Imagen Docker
├── docker-compose.yml     # Orquestación de servicios
└── README.md             # Documentación
```

## Características Técnicas

### Seguridad
- Autenticación JWT en todas las APIs
- Rate limiting en API Node.js
- Validación de entrada en todos los endpoints
- Headers de seguridad con Helmet.js

### Performance
- Factorización QR optimizada con Gram-Schmidt
- Cálculo eficiente de estadísticas
- Caché de tokens JWT

## Contacto

**Guillermo Cirilo** - guillermo.cirilo@interseguro.com.pe

Proyecto desarrollado como parte del Reto IS

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración
const JWT_SECRET = 'guillermo.cirilo';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por IP
});
app.use(limiter);

// Middleware de autenticación JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  //console.log('authHeader ->', authHeader);
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de autorización requerido'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }
    req.user = user;
    next();
  });
};




// Ruta de login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'demo' && password === 'demo') {
    const token = jwt.sign(
      { username: username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: token,
      message: 'Login exitoso'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    });
  }
});




// Ruta invocada desde Go-API para calcular estadísticas de matrices existentes
app.post('/api/stats', authenticateToken, (req, res) => {
  try {
    const { matrices } = req.body;
    //console.log('matrices ->', matrices);

    if (!matrices || !Array.isArray(matrices) || matrices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron matrices válidas'
      });
    }

    const stats = calculateMatrixStats(matrices);

    res.json({
      success: true,
      ...stats,
      message: 'Estadísticas calculadas exitosamente usando Node.js'
    });

  } catch (error) {
    console.error('Error calculando estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});




// Función para calcular estadísticas de matrices
function calculateMatrixStats(matrices) {
  let maxValue = -Infinity;
  let minValue = Infinity;
  let totalSum = 0;
  let totalElements = 0;
  let isDiagonal = true;

  //1. itero cada matriz
  matrices.forEach(matrix => {
    if (!Array.isArray(matrix)) return;

    //2. itero cada fila
    matrix.forEach((row, i) => {
      if (!Array.isArray(row)) return;

      //3itero cada valor
      row.forEach((value, j) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        // Actualizar valores extremos
        if (numValue > maxValue) {
          maxValue = numValue;
        }
        if (numValue < minValue) {
          minValue = numValue;
        }

        totalSum += numValue;
        totalElements++;

        // Verificar si es diagonal (solo para matrices cuadradas)
        if (matrix.length === row.length && i !== j && Math.abs(numValue) > 1e-10) {
          isDiagonal = false;
        }
      });
    });
  });

  const promedio = totalElements > 0 ? totalSum / totalElements : 0;

  return { //Los valores se redondean a 3 decimales Math.round(valor * 1000) / 1000
    maxValue: maxValue === -Infinity ? 0 : Math.round(maxValue * 1000) / 1000,
    minValue: minValue === Infinity ? 0 : Math.round(minValue * 1000) / 1000,
    promedio: Math.round(promedio * 1000) / 1000,
    totalSum: Math.round(totalSum * 1000) / 1000,
    isDiagonal: isDiagonal,
    totalElements: totalElements
  };
}




// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Node.js Stats API',
    timestamp: new Date().toISOString()
  });
});






// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});




// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor Node.js iniciado en puerto ${PORT}`);
});

module.exports = app;

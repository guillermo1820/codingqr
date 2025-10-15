package main

import (
	"log"
	"math"
	"bytes"
    "encoding/json"
    "fmt"
    "net/http"
	"os"
    "time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/golang-jwt/jwt/v5"
)


var (
    nodeAPIURL = getEnv("NODE_API_URL", "http://localhost:3000")
)

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

// StatsRequest representa la petición para calcular estadísticas
type StatsRequest struct {
    Matrices [][][]float64 `json:"matrices"`
}

// StatsResponse representa la respuesta de estadísticas
type StatsResponse struct {
    Success      bool    `json:"success"`
    MaxValue     float64 `json:"maxValue"`
    MinValue     float64 `json:"minValue"`
    Promedio     float64 `json:"promedio"`
    TotalSum     float64 `json:"totalSum"`
    IsDiagonal   bool    `json:"isDiagonal"`
    TotalElements int    `json:"totalElements"`
    Message      string  `json:"message"`
}

// Matrix representa una matriz rectangular
type Matrix struct {
	Data [][]float64 `json:"data"`
}

// QRResult representa el resultado de la factorización QR
type QRResult struct {
	Q [][]float64 `json:"Q"`
	R [][]float64 `json:"R"`
}

// QRRequest representa la petición para factorización QR
type QRRequest struct {
	Matrix Matrix `json:"matrix"`
}

// QRResponse representa la respuesta de la factorización QR
type QRResponse struct {
	Success bool     `json:"success"`
	Result  QRResult `json:"result"`
	Message string   `json:"message"`
}


// Claims para JWT
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

var jwtKey = []byte("guillermo.cirilo")




func main() {
	app := fiber.New()

	// Middleware
	app.Use(cors.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

    // Ruta que incluye estadísticas
    app.Post("/api/qr-with-stats", authenticateToken, performQRFactorizationWithStats)

	// Ruta de salud
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "Go QR API",
		})
	})

	log.Println("Servidor Go Fiber iniciado en puerto 8080")
	log.Fatal(app.Listen(":8080"))
}



// authenticateToken middleware para verificar JWT
func authenticateToken(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"message": "Token de autorización requerido",
		})
	}

	tokenString := authHeader[7:] // Remover "Bearer "

	claims := &Claims{}

	//token: es el token JWT parseado y validado
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	//Si no hay token o es inválido
	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"message": "Token inválido",
		})
	}

	c.Locals("user", claims.Username)
	return c.Next()
}


// Función que realiza QR y luego envía las matrices a Node.js
func performQRFactorizationWithStats(c *fiber.Ctx) error {
    var req QRRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(QRResponse{
            Success: false,
            Message: "Error al parsear la matriz",
        })
    }

    matrix := req.Matrix.Data
    if len(matrix) == 0 || len(matrix[0]) == 0 {
        return c.Status(400).JSON(QRResponse{
            Success: false,
            Message: "Matriz vacía",
        })
    }

    // Verificar que la matriz sea rectangular
    rows := len(matrix)
    cols := len(matrix[0])
    for i := 1; i < rows; i++ {
        if len(matrix[i]) != cols {
            return c.Status(400).JSON(QRResponse{
                Success: false,
                Message: "La matriz debe ser rectangular",
            })
        }
    }

    // Realizar factorización QR
    Q, R := gramSchmidtQR(matrix)

    // Obtener token de autenticación del header
    authHeader := c.Get("Authorization")
    if authHeader == "" {
        return c.Status(401).JSON(QRResponse{
            Success: false,
            Message: "Token de autorización requerido",
        })
    }

	//INVOCA API NODE.JS enviando matrices Q y R y obtener el calculo de estadísticas
    statsResponse, err := sendMatricesToStatsAPI(Q, R, authHeader)
    if err != nil {
        // Log del error pero continuar con la respuesta QR
        fmt.Printf("Error enviando matrices a Node.js: %v\n", err)
    }

    // Preparar respuesta con QR y estadísticas
    response := QRResponse{
        Success: true,
        Result: QRResult{
            Q: Q,
            R: R,
        },
        Message: "Factorización QR completada exitosamente en Go-API",
    }

    // Si se obtuvieron estadísticas, incluirlas en la respuesta
    if statsResponse != nil && statsResponse.Success {
        // Crear una respuesta extendida que incluya las estadísticas
        extendedResponse := map[string]interface{}{
            "success": true,
            "result": QRResult{
                Q: Q,
                R: R,
            },
            "message": "Factorización QR completada exitosamente en Go-API",
            "statistics": map[string]interface{}{
                "maxValue":     statsResponse.MaxValue,
                "minValue":     statsResponse.MinValue,
                "promedio":     statsResponse.Promedio,
                "totalSum":     statsResponse.TotalSum,
                "isDiagonal":   statsResponse.IsDiagonal,
                "totalElements": statsResponse.TotalElements,
            },
        }
        return c.JSON(extendedResponse)
    }

    return c.JSON(response)
}



// Función que INVOCA al API Node.js enviando matrices Q y R y obtener el calculo de estadísticas
func sendMatricesToStatsAPI(Q, R [][]float64, authToken string) (*StatsResponse, error) {
    // Preparar las matrices para enviar
    matrices := [][][]float64{Q, R}
    	
    requestData := StatsRequest{
        Matrices: matrices,
    }
    
    // Convertir a JSON
    jsonData, err := json.Marshal(requestData)
    if err != nil {
        return nil, fmt.Errorf("error al serializar datos: %v", err)
    }

    // Crear la petición HTTP
    req, err := http.NewRequest("POST", nodeAPIURL+"/api/stats", bytes.NewBuffer(jsonData))
    if err != nil {
        return nil, fmt.Errorf("error al crear petición: %v", err)
    }
    
    // Configurar headers
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", authToken)
	//fmt.Printf("Header Authorization: %s\n", req.Header.Get("Authorization"))
    
    // Crear cliente HTTP con timeout
    client := &http.Client{
        Timeout: 30 * time.Second,
    }

    // Enviar petición
    resp, err := client.Do(req)
    if err != nil {
        return nil, fmt.Errorf("error al enviar petición: %v", err)
    }
    defer resp.Body.Close()
    
    // Verificar status code
    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API retornó status %d", resp.StatusCode)
    }
    
    // Decodificar respuesta
    var statsResponse StatsResponse
    if err := json.NewDecoder(resp.Body).Decode(&statsResponse); err != nil {
        return nil, fmt.Errorf("error al decodificar respuesta: %v", err)
    }
    
    return &statsResponse, nil
}


// gramSchmidtQR implementa la factorización QR usando Gram-Schmidt
func gramSchmidtQR(matrix [][]float64) ([][]float64, [][]float64) {
	rows := len(matrix)
	cols := len(matrix[0])

	// Inicializar matrices Q y R
	Q := make([][]float64, rows)
	R := make([][]float64, cols)
	for i := range Q {
		Q[i] = make([]float64, cols)
	}
	for i := range R {
		R[i] = make([]float64, cols)
	}

	// Proceso de Gram-Schmidt
	for j := 0; j < cols; j++ {
		// Copiar columna j de la matriz original
		for i := 0; i < rows; i++ {
			Q[i][j] = matrix[i][j]
		}

		// Restar proyecciones sobre las columnas anteriores
		for k := 0; k < j; k++ {
			// Calcular producto punto
			dot := 0.0
			for i := 0; i < rows; i++ {
				dot += Q[i][k] * matrix[i][j]
			}
			R[k][j] = dot

			// Restar proyección
			for i := 0; i < rows; i++ {
				Q[i][j] -= R[k][j] * Q[i][k]
			}
		}

		// Normalizar la columna
		norm := 0.0
		for i := 0; i < rows; i++ {
			norm += Q[i][j] * Q[i][j]
		}
		norm = math.Sqrt(norm)

		if norm > 1e-10 {
			R[j][j] = norm
			for i := 0; i < rows; i++ {
				Q[i][j] /= norm
			}
		} else {
			R[j][j] = 0
		}
	}

	return Q, R
}

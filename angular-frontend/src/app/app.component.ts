import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Calculadora de Matrices';
  
  loginForm: FormGroup;
  matrixForm: FormGroup;
  isLoggedIn = false;
  isLoading = false;
  
  // Resultados
  qrResult: any = null;
  statistics: any = null;
  
  // Matriz de entrada
  matrixInput: number[][] = [];
  matrixSize = { rows: 2, cols: 2 };

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.matrixForm = this.fb.group({
      matrix: ['', Validators.required]
    });

    this.initializeMatrix();
  }

  ngOnInit(): void {
    // Verificar si hay token guardado
    const token = localStorage.getItem('token');
    if (token) {
      this.isLoggedIn = true;
    }
  }

  initializeMatrix(): void {
    this.matrixInput = [];
    for (let i = 0; i < this.matrixSize.rows; i++) {
      this.matrixInput[i] = [];
      for (let j = 0; j < this.matrixSize.cols; j++) {
        this.matrixInput[i][j] = 0;
      }
    }
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      
      this.apiService.login(username, password).subscribe({
        next: (response) => {
          if (response.success) {
            localStorage.setItem('token', response.token); //guardo el token en el localStorage
            this.isLoggedIn = true;
            this.snackBar.open('Login exitoso', 'Cerrar', { duration: 3000 });
          }
        },
        error: (error) => {
          this.snackBar.open('Error en el login: ' + error.error.message, 'Cerrar', { duration: 5000 });
        }
      });
    }
  }

  onLogout(): void {
    localStorage.removeItem('token');
    this.isLoggedIn = false;
    this.qrResult = null;
    this.statistics = null;
    this.snackBar.open('Sesión cerrada', 'Cerrar', { duration: 3000 });
  }

  updateMatrixSize(): void {
    this.initializeMatrix();
  }

  processMatrix(): void {
    if (!this.isLoggedIn) {
      this.snackBar.open('Debe iniciar sesión primero', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.matrixSize.rows < this.matrixSize.cols) {
      this.snackBar.open('La matriz debe tener más filas que columnas', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    //Invocamos la factorización QR en Go-Api
    this.apiService.getQRFactorizationWithStats(this.matrixInput).subscribe({
      next: (response) => this.handleQRWithStatsResponse(response),
      error: (error) => this.handleError(error)
    });
  }

  private handleQRWithStatsResponse(response: any): void {
    if (response.success) {
      this.qrResult = response.result;
      this.statistics = response.statistics; // ← Recibir estadísticas directamente
      this.isLoading = false;
      this.snackBar.open('Matriz procesada exitosamente', 'Cerrar', { duration: 3000 });
    } else {
      this.handleError(new Error('QR factorization failed'));
    }
  }

  private handleError(error: any): void {
    this.snackBar.open('Error procesando matriz: ' + error.error?.message || error.message, 'Cerrar', { duration: 5000 });
    this.isLoading = false;
  }




  generateRandomMatrix(): void {
    if (this.matrixSize.rows < this.matrixSize.cols) {
      this.snackBar.open('La matriz debe tener más filas que columnas', 'Cerrar', { duration: 3000 });
      return;
    }
    
    for (let i = 0; i < this.matrixSize.rows; i++) {
      for (let j = 0; j < this.matrixSize.cols; j++) {
        this.matrixInput[i][j] = Math.round((Math.random() * 20 - 10) * 100) / 100;
      }
    }
    
    this.qrResult = null;
    this.statistics = null;
  }

  clearMatrix(): void {
    this.initializeMatrix();
    this.qrResult = null;
    this.statistics = null;
  }

  formatNumber(num: number): string {
    return num.toFixed(3);
  }


}

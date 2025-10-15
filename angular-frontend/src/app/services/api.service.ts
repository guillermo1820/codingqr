import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly GO_API_URL = 'http://localhost:8080';
  private readonly NODE_API_URL = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  
  //Invoca a la Api en Node JS para el login
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.NODE_API_URL}/api/login`, {
      username,
      password
    });
  }


  //Invoca a la Api Go para la factorización y devuelve las matrices Q y R + estadisticas
  getQRFactorizationWithStats(matrix: number[][]): Observable<any> {
    return this.http.post(`${this.GO_API_URL}/api/qr-with-stats`, {
      matrix: { data: matrix }
    }, { headers: this.getHeaders() }); //headers: el token JWT
  }

}

import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [RouterOutlet, CommonModule],
  styleUrl: './app.scss'
})
export class App {
  protected title = 'vetplus-frontend';
  private authService = inject(AuthService);

  constructor(private router: Router) {}

  public goToLogin() {
    this.router.navigate(['/login']);
  }

  public testClick() {
    console.log('🚨 TEST CLICK FUNCIONANDO!');
    alert('Angular está funcionando correctamente!');
  }

  public getAuthStatus() {
    return this.authService.authStatus();
  }

  public getCurrentUser() {
    return this.authService.currentUser();
  }

  public getCurrentTime() {
    return new Date().toLocaleString();
  }

  public getUserData() {
    const user = this.authService.currentUser();
    return user ? JSON.stringify(user) : 'null';
  }
}

import { Component, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ConfiguracionService } from './services/configuracion.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  imports: [RouterOutlet, CommonModule],
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Ramelo';
  private authService = inject(AuthService);
  private configuracionService = inject(ConfiguracionService);

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.updateBrowserTitle());

    effect(() => {
      this.configuracionService.empresaConfig();
      this.updateBrowserTitle();
    });

    this.updateBrowserTitle();
  }

  private updateBrowserTitle(): void {
    if (typeof document === 'undefined') return;

    const url = this.router.url || '';
    const isSuperadminRoute = url.startsWith('/superadmin');

    if (isSuperadminRoute) {
      document.title = 'Superadmin';
      return;
    }

    const empresa = this.configuracionService.empresaConfig();
    const nombreEmpresa = empresa?.nombre_empresa?.trim();
    document.title = nombreEmpresa || 'Ramelo';
  }

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

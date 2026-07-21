import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SuperadminAuthService } from '../../services/superadmin-auth.service';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './superadmin-layout.component.html',
  styleUrls: ['./superadmin-layout.component.scss']
})
export class SuperadminLayoutComponent {
  readonly svc = inject(SuperadminAuthService);

  logout(): void {
    this.svc.logout();
  }
}

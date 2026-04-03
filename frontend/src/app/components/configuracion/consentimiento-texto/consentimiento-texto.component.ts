import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { ConfiguracionService } from '../../../services/configuracion.service';

@Component({
  selector: 'app-consentimiento-texto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    RouterLink
  ],
  templateUrl: './consentimiento-texto.component.html',
  styleUrl: './consentimiento-texto.component.css'
})
export class ConsentimientoTextoComponent implements OnInit {
  cargando = signal(true);
  guardando = signal(false);
  versionActual = signal<{ id_version: number; titulo: string; created_at: string } | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private configuracionService: ConfiguracionService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      textoLegal: ['', [Validators.required, Validators.minLength(20)]]
    });
  }

  ngOnInit(): void {
    this.cargarTexto();
  }

  private cargarTexto(): void {
    this.cargando.set(true);
    this.configuracionService.getTextoConsentimiento().subscribe({
      next: ({ version }) => {
        this.versionActual.set({ id_version: version.id_version, titulo: version.titulo, created_at: version.created_at });
        this.form.patchValue({ titulo: version.titulo, textoLegal: version.texto_legal });
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('Error al cargar el texto del consentimiento', 'Cerrar', { duration: 3000 });
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { titulo, textoLegal } = this.form.value;
    this.guardando.set(true);

    this.configuracionService.updateTextoConsentimiento(titulo, textoLegal).subscribe({
      next: ({ message, version }) => {
        this.guardando.set(false);
        this.versionActual.set({ id_version: version.id_version, titulo: version.titulo, created_at: version.created_at });
        this.snackBar.open(message, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open(err.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }
}

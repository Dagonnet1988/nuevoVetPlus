import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { Observable, map, startWith, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { ClientesService } from '../../../services/clientes.service';

interface Cliente {
  id_cliente: string;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

@Component({
  selector: 'app-cliente-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <div class="cliente-selector">
      <!-- Campo de búsqueda -->
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Buscar Cliente</mat-label>
        <input matInput
               [formControl]="searchControl"
               [matAutocomplete]="auto"
               placeholder="Nombre, documento o teléfono"
               (blur)="onBlur()">
        <mat-icon matSuffix>search</mat-icon>
        @if (searchControl.value && !clienteSeleccionado()) {
          <button mat-icon-button matSuffix (click)="limpiarBusqueda()" aria-label="Limpiar">
            <mat-icon>clear</mat-icon>
          </button>
        }
      </mat-form-field>

      <mat-autocomplete #auto="matAutocomplete"
                       [displayWith]="displayCliente"
                       (optionSelected)="onClienteSeleccionado($event)">
        @for (cliente of clientesFiltrados$ | async; track cliente.id_cliente) {
          <mat-option [value]="cliente">
            <div class="cliente-option">
              <div class="cliente-info">
                <strong>{{ cliente.nombre }}</strong>
                <small class="cliente-documento">📄 {{ cliente.documento }}</small>
              </div>
              @if (cliente.telefono) {
                <small class="cliente-contacto">📞 {{ cliente.telefono }}</small>
              }
            </div>
          </mat-option>
        }
        @if ((clientesFiltrados$ | async)?.length === 0 && (searchControl.value?.length || 0) >= 2) {
          <mat-option disabled>
            <div class="no-results">
              <mat-icon>search_off</mat-icon>
              <span>No se encontraron clientes</span>
            </div>
          </mat-option>
        }
      </mat-autocomplete>

      <!-- Cliente seleccionado -->
      @if (clienteSeleccionado()) {
        <mat-card class="cliente-card">
          <mat-card-content>
            <div class="cliente-header">
              <div class="cliente-avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="cliente-details">
                <h4>{{ clienteSeleccionado()?.nombre }}</h4>
                <p class="cliente-documento">📄 {{ clienteSeleccionado()?.documento }}</p>
              </div>
              <button mat-icon-button (click)="removerCliente()" aria-label="Remover cliente">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="cliente-contact-info">
              @if (clienteSeleccionado()?.telefono) {
                <mat-chip>
                  <mat-icon>phone</mat-icon>
                  {{ clienteSeleccionado()?.telefono }}
                </mat-chip>
              }
              @if (clienteSeleccionado()?.email) {
                <mat-chip>
                  <mat-icon>email</mat-icon>
                  {{ clienteSeleccionado()?.email }}
                </mat-chip>
              }
            </div>

            @if (clienteSeleccionado()?.direccion) {
              <div class="cliente-address">
                <mat-icon>location_on</mat-icon>
                <span>{{ clienteSeleccionado()?.direccion }}</span>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Acciones -->
      <div class="selector-actions">
        <button mat-stroked-button (click)="crearNuevoCliente()">
          <mat-icon>add</mat-icon>
          Nuevo Cliente
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cliente-selector {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .search-field {
      width: 100%;
    }

    .cliente-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .cliente-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cliente-documento {
      color: #666;
      font-size: 12px;
    }

    .cliente-contacto {
      color: #666;
      font-size: 11px;
    }

    .no-results {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
    }

    .cliente-card {
      margin-top: 8px;
    }

    .cliente-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .cliente-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #e3f2fd;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1976d2;
    }

    .cliente-details {
      flex: 1;
    }

    .cliente-details h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .cliente-contact-info {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .cliente-address {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-size: 14px;
    }

    .selector-actions {
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .cliente-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .cliente-contact-info {
        justify-content: center;
      }
    }
  `]
})
export class ClienteSelectorComponent {
  @Output() clienteSeleccionadoChange = new EventEmitter<Cliente | null>();

  private clientesService = inject(ClientesService);

  searchControl = new FormControl('');
  clientesFiltrados$!: Observable<Cliente[]>;
  clienteSeleccionado = signal<Cliente | null>(null);

  constructor() {
    this.setupAutocomplete();
  }

  private setupAutocomplete() {
    this.clientesFiltrados$ = this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || term.length < 2) {
          return of([]);
        }
        return this.buscarClientes(term);
      })
    );
  }

  private buscarClientes(termino: string): Observable<Cliente[]> {
    // Aquí implementar la búsqueda real de clientes
    // Por ahora retornamos datos de ejemplo
    return of([
      {
        id_cliente: '1',
        nombre: 'María González',
        documento: '12345678',
        telefono: '+57 300 123 4567',
        email: 'maria@email.com',
        direccion: 'Calle 123 # 45-67, Bogotá'
      },
      {
        id_cliente: '2',
        nombre: 'Juan Pérez',
        documento: '87654321',
        telefono: '+57 301 987 6543',
        email: 'juan@email.com',
        direccion: 'Carrera 45 # 67-89, Medellín'
      }
    ].filter(cliente =>
      cliente.nombre.toLowerCase().includes(termino.toLowerCase()) ||
      cliente.documento.includes(termino) ||
      cliente.telefono?.includes(termino)
    ));
  }

  onClienteSeleccionado(event: MatAutocompleteSelectedEvent) {
    const cliente = event.option.value;
    this.clienteSeleccionado.set(cliente);
    this.searchControl.setValue(cliente.nombre);
    this.clienteSeleccionadoChange.emit(cliente);
  }

  removerCliente() {
    this.clienteSeleccionado.set(null);
    this.searchControl.setValue('');
    this.clienteSeleccionadoChange.emit(null);
  }

  limpiarBusqueda() {
    this.searchControl.setValue('');
    this.clienteSeleccionado.set(null);
    this.clienteSeleccionadoChange.emit(null);
  }

  crearNuevoCliente() {
    // TODO: Implementar modal o navegación para crear cliente
    console.log('Crear nuevo cliente');
  }

  onBlur() {
    // Si no hay cliente seleccionado y hay texto, intentar búsqueda exacta
    const valor = this.searchControl.value;
    if (valor && !this.clienteSeleccionado()) {
      // Aquí podríamos buscar por documento exacto
    }
  }

  displayCliente(cliente: Cliente): string {
    return cliente ? cliente.nombre : '';
  }

  // Método público para obtener el cliente seleccionado
  getClienteSeleccionado(): Cliente | null {
    return this.clienteSeleccionado();
  }

  // Método público para establecer cliente programáticamente
  setCliente(cliente: Cliente | null) {
    this.clienteSeleccionado.set(cliente);
    if (cliente) {
      this.searchControl.setValue(cliente.nombre);
    } else {
      this.searchControl.setValue('');
    }
    this.clienteSeleccionadoChange.emit(cliente);
  }
}

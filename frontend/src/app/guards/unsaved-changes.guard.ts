import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** Cualquier componente que quiera recibir el guard implementa esta interfaz */
export interface CanComponentDeactivate {
  /** Retorna true si se puede salir sin problema, false si hay cambios sin guardar */
  canDeactivate(): boolean | Observable<boolean>;
}

/**
 * Guard funcional Angular 17.
 * Muestra un diálogo de confirmación cuando el formulario tiene cambios sin guardar.
 */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component,
): boolean | Observable<boolean> => {
  // Si el componente dice que se puede salir, lo dejamos pasar
  const canLeave = component.canDeactivate();
  if (canLeave === true) return true;
  if (canLeave === false) {
    const dialog = inject(MatDialog);
    return dialog
      .open(UnsavedChangesDialogComponent, {
        width: '420px',
        disableClose: true,
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }
  return canLeave; // Observable<boolean> pasado directamente
};

// ── Dialog inline ────────────────────────────────────────────────────────────
import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div style="padding: 8px">
      <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px">
        <mat-icon style="color:#f57c00">warning</mat-icon>
        Cambios sin guardar
      </h2>
      <mat-dialog-content>
        <p>Tienes cambios que aún <strong>no se han guardado</strong>.</p>
        <p>Si sales ahora, se perderán. ¿Deseas salir de todas formas?</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="quedarse()">
          <mat-icon>edit</mat-icon> Continuar editando
        </button>
        <button mat-raised-button color="warn" (click)="salir()">
          <mat-icon>exit_to_app</mat-icon> Salir sin guardar
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class UnsavedChangesDialogComponent {
  constructor(private dialogRef: MatDialogRef<UnsavedChangesDialogComponent>) {}
  quedarse(): void { this.dialogRef.close(false); }
  salir():    void { this.dialogRef.close(true);  }
}

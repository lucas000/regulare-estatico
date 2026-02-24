import {
  Component,
  AfterViewInit,
  OnDestroy,
  Inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

declare var L: any;

export interface MapCoordinatesData {
  latitude?: number;
  longitude?: number;
}

export interface MapCoordinatesResult {
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-map-coordinates-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px 0;
    }
    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    .map-container {
      width: 100%;
      height: 400px;
      margin: 16px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
    }
    #map {
      width: 100%;
      height: 100%;
    }
    .coords-display {
      display: flex;
      gap: 16px;
      padding: 0 24px;
      margin-bottom: 16px;
    }
    .coords-display mat-form-field {
      flex: 1;
    }
    .instructions {
      padding: 0 24px;
      margin-bottom: 16px;
      color: #666;
      font-size: 14px;
    }
    .search-container {
      padding: 0 24px;
      margin-bottom: 8px;
    }
    .search-container mat-form-field {
      width: 100%;
    }
    mat-dialog-content {
      padding: 0 !important;
      max-height: 70vh;
      overflow-y: auto;
    }
    mat-dialog-actions {
      padding: 16px 24px !important;
    }
  `],
  template: `
    <div class="dialog-header">
      <h2>Selecionar Coordenadas</h2>
    </div>

    <mat-dialog-content>
      <p class="instructions">
        Clique no mapa para selecionar a localização ou use a busca por endereço.
      </p>

      <div class="search-container">
        <mat-form-field appearance="outline">
          <mat-label>Buscar endereço</mat-label>
          <input matInput [(ngModel)]="searchAddress" (keyup.enter)="searchLocation()" placeholder="Digite o endereço..." />
          <button mat-icon-button matSuffix (click)="searchLocation()" [disabled]="searching">
            <mat-icon>search</mat-icon>
          </button>
        </mat-form-field>
      </div>

      <div class="map-container">
        <div id="map" #mapContainer></div>
      </div>

      <div class="coords-display">
        <mat-form-field appearance="outline">
          <mat-label>Latitude</mat-label>
          <input matInput type="number" [(ngModel)]="selectedLatitude" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Longitude</mat-label>
          <input matInput type="number" [(ngModel)]="selectedLongitude" readonly />
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirm()" [disabled]="!selectedLatitude || !selectedLongitude">
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
})
export class MapCoordinatesDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  selectedLatitude: number | null = null;
  selectedLongitude: number | null = null;
  searchAddress = '';
  searching = false;

  private map: any;
  private marker: any;
  private leafletLoaded = false;

  // @ts-ignore
    constructor(@Inject(MAT_DIALOG_DATA) public data: MapCoordinatesData,
    private dialogRef: MatDialogRef<MapCoordinatesDialogComponent>,
    private cdr: ChangeDetectorRef
  ) {
    if (data?.latitude) this.selectedLatitude = data.latitude;
    if (data?.longitude) this.selectedLongitude = data.longitude;
  }

  ngAfterViewInit() {
    this.loadLeaflet();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private loadLeaflet() {
    // Check if Leaflet is already loaded
    if (typeof L !== 'undefined') {
      this.initMap();
      return;
    }

    // Check if CSS is already loaded
    const existingCss = document.querySelector('link[href*="leaflet.css"]');
    if (!existingCss) {
      // Load Leaflet CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      cssLink.crossOrigin = '';
      document.head.appendChild(cssLink);
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', () => {
        this.leafletLoaded = true;
        setTimeout(() => this.initMap(), 100);
      });
      return;
    }

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      this.leafletLoaded = true;
      setTimeout(() => this.initMap(), 100);
    };
    script.onerror = () => {
      console.error('Falha ao carregar Leaflet. Verifique sua conexão com a internet.');
      alert('Erro ao carregar o mapa. Verifique sua conexão com a internet.');
    };
    document.head.appendChild(script);
  }

  private initMap() {
    // Default to Brazil center if no coordinates
    const defaultLat = this.selectedLatitude || -15.7801;
    const defaultLng = this.selectedLongitude || -47.9292;
    const defaultZoom = this.selectedLatitude ? 15 : 4;

    this.map = L.map('map').setView([defaultLat, defaultLng], defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Add initial marker if coordinates exist
    if (this.selectedLatitude && this.selectedLongitude) {
      this.marker = L.marker([this.selectedLatitude, this.selectedLongitude]).addTo(this.map);
    }

    // Handle map click
    this.map.on('click', (e: any) => {
      this.setMarker(e.latlng.lat, e.latlng.lng);
    });

    // Fix map size after dialog opens
    setTimeout(() => {
      this.map.invalidateSize();
    }, 200);
  }

  private setMarker(lat: number, lng: number) {
    this.selectedLatitude = Number.parseFloat(lat.toFixed(6));
    this.selectedLongitude = Number.parseFloat(lng.toFixed(6));

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }

    this.cdr.markForCheck();
  }

  searchLocation() {
    if (!this.searchAddress.trim()) return;

    this.searching = true;
    this.cdr.markForCheck();

    // Use Nominatim (OpenStreetMap geocoding service)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchAddress)}&limit=1`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        this.searching = false;
        if (data && data.length > 0) {
          const result = data[0];
          const lat = Number.parseFloat(result.lat);
          const lng = Number.parseFloat(result.lon);

          this.map.setView([lat, lng], 16);
          this.setMarker(lat, lng);
        } else {
          alert('Endereço não encontrado. Tente novamente.');
        }
        this.cdr.markForCheck();
      })
      .catch(err => {
        this.searching = false;
        console.error('Erro na busca:', err);
        alert('Erro ao buscar endereço. Tente novamente.');
        this.cdr.markForCheck();
      });
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    if (this.selectedLatitude && this.selectedLongitude) {
      this.dialogRef.close({
        latitude: this.selectedLatitude,
        longitude: this.selectedLongitude
      } as MapCoordinatesResult);
    }
  }
}

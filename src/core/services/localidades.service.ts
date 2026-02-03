import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

export interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

export interface Municipio {
  id: number;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class LocalidadesService {
  private readonly base = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';
  constructor(private readonly http: HttpClient) {}

  getEstados(): Observable<Estado[]> {
    return this.http.get<any[]>(this.base).pipe(
      map(arr => arr.map(item => ({ id: item.id, sigla: item.sigla, nome: item.nome } as Estado))),
      catchError(err => {
        console.error('Erro ao buscar estados IBGE', err);
        return throwError(() => err);
      })
    );
  }

  getMunicipiosByUF(uf: string): Observable<Municipio[]> {
    if (!uf) return new Observable<Municipio[]>(subscriber => { subscriber.next([]); subscriber.complete(); });
    const url = `${this.base}/${encodeURIComponent(uf)}/municipios`;
    return this.http.get<any[]>(url).pipe(
      map(arr => arr.map(item => ({ id: item.id, nome: item.nome } as Municipio))),
      catchError(err => {
        console.error('Erro ao buscar municípios IBGE', err);
        return throwError(() => err);
      })
    );
  }
}

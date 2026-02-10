import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, throwError } from 'rxjs';

export interface Cnae {
  id: string;
  descricao: string;
  observacoes?: string[];
}

@Injectable({ providedIn: 'root' })
export class CnaeService {
  private readonly baseUrl = 'https://servicodados.ibge.gov.br/api/v2/cnae/classes';

  // Lazy cache (created on first use) to avoid using HttpClient before constructor.
  private _classes$?: Observable<Cnae[]>;

  constructor(private readonly http: HttpClient) {}

  private get classes$(): Observable<Cnae[]> {
    if (!this._classes$) {
      this._classes$ = this.http.get<any[]>(this.baseUrl).pipe(
        map((arr) =>
          (arr ?? []).map(
            (item) =>
              ({
                id: String(item?.id ?? ''),
                descricao: String(item?.descricao ?? ''),
                observacoes: Array.isArray(item?.observacoes) ? (item.observacoes as string[]) : [],
              }) as Cnae
          )
        ),
        shareReplay({ bufferSize: 1, refCount: true }),
        catchError((err) => {
          console.error('Erro ao buscar CNAEs do IBGE', err);
          return throwError(() => err);
        })
      );
    }
    return this._classes$;
  }

  /**
   * Fetch all CNAE classes (cached).
   */
  getClasses(): Observable<Cnae[]> {
    return this.classes$;
  }

  /**
   * Search CNAE classes by description (local filter).
   */
  searchClasses(term: string): Observable<Cnae[]> {
    const t = (term ?? '').trim().toLowerCase();
    if (!t) return of([]);

    return this.getClasses().pipe(
      map((list) =>
        (list ?? [])
          .filter((i) => (i.descricao ?? '').toLowerCase().includes(t))
          .slice(0, 50)
      )
    );
  }
}

import { ChangeDetectionStrategy, Component, inject, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CompaniesRepository } from '../repositories/companies.repository';
import { Company, CompanyCnae } from '../models/company.model';
import { LocalidadesService, Estado, Municipio } from '../../../core/services/localidades.service';
import { Unit, DocumentType } from '../models/unit.model';
import { CnaeService, Cnae } from '../../../core/services/cnae.service';
import { Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError, finalize } from 'rxjs';

function cnaeToCompanyCnae(c: Cnae | CompanyCnae | string | null | undefined): CompanyCnae {
  if (!c) return { id: '', descricao: '', observacoes: [] } as any;
  if (typeof c === 'string') return { id: c, descricao: c, observacoes: [] } as any;
  return {
    id: String((c as any).id ?? ''),
    descricao: String((c as any).descricao ?? ''),
    observacoes: Array.isArray((c as any).observacoes) ? (c as any).observacoes : [],
  } as any;
}

function toUpperSafe(v: any): string {
  return String(v ?? '').trim().toUpperCase();
}

@Component({
  selector: 'app-unit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatIconModule,
    MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>Unidade</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Empreendimento (PF/PJ)</mat-label>
        <mat-select formControlName="companyId">
          <mat-option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</mat-option>
        </mat-select>
        <mat-error *ngIf="(submitted || form.controls['companyId']?.touched) && form.controls['companyId']?.invalid">Empresa é obrigatória</mat-error>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Nome da Unidade</mat-label>
        <input matInput formControlName="name" />
        <mat-error *ngIf="(submitted || form.controls['name']?.touched) && form.controls['name']?.invalid">Nome é obrigatório</mat-error>
      </mat-form-field>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Tipo de Documento</mat-label>
          <mat-select formControlName="documentType">
            <mat-option *ngFor="let t of documentTypes" [value]="t">{{ t }}</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.controls['documentType']?.touched) && form.controls['documentType']?.invalid">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Número do Documento</mat-label>
          <input matInput formControlName="documentNumber" />
          <mat-error *ngIf="(submitted || form.controls['documentNumber']?.touched) && form.controls['documentNumber']?.invalid">Obrigatório</mat-error>
        </mat-form-field>
      </div>

      <!-- CNAE Principal (busca) -->
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>CNAE Principal</mat-label>
        <input
          matInput
          [formControl]="cnaeMainSearch"
          [matAutocomplete]="autoCnaeMain"
          placeholder="Digite para buscar..."
        />
        <button
          mat-icon-button
          matSuffix
          type="button"
          aria-label="Limpar"
          *ngIf="cnaeMainSearch.value"
          (click)="clearCnaeMain()"
        >
          <mat-icon>close</mat-icon>
        </button>
        <mat-hint *ngIf="cnaeMainLoading">Carregando...</mat-hint>
        <mat-error *ngIf="(cnaeMainSearch.touched) && (!selectedCnaeMain?.id)">Obrigatório</mat-error>
        <mat-autocomplete
          #autoCnaeMain="matAutocomplete"
          (optionSelected)="onSelectCnaeMain($event.option.value)"
          [displayWith]="cnaeDisplay.bind(this)"
        >
          <mat-option *ngIf="!cnaeMainLoading && cnaeMainOptions.length === 0 && (cnaeMainSearch.value || '')" [disabled]="true">
            Nenhum resultado
          </mat-option>
          <mat-option *ngFor="let opt of cnaeMainOptions" [value]="opt">
            {{ opt.descricao }} ({{ opt.id }})
          </mat-option>
        </mat-autocomplete>
      </mat-form-field>

      <!-- CNAEs Secundários (múltiplos) -->
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>CNAEs Secundários</mat-label>
        <input
          matInput
          [formControl]="cnaeSecondarySearch"
          [matAutocomplete]="autoCnaeSec"
          placeholder="Digite para buscar e selecione..."
        />
        <mat-hint *ngIf="cnaeSecondaryLoading">Carregando...</mat-hint>
        <mat-autocomplete #autoCnaeSec="matAutocomplete" (optionSelected)="addSecondary($event.option.value)">
          <mat-option *ngIf="!cnaeSecondaryLoading && cnaeSecondaryOptions.length === 0 && (cnaeSecondarySearch.value || '')" [disabled]="true">
            Nenhum resultado
          </mat-option>
          <mat-option *ngFor="let opt of cnaeSecondaryOptions" [value]="opt">
            {{ opt.descricao }} ({{ opt.id }})
          </mat-option>
        </mat-autocomplete>
      </mat-form-field>

      <div *ngIf="selectedCnaeSecondary.length">
        <mat-chip-listbox class="cnae-chips-list">
          <mat-chip class="cnae-chip" *ngFor="let c of selectedCnaeSecondary" [removable]="true" (removed)="removeSecondary(c.id)">
            {{ c.descricao }} ({{ c.id }})
            <button matChipRemove aria-label="Remover"><mat-icon>cancel</mat-icon></button>
          </mat-chip>
        </mat-chip-listbox>
      </div>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Logradouro</mat-label>
        <input matInput formControlName="street" />
        <mat-error *ngIf="(submitted || form.controls['street']?.touched) && form.controls['street']?.invalid">Obrigatório</mat-error>
      </mat-form-field>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Estado</mat-label>
          <mat-select formControlName="state">
            <mat-option *ngFor="let estado of estados" [value]="estado.sigla">{{ estado.nome }}</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.controls['state']?.touched) && form.controls['state']?.invalid">Estado é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Município</mat-label>
          <mat-select formControlName="city" [disabled]="loadingMunicipios || !form.get('state')?.value">
            <mat-option *ngIf="loadingMunicipios" disabled>Carregando municípios...</mat-option>
            <mat-option *ngFor="let municipio of municipios" [value]="municipio.nome">{{ municipio.nome }}</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.controls['city']?.touched) && form.controls['city']?.invalid">Cidade é obrigatória</mat-error>
        </mat-form-field>
      </div>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Descrição do Ambiente e Processo de Trabalho</mat-label>
        <textarea matInput rows="3" formControlName="workEnvironmentDescription"></textarea>
        <mat-error *ngIf="(submitted || form.controls['workEnvironmentDescription']?.touched) && form.controls['workEnvironmentDescription']?.invalid">Obrigatório</mat-error>
      </mat-form-field>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>E-mail</mat-label>
          <input matInput formControlName="email" />
        </mat-form-field>

        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Telefone</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Situação</mat-label>
          <mat-select formControlName="status">
            <mat-option value="active">Ativa</mat-option>
            <mat-option value="inactive">Inativa</mat-option>
          </mat-select>
          <mat-error *ngIf="form.controls['status']?.invalid">Obrigatório</mat-error>
        </mat-form-field>
      </div>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Observações</mat-label>
        <textarea matInput rows="2" formControlName="notes"></textarea>
      </mat-form-field>

      <div *ngIf="loadingMunicipios" style="text-align: center; margin-top: 16px">
        <mat-spinner diameter="24"></mat-spinner>
      </div>
      <div *ngIf="municipiosError" style="color: red; margin-top: 16px">
        {{ municipiosError }}
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Salvar</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly companiesRepo = inject(CompaniesRepository);
  private readonly localidades = inject(LocalidadesService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly cnaeService = inject(CnaeService);
  companies: Company[] = [];
  estados: Estado[] = [];
  municipios: Municipio[] = [];
  loadingMunicipios = false;
  municipiosError: string | null = null;
  documentTypes: DocumentType[] = ['CNPJ', 'CPF', 'CAEPF', 'CNO'];
  submitted = false;

  // CNAE UI state (replicado do cadastro de Empresas)
  cnaeMainSearch = new FormControl<string | CompanyCnae>('');
  cnaeSecondarySearch = new FormControl<string | CompanyCnae>('');
  cnaeMainOptions: CompanyCnae[] = [];
  cnaeSecondaryOptions: CompanyCnae[] = [];
  cnaeMainLoading = false;
  cnaeSecondaryLoading = false;
  selectedCnaeMain: CompanyCnae | null = null;
  selectedCnaeSecondary: CompanyCnae[] = [];

  private subs = new Subscription();

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      companyId: ['', [Validators.required]],
      name: ['', [Validators.required]],

      documentType: ['CNPJ', [Validators.required]],
      documentNumber: ['', [Validators.required]],

      // cnaeMain/cnaeSecondary agora controlados fora do form (autocomplete)

      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],

      workEnvironmentDescription: ['', [Validators.required]],

      email: [''],
      phone: [''],

      status: ['active', [Validators.required]],
      notes: [''],
    });

    if (this.data) {
      const d: any = this.data;
      this.form.patchValue({
        companyId: d.companyId ?? '',
        name: d.name ?? '',
        documentType: d.documentType ?? 'CNPJ',
        documentNumber: d.documentNumber ?? '',
        street: d.address?.street ?? d.street ?? '',
        state: d.address?.state ?? d.state ?? '',
        city: d.address?.city ?? d.city ?? '',
        workEnvironmentDescription: d.workEnvironmentDescription ?? '',
        email: d.email ?? '',
        phone: d.phone ?? '',
        status: d.status ?? 'active',
        notes: d.notes ?? '',
      });

      // CNAE (edit mode)
      const main = d.cnaeMain as any;
      if (main) {
        this.selectedCnaeMain = cnaeToCompanyCnae(main);
        this.cnaeMainSearch.setValue(this.cnaeDisplay(this.selectedCnaeMain), { emitEvent: false });
      }
      const secondary = d.cnaeSecondary as any;
      if (Array.isArray(secondary)) {
        this.selectedCnaeSecondary = secondary.map((x: any) => cnaeToCompanyCnae(x)).filter((x) => x.id || x.descricao);
      } else if (typeof secondary === 'string') {
        this.selectedCnaeSecondary = secondary
          .split(/\r?\n|,/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((s: string) => ({ id: s, descricao: s, observacoes: [] } as any));
      }
    }

    this.loadCompanies();
    this.loadEstados();

    this.form.get('state')?.valueChanges.subscribe((uf: string | null) => {
      this.municipios = [];
      this.form.patchValue({ city: '' });
      this.municipiosError = null;
      if (!uf) return;
      this.loadMunicipios(uf);
    });
  }

  ngOnInit(): void {
    // CNAE main search
    this.subs.add(
      this.cnaeMainSearch.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((term) => {
            const t = typeof term === 'string' ? term.trim() : '';
            if (!t) {
              this.cnaeMainOptions = [];
              return of([]);
            }
            this.cnaeMainLoading = true;
            this.cd.markForCheck();
            return this.cnaeService.searchClasses(t).pipe(
              catchError(() => of([])),
              finalize(() => {
                this.cnaeMainLoading = false;
                this.cd.markForCheck();
              })
            );
          })
        )
        .subscribe((list) => {
          this.cnaeMainOptions = (list ?? []).map((x) => cnaeToCompanyCnae(x));
          this.cd.markForCheck();
        })
    );

    // CNAE secondary search
    this.subs.add(
      this.cnaeSecondarySearch.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((term) => {
            const t = typeof term === 'string' ? term.trim() : '';
            if (!t) {
              this.cnaeSecondaryOptions = [];
              return of([]);
            }
            this.cnaeSecondaryLoading = true;
            this.cd.markForCheck();
            return this.cnaeService.searchClasses(t).pipe(
              catchError(() => of([])),
              finalize(() => {
                this.cnaeSecondaryLoading = false;
                this.cd.markForCheck();
              })
            );
          })
        )
        .subscribe((list) => {
          const mapped = (list ?? []).map((x) => cnaeToCompanyCnae(x));
          const selectedIds = new Set(this.selectedCnaeSecondary.map((s) => s.id));
          this.cnaeSecondaryOptions = mapped.filter((m) => !selectedIds.has(m.id));
          this.cd.markForCheck();
        })
    );
  }

  private async loadCompanies() {
    const all = await this.companiesRepo.listAll();
    this.companies = all.filter((c) => c.status === 'ativo');
    if (this.data && (this.data as any).companyId) {
      this.form.patchValue({ companyId: (this.data as any).companyId });
    }
    this.cd.markForCheck();
  }

  private loadEstados() {
    this.localidades.getEstados().subscribe({
      next: (list) => {
        this.estados = list.sort((a, b) => a.nome.localeCompare(b.nome));
        const presetUf = this.form.get('state')?.value as string | null;
        if (presetUf) {
          this.loadMunicipios(presetUf);
        }
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Erro carregando estados', err);
      },
    });
  }

  cnaeDisplay(c: any | null): string {
    if (!c) return '';
    if (typeof c === 'string') return c;
    const id = String((c?.id ?? '')).trim();
    const desc = String((c?.descricao ?? '')).trim();
    if (!id && !desc) return '';
    if (id && desc) return `${desc} (${id})`;
    return desc || id;
  }

  onSelectCnaeMain(selected: CompanyCnae) {
    this.selectedCnaeMain = selected;
    this.cnaeMainSearch.setValue(this.cnaeDisplay(selected), { emitEvent: false });
    this.cnaeMainOptions = [];
    this.cd.markForCheck();
  }

  clearCnaeMain() {
    this.selectedCnaeMain = null;
    this.cnaeMainSearch.setValue('', { emitEvent: false });
    this.cnaeMainOptions = [];
    this.cd.markForCheck();
  }

  addSecondary(c: CompanyCnae) {
    if (!c) return;
    if (this.selectedCnaeSecondary.some((x) => x.id === c.id)) return;
    this.selectedCnaeSecondary = [...this.selectedCnaeSecondary, c];
    this.cnaeSecondarySearch.setValue('', { emitEvent: false });
    this.cnaeSecondaryOptions = [];
    this.cd.markForCheck();
  }

  removeSecondary(id: string) {
    this.selectedCnaeSecondary = this.selectedCnaeSecondary.filter((c) => c.id !== id);
    this.cd.markForCheck();
  }

  private loadMunicipios(uf: string) {
    this.loadingMunicipios = true;
    this.municipiosError = null;
    this.cd.markForCheck();
    this.localidades.getMunicipiosByUF(uf).subscribe({
      next: (list) => {
        this.municipios = list.sort((a, b) => a.nome.localeCompare(b.nome));
        if (this.data) {
          const incomingCity = (this.data as any).address?.city ?? (this.data as any).city ?? (this.data as any).cidade ?? null;
          if (incomingCity) {
            this.form.patchValue({ city: incomingCity });
          }
        }
        this.loadingMunicipios = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Erro carregando municípios', err);
        this.municipiosError = 'Erro ao carregar municípios';
        this.loadingMunicipios = false;
        this.cd.markForCheck();
      },
    });
  }

  save() {
    this.submitted = true;

    // valida CNAE principal selecionado
    const hasMain = !!this.selectedCnaeMain?.id;
    if (this.form.invalid || !hasMain) {
      this.form.markAllAsTouched();
      if (!hasMain) {
        this.cnaeMainSearch.markAsTouched();
      }
      this.cd.markForCheck();
      return;
    }

    const raw = this.form.getRawValue() as any;

    const payload: Partial<Unit> = {
      companyId: raw.companyId,
      name: toUpperSafe(raw.name),
      documentType: raw.documentType,
      documentNumber: raw.documentNumber,

      // Persistência: armazenar objeto completo (id, descricao, observacoes)
      cnaeMain: this.selectedCnaeMain!,
      cnaeSecondary: this.selectedCnaeSecondary,

      address: {
        street: raw.street,
        city: raw.city,
        state: raw.state,
      },
      workEnvironmentDescription: raw.workEnvironmentDescription,
      // nunca enviar undefined para o Firestore
      email: raw.email ? raw.email : null,
      phone: raw.phone ? raw.phone : null,
      status: raw.status,
      notes: raw.notes ? raw.notes : null,

      // backward compatibility
      city: raw.city,
      state: raw.state,
    };

    this.dialogRef.close(payload);
  }

  cancel() {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}

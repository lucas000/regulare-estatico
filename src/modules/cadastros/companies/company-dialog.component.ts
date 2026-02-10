import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Subscription, debounceTime, distinctUntilChanged, switchMap, of, catchError, finalize } from 'rxjs';
import { LocalidadesService, Estado, Municipio } from '../../../core/services/localidades.service';
import { CompanyPersonType, CompanyType, CompanyCnae } from '../models/company.model';
import { CnaeService, Cnae } from '../../../core/services/cnae.service';

function cnaeToCompanyCnae(c: Cnae | CompanyCnae | null | undefined): CompanyCnae {
  if (!c) return { id: '', descricao: '', observacoes: [] };
  return {
    id: String((c as any).id ?? ''),
    descricao: String((c as any).descricao ?? ''),
    observacoes: Array.isArray((c as any).observacoes) ? (c as any).observacoes : [],
  };
}

function toUpperSafe(v: any): string {
  return String(v ?? '').trim().toUpperCase();
}

@Component({
  selector: 'app-company-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatAutocompleteModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './company-dialog.component.html',
  styleUrls: ['./company-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly localidades = inject(LocalidadesService);
  private readonly cnaeService = inject(CnaeService);
  private readonly cd = inject(ChangeDetectorRef);

  estados: Estado[] = [];
  municipios: Municipio[] = [];
  municipiosLoading = false;
  loadError: string | null = null;

  // CNAE UI state
  cnaeMainSearch = new FormControl<string | CompanyCnae>('');
  cnaeSecondarySearch = new FormControl<string | CompanyCnae>('');
  cnaeMainOptions: CompanyCnae[] = [];
  cnaeSecondaryOptions: CompanyCnae[] = [];
  cnaeMainLoading = false;
  cnaeSecondaryLoading = false;

  selectedCnaeMain: CompanyCnae | null = null;
  selectedCnaeSecondary: CompanyCnae[] = [];

  readonly personTypes: Array<{ value: CompanyPersonType; label: string }> = [
    { value: 'PJ', label: 'Pessoa Jurídica' },
    { value: 'PF', label: 'Pessoa Física' },
  ];

  readonly companyTypes: Array<{ value: CompanyType; label: string }> = [
    { value: 'Fazenda', label: 'Fazenda' },
    { value: 'Indústria', label: 'Indústria' },
    { value: 'Revenda', label: 'Revenda' },
    { value: 'Prestadora', label: 'Prestadora' },
    { value: 'Aviação Agrícola', label: 'Aviação Agrícola' },
    { value: 'Comércio', label: 'Comércio' },
    { value: 'Serviços', label: 'Serviços' },
    { value: 'Outro', label: 'Outro' },
  ];

  private subs = new Subscription();

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      // Identificação
      razaoSocial: ['', [Validators.required]],
      nomeFantasia: ['', [Validators.required]],
      personType: ['PJ', [Validators.required]],
      document: ['', [Validators.required]],
      caepf: [''],
      cno: [''],

      // Responsável legal
      legalResponsibleName: ['', [Validators.required]],
      legalResponsibleCpf: ['', [Validators.required]],

      // Endereço
      addressStreet: ['', [Validators.required]],
      addressUf: ['', [Validators.required]],
      addressCity: ['', [Validators.required]],

      // Classificação
      companyType: ['Outro', [Validators.required]],
      workEnvironmentDescription: ['', [Validators.required]],

      // Contato
      institutionalEmail: ['', [Validators.required, Validators.email]],
      phoneWhatsapp: ['', [Validators.required]],

      // Controle
      notes: [''],

      // Login (mantido)
      email: ['', [Validators.required, Validators.email]],
      password: [''],
    });

    if (this.data) {
      const d: any = this.data as any;
      this.form.patchValue({
        ...d,
        razaoSocial: d.razaoSocial ?? d.name ?? '',
        document: d.document ?? d.cnpj ?? '',
        institutionalEmail: d.institutionalEmail ?? d.email ?? '',
      });

      // CNAE (edit mode)
      const main = d.cnaeMain;
      if (main) {
        this.selectedCnaeMain = cnaeToCompanyCnae(main);
        this.cnaeMainSearch.setValue(this.cnaeDisplay(this.selectedCnaeMain), { emitEvent: false });
      }
      const secondary = d.cnaeSecondary;
      if (Array.isArray(secondary)) {
        this.selectedCnaeSecondary = secondary.map((x: any) => cnaeToCompanyCnae(x)).filter((x) => x.id || x.descricao);
      } else if (typeof secondary === 'string') {
        // legacy fallback (\n separated)
        this.selectedCnaeSecondary = secondary
          .split(/\r?\n/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((s: string) => ({ id: s, descricao: s, observacoes: [] }));
      }
    }
  }

  ngOnInit(): void {
    // Estados
    this.subs.add(
      this.localidades.getEstados().subscribe({
        next: (estados) => {
          this.estados = estados.sort((a, b) => a.nome.localeCompare(b.nome));

          const uf = (this.form.get('addressUf') as FormControl).value as string;
          const city = (this.form.get('addressCity') as FormControl).value as string;
          if (uf) {
            this.loadMunicipiosForUf(uf, city);
          }
          this.cd.markForCheck();
        },
        error: () => {
          this.loadError = 'Erro ao carregar estados.';
          this.cd.markForCheck();
        },
      })
    );

    // UF change -> clear city and reload
    this.subs.add(
      (this.form.get('addressUf') as FormControl).valueChanges.subscribe((uf) => {
        this.form.get('addressCity')?.setValue('');
        this.municipios = [];
        if (uf) {
          this.loadMunicipiosForUf(uf as string);
        }
        this.cd.markForCheck();
      })
    );

    // personType conditional validators
    this.subs.add(
      (this.form.get('personType') as FormControl).valueChanges.subscribe(() => {
        this.applyConditionalValidators();
      })
    );
    this.applyConditionalValidators();

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
          // avoid showing already selected
          const selectedIds = new Set(this.selectedCnaeSecondary.map((s) => s.id));
          this.cnaeSecondaryOptions = mapped.filter((m) => !selectedIds.has(m.id));
          this.cd.markForCheck();
        })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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

  private applyConditionalValidators() {
    const personType = (this.form.get('personType')?.value as CompanyPersonType) ?? 'PJ';

    const docCtrl = this.form.get('document');
    docCtrl?.setValidators([Validators.required]);
    docCtrl?.updateValueAndValidity({ emitEvent: false });

    const caepfCtrl = this.form.get('caepf');
    if (personType === 'PF') {
      caepfCtrl?.setValidators([Validators.required]);
    } else {
      caepfCtrl?.clearValidators();
    }
    caepfCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  private loadMunicipiosForUf(uf: string, keepSelectedCity?: string) {
    this.municipiosLoading = true;
    this.cd.markForCheck();
    this.subs.add(
      this.localidades.getMunicipiosByUF(uf).subscribe({
        next: (municipios) => {
          this.municipios = municipios.sort((a, b) => a.nome.localeCompare(b.nome));
          this.municipiosLoading = false;

          if (keepSelectedCity) {
            const exists = this.municipios.some((m) => m.nome === keepSelectedCity);
            if (exists) {
              this.form.get('addressCity')?.setValue(keepSelectedCity, { emitEvent: false });
            }
          }
          this.cd.markForCheck();
        },
        error: () => {
          this.municipiosLoading = false;
          this.loadError = 'Erro ao carregar municípios.';
          this.cd.markForCheck();
        },
      })
    );
  }

  save() {
    // CNAE principal é obrigatório agora (fora do form)
    if (this.form.invalid || !this.selectedCnaeMain?.id) {
      this.form.markAllAsTouched();
      // força erro no campo de texto do CNAE principal
      if (!this.selectedCnaeMain?.id) {
        this.cnaeMainSearch.markAsTouched();
      }
      this.cd.markForCheck();
      return;
    }

    const raw = this.form.getRawValue() as any;

    const payload = {
      ...raw,
      razaoSocial: toUpperSafe(raw.razaoSocial),
      nomeFantasia: toUpperSafe(raw.nomeFantasia),
      cnaeMain: this.selectedCnaeMain,
      cnaeSecondary: this.selectedCnaeSecondary,
      // compat fields
      name: toUpperSafe(raw.razaoSocial),
      cnpj: raw.document,
    };

    this.dialogRef.close(payload);
  }

  cancel() {
    this.dialogRef.close();
  }
}

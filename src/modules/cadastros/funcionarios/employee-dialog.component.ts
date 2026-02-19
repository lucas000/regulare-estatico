import {ChangeDetectionStrategy, Component, inject, ChangeDetectorRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog} from '@angular/material/dialog';
import {ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ErrorStateMatcher} from '@angular/material/core';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatSelectModule} from '@angular/material/select';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {CompaniesRepository} from '../repositories/companies.repository';
import {UnitsRepository} from '../repositories/units.repository';
import {CargosRepository} from '../repositories/cargos.repository';
import {SectorsFiltersRepository} from '../repositories/sectors-filters.repository';
import {SessionService} from '../../../core/services/session.service';
import {CompaniesService} from '../services/companies.service';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {Observable, of} from 'rxjs';
import {AuditHistoryDialogComponent, AuditHistoryData} from '../../../core/components/audit-history-dialog.component';

@Component({
    selector: 'app-employee-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDialogModule,
        MatSelectModule,
        MatAutocompleteModule,
        MatIconModule,
        MatTooltipModule,
    ],
    template: `
        <div class="dialog-header">
            <h2 mat-dialog-title>Funcionário</h2>
            <button 
                *ngIf="isEdit" 
                mat-icon-button 
                class="audit-btn"
                matTooltip="Histórico de alterações"
                (click)="openAuditHistory()">
                <mat-icon>history</mat-icon>
            </button>
        </div>

        <mat-dialog-content [formGroup]="form" class="employee-dialog">
            <!-- Identificação / Vínculos -->
            <mat-form-field appearance="fill" class="full">
                <mat-label>Empreendimento (PF/PJ)</mat-label>
                <mat-select formControlName="companyId" [disabled]="isCliente">
                    <mat-option *ngIf="companiesLoading" disabled>Carregando empreendimentos...</mat-option>
                    <mat-option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</mat-option>
                </mat-select>
                <mat-error *ngIf="(submitted || form.get('companyId')?.touched) && form.get('companyId')?.invalid">
                    Obrigatório
                </mat-error>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full">
                <mat-label>Unidade</mat-label>
                <mat-select formControlName="unitId" [disabled]="!form.get('companyId')?.value || unitsLoading">
                    <mat-option *ngIf="unitsLoading" disabled>Carregando unidades...</mat-option>
                    <mat-option *ngFor="let u of units" [value]="u.id">{{ u.name }}</mat-option>
                </mat-select>
                <mat-error *ngIf="(submitted || form.get('unitId')?.touched) && form.get('unitId')?.invalid">
                    Obrigatório
                </mat-error>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full">
                <mat-label>Setor</mat-label>
                <mat-select formControlName="sectorId"
                            [disabled]="!form.get('companyId')?.value || !form.get('unitId')?.value || sectorsLoading">
                    <mat-option *ngIf="sectorsLoading" disabled>Carregando setores...</mat-option>
                    <mat-option *ngFor="let s of sectors" [value]="s.id">{{ s.name }}</mat-option>
                </mat-select>
                <mat-error *ngIf="(submitted || form.get('sectorId')?.touched) && form.get('sectorId')?.invalid">
                    Obrigatório
                </mat-error>
            </mat-form-field>

            <mat-form-field appearance="fill" class="full">
                <mat-label>Nome completo</mat-label>
                <input matInput formControlName="name"/>
                <mat-error *ngIf="(submitted || form.get('name')?.touched) && form.get('name')?.invalid">Obrigatório
                </mat-error>
            </mat-form-field>

            <div class="grid">
                <mat-form-field appearance="fill">
                    <mat-label>CPF</mat-label>
                    <input
                            matInput
                            formControlName="cpf"
                            placeholder="000.000.000-00"
                            inputmode="numeric"
                            autocomplete="off"
                            maxlength="14"
                            (input)="onCpfInput($event)"
                    />
                    <mat-error *ngIf="(submitted || form.get('cpf')?.touched) && form.get('cpf')?.invalid">Obrigatório
                    </mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill">
                    <mat-label>Data de Nascimento</mat-label>
                    <input
                            matInput
                            formControlName="birthDate"
                            placeholder="dd/MM/aaaa"
                            inputmode="numeric"
                            autocomplete="off"
                            maxlength="10"
                            (input)="onBirthDateInput($event)"
                    />
                    <mat-error *ngIf="(submitted || form.get('birthDate')?.touched) && form.get('birthDate')?.hasError('required')">
                        Obrigatório
                    </mat-error>
                    <mat-error *ngIf="(submitted || form.get('birthDate')?.touched) && form.get('birthDate')?.hasError('pattern')">
                        Data inválida (use dd/MM/aaaa)
                    </mat-error>
                </mat-form-field>
            </div>

            <div class="grid">
                <mat-form-field appearance="fill">
                    <mat-label>Sexo</mat-label>
                    <mat-select formControlName="gender">
                        <mat-option value="Masculino">Masculino</mat-option>
                        <mat-option value="Feminino">Feminino</mat-option>
                        <mat-option value="Não definido">Não definido</mat-option>
                    </mat-select>
                    <mat-error *ngIf="(submitted || form.get('gender')?.touched) && form.get('gender')?.invalid">
                        Obrigatório
                    </mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill">
                    <mat-label>NIS/PIS</mat-label>
                    <input matInput formControlName="nisPis" placeholder="000.00000.00-0" maxlength="14"/>
                    <mat-hint>Recomendado</mat-hint>
                </mat-form-field>
            </div>

            <div class="grid">
                <mat-form-field appearance="fill">
                    <mat-label>Nome do Pai</mat-label>
                    <input matInput formControlName="fatherName"/>
                </mat-form-field>

                <mat-form-field appearance="fill">
                    <mat-label>Nome da Mãe</mat-label>
                    <input matInput formControlName="motherName"/>
                </mat-form-field>
            </div>

            <div class="grid">
                <mat-form-field appearance="fill">
                    <mat-label>Matrícula eSocial</mat-label>
                    <input matInput formControlName="esocialRegistration"/>
                    <mat-error
                            *ngIf="(submitted || form.get('esocialRegistration')?.touched) && form.get('esocialRegistration')?.invalid">
                        Obrigatório
                    </mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill">
                    <mat-label>Categoria eSocial</mat-label>
                    <mat-select formControlName="esocialCategory">
                        <mat-option *ngFor="let c of esocialCategories" [value]="c">{{ c }}</mat-option>
                    </mat-select>
                    <mat-error
                            *ngIf="(submitted || form.get('esocialCategory')?.touched) && form.get('esocialCategory')?.invalid">
                        Obrigatório
                    </mat-error>
                </mat-form-field>
            </div>

            <div class="grid">
                <!-- Cargo with autocomplete -->
                <mat-form-field appearance="fill">
                    <mat-label>Cargo</mat-label>
                    <input type="text" matInput [formControl]="cargoCtrl" [matAutocomplete]="autoCargo"
                           [errorStateMatcher]="cargoErrorMatcher" placeholder="Digite o nome ou CBO"/>
                    <mat-autocomplete #autoCargo="matAutocomplete"
                                      (optionSelected)="onCargoSelected($event.option.value)">
                        <mat-option *ngFor="let c of (cargos$ | async)" [value]="c">{{ c.name }}— {{ c.cbo }}
                        </mat-option>
                        <mat-option *ngIf="loadingCargos" disabled>Carregando...</mat-option>
                    </mat-autocomplete>
                    <mat-error>Obrigatório</mat-error>
                </mat-form-field>

                <mat-form-field appearance="fill">
                    <mat-label>Data de admissão</mat-label>
                    <input
                            matInput
                            formControlName="admissionDate"
                            placeholder="dd/MM/aaaa"
                            inputmode="numeric"
                            autocomplete="off"
                            maxlength="10"
                            (input)="onAdmissionDateInput($event)"
                    />
                    <mat-error
                            *ngIf="(submitted || form.get('admissionDate')?.touched) && form.get('admissionDate')?.hasError('required')">
                        Obrigatório
                    </mat-error>
                    <mat-error
                            *ngIf="(submitted || form.get('admissionDate')?.touched) && form.get('admissionDate')?.hasError('pattern')">
                        Data inválida (use dd/MM/aaaa)
                    </mat-error>
                </mat-form-field>
            </div>

            <mat-form-field appearance="fill" class="full">
                <mat-label>Descrição da Função</mat-label>
                <textarea matInput rows="4" formControlName="jobDescription" maxlength="500"></textarea>
                <mat-hint align="end">{{ (form.get('jobDescription')?.value?.length || 0) }}/500</mat-hint>
                <mat-error
                        *ngIf="(submitted || form.get('jobDescription')?.touched) && form.get('jobDescription')?.hasError('required')">
                    Obrigatório
                </mat-error>
                <mat-error
                        *ngIf="(submitted || form.get('jobDescription')?.touched) && form.get('jobDescription')?.hasError('maxlength')">
                    Máximo 500 caracteres
                </mat-error>
            </mat-form-field>

            <div class="grid">
                <mat-form-field appearance="fill">
                    <mat-label>Situação</mat-label>
                    <mat-select formControlName="status">
                        <mat-option value="ativo">Ativo</mat-option>
                        <mat-option value="inativo">Inativo</mat-option>
                    </mat-select>
                </mat-form-field>
            </div>

            <!-- Opcionais -->
            <div class="grid">
                <mat-form-field appearance="fill">
                    <mat-label>Telefone</mat-label>
                    <input matInput formControlName="phone"/>
                </mat-form-field>

                <mat-form-field appearance="fill">
                    <mat-label>E-mail</mat-label>
                    <input matInput formControlName="email"/>
                    <mat-error *ngIf="form.get('email')?.touched && form.get('email')?.invalid">E-mail inválido
                    </mat-error>
                </mat-form-field>
            </div>

            <mat-form-field appearance="fill" class="full">
                <mat-label>Observações</mat-label>
                <textarea matInput rows="3" formControlName="notes"></textarea>
            </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button mat-button (click)="cancel()">Cancelar</button>
            <button mat-flat-button color="primary" (click)="save()"
                    [disabled]="companiesLoading || unitsLoading || sectorsLoading">Salvar
            </button>
        </mat-dialog-actions>
    `,
    styles: [`
        .dialog-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0;
        }
        .dialog-header h2[mat-dialog-title] { margin: 0; flex: 1; }
        .dialog-header .audit-btn {
            color: #757575;
            transition: color 0.2s ease;
        }
        .dialog-header .audit-btn:hover { color: #1565c0; }
        .dialog-header .audit-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

        .employee-dialog {
            display: block;
        }

        .full {
            width: 100%;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDialogComponent {
    form!: FormGroup;
    cargoCtrl = new FormControl('', [Validators.required]);
    cargos$!: Observable<any[]>;
    loadingCargos = false;

    // ErrorStateMatcher customizado para o campo Cargo
    cargoErrorMatcher: ErrorStateMatcher = {
        isErrorState: () => {
            return (this.submitted || this.cargoCtrl.touched) && (this.cargoCtrl.invalid || !this.form?.get('cargoId')?.value);
        }
    };

    esocialCategories: string[] = [
        'Empregado CLT',
        'Trabalhador Temporário',
        'Avulso',
        'Agente Público',
        'Cessão',
        'Segurado Especial',
        'Contribuinte Individual',
        'Bolsista',
        'Jovem aprendiz',
        'Estagiário',
        'PJ',
        'Diarista',
        'Trabalhador Intermitente',
        'Safrista',
        'Autônomo',
    ];


    private readonly data = inject(MAT_DIALOG_DATA);
    private readonly companiesRepo = inject(CompaniesRepository);
    private readonly unitsRepo = inject(UnitsRepository);
    private readonly cargosRepo = inject(CargosRepository);
    private readonly cd = inject(ChangeDetectorRef);
    private readonly sectorsRepo = inject(SectorsFiltersRepository);
    private readonly session = inject(SessionService);
    private readonly companiesService = inject(CompaniesService);
    isCliente: boolean = this.session.hasRole(['CLIENTE'] as any);

    companies: any[] = [];
    units: any[] = [];
    sectors: any[] = [];
    private selectedCargo: any | null = null;
    sectorsLoading = false;
    submitted = false;
    companiesLoading = false;
    unitsLoading = false;
    private initializing = true;
    isEdit = false;

    constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
        this.form = this.fb.group({
            companyId: ['', [Validators.required]],
            unitId: ['', [Validators.required]],
            sectorId: ['', [Validators.required]],
            name: ['', [Validators.required]],
            cpf: ['', [Validators.required]],
            cargoId: ['', [Validators.required]],

            // new required
            esocialRegistration: ['', [Validators.required]],
            esocialCategory: ['', [Validators.required]],
            admissionDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],

            // obrigatório
            jobDescription: ['', [Validators.required, Validators.maxLength(500)]],

            // optionals
            phone: [''],
            email: ['', [Validators.email]],
            notes: [''],

            // novos campos
            birthDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],
            nisPis: [''], // recomendado, mas não obrigatório
            gender: ['', [Validators.required]],
            fatherName: [''],
            motherName: [''],

            status: ['ativo'],
        });

        if (this.data) {
            const patch: any = {...(this.data as any)};

            // admissionDate agora é string; não converter para Date
            this.form.patchValue(patch);
            this.isEdit = !!this.data.id;

            // Pre-fill cargo control display if editing
            if ((this.data as any).cargoName) {
                this.cargoCtrl.setValue(`${(this.data as any).cargoName} — ${(this.data as any).cargoCbo}`);
            }
        }

        // CLIENTE: companyId fixo no formulário
        if (this.isCliente) {
            const u = (this.session as any).user?.();
            const companyId = u?.companyId ?? '';
            if (companyId) {
                this.form.patchValue({companyId}, {emitEvent: true});
            }
            this.form.get('companyId')?.disable({emitEvent: false});
        }

        // Carrega empresas e (se edição) unidades/setores antes de liberar a UI
        this.bootstrapInitialData();

        // When company changes, refresh units and clear selected unit
        this.form.get('companyId')?.valueChanges.subscribe(async (v: string | null) => {
            if (!v) {
                this.units = [];
                this.sectors = [];
                if (!this.initializing) {
                    this.form.patchValue({unitId: '', sectorId: ''}, {emitEvent: false});
                }
                this.cd.markForCheck();
                return;
            }

            this.unitsLoading = true;
            this.cd.markForCheck();
            try {
                this.units = await this.unitsRepo.listBy('companyId' as any, v, 500);
            } finally {
                this.unitsLoading = false;
                if (!this.initializing) {
                    this.form.patchValue({unitId: '', sectorId: ''}, {emitEvent: false});
                    this.sectors = [];
                }
                this.cd.markForCheck();
            }
        });

        this.form.get('unitId')?.valueChanges.subscribe(async (unitId: string | null) => {
            const companyId = this.form.get('companyId')?.value as string;

            if (!this.initializing) {
                this.form.patchValue({sectorId: ''}, {emitEvent: false});
            }

            this.sectors = [];
            if (!companyId || !unitId) {
                this.cd.markForCheck();
                return;
            }
            this.sectorsLoading = true;
            this.cd.markForCheck();
            try {
                this.sectors = await this.sectorsRepo.listByCompanyAndUnit(companyId, unitId, 500);
            } finally {
                this.sectorsLoading = false;
                // Ensure edit mode keeps the saved sector selected
                const preSectorId = (this.data as any)?.sectorId ?? this.form.get('sectorId')?.value;
                if (preSectorId) {
                    this.form.patchValue({sectorId: preSectorId}, {emitEvent: false});
                }
                this.cd.markForCheck();
            }
        });

        // Setup cargo autocomplete stream
        this.cargos$ = this.cargoCtrl.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap((term: any) => {
                const t = typeof term === 'string' ? term : '';
                // If user starts typing after selecting, clear the selected cargoId
                if (this.selectedCargo && t && !t.includes(this.selectedCargo.cbo) && !t.includes(this.selectedCargo.name)) {
                    this.selectedCargo = null;
                    this.form.patchValue({cargoId: ''});
                }
                if (!t || t.length < 1) return of([]);
                this.loadingCargos = true;
                return this.cargosRepo.searchByNameOrCbo(t?.toString().toUpperCase(), 20) as any;
            })
        ) as any;

        // Reset loading flag when results arrive
        this.cargos$.subscribe({next: () => (this.loadingCargos = false), error: () => (this.loadingCargos = false)});
    }

    private async bootstrapInitialData() {
        this.companiesLoading = true;
        this.cd.markForCheck();
        try {
            await this.loadCompanies();

            const companyId = this.form.get('companyId')?.value as string;
            const unitId = this.form.get('unitId')?.value as string;

            // Pre-load units so the select shows the saved unit immediately in edit mode
            if (companyId) {
                this.unitsLoading = true;
                this.cd.markForCheck();
                try {
                    this.units = await this.unitsRepo.listBy('companyId' as any, companyId, 500);
                } finally {
                    this.unitsLoading = false;
                }
            }

            // Trigger sectors load for edit mode
            if (companyId && unitId) {
                this.form.get('unitId')?.setValue(unitId, {emitEvent: true});
            }
        } finally {
            this.companiesLoading = false;
            this.initializing = false;
            this.cd.markForCheck();
        }
    }

    private async loadCompanies() {
        // Use service to respect CLIENTE scoping
        this.companies = await this.companiesService.listCompanies();
        this.cd.markForCheck();
    }

    onCargoSelected(cargo: any) {
        this.selectedCargo = cargo;
        this.form.patchValue({cargoId: cargo.id});
        this.cargoCtrl.setValue(`${cargo.name} — ${cargo.cbo}`);
        this.cargoCtrl.setErrors(null); // Limpa erros ao selecionar cargo válido
    }

    onAdmissionDateInput(evt: Event) {
        const el = evt.target as HTMLInputElement;
        const raw = (el?.value ?? '').toString();

        // mantém apenas dígitos e aplica máscara dd/MM/aaaa
        const digits = raw.replace(/\D/g, '').slice(0, 8);
        let masked = '';
        if (digits.length <= 2) masked = digits;
        else if (digits.length <= 4) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        else masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;

        if (masked !== this.form.get('admissionDate')?.value) {
            this.form.get('admissionDate')?.setValue(masked, {emitEvent: false});
        }
    }

    onBirthDateInput(evt: Event) {
        const el = evt.target as HTMLInputElement;
        const raw = (el?.value ?? '').toString();

        // mantém apenas dígitos e aplica máscara dd/MM/aaaa
        const digits = raw.replace(/\D/g, '').slice(0, 8);
        let masked = '';
        if (digits.length <= 2) masked = digits;
        else if (digits.length <= 4) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        else masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;

        if (masked !== this.form.get('birthDate')?.value) {
            this.form.get('birthDate')?.setValue(masked, {emitEvent: false});
        }
    }

    onCpfInput(evt: Event) {
        const el = evt.target as HTMLInputElement;
        const raw = (el?.value ?? '').toString();

        // mantém apenas dígitos e aplica máscara 000.000.000-00
        const digits = raw.replace(/\D/g, '').slice(0, 11);
        let masked = digits;

        if (digits.length > 3) masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
        if (digits.length > 6) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
        if (digits.length > 9) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;

        if (masked !== this.form.get('cpf')?.value) {
            this.form.get('cpf')?.setValue(masked, {emitEvent: false});
        }
    }

    private toUpperSafe(v: any): string {
        return String(v ?? '').trim().toUpperCase();
    }

    save() {
        this.submitted = true;
        this.cargoCtrl.markAsTouched();

        // Se não tem cargoId selecionado, marca cargoCtrl como inválido
        if (!this.form.get('cargoId')?.value) {
            this.cargoCtrl.setErrors({required: true});
        }

        if (this.form.invalid || !this.form.get('cargoId')?.value) {
            this.form.markAllAsTouched();
            this.cd.markForCheck();
            return;
        }

        const v = this.form.value;
        const cargo = this.selectedCargo;

        const payload = {
            ...v,
            name: this.toUpperSafe(v.name),
            // admissionDate permanece string dd/MM/aaaa
            admissionDate: String(v.admissionDate ?? '').trim(),
            cargoName: cargo?.name ?? (this.data as any)?.cargoName ?? '',
            cargoCbo: cargo?.cbo ?? (this.data as any)?.cargoCbo ?? '',
        };

        this.dialogRef.close(payload);
    }

    cancel() {
        this.dialogRef.close(null);
    }

    private readonly auditDialog = inject(MatDialog);

    openAuditHistory(): void {
        const auditData: AuditHistoryData = {
            title: 'Funcionário',
            createdAt: this.data?.createdAt,
            createdBy: this.data?.createdBy,
            updatedAt: this.data?.updatedAt,
            updatedBy: this.data?.updatedBy,
        };

        this.auditDialog.open(AuditHistoryDialogComponent, {
            data: auditData,
            width: '400px',
            disableClose: false,
        });
    }
}

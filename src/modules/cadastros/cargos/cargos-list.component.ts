import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
    ChangeDetectorRef,
    ViewChild,
    OnDestroy
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTableModule, MatTableDataSource} from '@angular/material/table';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {FormsModule, ReactiveFormsModule, FormControl} from '@angular/forms';
import {MatPaginator, MatPaginatorModule, PageEvent} from '@angular/material/paginator';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {Subscription} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {Cargo} from '../models/cargo.model';
import {CargosService} from '../services/cargos.service';
import {CboImportService} from '../services/cbo-import.service';
import {CompanyCargosService} from '../services/company-cargos.service';
import {CompanyCargo} from '../models/cargo.model';
import {SessionService} from '../../../core/services/session.service';
import { CargoDialogComponent } from './cargo-dialog.component';
import {Risk} from '../models/risk.model';
import {RisksService} from '../services/risks.service';
import {CompanyRisksService} from '../services/company-risks.service';
import {CompanyRisk} from '../models/company-risk.model';
import {RiskDialogComponent} from '../risks/risk-dialog.component';

@Component({
    selector: 'app-cargos-list',
    standalone: true,
    imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, FormsModule, ReactiveFormsModule, MatPaginatorModule, MatSnackBarModule],
    templateUrl: './cargos-list.component.html',
    styleUrls: ['./cargos-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargosListComponent implements OnInit, OnDestroy {
    private readonly cargosService = inject(CargosService);
    private readonly cboImport = inject(CboImportService);
    private readonly companyCargosService = inject(CompanyCargosService);
    private readonly dialog = inject(MatDialog);
    private readonly cd = inject(ChangeDetectorRef);
    private readonly snack = inject(MatSnackBar);
    private readonly sessionService = inject(SessionService);
    private readonly risksService = inject(RisksService);
    private readonly companyRisksService = inject(CompanyRisksService);
    private readonly riskDialog = inject(MatDialog);

    columns = ['name', 'cbo', 'status', 'acoes'];
    cargos: any[] = [];
    dataSource: MatTableDataSource<any>;

    // risks state
    riskColumns = ['name', 'riskGroup', 'status', 'acoesRisk'];
    risks: any[] = [];
    riskDataSource = new MatTableDataSource<any>([]);

    pageSize = 30;
    pageIndex = 0;
    cursors: any[] = [];
    total = 0;
    hasMore = true;
    private _reqId = 0;
    filterTerm = '';

    loading = false;
    importing = false;
    loadingRisks = false;

    // Controle de perfil
    isCliente = false;
    isAdmin = false;
    hasAdminScope = false; // ADMIN com empresa selecionada

    searchControl = new FormControl('');
    private subs: Subscription | null = null;

    constructor() {
        this.dataSource = new MatTableDataSource<any>([]);
    }

    @ViewChild(MatPaginator) paginator?: MatPaginator;

    ngOnInit(): void {
        // Detectar perfil do usuário
        this.isCliente = this.cargosService.isCliente();
        this.isAdmin = this.cargosService.isAdmin();
        this.hasAdminScope = this.cargosService.hasAdminScopeCompany();
        // adminGlobalView = ADMIN && no company selected
        // will compute on demand via getAdminScopeCompanyId()

        // For company-scoped views (CLIENTE or ADMIN with company selected) we still show actions
        // The actions will operate on company_cargos collection

        this.subs = this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v: string | null) => {
            this.filterTerm = v ?? '';
            this.loadPage(0, true);
        });
        this.loadPage(0, true);
    }

    ngOnDestroy(): void {
        this.subs?.unsubscribe();
    }

    async loadPage(index = 0, reset = false) {
        if (reset) {
            this.pageIndex = index;
            this.cursors = [];
            this.hasMore = true;
        }
        this.loading = true;
        const reqId = ++this._reqId;
        try {
            // Determine admin global view: admin && no company selected => list all cargos paged
            const adminScopeCompanyId = this.cargosService.getAdminScopeCompanyId();
            const isAdminGlobalView = this.isAdmin && !adminScopeCompanyId;

            if (isAdminGlobalView) {
                const startAfterDoc = index > 0 ? this.cursors[index - 1] : undefined;
                const res: any = await this.cargosService.listCargosPaged(this.filterTerm, this.pageSize, startAfterDoc);
                if (reqId !== this._reqId) return;
                this.cargos = res.docs as Cargo[];
                this.dataSource.data = this.cargos;
                this.cursors[index] = res.lastDoc;
                this.pageIndex = index;
                this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
                this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
                if (this.paginator) {
                    this.paginator.pageIndex = this.pageIndex;
                    this.paginator.length = this.total;
                }
            } else {
                // company-scoped: load cargos from company_cargos collection (CLIENTE or ADMIN with selected company)
                const companyId = this.isCliente ? (this.sessionService.user()?.companyId ?? '') : adminScopeCompanyId ?? '';
                const list = companyId ? await this.companyCargosService.listByCompany(companyId) : [];
                if (reqId !== this._reqId) return;

                let filtered = list;
                if (this.filterTerm && this.filterTerm.trim().length) {
                    const term = this.filterTerm.trim().toLowerCase();
                    filtered = list.filter((c: CompanyCargo) => (c.name || '').toLowerCase().includes(term) || (String(c.cbo || '')).toLowerCase().includes(term));
                }

                this.cargos = filtered;
                this.dataSource.data = this.cargos;
                this.total = this.cargos.length;
                this.hasMore = false;
                if (this.paginator) {
                    this.paginator.pageIndex = 0;
                    this.paginator.length = this.total;
                }
            }
        } finally {
            if (reqId === this._reqId) {
                this.loading = false;
                this.cd.markForCheck();
            }
            // always refresh risks after cargos load (scope may have changed)
            await this.loadRisks();
        }
    }

    async loadRisks() {
        this.loadingRisks = true;
        this.cd.markForCheck();
        try {
            const adminScopeCompanyId = this.cargosService.getAdminScopeCompanyId();
            const isAdminGlobalView = this.isAdmin && !adminScopeCompanyId;

            if (isAdminGlobalView) {
                // show generic risks (first page)
                const res: any = await this.risksService.listRisksPaged(this.filterTerm, 30);
                this.risks = (res.docs as Risk[]) ?? [];
            } else {
                const companyId = this.isCliente ? (this.sessionService.user()?.companyId ?? '') : adminScopeCompanyId ?? '';
                if (companyId) {
                    const list = await this.companyRisksService.listByCompany(companyId);
                    // optional client-side filter
                    if (this.filterTerm && this.filterTerm.trim().length) {
                        const term = this.filterTerm.trim().toLowerCase();
                        this.risks = list.filter((r: CompanyRisk) => (r.name || '').toLowerCase().includes(term));
                    } else this.risks = list;
                } else {
                    this.risks = [];
                }
            }

            this.riskDataSource.data = this.risks;
        } catch (e) {
            console.error('Erro ao carregar riscos:', e);
            this.risks = [];
            this.riskDataSource.data = [];
        } finally {
            this.loadingRisks = false;
            this.cd.markForCheck();
        }
    }

    viewRisk(r: any) {
        this.riskDialog.open(RiskDialogComponent, { width: '700px', data: { ...r, readOnly: true }, disableClose: false, hasBackdrop: true });
    }

    async load(reset = false) {
        await this.loadPage(reset ? 0 : this.pageIndex, reset);
    }

    search() {
        this.filterTerm = this.searchControl.value ?? '';
        this.loadPage(0, true);
    }

    async onPage(event: PageEvent) {
        const targetIndex = event.pageIndex;
        const targetSize = event.pageSize;
        this.pageSize = targetSize;
        if (targetIndex === this.pageIndex) return;
        if (targetIndex < this.pageIndex) {
            await this.loadPage(targetIndex);
            return;
        }
        for (let i = this.pageIndex + 1; i <= targetIndex; i++) {
            const startAfter = i > 0 ? this.cursors[i - 1] : undefined;
            const res: any = await this.cargosService.listCargosPaged(this.filterTerm, this.pageSize, startAfter);
            this.cursors[i] = res.lastDoc;
            if (i === targetIndex) {
                this.cargos = res.docs as Cargo[];
                this.dataSource.data = this.cargos;
                this.pageIndex = i;
                this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
                this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
                if (this.paginator) this.paginator.length = this.total;
                this.cd.markForCheck();
            }
            if (!Array.isArray(res.docs) || res.docs.length < this.pageSize) break;
        }
    }

    newCargo() {
        const ref = this.dialog.open(CargoDialogComponent, {width: '600px', disableClose: true, hasBackdrop: true});
        ref.afterClosed().subscribe(async (res: any) => {
            if (!res) return;
            try {
                const adminScopeCompanyId = this.cargosService.getAdminScopeCompanyId();
                const isAdminGlobalView = this.isAdmin && !adminScopeCompanyId;

                if (!isAdminGlobalView) {
                    const companyId = this.isCliente ? (this.sessionService.user()?.companyId ?? '') : adminScopeCompanyId ?? '';
                    if (!companyId) throw new Error('Empresa não definida');
                    // create a new company cargo (from provided fields)
                    await this.companyCargosService.createFromGeneric(companyId, res);
                    this.snack.open('Cargo vinculado à empresa criado com sucesso', 'Fechar', {duration: 3000});
                    this.loadPage(0, true);
                } else {
                    await this.cargosService.createCargo(res);
                    this.snack.open('Cargo criado com sucesso', 'Fechar', {duration: 3000});
                    this.loadPage(0, true);
                }
            } catch (e: any) {
                this.snack.open(e?.message ?? 'Erro ao criar cargo', 'Fechar', {duration: 4000});
            }
        });
    }

    editCargo(c: Cargo) {
        // If company-scoped view, the item might be a CompanyCargo. Handle both cases.
        const payload = c as any;
        const ref = this.dialog.open(CargoDialogComponent, {width: '600px', data: payload, disableClose: true, hasBackdrop: true});
        ref.afterClosed().subscribe(async (res: any) => {
            if (!res) return;
            try {
                const adminScopeCompanyId = this.cargosService.getAdminScopeCompanyId();
                const isAdminGlobalView = this.isAdmin && !adminScopeCompanyId;

                if (!isAdminGlobalView) {
                    const cc = payload as CompanyCargo;
                    await this.companyCargosService.updateCargo(cc.id, res);
                    this.snack.open('Cargo atualizado com sucesso', 'Fechar', {duration: 3000});
                    this.loadPage(0, true);
                } else {
                    await this.cargosService.updateCargo(payload.id, res);
                    this.snack.open('Cargo atualizado com sucesso', 'Fechar', {duration: 3000});
                    this.loadPage(0, true);
                }
            } catch (e: any) {
                this.snack.open(e?.message ?? 'Erro ao atualizar cargo', 'Fechar', {duration: 4000});
            }
        });
    }

    /** Visualizar cargo em modo somente leitura (para CLIENTE) */
    viewCargo(c: Cargo) {
        this.dialog.open(CargoDialogComponent, {
            width: '600px',
            data: { ...c, readOnly: true },
            disableClose: false,
            hasBackdrop: true
        });
    }

    async toggleActive(c: any) {
        // Detect whether item is a CompanyCargo (scoped) or a global Cargo
        const isCompanyCargo = !!c?.companyId || (typeof c?.id === 'string' && c.id.startsWith('ccargo_'));

        if (isCompanyCargo) {
            try {
                const cc = c as CompanyCargo;
                const newStatus = cc.status !== 'ativo';
                await this.companyCargosService.updateCargo(cc.id, { status: newStatus ? 'ativo' : 'inativo' });
                const msg = newStatus ? 'Cargo ativado com sucesso' : 'Cargo inativado com sucesso';
                this.snack.open(msg, 'Fechar', { duration: 3000 });
                await this.loadPage(0, true);
                return;
            } catch (err: any) {
                console.error('Erro ao atualizar company cargo:', err?.message ?? err);
                // If update failed because the document id isn't present, fall through to try global
            }
        }

        // Fallback / global cargo
        try {
            await this.cargosService.setActive(c.id, c.status !== 'ativo');
            const msg = c.status !== 'ativo' ? 'Cargo ativado com sucesso' : 'Cargo inativado com sucesso';
            this.snack.open(msg, 'Fechar', { duration: 3000 });
            await this.loadPage(0, true);
        } catch (err: any) {
            console.error('Erro ao atualizar cargo global:', err?.message ?? err);
            this.snack.open(err?.message ?? 'Erro ao atualizar cargo', 'Fechar', { duration: 4000 });
        }
    }

    async handleFile(file?: File) {
        if (!file) return;
        this.importing = true;
        this.cd.markForCheck();
        try {
            const res = await this.cboImport.importFromFile(file);
            this.snack.open(`Importação concluída com sucesso. Importados: ${res.imported}. Ignorados: ${res.skipped}. Erros: ${res.errors}`, 'Fechar', {duration: 6000});
            this.loadPage(0, true);
        } catch (e: any) {
            this.snack.open(e?.message ?? 'Erro na importação', 'Fechar', {duration: 6000});
        } finally {
            this.importing = false;
            this.cd.markForCheck();
        }
    }
}

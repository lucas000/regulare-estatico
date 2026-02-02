import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CompanyDialogComponent } from './company-dialog.component';
import { CompaniesService } from '../services/companies.service';
import { Company } from '../models/company.model';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './companies-list.component.html',
  styleUrls: ['./companies-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesListComponent implements OnInit {
  private readonly companiesService = inject(CompaniesService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);

  columns = ['nome', 'cnpj', 'status', 'acoes'];
  companies: Company[] = [];
  dataSource: MatTableDataSource<Company>;


  constructor() {
    // initialize dataSource once and avoid recreating it later
    this.dataSource = new MatTableDataSource<Company>([]);
  }

  ngOnInit(): void {
    // Carregamento automático sempre que o componente for inicializado
    this.load();
  }

  async load() {
    this.companies = await this.companiesService.listCompanies();
    // Update existing datasource data instead of creating a new instance
    this.dataSource.data = this.companies;
    // Ensure OnPush detects the change
    this.cd.markForCheck();
  }

  newCompany() {
    const ref = this.dialog.open(CompanyDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      // Use the new API to create company with a CLIENTE user
      await this.companiesService.createCompanyWithClientUser(res);
      this.load();
    });
  }

  editCompany(c: Company) {
    const ref = this.dialog.open(CompanyDialogComponent, { width: '600px', data: c });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.companiesService.updateCompany(c.id, res);
      this.load();
    });
  }

  toggleActive(c: Company) {
    this.companiesService.setActive(c.id, c.status !== 'ativo').then(() => this.load());
  }
}

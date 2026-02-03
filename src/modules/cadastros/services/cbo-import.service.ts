import { Injectable } from '@angular/core';
import { CargosRepository } from '../repositories/cargos.repository';

function makeId(prefix = '') { return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`; }

@Injectable({ providedIn: 'root' })
export class CboImportService {
  constructor(private readonly repo: CargosRepository) {}

  async importFromText(csvText: string): Promise<{ imported: number; skipped: number; errors: number }> {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
    if (lines.length === 0) return { imported: 0, skipped: 0, errors: 0 };

    // Assume first line is header; find header indices
    const header = lines[0].split(/[;,\t]/).map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());
    const codigoIdx = header.findIndex(h => h === 'CODIGO');
    const tituloIdx = header.findIndex(h => h === 'TITULO');
    if (codigoIdx === -1 || tituloIdx === -1) throw new Error('CSV header inválido. Deve conter CODIGO e TITULO');

    let imported = 0; let skipped = 0; let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      const parts = raw.split(/[;,\t]/).map(p => p.trim().replace(/^"|"$/g, ''));
      const codigo = parts[codigoIdx] ?? '';
      const titulo = (parts[tituloIdx] ?? '').toUpperCase();
      if (!codigo || !titulo) { skipped++; continue; }

      try {
        const existing = await this.repo.findByCbo(codigo);
        if (existing) { skipped++; continue; }

        const now = new Date().toISOString();
        const id = `cargo_${makeId()}`;
        const doc: any = {
          id,
          name: titulo,
          cbo: codigo,
          description: '',
          notes: '',
          status: 'ativo',
          criadoEm: now,
          atualizadoEm: now,
          criadoPor: 'SISTEMA',
          atualizadoPor: 'SISTEMA'
        };
        await this.repo.create(doc);
        imported++;
      } catch (e) {
        console.error('Erro importando linha', i, e);
        errors++;
        // continue
      }
    }

    return { imported, skipped, errors };
  }

  async importFromFile(file: File): Promise<{ imported: number; skipped: number; errors: number }> {
    // Read file as ArrayBuffer and decode using windows-1252 (a superset of iso-8859-1) to support accented characters.
    // TextDecoder supports 'windows-1252' in modern browsers; if not supported, fallback to 'iso-8859-1'.
    const ab = await file.arrayBuffer();
    let decoder: TextDecoder;
    try {
      decoder = new TextDecoder('windows-1252');
    } catch (e) {
      // Fallback
      decoder = new TextDecoder('iso-8859-1');
    }
    const text = decoder.decode(ab);
    return this.importFromText(text);
  }
}

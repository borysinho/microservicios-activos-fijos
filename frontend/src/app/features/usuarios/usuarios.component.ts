import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosGqlService } from '../../core/services/activos-gql.service';
import { AuthService } from '../../core/services/auth.service';
import type { Usuario, Area, Responsable, CategoriaActivo, RolUsuario } from '../../core/models/models';

type Tab = 'usuarios' | 'areas' | 'responsables' | 'categorias';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit {
  private gql  = inject(ActivosGqlService);
  auth = inject(AuthService);

  // ── State ────────────────────────────────────────────────────────────────
  activeTab   = signal<Tab>('usuarios');
  loading     = signal(true);
  saving      = signal(false);
  error       = signal('');
  search      = '';

  usuarios    = signal<Usuario[]>([]);
  areas       = signal<Area[]>([]);
  responsables= signal<Responsable[]>([]);
  categorias  = signal<CategoriaActivo[]>([]);

  // ── Modales ──────────────────────────────────────────────────────────────
  showUsuarioModal   = signal(false);
  showAreaModal      = signal(false);
  showRespModal      = signal(false);
  showCatModal       = signal(false);

  editingUsuarioId   = signal<string | null>(null);
  editingAreaId      = signal<string | null>(null);
  editingRespId      = signal<string | null>(null);
  editingCatId       = signal<string | null>(null);

  // ── Forms ────────────────────────────────────────────────────────────────
  formUsuario  = { username: '', email: '', password: '', rol: 'SOLO_LECTURA' as RolUsuario };
  formArea     = { codigo: '', nombre: '', descripcion: '', responsableId: '' };
  formResp     = { nombre: '', cargo: '', email: '', telefono: '' };
  formCat      = { nombre: '', descripcion: '', metodoDepreciacion: 'LINEAL', tasaDepreciacion: 0.1 };

  readonly roles: RolUsuario[] = ['ADMINISTRADOR', 'RESPONSABLE_AREA', 'AUDITOR', 'SOLO_LECTURA'];
  readonly metodos = ['LINEAL', 'ACELERADO', 'SUMA_DIGITOS'];

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.loading.set(true);
    this.gql.getUsuarios().subscribe({ next: d => this.usuarios.set(d), error: () => {} });
    this.gql.getAreas().subscribe({ next: d => this.areas.set(d), error: () => {} });
    this.gql.getResponsables().subscribe({ next: d => this.responsables.set(d), error: () => {} });
    this.gql.getCategorias().subscribe({
      next: d => { this.categorias.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  get usuariosFiltrados(): Usuario[] {
    if (!this.search) return this.usuarios();
    const t = this.search.toLowerCase();
    return this.usuarios().filter(u =>
      u.username?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t)
    );
  }

  get areasFiltradas(): Area[] {
    if (!this.search) return this.areas();
    const t = this.search.toLowerCase();
    return this.areas().filter(a =>
      a.nombre.toLowerCase().includes(t) || a.codigo.toLowerCase().includes(t)
    );
  }

  get responsablesFiltrados(): Responsable[] {
    if (!this.search) return this.responsables();
    const t = this.search.toLowerCase();
    return this.responsables().filter(r =>
      r.nombre.toLowerCase().includes(t) || r.email.toLowerCase().includes(t)
    );
  }

  get categoriasFiltradas(): CategoriaActivo[] {
    if (!this.search) return this.categorias();
    const t = this.search.toLowerCase();
    return this.categorias().filter(c => c.nombre.toLowerCase().includes(t));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  get isAdmin(): boolean {
    return this.auth.hasRole('ADMINISTRADOR');
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.search = '';
  }

  rolBadge(rol?: string): string {
    const map: Record<string, string> = {
      ADMINISTRADOR:    'badge badge--accent',
      AUDITOR:          'badge badge--warning',
      RESPONSABLE_AREA: 'badge badge--cyan',
      SOLO_LECTURA:     'badge',
    };
    return map[rol ?? ''] ?? 'badge';
  }

  metodoLabel(m: string): string {
    const map: Record<string, string> = { LINEAL: 'Lineal', ACELERADO: 'Acelerado', SUMA_DIGITOS: 'Suma Dígitos' };
    return map[m] ?? m;
  }

  // ── CRUD Usuarios ────────────────────────────────────────────────────────
  openCrearUsuario(): void {
    this.editingUsuarioId.set(null);
    this.formUsuario = { username: '', email: '', password: '', rol: 'SOLO_LECTURA' };
    this.showUsuarioModal.set(true);
  }

  openEditarUsuario(usuario: Usuario): void {
    this.editingUsuarioId.set(usuario.id);
    this.formUsuario = {
      username: usuario.username,
      email: usuario.email,
      password: '',
      rol: usuario.rol,
    };
    this.showUsuarioModal.set(true);
  }

  guardarUsuario(): void {
    const id = this.editingUsuarioId();
    if (!this.formUsuario.username || !this.formUsuario.email || (!id && !this.formUsuario.password)) return;
    this.saving.set(true);
    const input = {
      username: this.formUsuario.username,
      email: this.formUsuario.email,
      rol: this.formUsuario.rol,
      ...(this.formUsuario.password ? { password: this.formUsuario.password } : {}),
    };
    const op = id ? this.gql.actualizarUsuario(id, input) : this.gql.crearUsuario(input as any);
    op.subscribe({
      next: () => {
        this.saving.set(false);
        this.showUsuarioModal.set(false);
        this.cargarTodo();
      },
      error: () => { this.saving.set(false); this.error.set('Error al crear usuario.'); },
    });
  }

  toggleUsuario(u: Usuario): void {
    this.gql.toggleUsuario(u.id).subscribe({
      next: () => this.cargarTodo(),
      error: () => this.error.set('Error al cambiar estado.'),
    });
  }

  restablecerPassword(u: Usuario): void {
    const nuevaPassword = window.prompt(`Nueva contraseña para ${u.username}`);
    if (!nuevaPassword) return;
    this.gql.restablecerPassword(u.id, nuevaPassword).subscribe({
      next: () => this.cargarTodo(),
      error: () => this.error.set('Error al restablecer contraseña.'),
    });
  }

  // ── CRUD Áreas ───────────────────────────────────────────────────────────
  openCrearArea(): void {
    this.editingAreaId.set(null);
    this.formArea = { codigo: '', nombre: '', descripcion: '', responsableId: '' };
    this.showAreaModal.set(true);
  }

  openEditarArea(a: Area): void {
    this.editingAreaId.set(a.id);
    this.formArea = { codigo: a.codigo, nombre: a.nombre, descripcion: a.descripcion ?? '', responsableId: a.responsable?.id ?? '' };
    this.showAreaModal.set(true);
  }

  guardarArea(): void {
    if (!this.formArea.codigo || !this.formArea.nombre) return;
    this.saving.set(true);
    const input = { ...this.formArea, responsableId: this.formArea.responsableId || undefined };
    const id = this.editingAreaId();
    const op = id ? this.gql.actualizarArea(id, input) : this.gql.crearArea(input);
    op.subscribe({
      next: () => { this.saving.set(false); this.showAreaModal.set(false); this.cargarTodo(); },
      error: () => { this.saving.set(false); this.error.set('Error al guardar área.'); },
    });
  }

  // ── CRUD Responsables ─────────────────────────────────────────────────────
  openCrearResp(): void {
    this.editingRespId.set(null);
    this.formResp = { nombre: '', cargo: '', email: '', telefono: '' };
    this.showRespModal.set(true);
  }

  openEditarResp(r: Responsable): void {
    this.editingRespId.set(r.id);
    this.formResp = { nombre: r.nombre, cargo: r.cargo, email: r.email, telefono: r.telefono ?? '' };
    this.showRespModal.set(true);
  }

  guardarResp(): void {
    if (!this.formResp.nombre || !this.formResp.cargo || !this.formResp.email) return;
    this.saving.set(true);
    const input = { ...this.formResp, telefono: this.formResp.telefono || undefined };
    const id = this.editingRespId();
    const op = id ? this.gql.actualizarResponsable(id, input) : this.gql.crearResponsable(input);
    op.subscribe({
      next: () => { this.saving.set(false); this.showRespModal.set(false); this.cargarTodo(); },
      error: () => { this.saving.set(false); this.error.set('Error al guardar responsable.'); },
    });
  }

  // ── CRUD Categorías ───────────────────────────────────────────────────────
  openCrearCat(): void {
    this.editingCatId.set(null);
    this.formCat = { nombre: '', descripcion: '', metodoDepreciacion: 'LINEAL', tasaDepreciacion: 0.1 };
    this.showCatModal.set(true);
  }

  openEditarCat(c: CategoriaActivo): void {
    this.editingCatId.set(c.id);
    this.formCat = { nombre: c.nombre, descripcion: c.descripcion ?? '', metodoDepreciacion: c.metodoDepreciacion, tasaDepreciacion: c.tasaDepreciacion };
    this.showCatModal.set(true);
  }

  guardarCat(): void {
    if (!this.formCat.nombre) return;
    this.saving.set(true);
    const input = { ...this.formCat, descripcion: this.formCat.descripcion || undefined };
    const id = this.editingCatId();
    const op = id ? this.gql.actualizarCategoria(id, input) : this.gql.crearCategoria(input);
    op.subscribe({
      next: () => { this.saving.set(false); this.showCatModal.set(false); this.cargarTodo(); },
      error: () => { this.saving.set(false); this.error.set('Error al guardar categoría.'); },
    });
  }
}

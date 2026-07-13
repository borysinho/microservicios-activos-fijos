import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NAV_ITEMS, canAccessRoute, type NavItem } from '../../core/auth/permissions';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  auth = inject(AuthService);

  nav = NAV_ITEMS;

  get filteredNav(): NavItem[] {
    const role = this.auth.currentUser()?.rol;
    return this.nav.filter((item) => canAccessRoute(role, item.route));
  }
}

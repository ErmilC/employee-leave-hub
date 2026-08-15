import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { EmployeeDashboardComponent } from './components/employee-dashboard/employee-dashboard.component';
import { ManagerDashboardComponent } from './components/manager-dashboard/manager-dashboard.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { authGuard, managerGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'employee', component: EmployeeDashboardComponent, canActivate: [authGuard] },
  { path: 'manager', component: ManagerDashboardComponent, canActivate: [managerGuard] },
  { path: 'admin', component: AdminPanelComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '/login' }
];

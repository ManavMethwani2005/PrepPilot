import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { SubjectsComponent } from './features/subjects/subjects.component';
import { TimetableComponent } from './features/timetable/timetable.component';
import { ActiveSessionComponent } from './features/study-session/active-session.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'onboarding', component: OnboardingComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'subjects', component: SubjectsComponent, canActivate: [authGuard] },
  { path: 'timetable', component: TimetableComponent, canActivate: [authGuard] },
  { path: 'session/:id', component: ActiveSessionComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];

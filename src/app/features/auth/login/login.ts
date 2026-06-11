import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  appearance: any = 'outline';
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder, 
    private configService: ConfigService,
    private authService: AuthService,
    private router: Router
  ) {
    this.appearance = this.configService.getConfig()?.formFieldAppearance || 'outline';
    
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Call handshaking API on load
    this.authService.handshake().subscribe({
      next: (res) => console.log('Handshake successful:', res),
      error: (err) => console.error('Handshake failed:', err)
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      const { username, password } = this.loginForm.value;
      
      this.authService.login({ username, password }).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Login successful!', response);
          // Navigate to dashboard or home after successful login
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error', error);
          this.errorMessage = error?.error?.message || 'Login failed. Please check your credentials and try again.';
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}

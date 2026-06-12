import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';
import { CryptoSessionService } from '../../../core/services/crypto-session.service';
import { RsaService } from '../../../core/services/rsa.service';
import { LoaderService } from '../../../core/services/loader.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  loginForm: FormGroup;
  appearance: any = 'outline';
  isLoading = false;
  hidePassword = true;
  errorMessage = '';

  publickey: string = '';

  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private crypto = inject(CryptoSessionService);
  private rsaService = inject(RsaService);
  private loaderService = inject(LoaderService);

  constructor() {
    this.appearance = this.configService.getConfig()?.formFieldAppearance || 'outline';

    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  async ngOnInit() {
    this.loaderService.show(); // Start loader for key generation
    try {
      await this.crypto.generateSessionKey();
      await this.rsaService.generateKeyPair(); // Generates and stores
      this.publickey = await this.rsaService.exportPublicKeyPEM(); // Uses stored key
      await this.handshaking(this.publickey);
    } finally {
      this.loaderService.hide(); // Hide loader after init logic
    }
  }

  async handshaking(publickey: string) {
    this.authService.handshake(publickey).subscribe({
      next: async (response) => {
        const data = response.data;
        await this.rsaService.decryptAesKey(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Login failed', error);
      }
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.loaderService.show(); // Show loader during encryption and login

      try {
        const { username, password } = this.loginForm.value;
        const loginData = { username, password };
        const encrypted = await this.rsaService.aesEncrypt(JSON.stringify(loginData));

        this.authService.login(encrypted).subscribe({
        next: async (response) => {
          const encryptedToken = response.token;
          const encryptedData = response.data;
          const token = await this.rsaService.aesDecrypt(encryptedToken);
          const data = await this.rsaService.aesDecrypt(encryptedData);

          localStorage.setItem('tk_9xf1BzX', token);
          localStorage.setItem('UserDetails', data);
          this.errorMessage = '';
          this.router.navigate(['/session-summary']);

          this.isLoading = false;
          this.loaderService.hide(); // Hide loader on success
        },
        error: (error) => {
          this.isLoading = false;
          this.loaderService.hide(); // Hide loader on error
          this.errorMessage = error?.error?.message || 'Login failed. Please check your credentials and try again.';
        }
      });
    } catch (e) {
      this.loaderService.hide(); // Ensure loader is hidden on unexpected encryption error
      this.isLoading = false;
      this.errorMessage = 'An error occurred while encrypting credentials.';
    }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}

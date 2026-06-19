import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideAngularModule, Eye, EyeOff, Wifi, WifiOff } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfigService } from '../../../core/services/config.service';
import { AuthService } from '../../../core/services/auth.service';
import { CryptoSessionService } from '../../../core/services/crypto-session.service';
import { RsaService } from '../../../core/services/rsa.service';
import { LoaderService } from '../../../core/services/loader.service';
import { HealthService } from '../../../core/services/health.service';
import { NetworkStatusComponent } from '../../../shared/components/network-status/network-status';

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
    LucideAngularModule,
    TranslatePipe,
    NetworkStatusComponent
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login implements OnInit {
  loginForm: FormGroup;
  appearance: any = 'outline';
  hidePassword = true;
  errorMessage = signal('');

  publickey: string = '';

  // Expose icons
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Wifi = Wifi;
  readonly WifiOff = WifiOff;

  public healthService = inject(HealthService);

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
    //this.loaderService.show(); // Start loader for key generation
    try {
      await this.crypto.generateSessionKey();
      await this.rsaService.generateKeyPair(); // Generates and stores
      this.publickey = await this.rsaService.exportPublicKeyPEM(); // Uses stored key
      await this.handshaking(this.publickey);
    } finally {
      // this.loaderService.hide(); // Hide loader after init logic
    }
  }

  async handshaking(publickey: string) {
    this.authService.handshake(publickey).subscribe({
      next: async (response) => {
        const data = response.data;
        await this.rsaService.decryptAesKey(data);
      },
      error: (error) => {
        console.error('Login failed', error);
      }
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.errorMessage.set('');
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
            this.errorMessage.set('');
            this.router.navigate(['/session-start']);

            this.loaderService.hide(); // Hide loader on success
          },
          error: (_err) => {
            this.loaderService.hide(); // Hide loader on error
            this.errorMessage.set('Invalid username or password.');
          }
        });
      } catch (e) {
        this.loaderService.hide(); // Ensure loader is hidden on unexpected encryption error
        this.errorMessage.set('Invalid username or password.');
      }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}

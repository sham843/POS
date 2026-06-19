import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, isDevMode } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

import { routes } from './app.routes';
import { ConfigService } from './core/services/config.service';
import { cookieInterceptor } from './core/interceptors/cookie.interceptor';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { provideServiceWorker } from '@angular/service-worker';

export function initializeApp(configService: ConfigService) {
  return () => configService.loadConfig();
}

export function formFieldOptionsFactory(configService: ConfigService) {
  const config = configService.getConfig();
  return { appearance: config?.formFieldAppearance || 'outline' };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptors([cookieInterceptor, apiInterceptor])),
    provideTranslateService(),
    provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true
    },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useFactory: formFieldOptionsFactory,
      deps: [ConfigService]
    }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};

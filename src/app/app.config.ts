import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

import { routes } from './app.routes';
import { ConfigService } from './core/services/config.service';

export function initializeApp(configService: ConfigService) {
  return () => configService.loadConfig();
}

export function formFieldOptionsFactory(configService: ConfigService) {
  const config = configService.getConfig();
  return { appearance: config?.formFieldAppearance || 'outline' };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideTranslateService(),
    provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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
    }
  ]
};

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideTranslateService(),
    provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};

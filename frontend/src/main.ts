import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeEsCo);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

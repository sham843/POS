import { Injectable, inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private activeRequests = 0;
  private spinner = inject(NgxSpinnerService);

  show() {
    if (this.activeRequests === 0) {
      this.spinner.show();
    }
    this.activeRequests++;
  }

  hide() {
    this.activeRequests--;
    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      this.spinner.hide();
    }
  }
}

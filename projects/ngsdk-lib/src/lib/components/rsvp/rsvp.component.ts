import { Component, OnInit, ViewChild, ElementRef, HostListener, Renderer2, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl, FormArray, AbstractControl, ValidatorFn } from '@angular/forms';

import { UtilService } from '../../services/util.service';
import { Guest, ModalMsg } from '../../util/nivite3-model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AtcService } from '../../services/atc.service';

@Component({
  selector: 'n3-rsvp',
  templateUrl: './rsvp.component.html',
  styleUrls: ['./rsvp.component.scss']
})
export class RsvpComponent implements OnInit, OnDestroy {
  @ViewChild('rsvpModal', { static: false }) rsvpModal: ElementRef;
  savingrsvp: boolean;
  fg: FormGroup;
  guest: Guest;
  uns = new Subject();
  constructor(private fb: FormBuilder, public atc: AtcService, private renderer: Renderer2, private util: UtilService) {
    this.util.showModalSub.subscribe((modalMsg: ModalMsg) => {
      if (modalMsg && modalMsg.id === 'rsvp') {
        if (modalMsg.show) {
          this.showRsvpModal();
        } else {
          this.hideRsvpModal();
        }
      }
    });
  }

  ngOnInit() {
    this.util.guestSub.pipe(takeUntil(this.uns)).subscribe((guest: Guest) => {
      this.guest = guest;
      this.resetRsvpForm();
    });
  }
  ngOnDestroy() {
    this.uns.next();
    this.uns.complete();
  }
  resetRsvpForm() {
    this.fg = this.fb.group({
      ac: this.guest ? this.guest.adultCount : 0,
      kc: this.guest ? this.guest.kidCount : 0,
      longMsg: this.guest ? this.guest.longMsg : ''
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    this.hideRsvpModal();
  }
  saveRsvp(rsvp: 'Y' | 'N' | 'M') {
    this.savingrsvp = true;
    const newGuest: Guest = {};
    newGuest.rsvp = rsvp;
    newGuest.adultCount = this.fg.get('ac').value;
    newGuest.kidCount = this.fg.get('kc').value;
    newGuest.longMsg = this.fg.get('longMsg').value;
    newGuest.shortMsg = '';
    newGuest.notifyUpdates = true;
    this.util.saveRsvp(newGuest, () => {
      this.savingrsvp = false;
    });
  }
  hideRsvpModal(event?: Event) {
    if (!event || (event.target as Element).classList.contains('modal')) {
      this.renderer.setStyle(this.rsvpModal.nativeElement, 'display', 'none');
      this.renderer.removeClass(this.rsvpModal.nativeElement, 'show');
    }
  }
  showRsvpModal() {
    this.renderer.setStyle(this.rsvpModal.nativeElement, 'display', 'block');
    this.renderer.addClass(this.rsvpModal.nativeElement, 'show');
  }
  isYOrNOrM(rsvp: 'Y' | 'N' | 'M'): boolean {
    return this.util.guest && this.util.guest && this.util.guest.rsvp && (this.util.guest.rsvp === rsvp);
  }
  getRsvp(): string {
    if (this.util.guest && this.util.guest) {
      switch (this.util.guest.rsvp) {
        case 'Y':
          return 'Yes';
        case 'N':
          return 'No';
        case 'M':
          return 'Maybe';
        default:
          break;
      }
    }
    return '';
  }
  getUnApproved(): string {
    if (this.util.guest && this.util.guest.hostApproved) {
      return '';
    }
    return '*';
  }
}

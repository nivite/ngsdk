import { NgModule } from '@angular/core';
import { NgsdkLibComponent } from './ngsdk-lib.component';
import { NavComponent } from './components/nav/nav.component';
import { RsvpComponent } from './components/rsvp/rsvp.component';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { ClogComponent } from './components/clog/clog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AtcComponent } from './components/atc/atc.component';

@NgModule({
  declarations: [
    NgsdkLibComponent,
    NavComponent,
    RsvpComponent,
    ClogComponent,
    AtcComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFirestoreModule,
    AngularFireAuthModule
  ],
  exports: [NgsdkLibComponent]
})
export class NgsdkLibModule { }

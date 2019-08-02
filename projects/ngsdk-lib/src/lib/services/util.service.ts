import * as firebase from 'firebase/app';
import * as moment_ from 'moment-timezone';
import { Injectable, PLATFORM_ID, NgZone } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Subject, ReplaySubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Invite, Guest, ModalMsg, Growl } from '../util/nivite3-model';
import { AngularFirestore, Action, DocumentSnapshot, QuerySnapshot } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { map } from 'rxjs/operators';
import { ClogService } from './clog.service';

const moment = moment_;

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  provider = new firebase.auth.GoogleAuthProvider();
  invite: Invite;
  inviteId: string;
  guest: Guest;
  guestId: string;
  retryCnt: number;
  authLoaded = false;
  collapsed = true;
  user: firebase.User;
  userSub: Subject<firebase.User> = new ReplaySubject(1);
  inviteSub: Subject<Invite> = new Subject();
  guestSub: Subject<Guest> = new Subject();
  showModalSub: Subject<ModalMsg> = new Subject();
  growlMax = 5;
  growlSub = new ReplaySubject<Growl>(this.growlMax); // Max 5 growls
  // Hard coding for now, because CORS blocked https://nivite.jrvite.com/__/firebase/init.js
  // Find a way to do this:
  // this.http.get('https://nivite.jrvite.com/__/firebase/init.js').subscribe((rsp) => {
  //   this.niviteFireAuth = new AngularFireAuth(this.firebaseWebConfig, this.firebaseWebConfig.appId, PLATFORM_ID, this.ngZone);
  // });
  niviteFirebaseWebConfig = {
    apiKey: 'AIzaSyDUFUg-yCwu0GbvSf8DJ-17WlzcgnbZhzo',
    appId: '1:212059574978:web:f955498611c402d9',
    databaseURL: 'https://nivite-firebase.firebaseio.com',
    storageBucket: 'nivite-firebase.appspot.com',
    authDomain: 'nivite-firebase.firebaseapp.com',
    messagingSenderId: '212059574978',
    projectId: 'nivite-firebase'
  };
  niviteFireAuth: AngularFireAuth;
  customerFirestore: AngularFirestore;
  customerFireStorage: AngularFireStorage;

  constructor(private http: HttpClient, private ngZone: NgZone, private clog: ClogService) {
    this.niviteFireAuth = new AngularFireAuth(this.niviteFirebaseWebConfig, this.niviteFirebaseWebConfig.appId, PLATFORM_ID, this.ngZone);
    if (this.niviteFireAuth) {
      this.provider.addScope('profile');
      this.provider.addScope('email');
      this.niviteFireAuth.authState.subscribe((user: firebase.User) => {
        this.user = user;
        this.authLoaded = true;
        this.userSub.next(user);
      }, (error) => {
        this.authLoaded = true;
        this.userSub.next(undefined);
      });
    }
    const url = new URL(window.location.href).searchParams;
    this.inviteId = url.get('iid');       // invite id
    // this.guestFid = url.get('guestfid');  // guest fid [firestore autogenerated id]
    // this.retryCnt = +url.get('retry');    // refresh count [avoid infinite refresh, when guests collection itself is deleted (rare)]
    this.clog.visible = url.get('log') ? true : false;         // log - initialize custom console
  }
  initializeFirestore(hostFirestoreWebConfig: any/* gapi.client.firebase.WebAppConfig */) {
    this.customerFirestore = new AngularFirestore(
      hostFirestoreWebConfig, hostFirestoreWebConfig.appId, false, null, PLATFORM_ID, this.ngZone, null);
    this.customerFireStorage = new AngularFireStorage(
      hostFirestoreWebConfig, hostFirestoreWebConfig.appId, hostFirestoreWebConfig.storageBucket, PLATFORM_ID, this.ngZone);
  }
  setupInvite() {
    this.customerFirestore.doc<Invite>('nivites/' + this.inviteId).snapshotChanges()
      .pipe(map((inviteDocSnap: Action<DocumentSnapshot<Invite>>) => {
        this.invite = inviteDocSnap.payload.data();
        this.inviteId = inviteDocSnap.payload.id;
        this.invite.timeFrom = this.ifNumberMoment(this.invite.timeFrom);
        this.invite.timeTo = this.ifNumberMoment(this.invite.timeTo);
        return inviteDocSnap;
      })).subscribe((inviteDocSnap: Action<DocumentSnapshot<Invite>>) => {
        this.inviteSub.next(inviteDocSnap.payload.data());
      }, (error) => {
        this.inviteSub.next(undefined);
      });
  }
  setupGuest(user: firebase.User) {
    if (user) { // login
      this.customerFirestore.collection('nivites/' + this.inviteId + '/guests', ref => ref.where('email', '==', this.user.email))
        .get().subscribe((guestDocChgAc: QuerySnapshot<Guest>) => {
          this.clog.log(`Find by email: ${this.user.email}, size: ${guestDocChgAc.size}`);
          if (guestDocChgAc.size > 0) { // found by email
            this.guestId = guestDocChgAc.docs[0].id;
            this.listenGuest();
          } else {
            this.clog.log('Adding new.');
            this.addNewGuest();
          }
        });
    } else { // logout
      this.guest = undefined;
      this.guestSub.next(this.guest);
    }
  }
  saveRsvp(guest: Guest, cb: () => void) {
    this.customerFirestore.doc<Guest>('nivites/' + this.inviteId + '/guests/' + this.guestId).update(guest)
      .then(() => {
        this.showModalSub.next({ id: 'rsvp', show: false });
        this.growlSub.next(new Growl('Saved', 'Your response is saved', 'success', () => { }))
      }).catch((error) => {
        this.clog.log(error);
      }).finally(cb);
  }
  check(): Observable<firebase.User> {
    return this.userSub.asObservable();
  }
  google(cb: () => void) {
    this.niviteFireAuth.auth.signInWithPopup(this.provider).then((uc: firebase.auth.UserCredential) => {
      cb();
    });
  }
  logout() {
    this.niviteFireAuth.auth.signOut();
  }
  toggleNav() {
    this.collapsed = !this.collapsed;
  }
  hideNav() {
    this.collapsed = true;
  }
  showModal(id: 'rsvp' | 'atc') {
    if (this.user) {
      this.showModalSub.next({ id, show: true });
    } else if (id === 'rsvp') {
      this.google(() => {
        this.showModalSub.next({ id, show: true });
      });
    }
  }
  isHost(): boolean {
    return this.guest && (this.guest.role === 'HOST' || this.guest.role === 'COLLAB');
  }
  private listenGuest() {
    this.customerFirestore.doc<Guest>('nivites/' + this.inviteId + '/guests/' + this.guestId).snapshotChanges()
      .subscribe((guestDocSnap: Action<DocumentSnapshot<Guest>>) => {
        this.guest = guestDocSnap.payload.data();
        this.guestId = guestDocSnap.payload.id;
        this.guestSub.next(this.guest);
      }, (error) => {
        this.guestSub.next(undefined);
      });
  }
  private addNewGuest() {
    this.customerFirestore.collection('nivites/' + this.inviteId + '/guests').add(this.makeNewGuest())
      .then((docRef: firebase.firestore.DocumentReference) => {
        docRef.set({ fid: docRef.id }, { merge: true }).then(() => {
          docRef.get().then((docSnap: firebase.firestore.DocumentSnapshot) => {
            this.guestId = docSnap.id;
            this.listenGuest();
          });
        });
      }).catch((error) => {
        // TODO: Alert User that not able to create a new invite.
        this.clog.log(error);
      });
  }
  makeNewGuest(): Guest {
    return {
      niviteuid: '',
      name: this.user.displayName,
      email: this.user.email,
      adultCount: 0,
      kidCount: 0,
      hostApproved: false,
      longMsg: '',
      notifyUpdates: true,
      role: 'GUEST',
      rsvp: 'V',
      shortMsg: ''
    };
  }
  private ifNumberMoment(input: moment_.Moment | number): moment_.Moment {
    return (typeof input === 'number') ? moment(input) : input;
  }

  /* private fetchGuest() {
    if (!this.guestFid) {
      this.customerFirestore.collection('nivites/' + this.inviteId + '/guests').get()
        .subscribe((qSnap: firebase.firestore.QuerySnapshot) => {
          if (!qSnap.size) {
            this.clog.log('guest collection empty');
            this.addNewGuest();
          } else {
            this.setupGuest();
          }
        });
    } else {
      this.customerFirestore.doc<Guest>('nivites/' + this.inviteId + '/guests/' + this.guestFid).snapshotChanges().
        pipe(map((guestDocSnap: Action<DocumentSnapshot<Guest>>) => {
          this.guest = guestDocSnap.payload.data();
          this.guestFid = guestDocSnap.payload.id;
          if (!this.guest || this.user.email !== this.guest.email) {
            this.setupGuest();
          } else if (this.guest && Object.keys(this.guest).length === 0) {
            this.clog.log('Guest was empty/invalid, initializing.');
            this.customerFirestore.collection('nivites/' + this.inviteId + '/guests').doc(this.guestFid)
              .set(this.newGuest(), { merge: true }).then(() => {
                this.redirect('guestfid', this.guestFid);
              }).catch((error) => {
                this.clog.log(error);
              });
          }
          return guestDocSnap;
        })).subscribe((guestDocSnap: Action<DocumentSnapshot<Guest>>) => {
          this.guestSub.next(guestDocSnap.payload.data());
        }, (error) => {
          this.clog.log(error);
        });
    }
  }

  private setupGuest() {
    this.customerFirestore.collection('nivites/' + this.inviteId + '/guests', ref => ref.where('email', '==', this.user.email))
      .snapshotChanges().subscribe((guestDocChgAc: DocumentChangeAction<Guest>[]) => {
        if (guestDocChgAc.length > 0) { // found by email address
          this.clog.log('Not your invite, redirecting to yours: ' + guestDocChgAc[0].payload.doc.id);
          this.guestFid = guestDocChgAc[0].payload.doc.id;
          this.redirect('guestfid', guestDocChgAc[0].payload.doc.id);
        } else { // create a new one
          this.clog.log('Not your invite, creating a new one');
          this.addNewGuest();
        }
      }, (error) => {
        // TODO: Alert User that search by email address failed.
        this.clog.log(error);
      });
  }
  private redirect(paramName: string, paramValue: string) {
    if (paramValue == null) {
      paramValue = '';
    }
    let url = window.location.href;
    const pattern = new RegExp('\\b(' + paramName + '=).*?(&|#|$)');
    if (url.search(pattern) >= 0) {
      return url.replace(pattern, '$1' + paramValue + '$2');
    }
    url = url.replace(/[?#]$/, '');
    url = url + (url.indexOf('?') > 0 ? '&' : '?') + paramName + '=' + paramValue;
    window.location.href = url;
  }
   */
}

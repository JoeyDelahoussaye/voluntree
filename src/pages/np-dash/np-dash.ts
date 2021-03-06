import {
    Component
} from '@angular/core';
import {
    ViewController,
    NavController,
    NavParams,
    ModalController
} from 'ionic-angular';
// import { CalendarComponent } from "../../components/calendar/calendar";
import {
    NgCalendarModule
} from 'ionic2-calendar';
import {
    OAuthProfile
} from '../oauth/models/oauth-profile.model';
import {
    OAuthService
} from '../oauth/oauth.service';
import {
    LoginPage
} from '../login/login-page';
import {
    Http
} from '@angular/http';
import 'rxjs/Rx';
import {
    GrabNpEventsProvider
} from '../../providers/grab-np-events/grab-np-events';
import {
    ManageEventsPage
} from '../manage-events/manage-events';
import {
    NpCalProvider
} from '../../providers/np-cal/np-cal';
import {
    CreateEventPage
} from '../create-event/create-event';
import {
    EinPage
} from '../ein/ein';
import {
    Storage
} from '@ionic/storage';

/**
 * Generated class for the NpDashPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */

@Component({
    selector: 'page-np-dash',
    templateUrl: 'np-dash.html',
    providers: [OAuthService, NpCalProvider]
})
export class NpDashPage {
    private oauthService: OAuthService;
    profile: OAuthProfile;
    private http: Http;
    timeoutHandler: any;
    description: string;
    edit: any;
    covers: string;
    newDescription: string;
    name: string;
    constructor(private viewCtrl: ViewController, http: Http, public navCtrl: NavController, public navParams: NavParams, public NgCalendarModule: NgCalendarModule, oauthService: OAuthService, public GrabNpEventsProvider: GrabNpEventsProvider, public NpCalProvider: NpCalProvider, public ModalController: ModalController, public storage: Storage) {
        this.http = http;
        this.oauthService = oauthService;
        this.edit = false;
        this.oauthService.getProfile()
            .then(profile => this.profile = profile)
    }

    public mouseup() {
        if (this.timeoutHandler) {
            clearInterval(this.timeoutHandler);
            this.timeoutHandler = null;
        }
    }

    public mousedown(ev) {
        this.timeoutHandler = setTimeout(() => {
            this.addEvent(ev);
        }, 500);
    }

    public npevents: any;
    public id;
    logout() {
        this.navCtrl.push(LoginPage)
            .then(() => this.navCtrl.remove(this.viewCtrl.index))
    }
    ionViewDidLoad() {
        this.oauthService.getProfile()
            .then(profile => this.profile = profile)
            .then(() => {
                this.http.post('http://ec2-13-59-91-202.us-east-2.compute.amazonaws.com:3000/graphql', {
                        query: `{ngo (name: "${this.profile.firstName} ${this.profile.lastName}"){id, description, type, username, ngo_address}}`
                    }).map(data => {
                        if (data.json().data.ngo.length === 0) {
                            this.navCtrl
                                .push(EinPage)
                                .then(() => this.navCtrl.remove(this.viewCtrl.index))
                        } else {
                            this.name = data.json().data.ngo[0].username;
                            this.description = data.json().data.ngo[0].description;
                            let id = data.json().data.ngo[0].id;
                            this.id = data.json().data.ngo[0].id;
                            this.storage.set('type', data.json().data.ngo[0].type)
                            this.storage.set('id', id);
                            this.storage.set('address', data.json().data.ngo[0].ngo_address)
                            this.loadEvents();
                        }
                    }).map(() => {})
                    .toPromise();
            })
    }

    goToManageEventsPage() {
        this.navCtrl.push(ManageEventsPage);
    }

    eventSource;
    viewTitle;
    isToday: boolean;
    calendar = {
        mode: 'month',
        currentDate: new Date(),
        formatDayHeader: 'E',
    }; // these are the variable used by the calendar.
    loadEvents() {
        this.NpCalProvider.getCalEvents({
            query: `{event(ngo_id: ${this.id}){
            id
            ngo_id
            description
            event_start
            event_end
            event_address
        }}`
        }).then(response => {
            function milToStandard(value) {
                if (value !== null && value !== undefined) { //If value is passed in
                    if (value.indexOf('AM') > -1 || value.indexOf('PM') > -1) { //If time is already in standard time then don't format.
                        return value;
                    } else {
                        if (value.length == 8) { //If value is the expected length for military time then process to standard time.
                            var hour = value.substring(0, 2); //Extract hour
                            var minutes = value.substring(3, 5); //Extract minutes
                            var identifier = 'AM'; //Initialize AM PM identifier

                            if (hour == 12) { //If hour is 12 then should set AM PM identifier to PM
                                identifier = 'PM';
                            }
                            if (hour == 0) { //If hour is 0 then set to 12 for standard time 12 AM
                                hour = 12;
                            }
                            if (hour > 12) { //If hour is greater than 12 then convert to standard 12 hour format and set the AM PM identifier to PM
                                hour = hour - 12;
                                identifier = 'PM';
                            }
                            return hour + ':' + minutes + ' ' + identifier; //Return the constructed standard time
                        } else { //If value is not the expected length than just return the value as is
                            return value;
                        }
                    }
                }
            };


            this.eventSource = response.event.map((value, i, array) => {
                value.startTime = new Date(value.event_start);
                // alert(`${value.event_start}`)
                value.event_start = null;
                value.endTime = new Date(value.event_end);
                value.event_end = null;
                value.title = value.description;
                return value;
            });
        });
    }
    onViewTitleChanged(title) {
        this.viewTitle = title;
    }
    onEventSelected(event) {
        // console.log('Event selected:' + event.startTime + '-' + event.endTime + ',' + event.title);
    }
    changeMode(mode) {
        this.calendar.mode = mode;
    }
    today() {
        this.calendar.currentDate = new Date();
    }
    onTimeSelected(ev) {
        // console.log('Selected time: ' + ev.selectedTime + ', hasEvents: ' +
        // (ev.events !== undefined && ev.events.length !== 0) + ', disabled: ' + ev.disabled);
    }
    onCurrentDateChanged(event: Date) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        event.setHours(0, 0, 0, 0);
        this.isToday = today.getTime() === event.getTime();
    }
    onRangeChanged(ev) {
        // console.log('range changed: startTime: ' + ev.startTime + ', endTime: ' + ev.endTime);
    }
    markDisabled = (date: Date) => {
        var current = new Date();
        current.setHours(0, 0, 0);
        return date < current;
    };

    addEvent(ev: Date) {
        let myModal = this.ModalController.create(CreateEventPage);
        myModal.onDidDismiss(() => {
            this.navCtrl.setRoot(this.navCtrl.getActive().component);
        })
        myModal.present();
    }
    editDescription() {
        this.edit = !this.edit
    }
    submitDescription() {
        console.log(this.newDescription)
        this.http
            .post('http://ec2-13-59-91-202.us-east-2.compute.amazonaws.com:3000/graphql', {
                query: `mutation {ngo (action: "update", name: "${this.profile.firstName} ${this.profile.lastName}", description: "${this.newDescription}") {description}}`
            })
            .map(data => {
                this.edit = !this.edit
                this.description = data.json().data.ngo.description
            })
            .map(() => {

            })
            .toPromise()
    }

    selectDate(e) {
        this.storage.set('selected', e);
    }

}
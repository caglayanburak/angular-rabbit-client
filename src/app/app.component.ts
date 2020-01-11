import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forEach } from '@angular/router/src/utils/collection';
import { queue } from 'rxjs/internal/scheduler/queue';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'rabbit-client';
  groupResult: any;
  waitingQueues: Array<any>;
  errorQueues: Array<any>;
  apiUrl = "http://localhost:15672";
  /**
   *
   */
  constructor(private httpClient: HttpClient) {

    this.errorQueues = new Array<Queue>();
    this.waitingQueues = new Array<Queue>();
    const httpOptions = this.prepareHeaderOption();

    httpClient.get<Array<Queue>>(this.apiUrl + '/api/queues', httpOptions).subscribe(result => {
      result.forEach(item => {
        if (item.name.indexOf('_error') <= 0 && item.messages > 0) this.waitingQueues.push(item);
      });
      result.forEach(item => {
        if (item.name.indexOf('_error') >= 0 && item.messages > 0) this.errorQueues.push(item);
      });
    });

  }

  private prepareHeaderOption() {
    var headers_object = new HttpHeaders({ 'Authorization': 'Basic Z3Vlc3Q6Z3Vlc3Q=' });
    const httpOptions = {
      headers: headers_object
    };
    return httpOptions;
  }

  purge(queueName: string) {
    var options = this.prepareHeaderOption();
    this.httpClient.delete(this.apiUrl + '/api/queues/%2F/' + queueName + '/contents', options).subscribe(
      result => {
        debugger;
      }
    )
  }

  shovel(queueName: string) {
    var fromQueue = queueName;
    var toQueue = queueName.replace('_error', '');
    var options = this.prepareHeaderOption();
    var payload = {
      "component": "shovel",
      "vhost": "/",
      "name": "Move from " + fromQueue,
      "value":
      {
        "src-uri": "amqp:///%2F", "src-queue": fromQueue,
        "src-protocol": "amqp091",
        "src-prefetch-count": 1000,
        "src-delete-after": "queue-length",
        "dest-protocol": "amqp091",
        "dest-uri": "amqp:///%2F",
        "dest-add-forward-headers": false,
        "ack-mode": "on-confirm",
        "dest-queue": toQueue
      }
    };
    this.httpClient.put(this.apiUrl + '/api/parameters/shovel/%2F/Move%20from%20' + queueName, payload, options).subscribe(result => {

    });
  }

  getMessages(queueName: string, messageCount: number) {
    var options = this.prepareHeaderOption();
    var payload = { "name": queueName, "count": messageCount, "requeue": true, "encoding": "auto", ackmode: "ack_requeue_true" };
    this.httpClient.post<Array<any>>(this.apiUrl + '/api/queues/%2F/' + queueName + '/get', payload, options).subscribe(result => {

      let t = result.map(({ properties }) => properties).map(({ headers }) => headers);
      let messages = new Array<any>();
      t.forEach(item => {
        messages.push(item['MT-Fault-Message']);
      })
      var counts = messages.reduce((p, c) => {
        var name = c;
        if (!p.hasOwnProperty(name)) {
          p[name] = 0;
        }
        p[name]++;
        return p;
      }, {});

      console.log(counts);

      this.groupResult = Object.keys(counts).map(k => {
        return { name: k, count: counts[k] };
      });


      //  var groupResult = messages.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), Object.create(null));
    });
  }
}
export class Queue {
  messages: number;
  name: string;
  consumers: number;
}
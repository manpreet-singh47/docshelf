import http from 'k6/http';
import {check} from 'k6';
export const options = { vus: 5, duration: '15s', thresholds: {http_req_failed:['rate<0.01']} };
export default function () {
 const response=http.get(`${__ENV.BASE_URL || 'http://localhost:8080'}/api/v1/health`);
 check(response, {'health returned 200': r => r.status === 200});
}

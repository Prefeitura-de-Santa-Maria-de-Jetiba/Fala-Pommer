import http from 'k6/http';
  import { check, sleep } from 'k6';

  export const options = {
    stages: [
        { duration: '30s', target: 50 },  // sobe até 5 usuários
        { duration: '30s', target: 100 },  // mantém 5 usuários
        { duration: '30s', target: 200 },
        { duration: '30s', target: 300 },
        { duration: '1m', target: 300 },
        { duration: '30s', target: 0 }
    ],

    thresholds: {
      http_req_failed: ['rate<0.01'],   // menos de 1% de erros
      http_req_duration: ['p(95)<500'], // 95% abaixo de 500 ms
      checks: ['rate>0.99'],
    },
  };

  export default function () {
    const resposta = http.get('http://localhost:3000/');

    check(resposta, {
      'status é 200': (r) => r.status === 200,
      'resposta está correta': (r) => r.body.includes('Hello World!'),
    });

    // Simula o intervalo entre ações de uma pessoa.
    sleep(1);
  }
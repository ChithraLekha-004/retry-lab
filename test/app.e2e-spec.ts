import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/simulate/slow (GET) with empty delay', () => {
    return request(app.getHttpServer())
      .get('/simulate/slow?delay=')
      .expect(400);
  });

  it('/simulate/slow (GET) with a non-numeric delay', () => {
    return request(app.getHttpServer())
      .get('/simulate/slow?delay=hello')
      .expect(400);
  });

  it('/simulate/slow (GET) with a negative delay', () => {
    return request(app.getHttpServer())
      .get('/simulate/slow?delay=-1')
      .expect(400);
  });

  it('/simulate/slow (GET) with a delay exceeding the limit', () => {
    return request(app.getHttpServer())
      .get('/simulate/slow?delay=10001')
      .expect(400);
  });

  it('/simulate/slow (GET) with a non-integer delay', () => {
    return request(app.getHttpServer())
      .get('/simulate/slow?delay=1.5')
      .expect(400);
  });

  it('/simulate/slow (GET) with a valid delay', () => {
    return request(app.getHttpServer())
      .get('/simulate/slow?delay=0')
      .expect(200)
      .expect('slow response');
  });

  it('/simulate/unavailable (GET)', () => {
    return request(app.getHttpServer())
      .get('/simulate/unavailable')
      .expect(503);
  });

  it('/simulate/rate-limit (POST)', () => {
    return request(app.getHttpServer())
      .post('/simulate/rate-limit')
      .send({
        limit: 5,
        windowSeconds: 10,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.limit).toBe(5);
        expect(res.body.windowSeconds).toBe(10);
      });
  });

  it('/simulate/rate-limit/:id (GET)', async () => {
    const result = await request(app.getHttpServer())
      .post('/simulate/rate-limit')
      .send({
        limit: 2,
        windowSeconds: 10,
      })
      .expect(201);

    const id = result.body.id;
    for (let i = 0; i < 2; i++) {
      await request(app.getHttpServer())
        .get(`/simulate/rate-limit/${id}`)
        .expect(200)
        .expect('rate-limit response');
    }

    await request(app.getHttpServer())
      .get(`/simulate/rate-limit/${id}`)
      .expect(429)
      .expect((res) => {
        expect(res.headers).toHaveProperty('retry-after');
      });
  });

  it('/simulate/rate-limit (GET)', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .get('/simulate/rate-limit')
        .expect(200)
        .expect('rate-limit response');
    }

    await request(app.getHttpServer())
      .get('/simulate/rate-limit')
      .expect(429)
      .expect((res) => {
        expect(res.headers).toHaveProperty('retry-after');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});

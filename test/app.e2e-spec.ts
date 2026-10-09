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

  afterEach(async () => {
    await app.close();
  });
});

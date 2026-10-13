import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'academic-collab-api',
      timestamp: new Date().toISOString(),
    };
  }
}

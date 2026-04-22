import { Controller, Get } from '@nestjs/common';
import { getConfig } from '@samachat/config';

@Controller('version')
export class VersionController {
  @Get()
  getVersion() {
    const config = getConfig();
    return {
      version: config.appVersion,
    };
  }
}
